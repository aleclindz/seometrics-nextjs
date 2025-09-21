import { NextRequest, NextResponse } from 'next/server';
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

          // Generate content for each article
          for (let i = 0; i < articlesToGenerate; i++) {
            try {
              // Use autonomous topic selection based on GSC data
              let selectedTopic = '';
              let topicDetails = null;

              try {
                // Try intelligent topic selection first
                const topicResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/agent/autonomous-topic-selection`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    userToken: schedule.user_token,
                    websiteToken: schedule.website_token,
                    domain: schedule.websites?.cleaned_domain || schedule.websites?.domain || schedule.domain,
                    analysisType: 'quick'
                  })
                });

                if (topicResponse.ok) {
                  const topicData = await topicResponse.json();
                  if (topicData.success && topicData.selectedTopics && topicData.selectedTopics.length > 0) {
                    // Select a random topic from the top recommendations
                    const randomIndex = Math.floor(Math.random() * Math.min(3, topicData.selectedTopics.length));
                    topicDetails = topicData.selectedTopics[randomIndex];
                    selectedTopic = topicDetails.title;
                    console.log(`[CONTENT CRON] Selected GSC-based topic: "${selectedTopic}" (Priority: ${topicDetails.priority})`);
                  }
                }
              } catch (error) {
                console.warn(`[CONTENT CRON] Autonomous topic selection failed, falling back to manual topics:`, error);
              }

              // Fallback to configured topics if autonomous selection fails
              if (!selectedTopic) {
                const topicSources = [
                  ...(schedule.topic_sources || []),
                  ...(schedule.content_pillars || [])
                ].filter(Boolean);

                if (topicSources.length > 0) {
                  selectedTopic = topicSources[Math.floor(Math.random() * topicSources.length)];
                } else {
                  // Default topics if none specified
                  const defaultTopics = [
                    'SEO best practices',
                    'content marketing strategies',
                    'digital marketing tips',
                    'website optimization',
                    'search engine optimization'
                  ];
                  selectedTopic = defaultTopics[Math.floor(Math.random() * defaultTopics.length)];
                }
              }

              // Add to generation queue
              // Calculate scheduled time (spread throughout the day)
              const scheduledTime = new Date(now);
              scheduledTime.setHours(
                schedule.preferred_hours[i % schedule.preferred_hours.length] || 12,
                Math.floor(Math.random() * 60), // Random minute
                0,
                0
              );

              await supabase
                .from('content_generation_queue')
                .insert({
                  user_token: schedule.user_token,
                  website_token: schedule.website_token,
                  schedule_id: schedule.id,
                  scheduled_for: scheduledTime.toISOString(),
                  topic: selectedTopic,
                  target_word_count: schedule.target_word_count,
                  content_style: schedule.content_style,
                  status: 'pending'
                });

              // Generate the article content with enhanced prompt if we have topic details
              const enhancedPrompt = topicDetails ?
                `Write a comprehensive ${schedule.target_word_count}-word article about "${selectedTopic}" in a ${schedule.content_style} style.

Target these specific queries: ${topicDetails.targetQueries?.join(', ')}

${topicDetails.contentBrief}

Include practical tips, examples, and actionable advice. This topic has an estimated traffic potential of ${topicDetails.estimatedTrafficPotential} monthly visitors based on GSC data analysis.` :
                `Write a comprehensive ${schedule.target_word_count}-word article about "${selectedTopic}" in a ${schedule.content_style} style. Include practical tips, examples, and actionable advice.`;

              await generateArticleContent({
                userToken: schedule.user_token,
                websiteToken: schedule.website_token,
                domain: schedule.websites?.cleaned_domain || schedule.websites?.domain || schedule.domain,
                topic: selectedTopic,
                prompt: enhancedPrompt,
                wordCount: schedule.target_word_count,
                contentStyle: schedule.content_style,
                includeImages: schedule.include_images,
                autoPublish: schedule.auto_publish,
                topicDetails
              });

              results.generated++;
              console.log(`[CONTENT CRON] Generated article for ${schedule.websites?.domain || schedule.domain}: "${selectedTopic}"`);

              // Add delay between articles to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error) {
              results.failed++;
              const errorMsg = `Failed to generate article for ${schedule.websites?.domain || schedule.domain}: ${error}`;
              results.errors.push(errorMsg);
              console.error(`[CONTENT CRON] ${errorMsg}`);
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