import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('[CRON SITEMAP] Starting scheduled sitemap regeneration...');

    // Verify this is a legitimate cron request 
    // Support both Bearer token (for actual cron) and admin secret (for testing)
    const authHeader = request.headers.get('authorization');
    const expectedCronAuth = `Bearer ${process.env.CRON_SECRET}`;
    const adminSecret = request.headers.get('x-admin-secret');
    
    console.log('[CRON SITEMAP] Auth check details:');
    console.log(`   Auth header: ${authHeader ? authHeader.substring(0, 20) + '...' : 'undefined'}`);
    console.log(`   Expected cron auth: ${expectedCronAuth?.substring(0, 20) + '...'}`);
    console.log(`   Admin secret header: ${adminSecret ? adminSecret.substring(0, 10) + '...' : 'undefined'}`);
    console.log(`   CRON_SECRET exists: ${!!process.env.CRON_SECRET}`);
    console.log(`   ADMIN_SECRET exists: ${!!process.env.ADMIN_SECRET}`);
    
    const validCronAuth = authHeader === expectedCronAuth;
    const validAdminAuth = adminSecret === process.env.ADMIN_SECRET;
    
    console.log(`   Valid cron auth: ${validCronAuth}`);
    console.log(`   Valid admin auth: ${validAdminAuth}`);
    
    if (!validCronAuth && !validAdminAuth) {
      console.log('[CRON SITEMAP] Unauthorized cron request - no valid auth');
      return NextResponse.json({ 
        error: 'Unauthorized',
        debug: {
          hasAuthHeader: !!authHeader,
          hasAdminSecret: !!adminSecret,
          hasCronSecret: !!process.env.CRON_SECRET,
          hasAdminEnvSecret: !!process.env.ADMIN_SECRET,
          authSource: validCronAuth ? 'cron' : validAdminAuth ? 'admin' : 'none'
        }
      }, { status: 401 });
    }
    
    const authSource = validCronAuth ? 'cron-bearer' : 'admin-secret';
    console.log(`[CRON SITEMAP] Authorized via: ${authSource}`);

    // Get all active websites that need sitemap regeneration
    const { data: websites, error: websitesError } = await supabase
      .from('websites')
      .select(`
        *,
        login_users!inner(*)
      `)
      .eq('is_managed', true);

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
      // Determine the website URL to use - handle null website.url (outside try block for catch access)
      const websiteUrl = website.url || website.domain;
      const displayUrl = websiteUrl || website.domain || 'Unknown';
      
      try {
        
        console.log(`[CRON SITEMAP] Processing website: ${displayUrl}`);
        
        results.processed++;

        if (!websiteUrl) {
          console.log(`[CRON SITEMAP] Skipping ${website.domain} - no URL available`);
          results.details.push({
            website: website.domain,
            status: 'skipped',
            reason: 'No URL available'
          });
          continue;
        }

        // Check if sitemap was regenerated recently (within last 6 days)
        const sixDaysAgo = new Date();
        sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);

        // Safely construct domain for query
        const safeDomain = websiteUrl.replace(/^https?:\/\//, '').replace(/^www\./, '');
        const { data: recentSitemap } = await supabase
          .from('sitemap_submissions')
          .select('*')
          .eq('user_token', website.user_token)
          .or(`site_url.eq.${websiteUrl},site_url.eq.sc-domain:${safeDomain}`)
          .gte('created_at', sixDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (recentSitemap) {
          console.log(`[CRON SITEMAP] Skipping ${displayUrl} - sitemap generated recently`);
          results.details.push({
            website: displayUrl,
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
            siteUrl: websiteUrl,
            submitToGSC: true
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`[CRON SITEMAP] ✅ Successfully regenerated sitemap for ${displayUrl}`);
          
          results.success++;
          results.details.push({
            website: displayUrl,
            status: 'success',
            urlCount: result.data?.urlCount || 0,
            sitemapUrl: result.data?.sitemapUrl
          });
        } else {
          console.error(`[CRON SITEMAP] ❌ Failed to regenerate sitemap for ${displayUrl}: ${response.status}`);
          
          results.failed++;
          results.details.push({
            website: displayUrl,
            status: 'failed',
            error: `HTTP ${response.status}`
          });
        }

        // Add small delay between requests to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`[CRON SITEMAP] Error processing ${displayUrl}:`, error);
        
        results.failed++;
        results.details.push({
          website: displayUrl,
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