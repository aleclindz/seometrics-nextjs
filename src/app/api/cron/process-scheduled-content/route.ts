import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes - content generation/publishing can take time

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ProcessResult {
  briefsProcessed: number;
  articlesPublished: number;
  errors: string[];
}

/**
 * GET /api/cron/process-scheduled-content
 * Runs hourly to:
 * 1. Generate articles from scheduled briefs
 * 2. Publish scheduled articles to CMS
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[CONTENT CRON] Starting scheduled content processing');

    const result: ProcessResult = {
      briefsProcessed: 0,
      articlesPublished: 0,
      errors: [],
    };

    // PART 1: Process scheduled briefs (generate articles)
    await processScheduledBriefs(result);

    // Delay between processing briefs and articles
    await delay(2000);

    // PART 2: Process scheduled articles (publish to CMS)
    await processScheduledArticles(result);

    // Log summary to system_logs
    await supabase.from('system_logs').insert({
      log_type: 'cron',
      message: 'Scheduled content processing completed',
      metadata: {
        briefs_processed: result.briefsProcessed,
        articles_published: result.articlesPublished,
        errors: result.errors,
        timestamp: new Date().toISOString(),
      },
    });

    console.log(
      `[CONTENT CRON] Completed: ${result.briefsProcessed} briefs processed, ${result.articlesPublished} articles published`
    );

    return NextResponse.json({
      success: true,
      message: 'Scheduled content processed',
      briefsProcessed: result.briefsProcessed,
      articlesPublished: result.articlesPublished,
      errors: result.errors,
    });
  } catch (error) {
    console.error('[CONTENT CRON] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Process briefs that are scheduled to be generated now or earlier
 */
async function processScheduledBriefs(result: ProcessResult): Promise<void> {
  const now = new Date().toISOString();

  // Query briefs scheduled for now or earlier
  const { data: scheduledBriefs, error: queryError } = await supabase
    .from('article_briefs')
    .select('*')
    .eq('status', 'queued')
    .lte('scheduled_for', now)
    .order('scheduled_for', { ascending: true })
    .limit(50); // Process max 50 per hour to avoid timeouts

  if (queryError) {
    console.error('[CONTENT CRON] Error querying scheduled briefs:', queryError);
    result.errors.push(`Brief query error: ${queryError.message}`);
    return;
  }

  if (!scheduledBriefs || scheduledBriefs.length === 0) {
    console.log('[CONTENT CRON] No scheduled briefs found');
    return;
  }

  console.log(`[CONTENT CRON] Found ${scheduledBriefs.length} scheduled briefs to process`);

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  // Process each brief
  for (const brief of scheduledBriefs) {
    try {
      console.log(`[CONTENT CRON] Generating article from brief: ${brief.id} - "${brief.title}"`);

      // Update status to generating to prevent duplicate processing
      await supabase
        .from('article_briefs')
        .update({ status: 'generating' })
        .eq('id', brief.id);

      // Call the article generation API
      const response = await fetch(`${baseUrl}/api/articles/from-brief`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          briefId: brief.id,
          userToken: brief.user_token,
          websiteToken: brief.website_token,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Article generation failed');
      }

      const articleData = await response.json();
      console.log(`[CONTENT CRON] Article generated successfully: ${articleData.articleId}`);

      result.briefsProcessed++;

      // Delay to avoid rate limiting
      await delay(2000);
    } catch (error) {
      console.error(`[CONTENT CRON] Error processing brief ${brief.id}:`, error);
      result.errors.push(`Brief ${brief.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);

      // Revert status back to queued so it can be retried
      await supabase
        .from('article_briefs')
        .update({ status: 'queued' })
        .eq('id', brief.id);
    }
  }
}

/**
 * Process articles that are scheduled to be published now or earlier
 */
async function processScheduledArticles(result: ProcessResult): Promise<void> {
  const now = new Date().toISOString();

  // Query articles scheduled for now or earlier
  const { data: scheduledArticles, error: queryError } = await supabase
    .from('article_queue')
    .select('*')
    .eq('status', 'generated')
    .lte('scheduled_for', now)
    .order('scheduled_for', { ascending: true })
    .limit(50); // Process max 50 per hour

  if (queryError) {
    console.error('[CONTENT CRON] Error querying scheduled articles:', queryError);
    result.errors.push(`Article query error: ${queryError.message}`);
    return;
  }

  if (!scheduledArticles || scheduledArticles.length === 0) {
    console.log('[CONTENT CRON] No scheduled articles found');
    return;
  }

  console.log(`[CONTENT CRON] Found ${scheduledArticles.length} scheduled articles to publish`);

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  // Process each article
  for (const article of scheduledArticles) {
    try {
      console.log(`[CONTENT CRON] Publishing article: ${article.id} - "${article.title}"`);

      // Update status to publishing to prevent duplicate processing
      await supabase
        .from('article_queue')
        .update({ status: 'publishing' })
        .eq('id', article.id);

      // Call the article publishing API
      const response = await fetch(`${baseUrl}/api/articles/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleId: article.id,
          userToken: article.user_token,
          cmsConnectionId: article.cms_connection_id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Article publishing failed');
      }

      const publishData = await response.json();
      console.log(`[CONTENT CRON] Article published successfully: ${publishData.publicUrl || 'success'}`);

      result.articlesPublished++;

      // Delay to avoid rate limiting
      await delay(2000);
    } catch (error) {
      console.error(`[CONTENT CRON] Error publishing article ${article.id}:`, error);
      result.errors.push(`Article ${article.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);

      // Update status to publishing_failed
      await supabase
        .from('article_queue')
        .update({
          status: 'publishing_failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', article.id);
    }
  }
}

/**
 * Utility: Delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
