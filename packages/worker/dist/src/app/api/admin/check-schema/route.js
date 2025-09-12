"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function GET() {
    try {
        // Check the structure of login_users table
        const { data: loginUsersColumns, error: loginUsersError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable')
            .eq('table_name', 'login_users')
            .eq('table_schema', 'public');
        // Check the structure of websites table  
        const { data: websitesColumns, error: websitesError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable')
            .eq('table_name', 'websites')
            .eq('table_schema', 'public');
        // Check user_plans table
        const { data: userPlansColumns, error: userPlansError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable')
            .eq('table_name', 'user_plans')
            .eq('table_schema', 'public');
        return server_1.NextResponse.json({
            success: true,
            login_users: loginUsersColumns,
            websites: websitesColumns,
            user_plans: userPlansColumns,
            errors: {
                loginUsersError,
                websitesError,
                userPlansError
            }
        });
    }
    catch (error) {
        console.error('[SCHEMA CHECK] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 });
    }
}
