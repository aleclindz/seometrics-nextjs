"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
// Get memory updates linked to conversations
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        const websiteToken = searchParams.get('websiteToken');
        const threadId = searchParams.get('threadId');
        const limit = parseInt(searchParams.get('limit') || '100');
        // Get agent memory entries with conversation metadata
        let memoryQuery = supabase
            .from('agent_memory')
            .select('*')
            .order('last_updated', { ascending: false })
            .limit(limit);
        if (userToken) {
            memoryQuery = memoryQuery.eq('user_token', userToken);
        }
        if (websiteToken) {
            memoryQuery = memoryQuery.eq('website_token', websiteToken);
        }
        const { data: memoryEntries, error } = await memoryQuery;
        if (error) {
            console.error('[ADMIN MEMORY] Error fetching memory updates:', error);
            return server_1.NextResponse.json({ error: 'Failed to fetch memory updates' }, { status: 500 });
        }
        // Filter entries that have conversation source metadata
        const conversationMemories = (memoryEntries || []).filter(entry => entry.metadata?.source && entry.metadata?.message_id);
        // Enrich with message details
        const enrichedMemories = await Promise.all(conversationMemories.map(async (memory) => {
            let messageDetails = null;
            let threadDetails = null;
            if (memory.metadata?.message_id) {
                // Get the source message
                const { data: message } = await supabase
                    .from('chat_messages')
                    .select('content, message_type, created_at, thread_id')
                    .eq('id', memory.metadata.message_id)
                    .single();
                if (message) {
                    messageDetails = message;
                    // Get thread details
                    const { data: thread } = await supabase
                        .from('chat_threads')
                        .select('title, site_id')
                        .eq('id', message.thread_id)
                        .single();
                    if (thread) {
                        threadDetails = thread;
                    }
                }
            }
            return {
                ...memory,
                source_message: messageDetails,
                thread: threadDetails
            };
        }));
        // Group by memory type for summary
        const memoryByType = enrichedMemories.reduce((acc, memory) => {
            const type = memory.memory_type;
            if (!acc[type])
                acc[type] = [];
            acc[type].push(memory);
            return acc;
        }, {});
        return server_1.NextResponse.json({
            success: true,
            memory_updates: enrichedMemories,
            summary: {
                total_updates: enrichedMemories.length,
                by_type: Object.keys(memoryByType).map(type => ({
                    type,
                    count: memoryByType[type].length,
                    latest_update: memoryByType[type][0]?.last_updated
                }))
            }
        });
    }
    catch (error) {
        console.error('[ADMIN MEMORY] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch memory updates' }, { status: 500 });
    }
}
