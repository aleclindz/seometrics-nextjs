import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { FunctionCaller } from '@/services/chat/function-caller';
import { getFunctionSchemas, validateFunctionArgs, getAvailableToolsForSetup } from '@/services/chat/function-schemas';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY! 
});

const functionCaller = new FunctionCaller();

interface LLMRequest {
  systemPrompt: string;
  history: Array<{
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    tool_calls?: any[];
    tool_call_id?: string;
  }>;
  userMessage: string;
  userToken: string;
  siteUrl?: string;
  availableTools?: string[]; // Dynamic tool filtering
}

// Model routing based on task type
function pickModel(toolName?: string): string {
  if (!toolName) return 'gpt-4o-mini'; // Default for planning/chat
  
  // Longform content generation needs quality
  if (['generate_article', 'create_content_strategy'].includes(toolName)) {
    return 'gpt-4o';
  }
  
  // Everything else can use mini
  return 'gpt-4o-mini';
}

// Helper to estimate token count (simplified)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4); // Rough approximation
}

// Trim history to stay under token limits
function trimHistory(history: any[], maxTokens: number = 8000): any[] {
  let totalTokens = 0;
  const trimmed = [];
  
  // Keep messages from newest to oldest until we hit the limit
  for (let i = history.length - 1; i >= 0; i--) {
    const message = history[i];
    const messageTokens = estimateTokens(JSON.stringify(message));
    
    if (totalTokens + messageTokens > maxTokens) {
      break;
    }
    
    totalTokens += messageTokens;
    trimmed.unshift(message);
  }
  
  return trimmed;
}

export async function POST(request: NextRequest) {
  try {
    const { 
      systemPrompt, 
      history, 
      userMessage, 
      userToken, 
      siteUrl,
      availableTools = [] 
    }: LLMRequest = await request.json();

    if (!userToken || !userMessage) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Trim history to prevent context overflow
    const trimmedHistory = trimHistory(history, 6000);
    
    // Build messages array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...trimmedHistory,
      { role: 'user', content: userMessage }
    ];

    // Get available function schemas with dynamic filtering
    const filteredSchemas = availableTools.length > 0 
      ? getFunctionSchemas({ functionNames: availableTools })
      : getFunctionSchemas();

    let toolResults: Record<string, any> = {};
    let guard = 0;
    const MAX_TOOL_STEPS = 5;
    const startTime = Date.now();
    const MAX_RUNTIME_MS = 30000; // 30 seconds

    // Multi-turn tool execution loop
    while (guard++ < MAX_TOOL_STEPS) {
      // Check runtime limit
      if (Date.now() - startTime > MAX_RUNTIME_MS) {
        console.warn('[LLM] Runtime limit exceeded');
        break;
      }

      // Determine model based on expected tool usage
      const expectedTool = guard === 1 ? predictLikelyTool(userMessage, filteredSchemas) : undefined;
      const model = pickModel(expectedTool);

      const response = await openai.chat.completions.create({
        model,
        messages,
        tools: filteredSchemas.map(func => ({
          type: 'function' as const,
          function: func
        })),
        tool_choice: 'auto',
        temperature: 0.3, // Lower for tool accuracy
        max_tokens: 1200,
        timeout: 15000 // 15 second timeout
      });

      const choice = response.choices[0];
      const messageContent = choice.message;

      // If no tool calls, we're done
      if (!messageContent.tool_calls?.length) {
        return NextResponse.json({
          success: true,
          content: messageContent.content || 'Done.',
          toolResults,
          steps: guard - 1,
          model
        });
      }

      // Execute all tool calls in parallel
      await Promise.all(messageContent.tool_calls.map(async (toolCall) => {
        if (toolCall.type !== 'function') return;
        
        const functionName = toolCall.function.name;
        let functionArgs: any;
        
        try {
          functionArgs = JSON.parse(toolCall.function.arguments || '{}');
        } catch (error) {
          console.error('[LLM] Invalid function arguments JSON:', error);
          toolResults[toolCall.id] = { 
            success: false, 
            error: 'Invalid function arguments format' 
          };
          return;
        }

        // Validate arguments with Zod
        const validation = validateFunctionArgs(functionName, functionArgs);
        if (!validation.success) {
          console.error('[LLM] Argument validation failed:', validation.error);
          toolResults[toolCall.id] = { 
            success: false, 
            error: `Validation error: ${validation.error}` 
          };
          return;
        }
        
        functionArgs = validation.data;

        // Validate site ownership for security
        if (functionArgs.site_url && siteUrl) {
          const normalizedArg = normalizeSiteUrl(functionArgs.site_url);
          const normalizedSite = normalizeSiteUrl(siteUrl);
          
          if (normalizedArg !== normalizedSite) {
            console.error('[LLM] Site URL mismatch - potential security issue');
            toolResults[toolCall.id] = { 
              success: false, 
              error: 'Unauthorized site access' 
            };
            return;
          }
        }

        const executionStart = Date.now();
        
        try {
          const result = await functionCaller.executeFunction(functionName, functionArgs);
          const executionTime = Date.now() - executionStart;
          
          toolResults[toolCall.id] = result;
          
          // Log for observability
          console.log(`[LLM] Tool executed: ${functionName} in ${executionTime}ms`, {
            success: result.success,
            argsHash: hashArgs(functionArgs)
          });

          // Record activity asynchronously (non-blocking)
          recordFunctionCallSafely(userToken, functionName, functionArgs, result, siteUrl);
          
        } catch (error) {
          console.error(`[LLM] Tool execution failed: ${functionName}`, error);
          toolResults[toolCall.id] = { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }

        // Add tool result to messages
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResults[toolCall.id])
        } as any);
      }));

      // Add the assistant message that made the tool calls
      messages.push({
        role: 'assistant',
        content: messageContent.content || '',
        tool_calls: messageContent.tool_calls
      } as any);
    }

    return NextResponse.json({
      success: true,
      content: 'Completed after maximum tool steps.',
      toolResults,
      steps: guard - 1
    });

  } catch (error) {
    console.error('[LLM] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'LLM processing failed'
    }, { status: 500 });
  }
}

// Helper functions
function normalizeSiteUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').toLowerCase();
}

function hashArgs(args: any): string {
  return Buffer.from(JSON.stringify(args)).toString('base64').slice(0, 8);
}

function predictLikelyTool(userMessage: string, schemas: any[]): string | undefined {
  const msg = userMessage.toLowerCase();
  
  if (msg.includes('generate') && msg.includes('article')) return 'generate_article';
  if (msg.includes('connect') && msg.includes('gsc')) return 'connect_gsc';
  if (msg.includes('sync') || msg.includes('update')) return 'sync_gsc_data';
  if (msg.includes('audit') || msg.includes('check')) return 'audit_site';
  
  return undefined;
}

async function recordFunctionCallSafely(
  userToken: string, 
  functionName: string, 
  args: any, 
  result: any, 
  siteUrl?: string
) {
  try {
    // Call our activity recording endpoint instead of direct DB access
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/agent/record-activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userToken,
        functionName,
        args,
        result,
        siteUrl
      })
    });
  } catch (error) {
    console.error('[LLM] Failed to record activity:', error);
  }
}

// Function schemas are now imported from shared location