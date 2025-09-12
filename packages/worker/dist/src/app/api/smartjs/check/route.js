"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const seoagentjs_detection_1 = require("@/lib/seoagentjs-detection");
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function POST(request) {
    try {
        const { websiteUrl, userToken } = await request.json();
        if (!websiteUrl) {
            return server_1.NextResponse.json({ error: 'Website URL is required' }, { status: 400 });
        }
        console.log('[SMARTJS CHECK] Testing installation for:', websiteUrl);
        const status = await (0, seoagentjs_detection_1.checkSmartJSInstallation)(websiteUrl);
        const simpleStatus = (0, seoagentjs_detection_1.getSimpleStatus)(status);
        // If userToken provided, update the database with the result
        if (userToken) {
            try {
                console.log('[SMARTJS CHECK] Updating seoagentjs_status to:', simpleStatus);
                // Find and update the website record
                const domain = websiteUrl.replace(/^https?:\/\//, '').replace(/^www\./, '');
                await supabase
                    .from('websites')
                    .update({
                    seoagentjs_status: simpleStatus,
                    last_status_check: new Date().toISOString()
                })
                    .eq('user_token', userToken)
                    .or(`domain.eq.${domain},domain.eq.sc-domain:${domain}`);
                console.log('[SMARTJS CHECK] Database updated successfully');
            }
            catch (dbError) {
                console.error('[SMARTJS CHECK] Database update failed:', dbError);
                // Continue - don't fail the test if DB update fails
            }
        }
        return server_1.NextResponse.json({
            success: true,
            data: {
                ...status,
                status: simpleStatus
            }
        });
    }
    catch (error) {
        console.error('[SMARTJS CHECK] Error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
async function GET(request) {
    const { searchParams } = new URL(request.url);
    const websiteUrl = searchParams.get('url');
    if (!websiteUrl) {
        return server_1.NextResponse.json({ error: 'Website URL is required' }, { status: 400 });
    }
    try {
        const status = await (0, seoagentjs_detection_1.checkSmartJSInstallation)(websiteUrl);
        const simpleStatus = (0, seoagentjs_detection_1.getSimpleStatus)(status);
        return server_1.NextResponse.json({
            success: true,
            data: {
                ...status,
                status: simpleStatus
            }
        });
    }
    catch (error) {
        console.error('[SMARTJS CHECK] Error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
