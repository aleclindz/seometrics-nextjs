"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function POST(request) {
    try {
        console.log('[URL INSPECTIONS CRON] Starting weekly URL inspections sync');
        // Verify cron job authorization
        const authHeader = request.headers.get('Authorization');
        const expectedToken = process.env.CRON_SECRET_TOKEN || 'your-secret-cron-token';
        if (authHeader !== `Bearer ${expectedToken}`) {
            console.log('[URL INSPECTIONS CRON] Unauthorized access attempt');
            return server_1.NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        // Get all active GSC connections
        const { data: connections, error: connectionsError } = await supabase
            .from('gsc_connections')
            .select(`
        *,
        gsc_properties (*)
      `)
            .eq('is_active', true);
        if (connectionsError) {
            console.error('[URL INSPECTIONS CRON] Error fetching connections:', connectionsError);
            return server_1.NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 });
        }
        console.log(`[URL INSPECTIONS CRON] Found ${connections?.length || 0} active GSC connections`);
        let totalInspections = 0;
        let failedUsers = 0;
        const processedUsers = [];
        // Process each user's connections
        for (const connection of connections || []) {
            try {
                console.log(`[URL INSPECTIONS CRON] Processing user: ${connection.user_token.substring(0, 10)}...`);
                // Get managed websites for this user
                const { data: websites, error: websitesError } = await supabase
                    .from('websites')
                    .select('*')
                    .eq('user_token', connection.user_token)
                    .eq('is_managed', true)
                    .eq('gsc_status', 'connected');
                if (websitesError) {
                    console.error(`[URL INSPECTIONS CRON] Error fetching websites for user ${connection.user_token}:`, websitesError);
                    continue;
                }
                console.log(`[URL INSPECTIONS CRON] Found ${websites?.length || 0} managed websites for user`);
                // Process each managed website
                for (const website of websites || []) {
                    try {
                        // Check if this website has a property in GSC
                        const hasProperty = connection.gsc_properties?.some((prop) => prop.site_url === website.domain ||
                            prop.site_url === website.cleaned_domain ||
                            prop.site_url === `sc-domain:${website.cleaned_domain}` ||
                            prop.site_url === `https://${website.cleaned_domain}`);
                        if (!hasProperty) {
                            console.log(`[URL INSPECTIONS CRON] No GSC property found for website: ${website.domain}`);
                            continue;
                        }
                        // Get recent performance data to find URLs to inspect
                        const { data: performanceData, error: perfError } = await supabase
                            .from('gsc_performance')
                            .select('pages, queries')
                            .eq('user_token', connection.user_token)
                            .order('date_start', { ascending: false })
                            .limit(5);
                        if (perfError) {
                            console.error(`[URL INSPECTIONS CRON] Error fetching performance data for ${website.domain}:`, perfError);
                            continue;
                        }
                        // Extract URLs from performance data
                        const urlsToInspect = new Set();
                        // Add homepage by default
                        urlsToInspect.add(`https://${website.cleaned_domain}/`);
                        // Add URLs from performance data
                        performanceData?.forEach(perf => {
                            if (perf.pages && Array.isArray(perf.pages)) {
                                perf.pages.forEach((pageData) => {
                                    if (pageData.page && pageData.clicks > 0) {
                                        urlsToInspect.add(pageData.page);
                                    }
                                });
                            }
                        });
                        const urlsArray = Array.from(urlsToInspect).slice(0, 10); // Limit to 10 URLs per site
                        console.log(`[URL INSPECTIONS CRON] Will inspect ${urlsArray.length} URLs for ${website.domain}`);
                        if (urlsArray.length === 0) {
                            console.log(`[URL INSPECTIONS CRON] No URLs to inspect for ${website.domain}`);
                            continue;
                        }
                        // Call the URL inspection API
                        const inspectionResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://seoagent.com'}/api/gsc/url-inspection`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                siteUrl: website.domain,
                                urls: urlsArray,
                                userToken: connection.user_token
                            }),
                        });
                        if (inspectionResponse.ok) {
                            const inspectionResult = await inspectionResponse.json();
                            totalInspections += inspectionResult.results?.length || 0;
                            console.log(`[URL INSPECTIONS CRON] ✅ Successfully inspected ${inspectionResult.results?.length || 0} URLs for ${website.domain}`);
                        }
                        else {
                            console.error(`[URL INSPECTIONS CRON] ❌ Failed to inspect URLs for ${website.domain}: ${inspectionResponse.status}`);
                        }
                    }
                    catch (error) {
                        console.error(`[URL INSPECTIONS CRON] Error processing website ${website.domain}:`, error);
                    }
                }
                processedUsers.push({
                    userToken: connection.user_token.substring(0, 10) + '...',
                    websitesCount: websites?.length || 0
                });
            }
            catch (error) {
                console.error(`[URL INSPECTIONS CRON] Error processing user ${connection.user_token}:`, error);
                failedUsers++;
            }
        }
        console.log('[URL INSPECTIONS CRON] ✅ Weekly URL inspections sync completed');
        return server_1.NextResponse.json({
            success: true,
            summary: {
                totalConnections: connections?.length || 0,
                processedUsersCount: processedUsers.length,
                failedUsers,
                totalInspections,
                processedUsers
            }
        });
    }
    catch (error) {
        console.error('[URL INSPECTIONS CRON] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Failed to run URL inspections sync' }, { status: 500 });
    }
}
async function GET() {
    return server_1.NextResponse.json({ message: 'URL Inspections CRON endpoint. Use POST method.' });
}
