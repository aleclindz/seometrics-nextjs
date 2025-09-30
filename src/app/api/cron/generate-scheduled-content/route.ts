import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST: Generate scheduled content
export async function POST(request: NextRequest) {
  try {
    // Verify cron authentication
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = {
      processed: 0,
      generated: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[]
    };

    try {
      console.log('[CONTENT CRON] Starting scheduled content generation...');

      // Find all enabled schedules that are due for content generation
      const { data: schedules, error: schedulesError } = await supabase
        .from('content_schedules')
        .select(`
          *,
          websites!content_schedules_website_token_fkey (
            domain,
            cleaned_domain
          )
        `)
        .eq('enabled', true)
        .or('next_scheduled_at.is.null,next_scheduled_at.lte.' + new Date().toISOString())
        .order('next_scheduled_at', { ascending: true, nullsFirst: true });

      if (schedulesError || !schedules) {
        throw new Error(`Failed to fetch schedules: ${schedulesError?.message}`);
      }

      console.log(`[CONTENT CRON] Found ${schedules.length} schedules to process`);

      for (const schedule of schedules) {
        results.processed++;

        try {
          console.log(`[CONTENT CRON] Processing schedule for ${schedule.domain}`);

          // Determine how many articles to generate based on frequency
          const now = new Date();
          let articlesToGenerate = 0;

          switch (schedule.frequency) {
            case 'daily':
              articlesToGenerate = schedule.daily_count || 1;
              break;
            case 'weekly':
              // Check if it's been a week since last generation
              const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              if (!schedule.last_generated_at || new Date(schedule.last_generated_at) <= weekAgo) {
                articlesToGenerate = schedule.weekly_count || 3;
              }
              break;
            case 'monthly':
              // Check if it's been a month since last generation
              const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              if (!schedule.last_generated_at || new Date(schedule.last_generated_at) <= monthAgo) {
                articlesToGenerate = schedule.monthly_count || 10;
              }
              break;
          }

          if (articlesToGenerate === 0) {
            results.skipped++;
            console.log(`[CONTENT CRON] Skipping ${schedule.websites?.domain || schedule.domain} - no articles due`);
            continue;
          }

          // Fetch due briefs
          const { data: dueBriefs, error: briefsErr } = await supabase
            .from('article_briefs')
            .select('*')
            .eq('user_token', schedule.user_token)
            .eq('website_token', schedule.website_token)
            .in('status', ['draft', 'queued'])
            .lte('scheduled_for', now.toISOString())
            .order('sort_index', { ascending: true, nullsFirst: true })
            .order('scheduled_for', { ascending: true })
            .limit(articlesToGenerate);

          if (briefsErr) {
            console.error('[CONTENT CRON] Error fetching article briefs:', briefsErr);
            continue;
          }

          let briefs = dueBriefs || [];

          // If not enough briefs are due, generate additional briefs
          if (briefs.length < articlesToGenerate) {
            const needed = articlesToGenerate - briefs.length;
            try {
              const cronBase = (() => { try { return new URL(request.url).origin; } catch { return process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL || process.env.APP_URL || 'http://localhost:3000'; } })();
              const resp = await fetch(`${cronBase}/api/agent/briefs/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userToken: schedule.user_token,
                  websiteToken: schedule.website_token,
                  domain: schedule.websites?.cleaned_domain || schedule.websites?.domain || schedule.domain,
                  count: needed,
                  includePillar: false,
                  addToQueue: true
                })
              });
              if (resp.ok) {
                const data = await resp.json();
                const created = Array.isArray(data?.briefs) ? data.briefs : [];
                briefs = briefs.concat(created);
              }
            } catch (e) {
              console.log('[CONTENT CRON] Brief generation error:', e);
            }
          }

          // Process each brief
          for (const brief of briefs.slice(0, articlesToGenerate)) {
            try {
              const targetKeywords: string[] = Array.from(new Set([brief.primary_keyword, ...((brief.secondary_keywords || []) as string[])])).filter(Boolean) as string[];
              const targetQueries: string[] = Array.isArray(brief.target_queries) ? brief.target_queries : [];
              const wc = (brief.metadata?.word_count_range?.[1]) || brief.word_count_max || schedule.target_word_count;
              const tone = (brief.metadata?.tone || brief.tone || schedule.content_style || 'professional');
              const enhancedPrompt = `Write a comprehensive ${wc}-word article titled "${brief.title}" in a ${tone} style.

Primary Keyword: ${brief.primary_keyword}
Secondary Keywords: ${targetKeywords.slice(1).join(', ')}
Target Queries: ${targetQueries.join(', ')}

${brief.summary || 'Include practical tips, examples, and actionable advice.'}

`;

              const articleResult = await generateArticleContent({
                userToken: schedule.user_token,
                websiteToken: schedule.website_token,
                domain: schedule.websites?.cleaned_domain || schedule.websites?.domain || schedule.domain,
                topic: brief.title,
                prompt: enhancedPrompt,
                wordCount: wc,
                contentStyle: tone,
                includeImages: schedule.include_images,
                autoPublish: schedule.auto_publish,
                topicDetails: { targetKeywords, targetQueries, intent: brief.intent, parentCluster: brief.parent_cluster }
              });

              if (articleResult && articleResult.success) {
                await supabase
                  .from('article_briefs')
                  .update({ status: 'generated', updated_at: new Date().toISOString() })
                  .eq('id', brief.id)
                  .eq('user_token', schedule.user_token);

                results.generated++;
                console.log(`[CONTENT CRON] Generated article from brief: "${brief.title}" (Brief ID: ${brief.id || 'new'})`);
              } else {
                await supabase
                  .from('article_briefs')
                  .update({ status: 'draft', updated_at: new Date().toISOString() })
                  .eq('id', brief.id)
                  .eq('user_token', schedule.user_token);

                results.failed++;
                console.error(`[CONTENT CRON] Failed to generate article from brief: "${brief.title}"`);
              }

              // Add delay between articles to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error) {
              results.failed++;
              const errorMsg = `Failed to generate article from brief ${brief.id || 'new'}: ${error}`;
              results.errors.push(errorMsg);
              console.error(`[CONTENT CRON] ${errorMsg}`);
              await supabase
                .from('article_briefs')
                .update({ status: 'draft', updated_at: new Date().toISOString() })
                .eq('id', brief.id)
                .eq('user_token', schedule.user_token);
            }
          }

          // Update the schedule's last_generated_at and next_scheduled_at
          const nextScheduledAt = calculateNextScheduledTime(schedule);

          await supabase
            .from('content_schedules')
            .update({
              last_generated_at: new Date().toISOString(),
              next_scheduled_at: nextScheduledAt.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', schedule.id);

          console.log(`[CONTENT CRON] Updated schedule for ${schedule.websites?.domain || schedule.domain}, next run: ${nextScheduledAt}`);

        } catch (error) {
          results.failed++;
          const errorMsg = `Failed to process schedule for ${schedule.websites?.domain || schedule.domain}: ${error}`;
          results.errors.push(errorMsg);
          console.error(`[CONTENT CRON] ${errorMsg}`);
        }

        // Rate limiting between websites
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log('[CONTENT CRON] Content generation completed:', results);

      return NextResponse.json({
        success: true,
        message: 'Scheduled content generation completed',
        results
      });

    } catch (error) {
      console.error('[CONTENT CRON] Error in content generation:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to generate scheduled content' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[CONTENT CRON] Error in scheduled content generation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to generate article content
async function generateArticleContent(params: {
  userToken: string;
  websiteToken: string;
  domain: string;
  topic: string;
  prompt?: string;
  wordCount: number;
  contentStyle: string;
  includeImages: boolean;
  autoPublish: boolean;
  topicDetails?: any;
  queueItemId?: number;
}) {
  try {
    // Call the existing article generation API internally
    const generateResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/articles/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userToken: params.userToken,
        prompt: params.prompt || `Write a comprehensive ${params.wordCount}-word article about "${params.topic}" in a ${params.contentStyle} style. Include practical tips, examples, and actionable advice.`,
        websiteDomain: params.domain,
        customInstructions: `Target word count: ${params.wordCount} words. Writing style: ${params.contentStyle}. ${params.includeImages ? 'Include suggestions for relevant images.' : 'Focus on text content only.'} ${params.topicDetails ? `Traffic potential: ${params.topicDetails.estimatedTrafficPotential} monthly visitors.` : ''}`
      })
    });

    if (!generateResponse.ok) {
      throw new Error(`Article generation failed: ${generateResponse.status}`);
    }

    const generateData = await generateResponse.json();

    if (generateData.success && generateData.articleId && params.autoPublish) {
      // Auto-publish the article if enabled
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait a bit for generation to complete

      const publishResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userToken: params.userToken,
          articleId: generateData.articleId,
          publishDraft: false
        })
      });

      if (publishResponse.ok) {
        console.log(`[CONTENT CRON] Auto-published article: ${generateData.articleId}`);
      } else {
        console.warn(`[CONTENT CRON] Failed to auto-publish article: ${generateData.articleId}`);
      }
    }

    return generateData;

  } catch (error) {
    console.error('[CONTENT CRON] Error generating article content:', error);
    throw error;
  }
}

// Helper function to calculate next scheduled time
function calculateNextScheduledTime(schedule: any): Date {
  const now = new Date();
  const preferredHours = schedule.preferred_hours || [9, 12, 15];
  const randomHour = preferredHours[Math.floor(Math.random() * preferredHours.length)];

  let nextTime = new Date(now);

  switch (schedule.frequency) {
    case 'daily':
      nextTime.setDate(now.getDate() + 1);
      break;
    case 'weekly':
      nextTime.setDate(now.getDate() + 7);
      break;
    case 'monthly':
      nextTime.setMonth(now.getMonth() + 1);
      break;
  }

  nextTime.setHours(randomHour, Math.floor(Math.random() * 60), 0, 0);
  return nextTime;
}

// GET endpoint for manual testing
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  return POST(request);
}
