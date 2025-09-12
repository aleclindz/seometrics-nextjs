"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function GET() {
    try {
        // Try to get a sample user to see the token format
        const { data: sampleUser, error: userError } = await supabase
            .from('login_users')
            .select('token')
            .limit(1)
            .single();
        // Try to get a sample website to see the user_token format
        const { data: sampleWebsite, error: websiteError } = await supabase
            .from('websites')
            .select('user_token')
            .limit(1)
            .single();
        // Try to get a sample user plan to see the user_token format
        const { data: samplePlan, error: planError } = await supabase
            .from('user_plans')
            .select('user_token')
            .limit(1)
            .single();
        return server_1.NextResponse.json({
            success: true,
            sample_login_user_token: sampleUser?.token,
            sample_website_user_token: sampleWebsite?.user_token,
            sample_plan_user_token: samplePlan?.user_token,
            token_types: {
                login_user_token_type: typeof sampleUser?.token,
                website_user_token_type: typeof sampleWebsite?.user_token,
                plan_user_token_type: typeof samplePlan?.user_token
            },
            errors: {
                userError: userError?.message,
                websiteError: websiteError?.message,
                planError: planError?.message
            }
        });
    }
    catch (error) {
        console.error('[TOKEN TYPE CHECK] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 });
    }
}
