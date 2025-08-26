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
    
    // Provide more specific error messages based on error type
    let errorMessage = "I'm experiencing some technical difficulties. Please try again in a moment.";
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = "There's an issue with the AI service configuration. Please contact support.";
      } else if (error.message.includes('rate limit')) {
        errorMessage = "I'm currently handling many requests. Please wait a moment and try again.";
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = "I'm having trouble connecting to my services. Please check your internet connection and try again.";
      }
    }
    
    return NextResponse.json(
      { 
        content: errorMessage,
        functionCall: null
      },
      { status: 200 }
    );
  }
}