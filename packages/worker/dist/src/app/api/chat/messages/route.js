"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const conversation_analyzer_1 = require("@/services/agent/conversation-analyzer");
const agent_memory_1 = require("@/services/agent/agent-memory");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
// Get messages for a thread
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        const threadId = searchParams.get('threadId');
        if (!userToken || !threadId) {
            return server_1.NextResponse.json({ error: 'User token and thread ID required' }, { status: 400 });
        }
        const { data: messages, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('user_token', userToken)
            .eq('thread_id', threadId)
            .order('created_at', { ascending: true });
        if (error) {
            console.error('[CHAT MESSAGES] Error fetching messages:', error);
            return server_1.NextResponse.json({ error: 'Failed to fetch chat messages' }, { status: 500 });
        }
        return server_1.NextResponse.json({
            success: true,
            messages: messages || []
        });
    }
    catch (error) {
        console.error('[CHAT MESSAGES] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch chat messages' }, { status: 500 });
    }
}
// Add a message to a thread
async function POST(request) {
    try {
        const { userToken, threadId, type, content, functionCall, metadata } = await request.json();
        if (!userToken || !threadId || !type || !content) {
            return server_1.NextResponse.json({
                error: 'User token, thread ID, type, and content required'
            }, { status: 400 });
        }
        const { data: message, error } = await supabase
            .from('chat_messages')
            .insert({
            user_token: userToken,
            thread_id: threadId,
            message_type: type,
            content,
            function_call: functionCall || null,
            metadata: metadata || null,
            created_at: new Date().toISOString()
        })
            .select()
            .single();
        if (error) {
            console.error('[CHAT MESSAGES] Error creating message:', error);
            return server_1.NextResponse.json({ error: 'Failed to create chat message' }, { status: 500 });
        }
        // Trigger conversation analysis for user messages
        if (type === 'user') {
            try {
                // Get website token from thread
                const { data: thread } = await supabase
                    .from('chat_threads')
                    .select('site_id')
                    .eq('id', threadId)
                    .eq('user_token', userToken)
                    .single();
                if (thread?.site_id) {
                    // Get recent messages for analysis context
                    const { data: recentMessages } = await supabase
                        .from('chat_messages')
                        .select('*')
                        .eq('user_token', userToken)
                        .eq('thread_id', threadId)
                        .order('created_at', { ascending: true })
                        .limit(20);
                    if (recentMessages && recentMessages.length > 1) {
                        // Initialize conversation analyzer
                        const agentMemory = new agent_memory_1.AgentMemory(thread.site_id, userToken);
                        const analyzer = new conversation_analyzer_1.ConversationAnalyzer(thread.site_id, userToken, agentMemory);
                        // Analyze conversation asynchronously (don't block response)
                        analyzer.analyzeAndUpdateMemory(recentMessages)
                            .then(result => {
                            if (result.appliedCount > 0) {
                                console.log(`[CONVERSATION ANALYZER] Applied ${result.appliedCount} insights from conversation analysis`);
                            }
                        })
                            .catch(error => {
                            console.error('[CONVERSATION ANALYZER] Background analysis error:', error);
                        });
                    }
                }
            }
            catch (analysisError) {
                // Don't fail the message creation if analysis fails
                console.error('[CONVERSATION ANALYZER] Error during conversation analysis:', analysisError);
            }
        }
        return server_1.NextResponse.json({
            success: true,
            message
        });
    }
    catch (error) {
        console.error('[CHAT MESSAGES] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Failed to create chat message' }, { status: 500 });
    }
}
