"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function POST(request) {
    try {
        const body = await request.json();
        const { userToken, fromWebsiteToken, toWebsiteToken, reason } = body;
        if (!userToken || !toWebsiteToken) {
            return server_1.NextResponse.json({ error: 'Missing required parameters: userToken, toWebsiteToken' }, { status: 400 });
        }
        console.log('[RECORD SWITCH API] Recording website switch:', {
            userToken,
            fromWebsiteToken,
            toWebsiteToken,
            reason: reason || 'user_switch'
        });
        // Record the switch
        const { error: insertError } = await supabase
            .from('website_switches')
            .insert({
            user_token: userToken,
            from_website_token: fromWebsiteToken,
            to_website_token: toWebsiteToken,
            reason: reason || 'user_switch',
            switched_at: new Date().toISOString()
        });
        if (insertError) {
            console.error('[RECORD SWITCH API] Failed to record switch:', insertError);
            return server_1.NextResponse.json({ error: 'Failed to record website switch' }, { status: 500 });
        }
        console.log('[RECORD SWITCH API] Website switch recorded successfully');
        return server_1.NextResponse.json({
            success: true,
            message: 'Website switch recorded successfully'
        });
    }
    catch (error) {
        console.error('[RECORD SWITCH API] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
