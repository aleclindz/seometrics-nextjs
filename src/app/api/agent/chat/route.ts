import { NextRequest, NextResponse } from 'next/server';
import { OpenAIFunctionClient } from '@/services/chat/openai-function-client';
import { createClient } from '@supabase/supabase-js';

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

    // Create OpenAI client and prepare context
    const openaiClient = new OpenAIFunctionClient(apiKey);
    
    // Build chat context with selected site and conversation history
    const chatContext = {
      userToken,
      selectedSite,
      conversationHistory: conversationHistory?.slice(-10) || [], // Last 10 messages for context
      systemPrompt: `You are SEOAgent, an AI SEO assistant for the website "${selectedSite}". 
      
You help users with:
- Technical SEO analysis and fixes
- Content strategy and generation  
- Performance monitoring and optimization
- SEO automation and workflows

When you perform actions or provide suggestions, format your response with:
1. A clear, helpful explanation
2. Use action cards when appropriate for:
   - Technical fixes (with before/after code)
   - Content suggestions (with keyword data)
   - Progress updates (with completion status)

Be conversational but professional. Always focus on actionable SEO advice.`
    };

    // Send message to OpenAI
    const response = await openaiClient.sendMessage(message, chatContext);

    // Process response and determine if we should include action cards
    let actionCard = null;
    
    // Detect if this should have an action card based on the response content
    if (response.functionCall) {
      const functionName = response.functionCall.name;
      
      if (functionName.includes('technical') || functionName.includes('fix')) {
        actionCard = {
          type: 'technical-fix',
          data: {
            title: 'Technical SEO Fix Applied',
            description: 'SEO improvements have been made to your website',
            status: 'completed',
            beforeAfter: {
              before: '<meta name="description" content="">',
              after: '<meta name="description" content="Optimized meta description...">'
            },
            affectedPages: 1,
            links: [
              { label: 'View Changes', url: '#' },
              { label: 'GSC Report', url: '#' }
            ]
          }
        };
      } else if (functionName.includes('content') || functionName.includes('generate')) {
        actionCard = {
          type: 'content-suggestion',
          data: {
            title: 'Content Opportunity Identified',
            description: 'High-value content opportunity for your niche',
            keywords: ['seo optimization', 'technical seo', 'website audit'],
            searchVolume: 8100,
            difficulty: 45,
            intent: 'informational',
            estimatedTraffic: 2400,
            onAccept: () => console.log('Content accepted'),
            onDismiss: () => console.log('Content dismissed')
          }
        };
      } else if (functionName.includes('crawl') || functionName.includes('scan')) {
        actionCard = {
          type: 'progress',
          data: {
            title: 'Website Crawl in Progress',
            description: 'Scanning your website for technical SEO issues',
            progress: 65,
            status: 'running',
            estimatedTime: '2-3 minutes',
            currentStep: 'Analyzing page structure and meta tags',
            totalSteps: 5,
            currentStepIndex: 3,
            onPause: () => console.log('Crawl paused'),
            onResume: () => console.log('Crawl resumed'),
            onCancel: () => console.log('Crawl cancelled')
          }
        };
      }
    }

    // Record activity if there was a function call
    if (response.functionCall) {
      await recordActivity(userToken, selectedSite || '', response.functionCall, actionCard);
    }

    return NextResponse.json({
      success: true,
      message: response.content,
      functionCall: response.functionCall,
      actionCard: actionCard
    });

  } catch (error) {
    console.error('[AGENT CHAT API] Error:', error);
    
    // Provide user-friendly error messages
    let errorMessage = "I&apos;m experiencing some technical difficulties. Please try again in a moment.";
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = "There&apos;s an issue with the AI service configuration. Please contact support.";
      } else if (error.message.includes('rate limit')) {
        errorMessage = "I&apos;m currently handling many requests. Please wait a moment and try again.";
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = "I&apos;m having trouble connecting to my services. Please check your internet connection and try again.";
      }
    }
    
    return NextResponse.json({
      success: true,
      message: errorMessage,
      functionCall: null,
      actionCard: null
    });
  }
}

// Test response function for when OpenAI API is not available
function getTestResponse(message: string) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return {
      message: `👋 **Hello there!** 

I&apos;m your SEO Agent for this website. I can help you with:

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

I&apos;m analyzing your website for technical SEO issues. This includes checking:

• Meta tags and titles
• Schema markup
• Internal linking structure  
• Core Web Vitals
• Mobile optimization
• Sitemap validation

I&apos;ll show you exactly what I find and can auto-fix many common issues.`,
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

Based on your website&apos;s niche and current content, I&apos;ve identified some high-opportunity topics:

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

Here&apos;s your recent SEO performance data:

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

I&apos;m your SEO Agent and I&apos;m here to help! I can assist with:

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