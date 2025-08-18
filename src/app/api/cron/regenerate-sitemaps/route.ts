import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('[CRON SITEMAP] Starting scheduled sitemap regeneration...');

    // Verify this is a legitimate cron request (basic auth check)
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
    
    console.log('[CRON SITEMAP] Received auth header:', authHeader?.substring(0, 20) + '...');
    console.log('[CRON SITEMAP] Expected auth header:', expectedAuth?.substring(0, 20) + '...');
    console.log('[CRON SITEMAP] CRON_SECRET exists:', !!process.env.CRON_SECRET);
    console.log('[CRON SITEMAP] Headers match:', authHeader === expectedAuth);
    
    if (authHeader !== expectedAuth) {
      console.log('[CRON SITEMAP] Unauthorized cron request - auth mismatch');
      return NextResponse.json({ 
        error: 'Unauthorized',
        debug: {
          hasAuthHeader: !!authHeader,
          hasCronSecret: !!process.env.CRON_SECRET,
          authHeaderLength: authHeader?.length || 0,
          expectedLength: expectedAuth?.length || 0
        }
      }, { status: 401 });
    }

    // Get all active websites that need sitemap regeneration
    const { data: websites, error: websitesError } = await supabase
      .from('websites')
      .select(`
        *,
        login_users!inner(*)
      `)
      .eq('is_managed', true)
      .eq('login_users.is_active', true);

    if (websitesError) {
      console.error('[CRON SITEMAP] Error fetching websites:', websitesError);
      return NextResponse.json({ error: 'Failed to fetch websites' }, { status: 500 });
    }

    console.log(`[CRON SITEMAP] Found ${websites?.length || 0} managed websites`);

    const results = {
      success: 0,
      failed: 0,
      processed: 0,
      details: [] as any[]
    };

    // Process each website
    for (const website of websites || []) {
      try {
        console.log(`[CRON SITEMAP] Processing website: ${website.url}`);
        
        results.processed++;

        // Check if sitemap was regenerated recently (within last 6 days)
        const sixDaysAgo = new Date();
        sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);

        const { data: recentSitemap } = await supabase
          .from('sitemap_submissions')
          .select('*')
          .eq('user_token', website.user_token)
          .or(`site_url.eq.${website.url},site_url.eq.sc-domain:${website.url.replace(/^https?:\/\//, '').replace(/^www\./, '')}`)
          .gte('created_at', sixDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (recentSitemap) {
          console.log(`[CRON SITEMAP] Skipping ${website.url} - sitemap generated recently`);
          results.details.push({
            website: website.url,
            status: 'skipped',
            reason: 'Generated recently'
          });
          continue;
        }

        // Call the sitemap generation endpoint
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/technical-seo/generate-sitemap`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userToken: website.user_token,
            siteUrl: website.url,
            submitToGSC: true
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`[CRON SITEMAP] ✅ Successfully regenerated sitemap for ${website.url}`);
          
          results.success++;
          results.details.push({
            website: website.url,
            status: 'success',
            urlCount: result.data?.urlCount || 0,
            sitemapUrl: result.data?.sitemapUrl
          });
        } else {
          console.error(`[CRON SITEMAP] ❌ Failed to regenerate sitemap for ${website.url}: ${response.status}`);
          
          results.failed++;
          results.details.push({
            website: website.url,
            status: 'failed',
            error: `HTTP ${response.status}`
          });
        }

        // Add small delay between requests to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`[CRON SITEMAP] Error processing ${website.url}:`, error);
        
        results.failed++;
        results.details.push({
          website: website.url,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`[CRON SITEMAP] Completed sitemap regeneration:`, results);

    // Log the cron run to database for tracking
    try {
      await supabase
        .from('system_logs')
        .insert({
          log_type: 'cron_sitemap_regeneration',
          message: 'Scheduled sitemap regeneration completed',
          metadata: results,
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      console.error('[CRON SITEMAP] Error logging to database:', logError);
    }

    return NextResponse.json({
      success: true,
      message: 'Sitemap regeneration completed',
      results
    });

  } catch (error) {
    console.error('[CRON SITEMAP] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Also support GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request);
}