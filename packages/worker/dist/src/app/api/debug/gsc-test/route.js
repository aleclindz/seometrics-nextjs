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
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    if (!userToken) {
        return server_1.NextResponse.json({ error: 'userToken required' }, { status: 400 });
    }
    try {
        console.log('[GSC TEST] Testing database operations for userToken:', userToken);
        // Test 1: Check if user exists
        const { data: user, error: userError } = await supabase
            .from('login_users')
            .select('*')
            .eq('token', userToken)
            .single();
        console.log('[GSC TEST] User lookup:', { user: !!user, error: userError });
        // Test 2: Try to insert a test GSC connection
        const testConnection = {
            user_token: userToken,
            access_token: 'test_access_token',
            refresh_token: 'test_refresh_token',
            expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
            email: 'test@example.com',
            scope: 'https://www.googleapis.com/auth/webmasters',
            is_active: true,
            last_sync_at: null,
            sync_errors: []
        };
        const { data: insertResult, error: insertError } = await supabase
            .from('gsc_connections')
            .insert(testConnection)
            .select()
            .single();
        console.log('[GSC TEST] Insert test:', { success: !!insertResult, error: insertError });
        // Test 3: Try to read back the connection
        const { data: readResult, error: readError } = await supabase
            .from('gsc_connections')
            .select('*')
            .eq('user_token', userToken)
            .single();
        console.log('[GSC TEST] Read test:', { success: !!readResult, error: readError });
        // Test 4: Clean up - delete the test connection
        if (insertResult) {
            await supabase
                .from('gsc_connections')
                .delete()
                .eq('id', insertResult.id);
        }
        return server_1.NextResponse.json({
            userExists: !!user,
            userError: userError?.message,
            insertSuccess: !!insertResult,
            insertError: insertError?.message,
            readSuccess: !!readResult,
            readError: readError?.message,
            testCompleted: true
        });
    }
    catch (error) {
        console.error('[GSC TEST] Unexpected error:', error);
        return server_1.NextResponse.json({
            error: 'Test failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
