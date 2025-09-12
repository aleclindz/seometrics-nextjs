"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const googleapis_1 = require("googleapis");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        const siteUrl = searchParams.get('siteUrl') || 'https://seoagent.com';
        if (!userToken) {
            return server_1.NextResponse.json({ error: 'Missing userToken' }, { status: 400 });
        }
        console.log(`[SITEMAP DEBUG] Starting debug for ${siteUrl} (user: ${userToken})`);
        const debugInfo = {
            siteUrl,
            userToken,
            timestamp: new Date().toISOString(),
            databaseData: {},
            gscData: {},
            actionItems: {}
        };
        // 1. Check database sitemap_submissions
        const { data: sitemapSubmissions, error: sitemapError } = await supabase
            .from('sitemap_submissions')
            .select('*')
            .eq('user_token', userToken);
        debugInfo.databaseData.sitemapSubmissions = {
            count: sitemapSubmissions?.length || 0,
            data: sitemapSubmissions,
            error: sitemapError
        };
        // 2. Check action items table
        const { data: actionItems, error: actionItemsError } = await supabase
            .from('seo_action_items')
            .select('*')
            .eq('user_token', userToken)
            .eq('issue_category', 'sitemap');
        debugInfo.actionItems = {
            count: actionItems?.length || 0,
            data: actionItems,
            error: actionItemsError
        };
        // 3. Try GSC API call
        try {
            const { data: connection } = await supabase
                .from('gsc_connections')
                .select('*')
                .eq('user_token', userToken)
                .eq('is_active', true)
                .single();
            if (connection) {
                const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
                oauth2Client.setCredentials({
                    access_token: connection.access_token,
                    refresh_token: connection.refresh_token
                });
                const webmasters = googleapis_1.google.webmasters({ version: 'v3', auth: oauth2Client });
                const response = await webmasters.sitemaps.list({
                    siteUrl: siteUrl
                });
                debugInfo.gscData = {
                    success: true,
                    sitemaps: response.data.sitemap || [],
                    sitemapCount: (response.data.sitemap || []).length
                };
            }
            else {
                debugInfo.gscData = { success: false, error: 'No GSC connection found' };
            }
        }
        catch (gscError) {
            debugInfo.gscData = {
                success: false,
                error: gscError.message,
                details: gscError
            };
        }
        // 4. Check GSC properties
        const { data: gscProperties } = await supabase
            .from('gsc_properties')
            .select('*')
            .eq('user_token', userToken);
        debugInfo.gscProperties = gscProperties;
        // 5. Test sitemap URL accessibility
        const testUrls = [
            'https://seoagent.com/sitemap.xml',
            'https://www.seoagent.com/sitemap.xml'
        ];
        debugInfo.sitemapUrlTests = {};
        for (const testUrl of testUrls) {
            try {
                const response = await fetch(testUrl, { method: 'HEAD' });
                debugInfo.sitemapUrlTests[testUrl] = {
                    accessible: response.ok,
                    status: response.status,
                    contentType: response.headers.get('content-type')
                };
            }
            catch (error) {
                debugInfo.sitemapUrlTests[testUrl] = {
                    accessible: false,
                    error: error.message
                };
            }
        }
        console.log(`[SITEMAP DEBUG] Complete debug info:`, JSON.stringify(debugInfo, null, 2));
        return server_1.NextResponse.json({
            success: true,
            debugInfo
        });
    }
    catch (error) {
        console.error('[SITEMAP DEBUG] Error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: 'Debug failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
