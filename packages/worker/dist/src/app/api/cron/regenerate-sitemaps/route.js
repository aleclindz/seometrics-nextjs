"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const DomainUtils_1 = require("@/lib/utils/DomainUtils");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function POST(request) {
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
            return server_1.NextResponse.json({
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
            return server_1.NextResponse.json({ error: 'Failed to fetch websites' }, { status: 500 });
        }
        console.log(`[CRON SITEMAP] Found ${websites?.length || 0} managed websites`);
        const results = {
            success: 0,
            failed: 0,
            processed: 0,
            details: []
        };
        // Process each website
        for (const website of websites || []) {
            // Use cleaned domain to avoid sc-domain: prefix issues
            const cleanDomain = website.cleaned_domain || DomainUtils_1.DomainUtils.cleanDomain(website.domain);
            const websiteUrl = website.url || DomainUtils_1.DomainUtils.buildUrl(cleanDomain);
            const displayUrl = cleanDomain || 'Unknown';
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
                // Use clean domain for database queries
                const safeDomain = cleanDomain;
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
                    // Create individual activity feed entry for this website
                    try {
                        await supabase
                            .from('agent_events')
                            .insert({
                            user_token: website.user_token,
                            event_type: 'seo_automation',
                            entity_type: 'sitemap_generation',
                            entity_id: website.website_token,
                            event_data: JSON.stringify({
                                title: '🗺️ Sitemap regenerated',
                                description: `Automated sitemap generation completed with ${result.data?.urlCount || 0} URLs`,
                                activity_type: 'sitemap_regenerated',
                                results: {
                                    urlCount: result.data?.urlCount || 0,
                                    sitemapUrl: result.data?.sitemapUrl,
                                    automated: true
                                }
                            }),
                            previous_state: null,
                            new_state: 'completed',
                            triggered_by: 'cron_job',
                            metadata: JSON.stringify({
                                site_url: websiteUrl,
                                sitemap_url: result.data?.sitemapUrl,
                                url_count: result.data?.urlCount || 0,
                                cron_run: 'weekly_sitemap_regeneration',
                                source: 'vercel_cron',
                                timestamp: Date.now()
                            })
                        });
                    }
                    catch (activityLogError) {
                        console.error(`[CRON SITEMAP] Failed to log activity for ${displayUrl}:`, activityLogError);
                    }
                }
                else {
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
            }
            catch (error) {
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
        }
        catch (logError) {
            console.error('[CRON SITEMAP] Error logging to database:', logError);
        }
        return server_1.NextResponse.json({
            success: true,
            message: 'Sitemap regeneration completed',
            results
        });
    }
    catch (error) {
        console.error('[CRON SITEMAP] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
// Also support GET for manual testing
async function GET(request) {
    return POST(request);
}
