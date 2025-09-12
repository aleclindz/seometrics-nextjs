"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
// Get all conversations with filtering options
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        const siteId = searchParams.get('siteId');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');
        // Base query for chat threads with user info
        let threadsQuery = supabase
            .from('chat_threads')
            .select(`
        id,
        user_token,
        site_id,
        title,
        last_message,
        created_at,
        updated_at,
        metadata
      `)
            .order('updated_at', { ascending: false })
            .range(offset, offset + limit - 1);
        // Apply filters
        if (userToken) {
            threadsQuery = threadsQuery.eq('user_token', userToken);
        }
        if (siteId) {
            threadsQuery = threadsQuery.eq('site_id', siteId);
        }
        if (dateFrom) {
            threadsQuery = threadsQuery.gte('created_at', dateFrom);
        }
        if (dateTo) {
            threadsQuery = threadsQuery.lte('created_at', dateTo);
        }
        const { data: threads, error: threadsError } = await threadsQuery;
        if (threadsError) {
            console.error('[ADMIN CHAT] Error fetching threads:', threadsError);
            return server_1.NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
        }
        // Get user details and message counts for each thread
        const enrichedThreads = await Promise.all((threads || []).map(async (thread) => {
            // Get user email
            const { data: user } = await supabase
                .from('login_users')
                .select('email')
                .eq('token', thread.user_token)
                .single();
            // Get message count
            const { count: messageCount } = await supabase
                .from('chat_messages')
                .select('*', { count: 'exact', head: true })
                .eq('thread_id', thread.id);
            // Get last few messages for preview
            const { data: recentMessages } = await supabase
                .from('chat_messages')
                .select('message_type, content, created_at')
                .eq('thread_id', thread.id)
                .order('created_at', { ascending: false })
                .limit(3);
            return {
                ...thread,
                user_email: user?.email || 'Unknown',
                message_count: messageCount || 0,
                recent_messages: recentMessages || []
            };
        }));
        // Get total count for pagination
        let countQuery = supabase
            .from('chat_threads')
            .select('*', { count: 'exact', head: true });
        if (userToken)
            countQuery = countQuery.eq('user_token', userToken);
        if (siteId)
            countQuery = countQuery.eq('site_id', siteId);
        if (dateFrom)
            countQuery = countQuery.gte('created_at', dateFrom);
        if (dateTo)
            countQuery = countQuery.lte('created_at', dateTo);
        const { count: totalCount } = await countQuery;
        return server_1.NextResponse.json({
            success: true,
            conversations: enrichedThreads,
            pagination: {
                total: totalCount || 0,
                limit,
                offset,
                has_more: (totalCount || 0) > offset + limit
            }
        });
    }
    catch (error) {
        console.error('[ADMIN CHAT] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }
}
