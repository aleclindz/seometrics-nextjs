import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Get messages for a thread
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const threadId = searchParams.get('threadId');
    
    if (!userToken || !threadId) {
      return NextResponse.json({ error: 'User token and thread ID required' }, { status: 400 });
    }

    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_token', userToken)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[CHAT MESSAGES] Error fetching messages:', error);
      return NextResponse.json({ error: 'Failed to fetch chat messages' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messages: messages || []
    });

  } catch (error) {
    console.error('[CHAT MESSAGES] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat messages' }, 
      { status: 500 }
    );
  }
}

// Add a message to a thread
export async function POST(request: NextRequest) {
  try {
    const { 
      userToken, 
      threadId, 
      type, 
      content, 
      functionCall,
      metadata 
    } = await request.json();
    
    if (!userToken || !threadId || !type || !content) {
      return NextResponse.json({ 
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
      return NextResponse.json({ error: 'Failed to create chat message' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message
    });

  } catch (error) {
    console.error('[CHAT MESSAGES] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to create chat message' }, 
      { status: 500 }
    );
  }
}