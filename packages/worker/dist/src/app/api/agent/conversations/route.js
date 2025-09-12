"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
exports.POST = POST;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
// GET - Retrieve conversation history for a website
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        const websiteToken = searchParams.get('websiteToken');
        const conversationId = searchParams.get('conversationId');
        const limit = parseInt(searchParams.get('limit') || '50');
        const includeSystem = searchParams.get('includeSystem') === 'true';
        if (!userToken || !websiteToken) {
            return server_1.NextResponse.json({ error: 'User token and website token required' }, { status: 400 });
        }
        console.log('[AGENT CONVERSATIONS] Fetching conversations:', {
            userToken,
            websiteToken,
            conversationId,
            limit
        });
        if (conversationId) {
            // Get specific conversation
            let query = supabase
                .from('agent_conversations')
                .select('*')
                .eq('user_token', userToken)
                .eq('website_token', websiteToken)
                .eq('conversation_id', conversationId)
                .order('message_order', { ascending: true });
            if (!includeSystem) {
                query = query.neq('message_role', 'system');
            }
            const { data: messages, error } = await query;
            if (error) {
                // Handle case where table doesn't exist yet
                if (error.code === '42P01') {
                    console.log('[AGENT CONVERSATIONS] Table does not exist yet');
                    return server_1.NextResponse.json({
                        success: true,
                        conversation: null,
                        message: 'Conversation history not available - database migration needed'
                    });
                }
                console.error('[AGENT CONVERSATIONS] Error fetching conversation:', error);
                return server_1.NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
            }
            return server_1.NextResponse.json({
                success: true,
                conversation: {
                    conversation_id: conversationId,
                    website_token: websiteToken,
                    messages: messages || [],
                    message_count: messages?.length || 0
                }
            });
        }
        else {
            // Get all conversation threads for this website
            let query = supabase
                .from('agent_conversations')
                .select(`
          conversation_id,
          website_token,
          created_at,
          message_content,
          message_role,
          message_order
        `)
                .eq('user_token', userToken)
                .eq('website_token', websiteToken)
                .order('created_at', { ascending: false })
                .limit(limit * 10); // Get more messages to group by conversation
            const { data: allMessages, error } = await query;
            if (error) {
                // Handle case where table doesn't exist yet
                if (error.code === '42P01') {
                    console.log('[AGENT CONVERSATIONS] Table does not exist yet');
                    return server_1.NextResponse.json({
                        success: true,
                        conversations: [],
                        message: 'Conversation history not available - database migration needed'
                    });
                }
                console.error('[AGENT CONVERSATIONS] Error fetching conversations:', error);
                return server_1.NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
            }
            // Group messages by conversation_id
            const conversationMap = new Map();
            allMessages?.forEach(msg => {
                if (!conversationMap.has(msg.conversation_id)) {
                    conversationMap.set(msg.conversation_id, {
                        conversation_id: msg.conversation_id,
                        website_token: msg.website_token,
                        messages: [],
                        message_count: 0,
                        started_at: msg.created_at,
                        last_message_at: msg.created_at
                    });
                }
                const conv = conversationMap.get(msg.conversation_id);
                conv.messages.push(msg);
                conv.message_count++;
                conv.last_message_at = msg.created_at;
            });
            // Convert to array and sort by most recent
            const conversations = Array.from(conversationMap.values())
                .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
                .slice(0, limit);
            return server_1.NextResponse.json({
                success: true,
                conversations
            });
        }
    }
    catch (error) {
        console.error('[AGENT CONVERSATIONS] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }
}
// POST - Store new conversation messages
async function POST(request) {
    try {
        const { userToken, websiteToken, conversationId, messages, sessionId } = await request.json();
        if (!userToken || !websiteToken || !messages || !Array.isArray(messages)) {
            return server_1.NextResponse.json({ error: 'User token, website token, and messages array required' }, { status: 400 });
        }
        console.log('[AGENT CONVERSATIONS] Storing conversation messages:', {
            userToken,
            websiteToken,
            conversationId,
            messageCount: messages.length
        });
        // Use provided conversationId or generate new one
        const finalConversationId = conversationId || crypto.randomUUID();
        // Prepare messages for insertion
        const messagesToInsert = messages.map((msg, index) => ({
            user_token: userToken,
            website_token: websiteToken,
            conversation_id: finalConversationId,
            message_role: msg.role,
            message_content: msg.content || '',
            function_call: msg.function_call || null,
            action_card: msg.action_card || null,
            message_order: msg.message_order || (index + 1),
            session_id: sessionId,
            metadata: msg.metadata || {}
        }));
        const { error } = await supabase
            .from('agent_conversations')
            .insert(messagesToInsert);
        if (error) {
            // Handle case where table doesn't exist yet
            if (error.code === '42P01') {
                console.log('[AGENT CONVERSATIONS] Table does not exist yet - storage skipped');
                return server_1.NextResponse.json({
                    success: true,
                    conversation_id: finalConversationId,
                    stored: false,
                    message: 'Conversation stored in memory only - database migration needed'
                });
            }
            console.error('[AGENT CONVERSATIONS] Error storing messages:', error);
            return server_1.NextResponse.json({ error: 'Failed to store conversation messages' }, { status: 500 });
        }
        return server_1.NextResponse.json({
            success: true,
            conversation_id: finalConversationId,
            stored: true,
            message_count: messagesToInsert.length
        });
    }
    catch (error) {
        console.error('[AGENT CONVERSATIONS] Unexpected error storing messages:', error);
        return server_1.NextResponse.json({ error: 'Failed to store conversation messages' }, { status: 500 });
    }
}
// DELETE - Clean up old conversations
async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        const websiteToken = searchParams.get('websiteToken');
        const conversationId = searchParams.get('conversationId');
        const olderThanDays = parseInt(searchParams.get('olderThanDays') || '30');
        if (!userToken || !websiteToken) {
            return server_1.NextResponse.json({ error: 'User token and website token required' }, { status: 400 });
        }
        console.log('[AGENT CONVERSATIONS] Cleaning conversations:', {
            userToken,
            websiteToken,
            conversationId,
            olderThanDays
        });
        let query = supabase
            .from('agent_conversations')
            .delete()
            .eq('user_token', userToken)
            .eq('website_token', websiteToken);
        if (conversationId) {
            // Delete specific conversation
            query = query.eq('conversation_id', conversationId);
        }
        else {
            // Delete old conversations
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
            query = query.lt('created_at', cutoffDate.toISOString());
        }
        const { count, error } = await query;
        if (error) {
            if (error.code === '42P01') {
                console.log('[AGENT CONVERSATIONS] Table does not exist yet');
                return server_1.NextResponse.json({
                    success: true,
                    deleted_count: 0,
                    message: 'No conversations to delete - table not found'
                });
            }
            console.error('[AGENT CONVERSATIONS] Error deleting conversations:', error);
            return server_1.NextResponse.json({ error: 'Failed to delete conversations' }, { status: 500 });
        }
        return server_1.NextResponse.json({
            success: true,
            deleted_count: count || 0
        });
    }
    catch (error) {
        console.error('[AGENT CONVERSATIONS] Unexpected error deleting conversations:', error);
        return server_1.NextResponse.json({ error: 'Failed to delete conversations' }, { status: 500 });
    }
}
