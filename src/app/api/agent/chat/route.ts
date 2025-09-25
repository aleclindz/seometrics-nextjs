import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { FunctionCaller } from '@/services/chat/function-caller';
import { getFunctionSchemas, validateFunctionArgs } from '@/services/chat/function-schemas';
import { getPromptManager } from '@/prompts';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Store conversation message; returns success boolean
async function storeConversationMessage(
  userToken: string,
  websiteToken: string,
  conversationId: string,
  messageRole: 'user' | 'assistant' | 'system',
  messageContent: string,
  messageOrder: number,
  functionCall?: any,
  actionCard?: any,
  metadata?: any
): Promise<boolean> {
  try {
    await supabase
      .from('agent_conversations')
      .insert({
        user_token: userToken,
        website_token: websiteToken || userToken, // Fallback if no websiteToken
        conversation_id: conversationId,
        message_role: messageRole,
        message_content: messageContent,
        function_call: functionCall,
        action_card: actionCard,
        message_order: messageOrder,
        metadata: metadata || {}
      });
    return true;
  } catch (error) {
    // Silently fail if table doesn't exist or other storage errors
    // This ensures chat functionality continues even if conversation storage fails
    console.log('[CONVERSATION STORAGE] Failed to store message (non-blocking):', error);
    return false;
  }
}

// Determine next message order from DB to avoid collisions with partial history
async function getNextMessageOrder(
  userToken: string,
  websiteToken: string,
  conversationId: string
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('agent_conversations')
      .select('message_order')
      .eq('user_token', userToken)
      .eq('website_token', websiteToken)
      .eq('conversation_id', conversationId)
      .order('message_order', { ascending: false })
      .limit(1);

    if (error) {
      console.log('[CONVERSATION STORAGE] Could not fetch next message order:', error);
      return 1;
    }

    const lastOrder = data && data.length > 0 ? (data[0].message_order as number) : 0;
    return lastOrder + 1;
  } catch (err) {
    console.log('[CONVERSATION STORAGE] Next order fallback due to error:', err);
    return 1;
  }
}

// Generate or extract conversation ID from conversation history
function getOrCreateConversationId(conversationHistory?: any[]): string {
  // Try to extract conversation_id from metadata in history
  if (conversationHistory && conversationHistory.length > 0) {
    const lastMessage = conversationHistory[conversationHistory.length - 1];
    if (lastMessage?.metadata?.conversation_id) {
      return lastMessage.metadata.conversation_id;
    }
  }
  
  // Generate new conversation ID
  return crypto.randomUUID();
}

export async function POST(request: NextRequest) {
  try {
    const { message, userToken, selectedSite, websiteToken: clientWebsiteToken, conversationHistory, conversationId: clientConversationId } = await request.json();

    if (!userToken || !message) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: userToken and message are required' 
        },
        { status: 400 }
      );
    }

    // Get or create conversation ID for this chat session
    const conversationId = clientConversationId || getOrCreateConversationId(conversationHistory);
    // Prefer explicit websiteToken from client; fallback to selectedSite (domain) or userToken
    const websiteToken = (clientWebsiteToken && typeof clientWebsiteToken === 'string') 
      ? clientWebsiteToken 
      : (selectedSite || userToken);
    
    // Calculate next message order from DB (not client history)
    const userMessageOrder = await getNextMessageOrder(userToken, websiteToken, conversationId);

    // Store user message (await for first write correctness)
    await storeConversationMessage(
      userToken,
      websiteToken,
      conversationId,
      'user',
      message,
      userMessageOrder
    );
    const assistantMessageOrder = userMessageOrder + 1;

    // Get OpenAI API key from server environment
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Fallback response for testing when OpenAI key is not available
      const testResponse = getTestResponse(message);
      
      // Record activity for test responses too
      if (testResponse.functionCall) {
        await recordActivity(userToken, selectedSite || '', testResponse.functionCall, testResponse.actionCard);
      }

      // Store test conversation messages
      await storeConversationMessage(
        userToken,
        websiteToken,
        conversationId,
        'assistant',
        testResponse.message,
        assistantMessageOrder,
        testResponse.functionCall,
        testResponse.actionCard,
        { test_response: true }
      );
      
      return NextResponse.json({
        success: true,
        message: testResponse.message,
        functionCall: testResponse.functionCall,
        actionCard: testResponse.actionCard,
        conversationId
      });
    }

    // This duplicate check can be removed since we handled it above
    // Get OpenAI API key from environment
    if (!apiKey) {
      // This case is already handled above, but keeping for safety
      const testResponse = getTestResponse(message);
      
      // Store test conversation messages
      await storeConversationMessage(
        userToken,
        websiteToken,
        conversationId,
        'assistant',
        testResponse.message,
        assistantMessageOrder,
        testResponse.functionCall,
        testResponse.actionCard,
        { test_response: true }
      );
      
      return NextResponse.json({
        success: true,
        message: testResponse.message,
        functionCall: testResponse.functionCall,
        actionCard: testResponse.actionCard,
        conversationId
      });
    }

    // Create OpenAI client (server-side only)
    const openai = new OpenAI({ apiKey });
    const functionCaller = new FunctionCaller(userToken);

    // Build system prompt
    const systemPrompt = await buildSystemPrompt(userToken, selectedSite);
    
    // Build messages array - filter out any messages with empty content
    const conversationMessages = (conversationHistory?.slice(-10) || [])
      .filter((msg: any) => msg.content && msg.content.trim())
      .map((msg: any) => ({
        role: msg.role,
        content: msg.content.trim()
      }));
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationMessages,
      { role: 'user', content: message.trim() }
    ];

    // Get function schemas
    const functionSchemas = getFunctionSchemas();

    // Multi-turn tool execution loop
    let toolResults: Record<string, any> = {};
    let guard = 0;
    const MAX_TOOL_STEPS = 3; // Reduced for chat responsiveness

    while (guard++ < MAX_TOOL_STEPS) {
      // Log prompt details
      try {
        const preview = messages.map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 300) })).slice(-4);
        console.log(`[AGENT CHAT][LLM] step=${guard}/${MAX_TOOL_STEPS} model=gpt-4o-mini messages=${messages.length} preview=`, preview);
      } catch {}

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

      try {
        const usage: any = (response as any).usage || {};
        console.log('[AGENT CHAT][LLM] finish_reason=', response.choices?.[0]?.finish_reason || 'n/a', 'usage=', usage);
      } catch {}

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
        const processedResponse = await processOpenAIResponse(
          finalResponse,
          userToken,
          selectedSite,
          {
            conversationId,
            websiteToken,
            messageOrder: assistantMessageOrder
          }
        );
        return NextResponse.json(processedResponse);
      }

      // Add conversational response before function execution
      let conversationalResponse = '';
      const firstToolCall = messageContent.tool_calls[0];
      if (firstToolCall?.function?.name) {
        conversationalResponse = getConversationalResponse(firstToolCall.function.name, message);
      }

      // First, add the assistant message with tool_calls
      messages.push({
        role: 'assistant',
        content: messageContent.content || '',
        tool_calls: messageContent.tool_calls
      } as any);

      // Then execute all tool calls and add responses
      const executedToolCalls: Array<{ name: string; arguments: any; id: string } > = [];
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

        // Auto-inject selected site into args if missing and relevant
        if (selectedSite && (functionArgs == null || typeof functionArgs !== 'object' || !('site_url' in functionArgs))) {
          functionArgs = { ...(functionArgs || {}), site_url: selectedSite };
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
        // Pass through conversation_id from client when available so downstream abilities can use it
        try {
          if (!('conversation_id' in functionArgs) && (clientConversationId || conversationId)) {
            (functionArgs as any).conversation_id = clientConversationId || conversationId;
          }
        } catch {}
        executedToolCalls.push({ name: functionName, arguments: functionArgs, id: toolCall.id });

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
      }));

      // Add all tool results to messages after execution
      messageContent.tool_calls.forEach((toolCall) => {
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResults[toolCall.id])
        } as any);
      });

      // Short-circuit to avoid a second LLM round-trip and Vercel timeouts
      const summary = buildToolSummary(executedToolCalls, toolResults);
      const combinedResponse = conversationalResponse
        ? `${conversationalResponse}\n\n${summary}`
        : summary;

      const immediateResponse = {
        content: combinedResponse,
        // Provide a single function_call so activity logging works
        function_call: {
          name: executedToolCalls[0]?.name || 'executed_function',
          arguments: JSON.stringify(executedToolCalls[0]?.arguments || {})
        },
        toolResults,
        steps: guard
      };
      const processedResponse = await processOpenAIResponse(
        immediateResponse,
        userToken,
        selectedSite,
        {
          conversationId,
          websiteToken,
          messageOrder: assistantMessageOrder
        }
      );
      return NextResponse.json(processedResponse);
    }

    // Final response after max steps
    const finalResponse = {
      content: "I've completed several SEO tasks for you. How else can I help?",
      toolResults,
      steps: guard - 1
    };

      const processedResponse = await processOpenAIResponse(
        finalResponse, 
        userToken, 
        selectedSite,
        {
          conversationId,
          websiteToken,
          messageOrder: assistantMessageOrder
        }
      );
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

function getFunctionDisplayName(functionName: string): string {
  switch (functionName) {
    // Core GSC functions
    case 'connect_gsc':
      return 'GSC Connected';
    case 'sync_gsc_data':
      return 'GSC Data Synced';
    case 'GSC_sync_data':
      return 'GSC Data Sync';
      
    // Content functions
    case 'generate_article':
      return 'Article Generated';
    case 'CONTENT_generate_article':
      return 'Article Created';
    case 'CONTENT_optimize_existing':
      return 'Content Optimized';
    case 'CONTENT_generate_and_publish':
      return 'Article Generated & Published';
      
    // SEO analysis and fixes
    case 'audit_site':
      return 'Website SEO Audit';
    case 'SEO_analyze_technical':
      return 'Technical SEO Analysis';
    case 'SEO_apply_fixes':
      return 'SEO Issues Fixed';
    case 'SEO_crawl_website':
      return 'Website Crawled';
      
    // Sitemap functions
    case 'SITEMAP_generate_submit':
      return 'Sitemap Generated';
      
    // CMS publishing
    case 'CMS_strapi_publish':
      return 'Published to Strapi';
    case 'CMS_wordpress_publish':
      return 'Published to WordPress';
      
    // Verification and monitoring
    case 'VERIFY_check_changes':
      return 'Changes Verified';
    case 'get_site_status':
      return 'Site Status Check';
      
    // Legacy/existing functions
    case 'technical_seo_scan':
      return 'Technical SEO Scan';
    case 'generate_content_ideas':
      return 'Content Ideas Generated';
    case 'get_performance_summary':
      return 'Performance Analysis';
    case 'create_idea':
      return 'SEO Idea Created';
    case 'run_action':
      return 'SEO Action Executed';
    case 'check_indexing_status':
      return 'Indexing Status Check';
    case 'analyze_page_performance':
      return 'Page Performance Analysis';
    case 'optimize_meta_tags':
      return 'Meta Tags Optimization';
    // Keyword strategy
    case 'KEYWORDS_add_keywords':
      return 'Keywords Added to Strategy';
    case 'update_keyword_strategy':
      return 'Keyword Strategy Updated';
    case 'KEYWORDS_get_strategy':
      return 'Keyword Strategy Retrieved';
    default:
      return functionName.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  }
}

function getDescriptionForFunction(functionName: string): string {
  switch (functionName) {
    // Core GSC functions
    case 'connect_gsc':
      return 'Successfully connected Google Search Console for SEO data access';
    case 'sync_gsc_data':
      return 'Synchronized latest performance data from Google Search Console';
    case 'GSC_sync_data':
      return 'Updated website performance metrics from Google Search Console';
      
    // Content functions
    case 'generate_article':
      return 'Created SEO-optimized article with target keywords and structure';
    case 'CONTENT_generate_article':
      return 'Generated high-quality article content optimized for search engines';
    case 'CONTENT_optimize_existing':
      return 'Enhanced existing content with SEO improvements and keyword optimization';
    case 'CONTENT_generate_and_publish':
      return 'Generated researched article and published to connected CMS';
      
    // SEO analysis and fixes
    case 'audit_site':
      return 'Performed comprehensive website SEO audit identifying optimization opportunities';
    case 'SEO_analyze_technical':
      return 'Analyzed technical SEO factors including meta tags, schema markup, and site structure';
    case 'SEO_apply_fixes':
      return 'Automatically applied SEO fixes to improve website search visibility';
    case 'SEO_crawl_website':
      return 'Crawled website pages to identify technical SEO issues and opportunities';
      
    // Sitemap functions
    case 'SITEMAP_generate_submit':
      return 'Generated XML sitemap and submitted to Google Search Console for indexing';
      
    // CMS publishing
    case 'CMS_strapi_publish':
      return 'Published SEO-optimized content directly to Strapi CMS';
    case 'CMS_wordpress_publish':
      return 'Published article content to WordPress with SEO optimization';
      
    // Verification and monitoring
    case 'VERIFY_check_changes':
      return 'Verified implementation of SEO changes and their impact';
    case 'get_site_status':
      return 'Retrieved current website status and SEO health metrics';
      
    // Legacy/existing functions
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
    case 'check_indexing_status':
      return 'Checked Google indexing status for website pages';
    case 'analyze_page_performance':
      return 'Analyzed Core Web Vitals and page speed metrics';
    case 'optimize_meta_tags':
      return 'Optimized meta titles and descriptions for better SEO';
    // Keyword strategy
    case 'KEYWORDS_add_keywords':
      return 'Added keywords to strategy and tracking list';
    case 'update_keyword_strategy':
      return 'Updated tracked keywords and clusters';
    case 'KEYWORDS_get_strategy':
      return 'Retrieved current keyword strategy overview';
    default:
      return `Executed ${functionName.replace(/_/g, ' ')} operation`;
  }
}

// Process OpenAI response and generate action cards
async function processOpenAIResponse(
  response: any, 
  userToken: string, 
  selectedSite: string,
  conversationData?: {
    conversationId: string;
    websiteToken: string;
    messageOrder: number;
  }
) {
  let actionCard = null;
  let functionCall = null;
  
  // Only record activities for actual OpenAI function calls, not generic tool results
  if (response.function_call || (response.tool_calls && response.tool_calls.length > 0)) {
    // Process actual OpenAI function calls
    const actualFunctionCall = response.function_call || response.tool_calls[0];
    
    functionCall = {
      name: actualFunctionCall.function?.name || actualFunctionCall.name,
      arguments: actualFunctionCall.function?.arguments || actualFunctionCall.arguments,
      result: response.toolResults ? Object.values(response.toolResults)[0] : null
    };
    
    // Generate action card based on the actual function
    if (functionCall.name === 'KEYWORDS_brainstorm' || functionCall.name === 'brainstorm_keywords' || functionCall.name === 'KEYWORDS_brainstorm_auto') {
      // Build a Keyword Save action card with cluster summary
      try {
        const toolRes: any = functionCall.result as any;
        const ideas = (
          toolRes?.data?.generated_keywords ||
          toolRes?.generated_keywords ||
          []
        ) as any[];
        const clusters: Record<string, number> = {};
        ideas.forEach((k: any) => {
          const c = (k?.suggested_topic_cluster || 'uncategorized') as string;
          clusters[c] = (clusters[c] || 0) + 1;
        });
        const clusterList = Object.entries(clusters)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);

        actionCard = {
          type: 'keyword-save',
          data: {
            title: 'Save Keywords to Strategy',
            description: 'Review and save brainstormed keywords grouped by suggested topic clusters.',
            total: ideas.length,
            clusters: clusterList,
            ideas
          }
        };
      } catch {
        actionCard = null;
      }
    } else if (functionCall.name === 'KEYWORDS_get_strategy') {
      // Build a Generate From Cluster action card to create briefs directly from clusters
      try {
        const strategy = (functionCall.result as any)?.data?.strategy || (functionCall.result as any)?.strategy || {};
        const clusters = Array.isArray(strategy.topic_clusters) ? strategy.topic_clusters : [];
        const simplified = clusters.map((c: any) => ({
          name: c.name,
          keywordCount: (c.keywords?.length || 0),
          contentCount: (c.content?.length || 0)
        })).sort((a: any, b: any) => b.keywordCount - a.keywordCount);
        actionCard = {
          type: 'generate-from-cluster',
          data: {
            title: 'Generate From Cluster',
            description: 'Pick a topic cluster to instantly add an article brief to your queue.',
            clusters: simplified.slice(0, 12) // show top 12 clusters
          }
        };
      } catch {
        actionCard = null;
      }
    } else if (functionCall.result && typeof functionCall.result === 'object' && 'success' in functionCall.result && functionCall.result.success) {
      // Let tools provide their own action cards when available
      const toolData = functionCall.result as any;
      if (toolData?.data?.actionCard) {
        actionCard = toolData.data.actionCard;
      } else {
        const normalizedSite = (selectedSite || '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
        const detailsUrl = normalizedSite ? `/website/${encodeURIComponent(normalizedSite)}` : '#';
        actionCard = {
          type: 'technical-fix',
          data: {
            title: getFunctionDisplayName(functionCall.name),
            description: getDescriptionForFunction(functionCall.name),
            status: 'completed',
            affectedPages: 1,
            links: [
              { label: 'View Details', url: detailsUrl }
            ]
          }
        };
      }
    }
    
    // Only record activity for real function calls
    await recordActivity(userToken, selectedSite || '', functionCall, actionCard);
  }
  // Don't record generic "executed_function" activities anymore

  // Store assistant message (async, non-blocking)
  if (conversationData) {
    storeConversationMessage(
      userToken,
      conversationData.websiteToken,
      conversationData.conversationId,
      'assistant',
      response.content,
      conversationData.messageOrder,
      functionCall,
      actionCard,
      { steps: response.steps }
    ).catch(error => {
      console.log('[CONVERSATION STORAGE] Assistant message storage failed (non-blocking):', error);
    });
  }

  return {
    success: true,
    message: response.content,
    functionCall: functionCall,
    actionCard: actionCard,
    steps: response.steps,
    conversationId: conversationData?.conversationId // Include conversation ID in response
  };
}

// Build system prompt with setup awareness
function buildSystemPrompt(userToken: string, selectedSite: string): string {
  return getPromptManager().getPrompt('agent', 'SIMPLE_SEO_AGENT', {
    selectedSite: selectedSite ? `\n\n**Currently Selected Site**: ${selectedSite}` : ''
  });
}

// Build a concise, human-readable summary of executed tool calls
function buildToolSummary(executed: Array<{ name: string; arguments: any; id: string }>, results: Record<string, any>): string {
  if (!executed || executed.length === 0) {
    return "I've completed the requested action.";
  }

  const first = executed[0];
  const res = Object.values(results)[0];

  // Human-readable summaries for common keyword functions
  if (first.name === 'KEYWORDS_get_strategy' && res && typeof res === 'object') {
    // Try to normalize fields across possible shapes
    const data = (res.data ?? res) as any;
    const strategy = data.strategy ?? {};
    const raw = data.raw_data ?? {};
    const has = Boolean(strategy.has_strategy ?? raw.hasStrategy);
    const total = Number(strategy.total_keywords ?? raw.totalKeywords ?? 0);
    const clusters = strategy.topic_clusters ?? raw.topicClusters ?? [];
    const nextSteps: string[] = Array.isArray(strategy.next_steps) ? strategy.next_steps : [];

    if (!has || total === 0) {
      const bullets = nextSteps.length
        ? nextSteps.map(s => `• ${s}`).join('\n')
        : [
            '• Brainstorm 10–20 long‑tail keywords that reflect buyer intent',
            '• Group them into 3–5 topic clusters',
            '• Pick 1–2 primary keywords per cluster and plan content'
          ].join('\n');
      return [
        '🔎 I checked your keyword strategy — none found yet.',
        '',
        'Recommended next steps:',
        bullets
      ].join('\n');
    }

    // Build a brief overview if a strategy exists
    const breakdown = strategy.keyword_breakdown ?? {};
    const primary = breakdown.primary ?? raw.primaryKeywords ?? 0;
    const secondary = breakdown.secondary ?? raw.secondaryKeywords ?? 0;
    const longTail = breakdown.long_tail ?? raw.longTailKeywords ?? 0;
    const clusterCount = Array.isArray(clusters) ? clusters.length : (raw.totalClusters ?? 0);

    return [
      '✅ Retrieved your keyword strategy overview',
      `• Total keywords: ${total}  (primary: ${primary}, secondary: ${secondary}, long‑tail: ${longTail})`,
      `• Topic clusters: ${clusterCount}`,
      '',
      'Next suggestions:',
      '• Focus 60%+ on long‑tail keywords for faster wins',
      '• Expand clusters with supporting articles and internal links',
      '• Identify content gaps and prioritize by expected impact'
    ].join('\n');
  }

  if (first.name === 'KEYWORDS_brainstorm' || first.name === 'brainstorm_keywords') {
    const ideas = res?.data?.generated_keywords || res?.generated_keywords || [];
    const count = ideas.length || 0;
    const top = ideas.slice(0, Math.min(10, ideas.length));
    const bullets = top.map((k: any) => {
      const kw = k.keyword || '';
      const intent = k.search_intent ? ` — ${k.search_intent}` : '';
      const cluster = k.suggested_topic_cluster ? ` (cluster: ${k.suggested_topic_cluster})` : '';
      return `- ${kw}${intent}${cluster}`;
    }).join('\n');
    return [
      `✨ Generated ${count} keyword ideas:`,
      '',
      bullets,
      '',
      'Reply with: "save keywords" (optionally add "to <cluster name>") and I\'ll store them in your Strategy. You can also specify a number, e.g., "save top 10".'
    ].join('\n');
  }
  if (first.name === 'KEYWORDS_brainstorm_auto') {
    const ideas = res?.data?.generated_keywords || res?.generated_keywords || [];
    const seeds = res?.data?.seed_keywords || res?.seed_keywords || [];
    const source = res?.data?.seed_source || res?.seed_source || 'auto';
    const count = ideas.length || 0;
    const seedNote = seeds.length ? ` (seeds from ${source}: ${seeds.slice(0,3).join(', ')}${seeds.length>3?'…':''})` : '';
    const top = ideas.slice(0, Math.min(10, ideas.length));
    const bullets = top.map((k: any) => `- ${k.keyword || k}`).join('\n');
    return [
      `✨ Generated ${count} keyword ideas${seedNote}:`,
      '',
      bullets,
      '',
      'Reply with: "save keywords" (optionally add "to <cluster name>") and I\'ll store them in your Strategy.'
    ].join('\n');
  }

  if (first.name === 'SEO_crawl_website') {
    const jobId = res?.data?.job_id || res?.job_id || 'job';
    return `🕸️ Started crawl job (${jobId}). I’ll fetch results and highlight technical issues when ready.`;
  }

  if (first.name === 'SEO_get_crawl_results') {
    const total = res?.data?.total_pages ?? res?.total_pages ?? 0;
    const analyzed = res?.data?.analyzed_pages ?? res?.analyzed_pages ?? 0;
    const issues = res?.data?.issues ?? res?.issues ?? {};
    const lines = [
      `🧭 Crawl results: ${analyzed}/${total} pages analyzed`,
      `• Missing titles: ${issues.missing_title ?? 0}`,
      `• Missing meta descriptions: ${issues.missing_meta_description ?? 0}`,
      `• Missing H1: ${issues.missing_h1 ?? 0}`,
      `• Missing canonical: ${issues.missing_canonical ?? 0}`,
      `• Noindex: ${issues.noindex ?? 0}`
    ];
    lines.push('', 'Want me to propose fixes for the top issues?');
    return lines.join('\n');
  }
  if (first.name === 'KEYWORDS_add_keywords' || first.name === 'update_keyword_strategy') {
    const added = res?.data?.added || res?.summary?.keywords_added || 0;
    return `✅ Added ${added} keywords to your strategy. Check the Strategy tab for updates.`;
  }

  // get_site_status → produce a helpful summary + next step
  if (first.name === 'get_site_status' && res && typeof res === 'object' && res.success && res.data) {
    const d = res.data;
    const metrics = d.current_metrics || {};
    const clicks = metrics.clicks_last_28_days ?? metrics.clicks_last_30_days ?? 0;
    const imps = metrics.impressions_last_28_days ?? metrics.impressions_last_30_days ?? 0;
    const ctr = metrics.click_through_rate ?? '0%';
    const pos = metrics.average_position ?? 0;
    const gsc = d.integrations?.google_search_console?.connected ? 'connected' : 'not connected';
    const smart = d.integrations?.smartjs?.active ? 'active' : 'inactive';

    // Best next step logic
    let nextTitle = '';
    let nextWhy = '';
    let nextAction = '';
    if (gsc !== 'connected') {
      nextTitle = 'Connect Google Search Console';
      nextWhy = 'Unlock performance insights and daily monitoring';
      nextAction = 'I can connect GSC for this site.';
    } else if (imps > 0 && ctr && parseFloat(String(ctr).replace('%','')) < 1) {
      nextTitle = 'Improve CTR on top pages';
      nextWhy = 'High impressions but very low CTR suggests title/description optimization';
      nextAction = 'I can analyze top pages and propose meta updates.';
    } else if (smart !== 'active') {
      nextTitle = 'Install SEOAgent.js';
      nextWhy = 'Enable automatic meta/alt tags and structured data';
      nextAction = 'I can provide the install snippet and verify it.';
    } else {
      nextTitle = 'Review performance trends';
      nextWhy = 'Identify rising/falling queries and pages over the last month';
      nextAction = 'I can analyze trends and suggest actions.';
    }

    return [
      '📊 Performance Snapshot',
      `• Impressions: ${imps.toLocaleString()}  • Clicks: ${clicks.toLocaleString()}  • CTR: ${ctr}  • Avg Pos: ${Number(pos).toFixed(1)}`,
      `• GSC: ${gsc}  • SEOAgent.js: ${smart}`,
      '',
      '✅ Best Next Step',
      `• ${nextTitle} — ${nextWhy}`,
      `• ${nextAction}`
    ].join('\n');
  }

  // Generic fallback
  if (res && typeof res === 'object') {
    if (res.success === false || res.error) {
      return `⚠️ The tool reported an error: ${res.error || 'Unknown error'}`;
    }
    return `✅ Completed: ${first.name.replace(/_/g, ' ')}`;
  }

  return `✅ Completed: ${first.name.replace(/_/g, ' ')}`;
}

// Generate conversational response based on function being executed
function getConversationalResponse(functionName: string, userMessage: string): string {
  const responses: Record<string, string[]> = {
    'CONTENT_suggest_ideas': [
      '🔍 Let me research your website and generate intelligent content ideas for you...',
      '✨ I&apos;ll analyze your website and brainstorm strategic content topics...',
      '🎯 Analyzing your business context to suggest high-impact content ideas...'
    ],
    'WEBSITE_crawl_and_analyze': [
      '🕷️ Crawling and analyzing your website to understand your business model...',
      '🔍 Let me examine your website to extract key business insights...',
      '📊 Analyzing your website structure and content to build a strategy...'
    ],
    'COMPETITOR_research_and_crawl': [
      '🔍 Researching your competitors to identify strategic opportunities...',
      '⚡ Analyzing competitor positioning and content strategies for you...',
      '🎯 Let me examine your competitive landscape and find gaps...'
    ],
    'KEYWORDS_brainstorm_strategy': [
      '💡 Generating a comprehensive keyword strategy based on your analysis...',
      '🎯 Creating strategic keyword recommendations tailored to your business...',
      '✨ Brainstorming high-impact keywords for your content strategy...'
    ],
    'TOPICS_create_clusters': [
      '🗂️ Organizing keywords into strategic topic clusters for content planning...',
      '📋 Creating content pillars and topic clusters from your keyword strategy...',
      '🎯 Structuring your keywords into actionable content themes...'
    ],
    'CONTENT_gap_analysis': [
      '🔍 Analyzing content gaps compared to your competitors...',
      '⚡ Identifying content opportunities your competitors are missing...',
      '📊 Finding strategic content gaps in your market...'
    ],
    'GSC_sync_data': [
      '📊 Syncing your latest Google Search Console data...',
      '🔄 Updating your performance metrics from GSC...',
      '📈 Fetching fresh search performance data...'
    ],
    'SEO_analyze_technical': [
      '🔧 Scanning your website for technical SEO issues...',
      '⚙️ Running a comprehensive technical audit...',
      '🔍 Analyzing your site&apos;s technical SEO health...'
    ],
    'CONTENT_generate_article': [
      '✍️ Creating a high-quality, SEO-optimized article for you...',
      '📝 Generating strategic content based on your requirements...',
      '✨ Writing an engaging article optimized for search...'
    ]
  };

  const functionResponses = responses[functionName] || [
    '⚡ Let me work on that for you...',
    '🔍 Analyzing and processing your request...',
    '🎯 Working on your SEO task...'
  ];

  // Return a random response from the available options
  return functionResponses[Math.floor(Math.random() * functionResponses.length)];
}
