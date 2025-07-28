import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Get chat threads for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const siteId = searchParams.get('siteId');
    
    if (!userToken) {
      return NextResponse.json({ error: 'User token required' }, { status: 401 });
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
      return NextResponse.json({ error: 'Failed to fetch chat threads' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      threads: threads || []
    });

  } catch (error) {
    console.error('[CHAT THREADS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat threads' }, 
      { status: 500 }
    );
  }
}

// Create or update a chat thread
export async function POST(request: NextRequest) {
  try {
    const { userToken, siteId, threadId, title, lastMessage } = await request.json();
    
    if (!userToken || !siteId) {
      return NextResponse.json({ error: 'User token and site ID required' }, { status: 400 });
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
        return NextResponse.json({ error: 'Failed to update chat thread' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        thread
      });
    } else {
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
        return NextResponse.json({ error: 'Failed to create chat thread' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        thread
      });
    }

  } catch (error) {
    console.error('[CHAT THREADS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to manage chat thread' }, 
      { status: 500 }
    );
  }
}