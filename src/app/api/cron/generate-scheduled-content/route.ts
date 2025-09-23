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

          // Check if there are queued articles ready to generate
          const { data: queuedArticles, error: queueError } = await supabase
            .from('content_generation_queue')
            .select('*')
            .eq('user_token', schedule.user_token)
            .eq('website_token', schedule.website_token)
            .eq('status', 'pending')
            .lte('scheduled_for', now.toISOString())
            .order('priority', { ascending: true })
            .order('scheduled_for', { ascending: true })
            .limit(articlesToGenerate);

          if (queueError) {
            console.error(`[CONTENT CRON] Error fetching queued articles:`, queueError);
            continue;
          }

          let articlesFromQueue = queuedArticles || [];

          // If we don't have enough queued articles, generate new ones
          if (articlesFromQueue.length < articlesToGenerate) {
            const needed = articlesToGenerate - articlesFromQueue.length;
            console.log(`[CONTENT CRON] Need ${needed} more articles for ${schedule.websites?.domain || schedule.domain}`);

            // Generate new topics to fill the gap
            try {
              const cronBase = (() => {
                try { return new URL(request.url).origin; } catch { return process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL || process.env.APP_URL || 'http://localhost:3000'; }
              })();
              const topicResponse = await fetch(`${cronBase}/api/content/bulk-article-ideas`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  userToken: schedule.user_token,
                  websiteToken: schedule.website_token,
                  domain: schedule.websites?.cleaned_domain || schedule.websites?.domain || schedule.domain,
                  period: 'week',
                  count: needed,
                  addToQueue: true
                })
              });

              if (topicResponse.ok) {
                console.log(`[CONTENT CRON] Generated ${needed} new article ideas for queue`);

                // Fetch the newly added queue items
                const { data: newQueueItems } = await supabase
                  .from('content_generation_queue')
                  .select('*')
                  .eq('user_token', schedule.user_token)
                  .eq('website_token', schedule.website_token)
                  .eq('status', 'draft')
                  .order('created_at', { ascending: false })
                  .limit(needed);

                // Update their status to pending and set proper schedule times
                if (newQueueItems && newQueueItems.length > 0) {
                  const updates = newQueueItems.map((item, index) => {
                    const scheduledTime = new Date(now);
                    scheduledTime.setHours(
                      schedule.preferred_hours[index % schedule.preferred_hours.length] || 12,
                      Math.floor(Math.random() * 60),
                      0,
                      0
                    );

                    return supabase
                      .from('content_generation_queue')
                      .update({
                        status: 'pending',
                        scheduled_for: scheduledTime.toISOString(),
                        schedule_id: schedule.id
                      })
                      .eq('id', item.id);
                  });

                  await Promise.all(updates);
                  articlesFromQueue = [...articlesFromQueue, ...newQueueItems];
                }
              }
            } catch (error) {
              console.error(`[CONTENT CRON] Failed to generate additional topics:`, error);
            }
          }

          // Process each queued article
          for (const queueItem of articlesFromQueue.slice(0, articlesToGenerate)) {
            try {
              // Update status to generating
              await supabase
                .from('content_generation_queue')
                .update({ status: 'generating' })
                .eq('id', queueItem.id);

              // Parse metadata for enhanced generation
              let metadata: any = {};
              try {
                metadata = JSON.parse(queueItem.metadata || '{}');
              } catch (e) {
                console.warn('Failed to parse queue item metadata');
              }

              const topicDetails = {
                title: queueItem.topic,
                targetKeywords: queueItem.target_keywords || metadata.targetKeywords || [],
                targetQueries: queueItem.target_queries || metadata.targetQueries || [],
                contentBrief: queueItem.content_brief || metadata.contentBrief || '',
                articleFormat: queueItem.article_format || metadata.articleFormat || {},
                authorityLevel: queueItem.authority_level || metadata.authorityLevel || 'foundation',
                estimatedTrafficPotential: queueItem.estimated_traffic_potential || metadata.estimatedTrafficPotential || 0
              };

              // Enhanced prompt based on queue metadata
              const enhancedPrompt = `Write a comprehensive ${queueItem.target_word_count || schedule.target_word_count}-word article about "${queueItem.topic}" in a ${queueItem.content_style || schedule.content_style} style.

${topicDetails.articleFormat.type ? `Article Format: ${topicDetails.articleFormat.type}` : ''}
${topicDetails.authorityLevel ? `Authority Level: ${topicDetails.authorityLevel}` : ''}
${topicDetails.targetKeywords.length > 0 ? `Target Keywords: ${topicDetails.targetKeywords.join(', ')}` : ''}
${topicDetails.targetQueries.length > 0 ? `Target Queries: ${topicDetails.targetQueries.join(', ')}` : ''}

${topicDetails.contentBrief || 'Include practical tips, examples, and actionable advice.'}

${topicDetails.estimatedTrafficPotential > 0 ? `This topic has an estimated traffic potential of ${topicDetails.estimatedTrafficPotential} monthly visitors based on GSC data analysis.` : ''}`;

              const articleResult = await generateArticleContent({
                userToken: schedule.user_token,
                websiteToken: schedule.website_token,
                domain: schedule.websites?.cleaned_domain || schedule.websites?.domain || schedule.domain,
                topic: queueItem.topic,
                prompt: enhancedPrompt,
                wordCount: queueItem.target_word_count || schedule.target_word_count,
                contentStyle: queueItem.content_style || schedule.content_style,
                includeImages: schedule.include_images,
                autoPublish: schedule.auto_publish,
                topicDetails,
                queueItemId: queueItem.id
              });

              if (articleResult && articleResult.success) {
                // Update queue item as completed
                await supabase
                  .from('content_generation_queue')
                  .update({
                    status: 'completed',
                    generated_article_id: articleResult.articleId
                  })
                  .eq('id', queueItem.id);

                results.generated++;
                console.log(`[CONTENT CRON] Generated queued article: "${queueItem.topic}" (Queue ID: ${queueItem.id})`);
              } else {
                // Mark as failed
                await supabase
                  .from('content_generation_queue')
                  .update({ status: 'failed' })
                  .eq('id', queueItem.id);

                results.failed++;
                console.error(`[CONTENT CRON] Failed to generate queued article: "${queueItem.topic}"`);
              }

              // Add delay between articles to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error) {
              results.failed++;
              const errorMsg = `Failed to generate queued article ${queueItem.id}: ${error}`;
              results.errors.push(errorMsg);
              console.error(`[CONTENT CRON] ${errorMsg}`);

              // Mark queue item as failed
              await supabase
                .from('content_generation_queue')
                .update({ status: 'failed' })
                .eq('id', queueItem.id);
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
