"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        if (!userToken) {
            return server_1.NextResponse.json({ error: 'Missing userToken parameter' }, { status: 400 });
        }
        console.log('[DEBUG TABLES] Checking table existence for user:', userToken);
        const results = {};
        const tables = ['cms_connections', 'websites', 'login_users'];
        for (const table of tables) {
            try {
                console.log(`[DEBUG TABLES] Testing table: ${table}`);
                const { data, error, count } = await supabase
                    .from(table)
                    .select('*', { count: 'exact', head: true })
                    .limit(1);
                if (error) {
                    results[table] = {
                        exists: false,
                        error: error.message,
                        code: error.code
                    };
                }
                else {
                    results[table] = {
                        exists: true,
                        count: count || 0
                    };
                }
            }
            catch (tableError) {
                results[table] = {
                    exists: false,
                    error: tableError.message,
                    type: 'exception'
                };
            }
        }
        // Also test a specific query for the user
        try {
            const userCheck = await supabase
                .from('login_users')
                .select('token')
                .eq('token', userToken)
                .single();
            results['user_exists'] = {
                found: !userCheck.error,
                error: userCheck.error?.message
            };
        }
        catch (err) {
            results['user_exists'] = {
                found: false,
                error: err.message
            };
        }
        return server_1.NextResponse.json({
            success: true,
            tables: results,
            userToken,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('[DEBUG TABLES] Unexpected error:', error);
        return server_1.NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
