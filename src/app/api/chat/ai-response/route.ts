import { NextRequest, NextResponse } from 'next/server';
import { OpenAIFunctionClient } from '@/services/chat/openai-function-client';

export async function POST(request: NextRequest) {
  try {
    const { userToken, message, chatContext } = await request.json();

    if (!userToken || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get OpenAI API key from server environment
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { 
          content: "I'm currently unable to process AI requests. Please contact support if this issue persists.",
          functionCall: null
        },
        { status: 200 }
      );
    }

    // Create OpenAI client and send message with memory context
    const openaiClient = new OpenAIFunctionClient(apiKey);
    
    // Add userToken to chat context for memory access
    const contextWithMemory = {
      ...chatContext,
      userToken
    };
    
    const response = await openaiClient.sendMessage(message, contextWithMemory);

    return NextResponse.json({
      content: response.content,
      functionCall: response.functionCall
    });

  } catch (error) {
    console.error('[AI RESPONSE API] Error:', error);
    return NextResponse.json(
      { 
        content: "I'm experiencing some technical difficulties. Please try again in a moment.",
        functionCall: null
      },
      { status: 200 }
    );
  }
}