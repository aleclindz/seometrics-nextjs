import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { FunctionCaller } from '@/services/chat/function-caller';
import { getFunctionSchemas, validateFunctionArgs } from '@/services/chat/function-schemas';

export async function POST(request: NextRequest) {
  try {
    const { message, userToken, selectedSite, conversationHistory } = await request.json();

    if (!userToken || !message) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: userToken and message are required' 
        },
        { status: 400 }
      );
    }

    // Get OpenAI API key from server environment
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Fallback response for testing when OpenAI key is not available
      const testResponse = getTestResponse(message);
      
      // Record activity for test responses too
      if (testResponse.functionCall) {
        await recordActivity(userToken, selectedSite || '', testResponse.functionCall, testResponse.actionCard);
      }
      
      return NextResponse.json({
        success: true,
        message: testResponse.message,
        functionCall: testResponse.functionCall,
        actionCard: testResponse.actionCard
      });
    }

    // Get OpenAI API key from environment
    if (!apiKey) {
      // Fallback to test responses when OpenAI key is not available
      const testResponse = getTestResponse(message);
      
      // Record activity for test responses too
      if (testResponse.functionCall) {
        await recordActivity(userToken, selectedSite || '', testResponse.functionCall, testResponse.actionCard);
      }
      
      return NextResponse.json({
        success: true,
        message: testResponse.message,
        functionCall: testResponse.functionCall,
        actionCard: testResponse.actionCard
      });
    }

    // Create OpenAI client (server-side only)
    const openai = new OpenAI({ apiKey });
    const functionCaller = new FunctionCaller(userToken);

    // Build system prompt
    const systemPrompt = await buildSystemPrompt(userToken, selectedSite);
    
    // Build messages array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory?.slice(-10) || []),
      { role: 'user', content: message }
    ];

    // Get function schemas
    const functionSchemas = getFunctionSchemas();

    // Multi-turn tool execution loop
    let toolResults: Record<string, any> = {};
    let guard = 0;
    const MAX_TOOL_STEPS = 3; // Reduced for chat responsiveness

    while (guard++ < MAX_TOOL_STEPS) {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Use mini for faster chat responses
        messages,
        tools: functionSchemas.map(func => ({
          type: 'function' as const,
          function: func
        })),
        tool_choice: 'auto',
        temperature: 0.4,
        max_tokens: 800
      });

      const choice = response.choices[0];
      const messageContent = choice.message;

      // If no tool calls, we're done
      if (!messageContent.tool_calls?.length) {
        const finalResponse = {
          content: messageContent.content || 'I can help you with SEO tasks. What would you like me to do?',
          toolResults,
          steps: guard - 1
        };
        
        // Process the response
        const processedResponse = await processOpenAIResponse(finalResponse, userToken, selectedSite);
        return NextResponse.json(processedResponse);
      }

      // Execute all tool calls
      await Promise.all(messageContent.tool_calls.map(async (toolCall) => {
        if (toolCall.type !== 'function') return;
        
        const functionName = toolCall.function.name;
        let functionArgs: any;
        
        try {
          functionArgs = JSON.parse(toolCall.function.arguments || '{}');
        } catch (error) {
          console.error('[AGENT CHAT] Invalid function arguments:', error);
          toolResults[toolCall.id] = { 
            success: false, 
            error: 'Invalid function arguments' 
          };
          return;
        }

        // Validate arguments
        const validation = validateFunctionArgs(functionName, functionArgs);
        if (!validation.success) {
          console.error('[AGENT CHAT] Argument validation failed:', validation.error);
          toolResults[toolCall.id] = { 
            success: false, 
            error: validation.error 
          };
          return;
        }
        
        functionArgs = validation.data;

        // Execute the function
        try {
          const result = await functionCaller.executeFunction(functionName, functionArgs);
          toolResults[toolCall.id] = result;
          
          console.log(`[AGENT CHAT] Executed ${functionName}:`, result.success);
        } catch (error) {
          console.error(`[AGENT CHAT] Function execution failed:`, error);
          toolResults[toolCall.id] = { 
            success: false, 
            error: error instanceof Error ? error.message : 'Execution failed' 
          };
        }

        // Add tool result to messages
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResults[toolCall.id])
        } as any);
      }));

      // Add the assistant message
      messages.push({
        role: 'assistant',
        content: messageContent.content || '',
        tool_calls: messageContent.tool_calls
      } as any);
    }

    // Final response after max steps
    const finalResponse = {
      content: "I've completed several SEO tasks for you. How else can I help?",
      toolResults,
      steps: guard - 1
    };

    const processedResponse = await processOpenAIResponse(finalResponse, userToken, selectedSite);
    return NextResponse.json(processedResponse);

  } catch (error) {
    console.error('[AGENT CHAT API] Error:', error);
    
    // Provide detailed error messages for debugging
    let errorMessage = "I'm experiencing technical difficulties.";
    let debugInfo = "";
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid \'tools[0].function.name\'')) {
        errorMessage = "There's an issue with my function definitions. I've detected invalid function names that need to be fixed.";
        debugInfo = "Function name validation error - check for invalid characters in tool names.";
      } else if (error.message.includes('API key')) {
        errorMessage = "There's an issue with the AI service configuration. Please contact support.";
        debugInfo = "OpenAI API key issue";
      } else if (error.message.includes('rate limit')) {
        errorMessage = "I'm currently handling many requests. Please wait a moment and try again.";
        debugInfo = "OpenAI rate limit exceeded";
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = "I'm having trouble connecting to my services. Please check your internet connection and try again.";
        debugInfo = "Network connectivity issue";
      } else if (error.message.includes('Property not found')) {
        errorMessage = "I couldn't access your Google Search Console data. Please check your GSC connection in settings.";
        debugInfo = "GSC property access denied";
      } else {
        // Include specific error details for debugging
        errorMessage = `I encountered an error: ${error.message.substring(0, 200)}`;
        debugInfo = error.message;
      }
    }
    
    // Log detailed error for debugging
    console.error('[AGENT CHAT API] Detailed error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      debugInfo
    });
    
    return NextResponse.json({
      success: true,
      message: errorMessage,
      functionCall: null,
      actionCard: null,
      debugInfo: process.env.NODE_ENV === 'development' ? debugInfo : undefined
    });
  }
}

// Test response function for when OpenAI API is not available
function getTestResponse(message: string) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return {
      message: `👋 **Hello there!** 

I'm your SEO Agent for this website. I can help you with:

**🔍 Technical SEO** - Scan for issues, fix meta tags, optimize sitemaps
**📝 Content Strategy** - Generate blog topics, analyze keywords, create content
**📊 Performance Analysis** - Check GSC data, monitor rankings, track improvements
**🤖 Automation** - Set up monitoring, schedule tasks, create workflows

Try asking me something like:
• *"Scan my website for SEO issues"*
• *"Generate 5 blog topic ideas"*
• *"Show me my recent performance data"*

What would you like to work on?`,
      functionCall: null,
      actionCard: null
    };
  }
  
  if (lowerMessage.includes('scan') || lowerMessage.includes('technical') || lowerMessage.includes('seo') || lowerMessage.includes('issues')) {
    return {
      message: `🔍 **Starting Technical SEO Scan**

I'm analyzing your website for technical SEO issues. This includes checking:

• Meta tags and titles
• Schema markup
• Internal linking structure  
• Core Web Vitals
• Mobile optimization
• Sitemap validation

I'll show you exactly what I find and can auto-fix many common issues.`,
      functionCall: {
        name: 'technical_seo_scan',
        arguments: { site_url: 'test-site' },
        result: { success: true, issues_found: 3 }
      },
      actionCard: {
        type: 'progress',
        data: {
          title: 'Website SEO Scan',
          description: 'Scanning your website for technical SEO opportunities',
          progress: 45,
          status: 'running',
          estimatedTime: '1-2 minutes',
          currentStep: 'Analyzing page meta tags and structure',
          totalSteps: 4,
          currentStepIndex: 2
        }
      }
    };
  }
  
  if (lowerMessage.includes('content') || lowerMessage.includes('blog') || lowerMessage.includes('topic') || lowerMessage.includes('ideas')) {
    return {
      message: `✨ **Content Strategy Analysis**

Based on your website's niche and current content, I've identified some high-opportunity topics:

These suggestions are based on search volume, competition analysis, and content gaps in your current strategy.`,
      functionCall: {
        name: 'generate_content_ideas',
        arguments: { site_url: 'test-site', count: 5 },
        result: { success: true, ideas_generated: 5 }
      },
      actionCard: {
        type: 'content-suggestion',
        data: {
          title: 'High-Value Content Opportunity',
          description: 'Create comprehensive guide on email marketing automation',
          keywords: ['email marketing automation', 'marketing workflows', 'email sequences'],
          searchVolume: 8100,
          difficulty: 42,
          intent: 'informational',
          estimatedTraffic: 2400
        }
      }
    };
  }
  
  if (lowerMessage.includes('performance') || lowerMessage.includes('analytics') || lowerMessage.includes('data') || lowerMessage.includes('gsc')) {
    return {
      message: `📊 **Performance Summary**

Here's your recent SEO performance data:

**Last 28 Days:**
• Impressions: 45,200 (+12%)  
• Clicks: 3,180 (+8%)
• Average Position: 8.4 (↑2 positions)
• CTR: 7.0% (+0.3%)

**Top Performing Pages:**
1. /blog/email-marketing-guide - 1,240 clicks
2. /resources/seo-checklist - 890 clicks
3. /blog/content-strategy - 567 clicks

Your technical SEO improvements are showing positive results!`,
      functionCall: {
        name: 'get_performance_summary',
        arguments: { site_url: 'test-site', period: '28d' },
        result: { success: true, data_retrieved: true }
      },
      actionCard: null
    };
  }
  
  // Default response
  return {
    message: `I heard you say: "${message}"

I'm your SEO Agent and I'm here to help! I can assist with:

🔍 **Technical SEO** - *"Scan my website for issues"*
📝 **Content Strategy** - *"Generate blog topic ideas"*  
📊 **Performance Analysis** - *"Show me my GSC data"*
🤖 **SEO Automation** - *"Set up monitoring for my site"*

What specific SEO task would you like help with?`,
    functionCall: null,
    actionCard: null
  };
}

// Record activity in the agent system
async function recordActivity(userToken: string, siteUrl: string, functionCall: any, actionCard: any) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Record an agent event
    const eventData = {
      title: functionCall.name.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      description: getDescriptionForFunction(functionCall.name),
      functionCall: functionCall,
      actionCard: actionCard
    };

    const { error: eventError } = await supabase
      .from('agent_events')
      .insert({
        user_token: userToken,
        event_type: 'chat_function_executed',
        entity_type: 'chat_interaction',
        entity_id: crypto.randomUUID(),
        event_data: eventData,
        new_state: 'completed',
        triggered_by: 'user_chat',
        metadata: {
          site_url: siteUrl,
          function_name: functionCall.name,
          has_action_card: !!actionCard
        }
      });

    if (eventError) {
      console.error('[AGENT CHAT] Error recording activity:', eventError);
    } else {
      console.log('[AGENT CHAT] Activity recorded successfully');
    }

    // If this represents a completed action, also create an agent_idea
    if (functionCall.name.includes('scan') || functionCall.name.includes('generate') || functionCall.name.includes('analyze')) {
      const { error: ideaError } = await supabase
        .from('agent_ideas')
        .insert({
          user_token: userToken,
          site_url: siteUrl,
          title: eventData.title,
          hypothesis: eventData.description,
          evidence: { 
            source: 'chat_interaction',
            user_request: functionCall.name,
            confidence: 80 
          },
          ice_score: 75,
          status: 'open',
          priority: 60,
          estimated_effort: 'medium',
          tags: [functionCall.name.split('_')[0], 'chat_generated']
        });

      if (ideaError) {
        console.error('[AGENT CHAT] Error creating idea:', ideaError);
      }
    }

  } catch (error) {
    console.error('[AGENT CHAT] Error in recordActivity:', error);
  }
}

function getDescriptionForFunction(functionName: string): string {
  switch (functionName) {
    case 'technical_seo_scan':
      return 'Initiated comprehensive technical SEO analysis of website';
    case 'generate_content_ideas':
      return 'Generated content strategy recommendations based on SEO analysis';
    case 'get_performance_summary':
      return 'Retrieved and analyzed website performance data from Google Search Console';
    case 'create_idea':
      return 'Created new SEO improvement opportunity';
    case 'run_action':
      return 'Executed automated SEO optimization task';
    default:
      return `Executed ${functionName.replace(/_/g, ' ')} operation`;
  }
}

// Process OpenAI response and generate action cards
async function processOpenAIResponse(response: any, userToken: string, selectedSite: string) {
  let actionCard = null;
  let functionCall = null;
  
  // Check if we have tool results to process
  if (response.toolResults && Object.keys(response.toolResults).length > 0) {
    // Create a function call representation from the first tool result
    const firstToolResult = Object.values(response.toolResults)[0] as any;
    functionCall = {
      name: 'executed_function',
      arguments: {},
      result: firstToolResult
    };
    
    // Generate action card based on the tool result
    if (firstToolResult.success) {
      actionCard = {
        type: 'technical-fix',
        data: {
          title: 'SEO Function Executed',
          description: 'AI agent successfully executed an SEO operation',
          status: 'completed',
          affectedPages: 1,
          links: [
            { label: 'View Details', url: '#' }
          ]
        }
      };
    }
  }

  // Record activity if there was a function call
  if (functionCall) {
    await recordActivity(userToken, selectedSite || '', functionCall, actionCard);
  }

  return {
    success: true,
    message: response.content,
    functionCall: functionCall,
    actionCard: actionCard,
    steps: response.steps
  };
}

// Build system prompt with setup awareness
async function buildSystemPrompt(userToken: string, selectedSite: string): Promise<string> {
  let prompt = `You are SEOAgent, an expert SEO assistant for SEOAgent.com. You help users with:

1. **Google Search Console Integration**: Connect websites, sync performance data, analyze search metrics
2. **Content Optimization**: Generate SEO articles, analyze content gaps, optimize existing pages
3. **Technical SEO**: Monitor SEOAgent.js performance, check website health, provide recommendations
4. **CMS Management**: Connect WordPress, Webflow, and other platforms for content publishing
5. **Performance Analytics**: Track rankings, traffic, and conversion metrics

**Available Functions**: You have access to powerful functions to help users. When a user asks to do something, use the appropriate function rather than just explaining how to do it.

**Communication Style**: 
- Be helpful, concise, and action-oriented
- Offer to perform tasks using functions when appropriate
- Provide specific, actionable recommendations
- Use a friendly but professional tone`;

  if (selectedSite) {
    prompt += `\n\n**Currently Selected Site**: ${selectedSite}`;
  }

  return prompt;
}