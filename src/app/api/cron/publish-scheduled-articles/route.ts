import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/cron/publish-scheduled-articles
 *
 * Cron job that automatically publishes articles when their scheduled_publish_at time arrives
 * Runs every 30 minutes via Vercel cron configuration
 *
 * Process:
 * 1. Find articles where scheduled_publish_at <= NOW() and status = 'generated'
 * 2. For each article, call the publish API
 * 3. Update article status to 'published'
 * 4. Handle errors and retry logic
 *
 * Authentication: Requires CRON_SECRET environment variable
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (authHeader !== expectedAuth) {
    console.error('[PUBLISH CRON] Unauthorized access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[PUBLISH CRON] Starting scheduled article publishing job');

  try {
    // Find articles that are ready to be published
    // Criteria:
    // - scheduled_publish_at is in the past (or current time)
    // - status is 'generated' (article content exists)
    // - article_content is not null
    const { data: articlesToPublish, error: queryError } = await supabase
      .from('article_queue')
      .select(`
        id,
        user_token,
        website_id,
        cms_connection_id,
        title,
        slug,
        status,
        scheduled_publish_at,
        article_content,
        websites!website_id (
          domain
        )
      `)
      .lte('scheduled_publish_at', new Date().toISOString())
      .eq('status', 'generated')
      .not('article_content', 'is', null)
      .limit(50); // Process max 50 articles per run

    if (queryError) {
      console.error('[PUBLISH CRON] Error querying articles:', queryError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to query scheduled articles',
          details: queryError.message
        },
        { status: 500 }
      );
    }

    if (!articlesToPublish || articlesToPublish.length === 0) {
      console.log('[PUBLISH CRON] No articles scheduled for publishing');
      return NextResponse.json({
        success: true,
        message: 'No articles scheduled for publishing',
        articlesProcessed: 0,
        duration: Date.now() - startTime
      });
    }

    console.log(`[PUBLISH CRON] Found ${articlesToPublish.length} articles to publish`);

    const results = {
      total: articlesToPublish.length,
      published: 0,
      failed: 0,
      errors: [] as Array<{ articleId: number; title: string; error: string }>
    };

    // Process each article
    for (const article of articlesToPublish) {
      try {
        console.log(`[PUBLISH CRON] Publishing article ${article.id}: ${article.title}`);

        // Update status to 'publishing' first
        await supabase
          .from('article_queue')
          .update({
            status: 'publishing',
            updated_at: new Date().toISOString()
          })
          .eq('id', article.id);

        // Check if CMS connection exists - if not, try to find one for the website
        let cmsConnectionId = article.cms_connection_id;

        if (!cmsConnectionId) {
          console.log(`[PUBLISH CRON] Article ${article.id} missing cms_connection_id, looking up website's CMS connection`);

          // Try to find active CMS connection for this website
          const { data: cmsConnection } = await supabase
            .from('cms_connections')
            .select('id')
            .eq('user_token', article.user_token)
            .eq('website_id', article.website_id)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (cmsConnection) {
            console.log(`[PUBLISH CRON] Found CMS connection ${cmsConnection.id} for website ${article.website_id}`);
            cmsConnectionId = cmsConnection.id;

            // Update article with the CMS connection for future use
            await supabase
              .from('article_queue')
              .update({ cms_connection_id: cmsConnection.id })
              .eq('id', article.id);
          }
        }

        // If still no CMS connection, this is a failure
        if (!cmsConnectionId) {
          console.error(`[PUBLISH CRON] Article ${article.id} has no CMS connection - cannot publish`);

          // Mark as publishing_failed
          await supabase
            .from('article_queue')
            .update({
              status: 'publishing_failed',
              updated_at: new Date().toISOString(),
              error_message: 'No CMS connection configured for this website. Please connect a CMS in Settings.'
            })
            .eq('id', article.id);

          results.failed++;
          results.errors.push({
            articleId: article.id,
            title: article.title,
            error: 'No CMS connection configured'
          });
          continue;
        }

        // Call the publish API endpoint
        // Note: This is an internal API call - in production, you might want to use a queue system
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                       (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

        const publishResponse = await fetch(
          `${baseUrl}/api/articles/publish`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userToken: article.user_token,
              articleId: article.id
            })
          }
        );

        if (!publishResponse.ok) {
          const errorData = await publishResponse.json().catch(() => ({}));
          throw new Error(errorData.error || `Publish API returned ${publishResponse.status}`);
        }

        const publishData = await publishResponse.json();

        // Verify the article was published
        const { data: updatedArticle } = await supabase
          .from('article_queue')
          .select('status, published_at')
          .eq('id', article.id)
          .single();

        if (updatedArticle?.status === 'published') {
          console.log(`[PUBLISH CRON] Successfully published article ${article.id}`);
          results.published++;
        } else {
          throw new Error(`Article status is ${updatedArticle?.status}, expected 'published'`);
        }

        // Small delay between publishes to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`[PUBLISH CRON] Error publishing article ${article.id}:`, error);

        // Update article with error status
        await supabase
          .from('article_queue')
          .update({
            status: 'publishing_failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            updated_at: new Date().toISOString()
          })
          .eq('id', article.id);

        results.failed++;
        results.errors.push({
          articleId: article.id,
          title: article.title,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const duration = Date.now() - startTime;

    console.log('[PUBLISH CRON] Job completed:', {
      total: results.total,
      published: results.published,
      failed: results.failed,
      duration: `${duration}ms`
    });

    return NextResponse.json({
      success: true,
      message: `Processed ${results.total} scheduled articles`,
      results,
      duration
    });

  } catch (error) {
    console.error('[PUBLISH CRON] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        duration: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}
