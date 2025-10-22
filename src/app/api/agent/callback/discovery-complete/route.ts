/**
 * POST /api/agent/callback/discovery-complete
 *
 * Callback endpoint triggered after strategy discovery + brief generation completes
 * Sends a follow-up message to the chat thread with correct brief counts and action card
 *
 * Body:
 * {
 *   userToken: string
 *   websiteToken: string
 *   conversationId: string
 *   discoveryId: number
 *   summary: {
 *     clusters: number
 *     briefsGenerated: number
 *     pillarBriefs: number
 *     supportingBriefs: number
 *   }
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
      discoveryId,
      summary
    } = await request.json();

    if (!userToken || !websiteToken || !conversationId || !discoveryId || !summary) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log('[DISCOVERY CALLBACK] Sending follow-up message:', {
      conversationId,
      discoveryId,
      briefsGenerated: summary.briefsGenerated
    });

    // Get last message (should be the progress card)
    const { data: lastMessage } = await supabase
      .from('agent_conversations')
      .select('*')
      .eq('user_token', userToken)
      .eq('website_token', websiteToken)
      .eq('conversation_id', conversationId)
      .order('message_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Update the progress card to show completion
    if (lastMessage && lastMessage.action_card?.type === 'progress') {
      console.log('[DISCOVERY CALLBACK] Updating progress card to completed');
      await supabase
        .from('agent_conversations')
        .update({
          action_card: {
            type: 'progress',
            data: {
              ...lastMessage.action_card.data,
              progress: 100,
              status: 'completed',
              currentStep: 'Brief generation complete',
              currentStepIndex: 2
            }
          }
        })
        .eq('id', lastMessage.id);
    }

    const nextMessageOrder = (lastMessage?.message_order || 0) + 1;

    // Build follow-up message
    const message = `✅ **Strategy Initialization Complete!**

📊 **Summary:**
- Created ${summary.clusters} topic clusters
- Generated ${summary.briefsGenerated} article briefs
  - ${summary.pillarBriefs} pillar articles
  - ${summary.supportingBriefs} supporting articles

📝 Your article briefs are ready to schedule for generation in the Content tab!`;

    // Build action card (wrap in data object to match ChatInterface expectations)
    const actionCard = {
      type: 'content-ready',
      data: {
        briefsGenerated: summary.briefsGenerated,
        pillarBriefs: summary.pillarBriefs,
        supportingBriefs: summary.supportingBriefs,
        websiteToken: websiteToken
      }
    };

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
          callback_type: 'discovery_complete',
          discovery_id: discoveryId,
          timestamp: new Date().toISOString()
        }
      });

    if (insertError) {
      console.error('[DISCOVERY CALLBACK] Error storing message:', insertError);
      return NextResponse.json(
        { error: 'Failed to store follow-up message' },
        { status: 500 }
      );
    }

    console.log('[DISCOVERY CALLBACK] Follow-up message sent successfully');

    return NextResponse.json({
      success: true,
      conversationId,
      messageOrder: nextMessageOrder
    });

  } catch (error) {
    console.error('[DISCOVERY CALLBACK] Error:', error);
    return NextResponse.json(
      {
        error: 'Callback failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
