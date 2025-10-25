import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const userToken = searchParams.get('userToken');

    if (!conversationId || !userToken) {
      return NextResponse.json(
        { success: false, error: 'conversationId and userToken required' },
        { status: 400 }
      );
    }

    // Query agent_conversations table for this conversation
    const { data, error } = await supabase
      .from('agent_conversations')
      .select('website_token')
      .eq('conversation_id', conversationId)
      .eq('user_token', userToken)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      console.log('[CONVERSATION WEBSITE] Conversation not found:', error);
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

    console.log('[CONVERSATION WEBSITE] Resolved websiteToken from conversation:', conversationId);
    return NextResponse.json({
      success: true,
      websiteToken: data.website_token
    });

  } catch (error) {
    console.error('[CONVERSATION WEBSITE] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
