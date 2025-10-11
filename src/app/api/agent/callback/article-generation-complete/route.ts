/**
 * POST /api/agent/callback/article-generation-complete
 *
 * Callback endpoint triggered after article generation completes
 * Sends a follow-up message to the chat thread with status and preview link
 *
 * Body:
 * {
 *   userToken: string
 *   websiteToken: string
 *   conversationId: string
 *   articleId: number
 *   title: string
 *   wordCount: number
 *   status: 'generated' | 'failed'
 *   errorMessage?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const {
      userToken,
      websiteToken,
      conversationId,
      articleId,
      title,
      wordCount,
      status,
      errorMessage
    } = await request.json();

    if (!userToken || !websiteToken || !conversationId || !articleId || !title || !status) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log('[ARTICLE GENERATION CALLBACK] Sending follow-up message:', {
      conversationId,
      articleId,
      status
    });

    // Get next message order
    const { data: lastMessage } = await supabase
      .from('agent_conversations')
      .select('message_order')
      .eq('user_token', userToken)
      .eq('website_token', websiteToken)
      .eq('conversation_id', conversationId)
      .order('message_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextMessageOrder = (lastMessage?.message_order || 0) + 1;

    // Build follow-up message based on status
    let message: string;
    let actionCard: any = null;

    if (status === 'generated') {
      message = `✅ **Article Generation Complete!**

📝 **"${title}"**
${wordCount ? `- ${wordCount.toLocaleString()} words` : ''}

Your article is ready to review in the Content tab. You can preview it, edit it, or schedule it for publication.`;

      actionCard = {
        type: 'article-ready',
        articleId,
        title,
        wordCount,
        websiteToken
      };
    } else {
      // Failed
      message = `❌ **Article Generation Failed**

📝 **"${title}"**

${errorMessage || 'An error occurred during generation. Please try again.'}`;

      actionCard = {
        type: 'article-failed',
        articleId,
        title,
        errorMessage: errorMessage || 'Unknown error',
        websiteToken
      };
    }

    // Store follow-up message
    const { error: insertError } = await supabase
      .from('agent_conversations')
      .insert({
        user_token: userToken,
        website_token: websiteToken,
        conversation_id: conversationId,
        message_role: 'assistant',
        message_content: message,
        action_card: actionCard,
        message_order: nextMessageOrder,
        metadata: {
          callback_type: 'article_generation_complete',
          article_id: articleId,
          status,
          timestamp: new Date().toISOString()
        }
      });

    if (insertError) {
      console.error('[ARTICLE GENERATION CALLBACK] Error storing message:', insertError);
      return NextResponse.json(
        { error: 'Failed to store follow-up message' },
        { status: 500 }
      );
    }

    console.log('[ARTICLE GENERATION CALLBACK] Follow-up message sent successfully');

    return NextResponse.json({
      success: true,
      conversationId,
      messageOrder: nextMessageOrder
    });

  } catch (error) {
    console.error('[ARTICLE GENERATION CALLBACK] Error:', error);
    return NextResponse.json(
      {
        error: 'Callback failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
