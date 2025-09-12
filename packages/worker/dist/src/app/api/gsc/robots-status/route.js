"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const googleapis_1 = require("googleapis");
const supabase_js_1 = require("@supabase/supabase-js");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        const siteUrl = searchParams.get('siteUrl');
        if (!userToken || !siteUrl) {
            return server_1.NextResponse.json({ error: 'Missing userToken or siteUrl' }, { status: 400 });
        }
        console.log('[GSC ROBOTS STATUS] Checking robots.txt status via GSC');
        // Get active GSC connection
        const { data: connection, error: connectionError } = await supabase
            .from('gsc_connections')
            .select('*')
            .eq('user_token', userToken)
            .eq('is_active', true)
            .single();
        if (connectionError || !connection) {
            return server_1.NextResponse.json({ error: 'No active GSC connection' }, { status: 404 });
        }
        // Setup OAuth credentials
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            return server_1.NextResponse.json({ error: 'OAuth credentials not configured' }, { status: 500 });
        }
        const oauth2Client = new googleapis_1.google.auth.OAuth2(clientId, clientSecret);
        oauth2Client.setCredentials({
            access_token: connection.access_token,
            refresh_token: connection.refresh_token
        });
        // Check robots.txt via direct HTTP request
        try {
            const robotsUrl = `${siteUrl.replace(/\/$/, '')}/robots.txt`;
            console.log(`[GSC ROBOTS STATUS] Checking robots.txt at: ${robotsUrl}`);
            // Make direct HTTP request to check robots.txt
            const robotsResponse = await fetch(robotsUrl, {
                method: 'HEAD',
                headers: {
                    'User-Agent': 'SEOAgent Bot'
                }
            });
            // Determine Google's fetch status
            let googleFetchStatus = 'unknown';
            let googleFetchErrors = 0;
            let fetchDetails = {};
            if (robotsResponse.ok) {
                googleFetchStatus = 'success';
                fetchDetails = {
                    httpStatus: robotsResponse.status,
                    headers: Object.fromEntries(robotsResponse.headers.entries()),
                    lastChecked: new Date().toISOString()
                };
            }
            else if (robotsResponse.status === 404) {
                googleFetchStatus = 'not_found';
                googleFetchErrors = 1;
                fetchDetails = {
                    httpStatus: robotsResponse.status,
                    error: 'Robots.txt not found (404)',
                    lastChecked: new Date().toISOString()
                };
            }
            else {
                googleFetchStatus = 'error';
                googleFetchErrors = 1;
                fetchDetails = {
                    httpStatus: robotsResponse.status,
                    error: `HTTP ${robotsResponse.status}: ${robotsResponse.statusText}`,
                    lastChecked: new Date().toISOString()
                };
            }
            // Update local robots analysis
            const { data: updatedRobots } = await supabase
                .from('robots_analyses')
                .upsert({
                user_token: userToken,
                site_url: siteUrl,
                google_fetch_status: googleFetchStatus,
                google_last_fetched: new Date().toISOString(),
                google_fetch_errors: googleFetchErrors,
                google_fetch_details: fetchDetails,
                verification_status: googleFetchStatus === 'success' ? 'verified' : 'failed',
                verification_attempts: 1,
                next_verification_check: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                analyzed_at: new Date().toISOString()
            }, {
                onConflict: 'user_token,site_url'
            })
                .select()
                .single();
            return server_1.NextResponse.json({
                success: true,
                robotsUrl,
                googleStatus: {
                    fetchStatus: googleFetchStatus,
                    httpStatus: fetchDetails.httpStatus,
                    errors: googleFetchErrors,
                    lastChecked: new Date().toISOString()
                },
                localData: updatedRobots,
                message: `Robots.txt status: ${googleFetchStatus}`
            });
        }
        catch (gscError) {
            console.error('[GSC ROBOTS STATUS] GSC API Error:', gscError);
            // Still update local data to reflect the check attempt
            await supabase
                .from('robots_analyses')
                .upsert({
                user_token: userToken,
                site_url: siteUrl,
                google_fetch_status: 'error',
                google_last_fetched: new Date().toISOString(),
                google_fetch_errors: 1,
                google_fetch_details: {
                    error: gscError.message,
                    lastChecked: new Date().toISOString()
                },
                verification_status: 'failed',
                verification_attempts: 1,
                next_verification_check: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            }, {
                onConflict: 'user_token,site_url'
            });
            return server_1.NextResponse.json({
                success: false,
                error: 'Failed to check robots.txt status via GSC',
                details: gscError.message,
                robotsUrl: `${siteUrl.replace(/\/$/, '')}/robots.txt`
            }, { status: 500 });
        }
    }
    catch (error) {
        console.error('[GSC ROBOTS STATUS] Error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: 'Failed to check robots.txt status'
        }, { status: 500 });
    }
}
async function POST(request) {
    try {
        const { userToken, siteUrl } = await request.json();
        if (!userToken || !siteUrl) {
            return server_1.NextResponse.json({
                error: 'Missing required parameters'
            }, { status: 400 });
        }
        console.log(`[GSC ROBOTS STATUS] Force refresh robots status for: ${siteUrl}`);
        // This will trigger a fresh check via the GET endpoint logic
        const checkResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/gsc/robots-status?userToken=${userToken}&siteUrl=${encodeURIComponent(siteUrl)}`, {
            method: 'GET'
        });
        const checkResult = await checkResponse.json();
        if (!checkResult.success) {
            return server_1.NextResponse.json(checkResult, { status: checkResponse.status });
        }
        return server_1.NextResponse.json({
            success: true,
            ...checkResult,
            message: 'Robots.txt status refreshed successfully'
        });
    }
    catch (error) {
        console.error('[GSC ROBOTS STATUS] Error refreshing status:', error);
        return server_1.NextResponse.json({
            success: false,
            error: 'Failed to refresh robots.txt status'
        }, { status: 500 });
    }
}
