import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log('[CONVERSATION DEBUG] Testing agent_conversations table...');
    
    // Test if agent_conversations table exists and is accessible
    const { data: tableTest, error: tableError } = await supabase
      .from('agent_conversations')
      .select('id')
      .limit(1);
    
    if (tableError) {
      console.error('[CONVERSATION DEBUG] Table access error:', tableError);
      return NextResponse.json({
        success: false,
        error: 'agent_conversations table not accessible',
        details: tableError,
        tableExists: false
      });
    }
    
    console.log('[CONVERSATION DEBUG] Table accessible, found records:', tableTest?.length || 0);
    
    // Try to create a test conversation entry
    const testConversationId = crypto.randomUUID();
    const testUserToken = 'test-user-token';
    const testWebsiteToken = 'test-website-token';
    
    const { data: insertResult, error: insertError } = await supabase
      .from('agent_conversations')
      .insert({
        user_token: testUserToken,
        website_token: testWebsiteToken,
        conversation_id: testConversationId,
        message_role: 'user',
        message_content: 'Test conversation message',
        message_order: 1
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('[CONVERSATION DEBUG] Insert test failed:', insertError);
      return NextResponse.json({
        success: false,
        error: 'Failed to insert test conversation',
        details: insertError,
        tableExists: true,
        insertable: false
      });
    }
    
    console.log('[CONVERSATION DEBUG] Test conversation inserted:', insertResult.id);
    
    // Try to retrieve the test conversation
    const { data: retrieveResult, error: retrieveError } = await supabase
      .from('agent_conversations')
      .select('*')
      .eq('conversation_id', testConversationId)
      .single();
    
    if (retrieveError) {
      console.error('[CONVERSATION DEBUG] Retrieve test failed:', retrieveError);
      return NextResponse.json({
        success: false,
        error: 'Failed to retrieve test conversation',
        details: retrieveError,
        tableExists: true,
        insertable: true,
        retrievable: false
      });
    }
    
    console.log('[CONVERSATION DEBUG] Test conversation retrieved:', retrieveResult.id);
    
    // Clean up test data
    await supabase
      .from('agent_conversations')
      .delete()
      .eq('conversation_id', testConversationId);
    
    // Get some sample recent conversations for diagnosis
    const { data: recentConversations, error: recentError } = await supabase
      .from('agent_conversations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    return NextResponse.json({
      success: true,
      message: 'agent_conversations table is fully functional',
      tableExists: true,
      insertable: true,
      retrievable: true,
      testConversationId,
      recentConversationsCount: recentConversations?.length || 0,
      recentConversations: recentConversations || []
    });
    
  } catch (error) {
    console.error('[CONVERSATION DEBUG] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error testing conversations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userToken, websiteToken } = await request.json();
    
    if (!userToken || !websiteToken) {
      return NextResponse.json(
        { error: 'userToken and websiteToken required' },
        { status: 400 }
      );
    }
    
    console.log('[CONVERSATION DEBUG] Testing conversation storage for:', { userToken, websiteToken });
    
    // Test conversation storage for a specific user/website
    const testConversationId = crypto.randomUUID();
    
    const testMessages = [
      {
        message_role: 'user',
        message_content: 'Test user message for conversation persistence',
        message_order: 1
      },
      {
        message_role: 'assistant', 
        message_content: 'Test assistant response for conversation persistence',
        message_order: 2
      }
    ];
    
    // Insert test messages
    const messagesToInsert = testMessages.map(msg => ({
      user_token: userToken,
      website_token: websiteToken,
      conversation_id: testConversationId,
      ...msg
    }));
    
    const { data: insertResult, error: insertError } = await supabase
      .from('agent_conversations')
      .insert(messagesToInsert)
      .select();
    
    if (insertError) {
      console.error('[CONVERSATION DEBUG] Failed to store test messages:', insertError);
      return NextResponse.json({
        success: false,
        error: 'Failed to store test conversation',
        details: insertError
      });
    }
    
    // Try to retrieve the conversation
    const { data: retrieveResult, error: retrieveError } = await supabase
      .from('agent_conversations')
      .select('*')
      .eq('user_token', userToken)
      .eq('website_token', websiteToken)
      .eq('conversation_id', testConversationId)
      .order('message_order', { ascending: true });
    
    if (retrieveError) {
      console.error('[CONVERSATION DEBUG] Failed to retrieve test conversation:', retrieveError);
      return NextResponse.json({
        success: false,
        error: 'Failed to retrieve test conversation',
        details: retrieveError
      });
    }
    
    // Clean up test data
    await supabase
      .from('agent_conversations')
      .delete()
      .eq('conversation_id', testConversationId);
    
    return NextResponse.json({
      success: true,
      message: 'Conversation storage working correctly',
      testConversationId,
      messagesStored: insertResult?.length || 0,
      messagesRetrieved: retrieveResult?.length || 0,
      conversationData: retrieveResult
    });
    
  } catch (error) {
    console.error('[CONVERSATION DEBUG] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error testing user conversation storage',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}