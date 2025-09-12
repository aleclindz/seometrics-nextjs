"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
// Get chat threads for a user
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        const siteId = searchParams.get('siteId');
        if (!userToken) {
            return server_1.NextResponse.json({ error: 'User token required' }, { status: 401 });
        }
        let query = supabase
            .from('chat_threads')
            .select('*')
            .eq('user_token', userToken)
            .order('updated_at', { ascending: false });
        if (siteId) {
            query = query.eq('site_id', siteId);
        }
        const { data: threads, error } = await query;
        if (error) {
            console.error('[CHAT THREADS] Error fetching threads:', error);
            return server_1.NextResponse.json({ error: 'Failed to fetch chat threads' }, { status: 500 });
        }
        return server_1.NextResponse.json({
            success: true,
            threads: threads || []
        });
    }
    catch (error) {
        console.error('[CHAT THREADS] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch chat threads' }, { status: 500 });
    }
}
// Create or update a chat thread
async function POST(request) {
    try {
        const { userToken, siteId, threadId, title, lastMessage } = await request.json();
        if (!userToken || !siteId) {
            return server_1.NextResponse.json({ error: 'User token and site ID required' }, { status: 400 });
        }
        if (threadId) {
            // Update existing thread
            const { data: thread, error } = await supabase
                .from('chat_threads')
                .update({
                title,
                last_message: lastMessage,
                updated_at: new Date().toISOString()
            })
                .eq('id', threadId)
                .eq('user_token', userToken)
                .select()
                .single();
            if (error) {
                console.error('[CHAT THREADS] Error updating thread:', error);
                return server_1.NextResponse.json({ error: 'Failed to update chat thread' }, { status: 500 });
            }
            return server_1.NextResponse.json({
                success: true,
                thread
            });
        }
        else {
            // Create new thread
            const { data: thread, error } = await supabase
                .from('chat_threads')
                .insert({
                user_token: userToken,
                site_id: siteId,
                title: title || 'New Chat',
                last_message: lastMessage,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
                .select()
                .single();
            if (error) {
                console.error('[CHAT THREADS] Error creating thread:', error);
                return server_1.NextResponse.json({ error: 'Failed to create chat thread' }, { status: 500 });
            }
            return server_1.NextResponse.json({
                success: true,
                thread
            });
        }
    }
    catch (error) {
        console.error('[CHAT THREADS] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Failed to manage chat thread' }, { status: 500 });
    }
}
