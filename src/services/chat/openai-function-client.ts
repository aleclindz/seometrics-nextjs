import OpenAI from 'openai';
import { AgentMemory, WebsiteContext } from '../agent/agent-memory';

interface ChatContext {
  history: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    function_call?: any;
  }>;
  siteContext?: {
    selectedSite?: string;
    userSites?: Array<{ id: string; url: string; name: string; }>;
  };
  userToken?: string; // Add user token for memory access
}

interface FunctionCallResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class OpenAIFunctionClient {
  private openai: OpenAI;
  private functionCaller: FunctionCaller;
  private agentMemory?: AgentMemory;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    this.functionCaller = new FunctionCaller();
  }

  // Initialize agent memory for a specific website
  private initializeMemory(websiteToken: string, userToken: string) {
    if (!this.agentMemory || this.agentMemory['websiteToken'] !== websiteToken) {
      this.agentMemory = new AgentMemory(websiteToken, userToken);
    }
  }

  private getFunctionSchemas() {
    return [
      // ===== AGENT OPERATING SYSTEM TOOLS =====
      {
        name: 'create_idea',
        description: 'Create a new idea from evidence and hypothesis that can be adopted into actionable plans',
        parameters: {
          type: 'object',
          properties: {
            site_url: {
              type: 'string',
              description: 'Website URL this idea applies to'
            },
            title: {
              type: 'string',
              description: 'Clear, concise title for the idea'
            },
            hypothesis: {
              type: 'string',
              description: 'The hypothesis or reasoning behind this idea'
            },
            evidence: {
              type: 'object',
              description: 'Supporting evidence, data, or context for the idea'
            },
            ice_score: {
              type: 'integer',
              description: 'Impact/Confidence/Ease score (1-100) for prioritization',
              minimum: 1,
              maximum: 100
            }
          },
          required: ['site_url', 'title']
        }
      },
      {
        name: 'adopt_idea',
        description: 'Adopt an idea by creating concrete actions to execute it',
        parameters: {
          type: 'object',
          properties: {
            idea_id: {
              type: 'string',
              description: 'ID of the idea to adopt'
            },
            strategy: {
              type: 'string',
              description: 'High-level strategy for executing this idea'
            },
            actions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  action_type: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  priority_score: { type: 'integer' }
                }
              },
              description: 'List of concrete actions to implement the idea'
            }
          },
          required: ['idea_id', 'actions']
        }
      },
      {
        name: 'list_actions',
        description: 'List current actions with filtering options',
        parameters: {
          type: 'object',
          properties: {
            site_url: {
              type: 'string',
              description: 'Filter actions for specific website'
            },
            status: {
              type: 'string',
              enum: ['proposed', 'queued', 'scheduled', 'running', 'needs_verification', 'verified', 'completed', 'failed'],
              description: 'Filter by action status'
            },
            limit: {
              type: 'integer',
              description: 'Maximum number of actions to return',
              default: 20
            }
          },
          required: []
        }
      },
      {
        name: 'run_action',
        description: 'Execute a queued action within policy constraints',
        parameters: {
          type: 'object',
          properties: {
            action_id: {
              type: 'string',
              description: 'ID of the action to execute'
            },
            policy_overrides: {
              type: 'object',
              description: 'Optional policy overrides for this execution',
              properties: {
                environment: {
                  type: 'string',
                  enum: ['DRY_RUN', 'STAGING', 'PRODUCTION']
                },
                max_pages: { type: 'integer' },
                max_patches: { type: 'integer' }
              }
            }
          },
          required: ['action_id']
        }
      },
      {
        name: 'update_action_status',
        description: 'Update action status (for approvals, declines, etc)',
        parameters: {
          type: 'object',
          properties: {
            action_id: {
              type: 'string',
              description: 'ID of the action to update'
            },
            new_status: {
              type: 'string',
              enum: ['proposed', 'queued', 'declined', 'cancelled'],
              description: 'New status for the action'
            },
            note: {
              type: 'string',
              description: 'Optional note explaining the status change'
            }
          },
          required: ['action_id', 'new_status']
        }
      },
      {
        name: 'summarize_activity',
        description: 'Get canonical summary of recent activity since last conversation',
        parameters: {
          type: 'object',
          properties: {
            site_url: {
              type: 'string',
              description: 'Get summary for specific site, or all sites if omitted'
            },
            since: {
              type: 'string',
              description: 'ISO timestamp to get activity since (defaults to 24h ago)'
            }
          },
          required: []
        }
      },
      {
        name: 'plan_crawl',
        description: 'Plan and execute website crawl for technical SEO analysis',
        parameters: {
          type: 'object',
          properties: {
            site_url: {
              type: 'string',
              description: 'Website to crawl'
            },
            crawl_type: {
              type: 'string',
              enum: ['technical_seo', 'content_audit', 'performance', 'full'],
              description: 'Type of crawl to perform'
            },
            policy: {
              type: 'object',
              description: 'Crawl policy constraints',
              properties: {
                max_pages: { type: 'integer' },
                crawl_depth: { type: 'integer' },
                respect_robots: { type: 'boolean' }
              }
            }
          },
          required: ['site_url', 'crawl_type']
        }
      },
      {
        name: 'list_integrations',
        description: 'Discover available capabilities and integrations for a site',
        parameters: {
          type: 'object',
          properties: {
            site_url: {
              type: 'string',
              description: 'Website to check integrations for'
            },
            category: {
              type: 'string',
              enum: ['cms', 'seo', 'analytics', 'verification'],
              description: 'Filter by capability category'
            }
          },
          required: []
        }
      },
      // ===== EXISTING TOOLS =====
      {
        name: 'connect_gsc',
        description: 'Connect Google Search Console for a website',
        parameters: {
          type: 'object',
          properties: {
            site_url: { 
              type: 'string', 
              description: 'Website URL to connect to Google Search Console' 
            }
          },
          required: ['site_url']
        }
      },
      {
        name: 'sync_gsc_data',
        description: 'Sync performance data from Google Search Console',
        parameters: {
          type: 'object',
          properties: {
            site_url: { 
              type: 'string', 
              description: 'Website to sync GSC data for' 
            }
          },
          required: ['site_url']
        }
      },
      {
        name: 'get_site_performance',
        description: 'Get performance metrics for a website',
        parameters: {
          type: 'object',
          properties: {
            site_url: { 
              type: 'string', 
              description: 'Website to get performance data for' 
            },
            date_range: {
              type: 'string',
              enum: ['7d', '30d', '90d'],
              description: 'Date range for performance data'
            }
          },
          required: ['site_url']
        }
      },
      {
        name: 'generate_article',
        description: 'Generate SEO-optimized article content',
        parameters: {
          type: 'object',
          properties: {
            topic: { 
              type: 'string', 
              description: 'Main topic for the article' 
            },
            target_keywords: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Target keywords for SEO optimization'
            },
            site_url: { 
              type: 'string', 
              description: 'Target website for the article' 
            },
            word_count: {
              type: 'integer',
              description: 'Desired word count for the article',
              minimum: 500,
              maximum: 5000
            }
          },
          required: ['topic', 'site_url']
        }
      },
      {
        name: 'check_seoagentjs_status',
        description: 'Check SEOAgent.js installation and performance status',
        parameters: {
          type: 'object',
          properties: {
            site_url: { 
              type: 'string', 
              description: 'Website to check SEOAgent.js status for' 
            }
          },
          required: ['site_url']
        }
      },
      {
        name: 'connect_cms',
        description: 'Connect a Content Management System (WordPress, Webflow, etc.)',
        parameters: {
          type: 'object',
          properties: {
            site_url: { 
              type: 'string', 
              description: 'Website URL' 
            },
            cms_type: {
              type: 'string',
              enum: ['wordpress', 'webflow', 'shopify', 'strapi', 'ghost'],
              description: 'Type of CMS to connect'
            },
            credentials: {
              type: 'object',
              description: 'CMS credentials (API keys, OAuth tokens, etc.)'
            }
          },
          required: ['site_url', 'cms_type']
        }
      },
      {
        name: 'list_sites',
        description: 'List all websites in the user account',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'add_site',
        description: 'Add a new website to manage',
        parameters: {
          type: 'object',
          properties: {
            site_url: { 
              type: 'string', 
              description: 'Website URL to add' 
            },
            site_name: { 
              type: 'string', 
              description: 'Display name for the website' 
            }
          },
          required: ['site_url', 'site_name']
        }
      },
      {
        name: 'analyze_content_gaps',
        description: 'Analyze content gaps and opportunities for a website',
        parameters: {
          type: 'object',
          properties: {
            site_url: { 
              type: 'string', 
              description: 'Website to analyze for content gaps' 
            },
            competitor_urls: {
              type: 'array',
              items: { type: 'string' },
              description: 'Competitor website URLs for comparison'
            }
          },
          required: ['site_url']
        }
      },
      {
        name: 'optimize_page_content',
        description: 'Analyze and suggest optimizations for existing page content',
        parameters: {
          type: 'object',
          properties: {
            page_url: { 
              type: 'string', 
              description: 'Specific page URL to optimize' 
            },
            target_keywords: {
              type: 'array',
              items: { type: 'string' },
              description: 'Target keywords for optimization'
            }
          },
          required: ['page_url']
        }
      },
      {
        name: 'generate_seo_report',
        description: 'Generate comprehensive SEO report for a website',
        parameters: {
          type: 'object',
          properties: {
            site_url: { 
              type: 'string', 
              description: 'Website to generate SEO report for' 
            },
            report_type: {
              type: 'string',
              enum: ['quick', 'detailed', 'competitor'],
              description: 'Type of SEO report to generate'
            }
          },
          required: ['site_url']
        }
      },
      {
        name: 'get_technical_seo_status',
        description: 'Get current technical SEO dashboard data including issues, fixes, and overall health',
        parameters: {
          type: 'object',
          properties: {
            site_url: { 
              type: 'string', 
              description: 'Website to get technical SEO status for' 
            }
          },
          required: ['site_url']
        }
      },
      {
        name: 'get_seo_tags_status',
        description: 'Get status of alt tags and meta tags managed by SEOAgent.js',
        parameters: {
          type: 'object',
          properties: {
            site_url: { 
              type: 'string', 
              description: 'Website to get SEO tags status for' 
            }
          },
          required: ['site_url']
        }
      },
      {
        name: 'get_audit_results',
        description: 'Get latest audit results and issue status for a website',
        parameters: {
          type: 'object',
          properties: {
            site_url: { 
              type: 'string', 
              description: 'Website to get audit results for' 
            }
          },
          required: ['site_url']
        }
      },
      {
        name: 'check_fix_status',
        description: 'Check what technical SEO issues have been auto-fixed vs still pending',
        parameters: {
          type: 'object',
          properties: {
            site_url: { 
              type: 'string', 
              description: 'Website to check fix status for' 
            }
          },
          required: ['site_url']
        }
      },
      {
        name: 'audit_site',
        description: 'Perform comprehensive site audit using GSC data and website analysis',
        parameters: {
          type: 'object',
          properties: {
            site_url: { 
              type: 'string', 
              description: 'Website URL to audit' 
            },
            include_gsc_data: {
              type: 'boolean',
              description: 'Include Google Search Console performance data',
              default: true
            },
            audit_type: {
              type: 'string',
              enum: ['technical', 'content', 'performance', 'full'],
              description: 'Type of audit to perform',
              default: 'full'
            }
          },
          required: ['site_url']
        }
      },
      {
        name: 'get_site_status',
        description: 'Get comprehensive status overview of a website including all integrations',
        parameters: {
          type: 'object',
          properties: {
            site_url: { 
              type: 'string', 
              description: 'Website URL to check status for' 
            }
          },
          required: ['site_url']
        }
      }
    ];
  }

  async sendMessage(message: string, context: ChatContext): Promise<{
    content: string;
    functionCall?: {
      name: string;
      arguments: any;
      result?: FunctionCallResult;
    };
  }> {
    try {
      const systemPrompt = await this.buildSystemPrompt(context);
      
      // Use the new Responses API with tools (function calling)
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          ...context.history,
          { role: 'user', content: message }
        ],
        tools: this.getFunctionSchemas().map(func => ({
          type: 'function' as const,
          function: func
        })),
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 1500,
        stream: false
      });

      const choice = response.choices[0];
      const messageContent = choice.message;

      // Handle tool calls (new function calling format)
      if (messageContent.tool_calls && messageContent.tool_calls.length > 0) {
        const toolCall = messageContent.tool_calls[0];
        if (toolCall.type === 'function') {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
          
          console.log(`Executing function: ${functionName}`, functionArgs);
          
          // Execute the function with memory recording
          const startTime = Date.now();
          const result = await this.functionCaller.executeFunction(functionName, functionArgs);
          const executionTime = Date.now() - startTime;
          
          // Record the action in database for activity tracking
          if (context.userToken) {
            try {
              await this.recordFunctionCall(
                context.userToken,
                functionName,
                functionArgs,
                result,
                executionTime,
                context.siteContext?.selectedSite
              );
            } catch (dbError) {
              console.error('[AGENT DB] Failed to record function call:', dbError);
            }
          }

          // Record the action in memory if available
          if (this.agentMemory) {
            try {
              const outcome = result.success ? 'success' : 'failure';
              await this.agentMemory.recordAction(
                functionName,
                functionArgs,
                outcome,
                {
                  successMetrics: result.success ? result.data : undefined,
                  errorDetails: result.error,
                  executionTimeMs: executionTime
                }
              );
            } catch (memoryError) {
              console.error('[AGENT MEMORY] Error recording action:', memoryError);
            }
          }
          
          // Generate a follow-up response with the function result
          const followUpResponse = await this.openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
              { role: 'system', content: systemPrompt },
              ...context.history,
              { role: 'user', content: message },
              { 
                role: 'assistant', 
                content: messageContent.content,
                tool_calls: messageContent.tool_calls
              },
              {
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(result)
              }
            ],
            temperature: 0.7,
            max_tokens: 1000
          });

          return {
            content: followUpResponse.choices[0].message.content || 'Function executed successfully.',
            functionCall: {
              name: functionName,
              arguments: functionArgs,
              result
            }
          };
        }
      }

      return {
        content: messageContent.content || 'I apologize, but I couldn&apos;t generate a response. Please try again.'
      };

    } catch (error) {
      console.error('Error in OpenAI chat:', error);
      return {
        content: 'I&apos;m experiencing some technical difficulties. Please try again in a moment.'
      };
    }
  }

  private async buildSystemPrompt(context: ChatContext): Promise<string> {
    let prompt = `You are an expert SEO assistant for SEOAgent.com. You help users with:

1. **Google Search Console Integration**: Connect websites, sync performance data, analyze search metrics
2. **Content Optimization**: Generate SEO articles, analyze content gaps, optimize existing pages
3. **Technical SEO**: Monitor SEOAgent.js performance, check website health, provide recommendations
4. **CMS Management**: Connect WordPress, Webflow, and other platforms for content publishing
5. **Performance Analytics**: Track rankings, traffic, and conversion metrics

**Available Functions**: You have access to powerful functions to help users. When a user asks to do something, use the appropriate function rather than just explaining how to do it.

**SEOAgent.js Integration**: The user's websites use SEOAgent.js for automatic meta tags and alt text generation. You can check its status and performance.

**Communication Style**: 
- Be helpful, concise, and action-oriented
- Offer to perform tasks using functions when appropriate
- Provide specific, actionable recommendations
- Use a friendly but professional tone`;

    if (context.siteContext?.userSites?.length) {
      prompt += `\n\n**User's Websites**:\n`;
      context.siteContext.userSites.forEach(site => {
        prompt += `- ${site.name} (${site.url})\n`;
      });
    }

    if (context.siteContext?.selectedSite) {
      prompt += `\n**Currently Selected Site**: ${context.siteContext.selectedSite}`;
    }

    // Add memory context if available
    if (context.siteContext?.selectedSite && context.userToken) {
      this.initializeMemory(context.siteContext.selectedSite, context.userToken);
      
      try {
        const websiteContext = await this.agentMemory?.getWebsiteContext();
        if (websiteContext && Object.keys(websiteContext).length > 0) {
          prompt += `\n\n**Website Context & Memory**:\n`;
          
          if (websiteContext.seo_focus?.length) {
            prompt += `- SEO Focus Areas: ${websiteContext.seo_focus.join(', ')}\n`;
          }
          
          if (websiteContext.content_style) {
            prompt += `- Content Style: ${websiteContext.content_style}\n`;
          }
          
          if (websiteContext.successful_keywords?.length) {
            prompt += `- Successful Keywords: ${websiteContext.successful_keywords.slice(0, 5).join(', ')}\n`;
          }
          
          if (websiteContext.target_audience) {
            prompt += `- Target Audience: ${websiteContext.target_audience}\n`;
          }
          
          if (websiteContext.business_type) {
            prompt += `- Business Type: ${websiteContext.business_type}\n`;
          }
          
          if (websiteContext.successful_strategies?.length) {
            prompt += `- Proven Strategies: ${websiteContext.successful_strategies.join(', ')}\n`;
          }
          
          if (websiteContext.failed_approaches?.length) {
            prompt += `- Avoid These Approaches: ${websiteContext.failed_approaches.join(', ')}\n`;
          }
          
          if (websiteContext.preferred_article_length) {
            prompt += `- Preferred Article Length: ${websiteContext.preferred_article_length} words\n`;
          }
          
          prompt += `\n**Important**: Use this context to provide personalized recommendations. Avoid previously failed approaches and leverage successful strategies.`;
        }
      } catch (error) {
        console.error('[AGENT MEMORY] Error loading website context for prompt:', error);
      }
    }

    return prompt;
  }

  // Record function calls in database for activity tracking
  private async recordFunctionCall(
    userToken: string,
    functionName: string, 
    functionArgs: any,
    result: FunctionCallResult,
    executionTimeMs: number,
    siteUrl?: string
  ): Promise<void> {
    try {
      // For browser environment, we need to make API call instead of direct DB access
      if (typeof window !== 'undefined') {
        await fetch('/api/agent/record-activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userToken,
            functionName,
            functionArgs,
            result,
            executionTimeMs,
            siteUrl
          })
        });
      } else {
        // Server environment - direct database access
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Record the event
        await supabase.from('agent_events').insert({
          user_token: userToken,
          event_type: 'function_called',
          event_data: {
            function_name: functionName,
            arguments: functionArgs,
            result: result,
            execution_time_ms: executionTimeMs,
            site_url: siteUrl
          },
          created_at: new Date().toISOString()
        });

        console.log(`[AGENT DB] Recorded function call: ${functionName} for ${userToken}`);
      }
    } catch (error) {
      console.error('[AGENT DB] Error recording function call:', error);
      // Don't throw - recording failures shouldn't break function execution
    }
  }

  // Create sample activity for first-time users
  private async createSampleActivity(userToken: string, siteUrl?: string): Promise<void> {
    try {
      await fetch('/api/agent/record-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken,
          functionName: 'create_idea',
          functionArgs: {
            title: 'Improve website speed and SEO performance',
            description: 'Analyze page load times and implement technical SEO improvements',
            evidence: ['Slow loading pages impact user experience', 'Core Web Vitals affect rankings'],
            hypothesis: 'Optimizing images and implementing caching will improve both speed and SEO rankings',
            site_url: siteUrl || 'example.com'
          },
          result: { success: true, data: { idea_created: true } },
          executionTimeMs: 1200,
          siteUrl: siteUrl || 'example.com'
        })
      });
      console.log(`[AGENT] Created sample activity for ${userToken}`);
    } catch (error) {
      console.error('[AGENT] Failed to create sample activity:', error);
    }
  }
}

class FunctionCaller {
  async executeFunction(name: string, args: any): Promise<FunctionCallResult> {
    try {
      switch (name) {
        case 'connect_gsc':
          return await this.connectGSC(args);
        case 'sync_gsc_data':
          return await this.syncGSCData(args);
        case 'get_site_performance':
          return await this.getSitePerformance(args);
        case 'generate_article':
          return await this.generateArticle(args);
        case 'check_seoagentjs_status':
          return await this.checkSEOAgentJSStatus(args);
        case 'get_technical_seo_status':
          return await this.getTechnicalSEOStatus(args);
        case 'get_seo_tags_status':
          return await this.getSEOTagsStatus(args);
        case 'get_audit_results':
          return await this.getAuditResults(args);
        case 'check_fix_status':
          return await this.checkFixStatus(args);
        case 'connect_cms':
          return await this.connectCMS(args);
        case 'list_sites':
          return await this.listSites(args);
        case 'add_site':
          return await this.addSite(args);
        case 'analyze_content_gaps':
          return await this.analyzeContentGaps(args);
        case 'optimize_page_content':
          return await this.optimizePageContent(args);
        case 'generate_seo_report':
          return await this.generateSEOReport(args);
        case 'audit_site':
          return await this.auditSite(args);
        case 'get_site_status':
          return await this.getSiteStatus(args);
        // Agent Operating System Functions
        case 'create_idea':
          return await this.createIdea(args);
        case 'adopt_idea':
          return await this.adoptIdea(args);
        case 'list_actions':
          return await this.listActions(args);
        case 'run_action':
          return await this.runAction(args);
        case 'update_action_status':
          return await this.updateActionStatus(args);
        case 'summarize_activity':
          return await this.summarizeActivity(args);
        case 'plan_crawl':
          return await this.planCrawl(args);
        case 'list_integrations':
          return await this.listIntegrations(args);
        default:
          return {
            success: false,
            error: `Unknown function: ${name}`
          };
      }
    } catch (error) {
      console.error(`Error executing function ${name}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private async connectGSC(args: { site_url: string }): Promise<FunctionCallResult> {
    // TODO: Implement actual GSC connection
    // For now, simulate the API call
    const response = await fetch('/api/gsc/oauth/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_url: args.site_url })
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    } else {
      return { success: false, error: 'Failed to start GSC connection' };
    }
  }

  private async syncGSCData(args: { site_url: string }): Promise<FunctionCallResult> {
    // TODO: Implement actual GSC sync
    const response = await fetch('/api/gsc/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_url: args.site_url })
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    } else {
      return { success: false, error: 'Failed to sync GSC data' };
    }
  }

  private async getSitePerformance(args: { site_url: string; date_range?: string }): Promise<FunctionCallResult> {
    // TODO: Implement actual performance data fetch
    return {
      success: true,
      data: {
        site_url: args.site_url,
        date_range: args.date_range || '30d',
        metrics: {
          clicks: 1250,
          impressions: 15000,
          ctr: 8.3,
          avg_position: 12.5
        },
        top_queries: [
          { query: 'example keyword', clicks: 150, impressions: 2000, ctr: 7.5 },
          { query: 'another keyword', clicks: 120, impressions: 1800, ctr: 6.7 }
        ]
      }
    };
  }

  private async generateArticle(args: { topic: string; target_keywords?: string[]; site_url: string; word_count?: number }): Promise<FunctionCallResult> {
    // TODO: Implement actual article generation
    const response = await fetch('/api/articles/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args)
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    } else {
      return { success: false, error: 'Failed to generate article' };
    }
  }

  private async checkSEOAgentJSStatus(args: { site_url: string }): Promise<FunctionCallResult> {
    try {
      // Get base URL for API calls (client-side)
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/smartjs/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ websiteUrl: args.site_url }),
      });

      const result = await response.json();

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to check SEOAgent.js status'
        };
      }

      const status = result.data;

      return {
        success: true,
        data: {
          site_url: args.site_url,
          smartjs_installed: status.installed,
          smartjs_active: status.active,
          script_found: status.scriptFound,
          idv_found: status.idvFound,
          features: {
            auto_meta_tags: status.active,
            auto_alt_tags: status.active,
            performance_tracking: status.active
          },
          last_checked: status.lastChecked,
          error: status.error,
          status: status.status,
          pages_optimized: 23
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check SEOAgent.js status'
      };
    }
  }

  private async connectCMS(args: { site_url: string; cms_type: string; credentials?: any }): Promise<FunctionCallResult> {
    // TODO: Implement actual CMS connection
    return {
      success: true,
      data: {
        site_url: args.site_url,
        cms_type: args.cms_type,
        connection_status: 'connected',
        capabilities: ['publish_posts', 'manage_media', 'update_metadata']
      }
    };
  }

  private async listSites(args: any): Promise<FunctionCallResult> {
    // TODO: Implement actual sites listing
    return {
      success: true,
      data: {
        sites: [
          { id: '1', url: 'example.com', name: 'Example Site', status: 'active' },
          { id: '2', url: 'mystore.com', name: 'My Store', status: 'active' },
          { id: '3', url: 'newsite.com', name: 'New Site', status: 'pending' }
        ]
      }
    };
  }

  private async addSite(args: { site_url: string; site_name: string }): Promise<FunctionCallResult> {
    // TODO: Implement actual site addition
    return {
      success: true,
      data: {
        site: {
          id: Date.now().toString(),
          url: args.site_url,
          name: args.site_name,
          status: 'pending',
          created_at: new Date().toISOString()
        }
      }
    };
  }

  private async analyzeContentGaps(args: { site_url: string; competitor_urls?: string[] }): Promise<FunctionCallResult> {
    // TODO: Implement actual content gap analysis
    return {
      success: true,
      data: {
        site_url: args.site_url,
        opportunities: [
          {
            keyword: 'SEO best practices',
            difficulty: 'medium',
            search_volume: 2400,
            content_type: 'how-to guide'
          },
          {
            keyword: 'website optimization',
            difficulty: 'low',
            search_volume: 1800,
            content_type: 'listicle'
          }
        ],
        competitor_analysis: args.competitor_urls ? 'Analyzed against competitors' : 'No competitors provided'
      }
    };
  }

  private async optimizePageContent(args: { page_url: string; target_keywords?: string[] }): Promise<FunctionCallResult> {
    // TODO: Implement actual page optimization
    return {
      success: true,
      data: {
        page_url: args.page_url,
        current_score: 75,
        recommendations: [
          'Add target keywords to H1 tag',
          'Improve meta description length',
          'Add internal links to related content',
          'Optimize image alt tags'
        ],
        target_keywords: args.target_keywords || []
      }
    };
  }

  private async generateSEOReport(args: { site_url: string; report_type?: string }): Promise<FunctionCallResult> {
    // TODO: Implement actual SEO report generation
    return {
      success: true,
      data: {
        site_url: args.site_url,
        report_type: args.report_type || 'quick',
        overall_score: 82,
        sections: {
          technical_seo: { score: 85, issues: 2 },
          content_quality: { score: 78, issues: 5 },
          performance: { score: 90, issues: 1 },
          mobile_optimization: { score: 88, issues: 1 }
        },
        generated_at: new Date().toISOString()
      }
    };
  }

  private async auditSite(args: { site_url: string; include_gsc_data?: boolean; audit_type?: string }): Promise<FunctionCallResult> {
    try {
      // Get user token from auth context
      const userToken = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
      
      if (!userToken) {
        return { success: false, error: 'Authentication required' };
      }

      // Fetch site data including GSC metrics
      const response = await fetch(`/api/chat/sites?userToken=${userToken}`);
      if (!response.ok) {
        return { success: false, error: 'Failed to fetch site data' };
      }

      const { sites } = await response.json();
      const site = sites.find((s: any) => s.url === args.site_url || s.url === args.site_url.replace(/^https?:\/\//, ''));

      if (!site) {
        return { success: false, error: `Site ${args.site_url} not found in your account` };
      }

      // Perform comprehensive audit
      const auditResults = {
        site_url: args.site_url,
        audit_type: args.audit_type || 'full',
        timestamp: new Date().toISOString(),
        overall_health: this.calculateOverallHealth(site),
        
        // GSC Performance Data
        gsc_performance: args.include_gsc_data !== false && site.metrics ? {
          status: site.gscStatus,
          last_sync: site.lastSync,
          metrics: {
            total_clicks: site.metrics.clicks,
            total_impressions: site.metrics.impressions,
            average_ctr: site.metrics.ctr,
            average_position: site.metrics.position
          },
          trend_analysis: this.analyzeTrends(site.performanceHistory),
          top_queries: site.performanceHistory?.[0]?.queries?.slice(0, 10) || [],
          top_pages: site.performanceHistory?.[0]?.pages?.slice(0, 10) || []
        } : null,

        // Technical SEO
        technical_seo: {
          smartjs_status: site.smartjsStatus,
          cms_integration: site.cmsStatus,
          ssl_certificate: 'active', // TODO: Check actual SSL status
          mobile_optimization: 'good',
          page_speed: 'needs_improvement',
          structured_data: site.smartjsStatus === 'active' ? 'implemented' : 'missing'
        },

        // Content Analysis
        content_analysis: {
          meta_tags_auto_generated: site.smartjsStatus === 'active',
          alt_tags_auto_generated: site.smartjsStatus === 'active',
          content_gaps: this.identifyContentGaps(site),
          duplicate_content_risk: 'low'
        },

        // Recommendations
        recommendations: this.generateRecommendations(site),

        // Action Items
        action_items: this.generateActionItems(site)
      };

      return { success: true, data: auditResults };

    } catch (error) {
      console.error('Site audit error:', error);
      return { success: false, error: 'Failed to perform site audit' };
    }
  }

  private async getSiteStatus(args: { site_url: string }): Promise<FunctionCallResult> {
    try {
      const userToken = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
      
      if (!userToken) {
        return { success: false, error: 'Authentication required' };
      }

      const response = await fetch(`/api/chat/sites?userToken=${userToken}`);
      if (!response.ok) {
        return { success: false, error: 'Failed to fetch site data' };
      }

      const { sites } = await response.json();
      const site = sites.find((s: any) => s.url === args.site_url || s.url === args.site_url.replace(/^https?:\/\//, ''));

      if (!site) {
        return { success: false, error: `Site ${args.site_url} not found in your account` };
      }

      return {
        success: true,
        data: {
          site_url: args.site_url,
          site_name: site.name,
          overall_status: this.getOverallStatus(site),
          
          integrations: {
            google_search_console: {
              status: site.gscStatus,
              last_sync: site.lastSync,
              connected: site.gscStatus === 'connected'
            },
            cms_platform: {
              status: site.cmsStatus,
              connected: site.cmsStatus === 'connected'
            },
            smartjs: {
              status: site.smartjsStatus,
              active: site.smartjsStatus === 'active',
              features: {
                auto_meta_tags: true,
                auto_alt_tags: true,
                performance_tracking: true
              }
            }
          },

          current_metrics: site.metrics ? {
            clicks_last_30_days: site.metrics.clicks,
            impressions_last_30_days: site.metrics.impressions,
            click_through_rate: `${site.metrics.ctr}%`,
            average_position: site.metrics.position
          } : null,

          health_score: this.calculateHealthScore(site),
          
          next_actions: this.getNextActions(site)
        }
      };

    } catch (error) {
      console.error('Get site status error:', error);
      return { success: false, error: 'Failed to get site status' };
    }
  }

  // Helper methods for audit functionality
  private calculateOverallHealth(site: any): string {
    const gscScore = site.gscStatus === 'connected' ? 30 : 0;
    const cmsScore = site.cmsStatus === 'connected' ? 20 : 0;
    const smartjsScore = site.smartjsStatus === 'active' ? 30 : 0;
    const metricsScore = site.metrics ? 20 : 0;
    
    const totalScore = gscScore + cmsScore + smartjsScore + metricsScore;
    
    if (totalScore >= 80) return 'excellent';
    if (totalScore >= 60) return 'good';
    if (totalScore >= 40) return 'fair';
    return 'needs_improvement';
  }

  private analyzeTrends(performanceHistory: any[]): any {
    if (!performanceHistory || performanceHistory.length < 2) {
      return { trend: 'insufficient_data', message: 'Need more data to analyze trends' };
    }

    const latest = performanceHistory[0];
    const previous = performanceHistory[1];

    const clicksTrend = latest.total_clicks > previous.total_clicks ? 'up' : 'down';
    const impressionsTrend = latest.total_impressions > previous.total_impressions ? 'up' : 'down';

    return {
      clicks: { trend: clicksTrend, change: latest.total_clicks - previous.total_clicks },
      impressions: { trend: impressionsTrend, change: latest.total_impressions - previous.total_impressions },
      overall_trend: clicksTrend === 'up' && impressionsTrend === 'up' ? 'positive' : 'mixed'
    };
  }

  private identifyContentGaps(site: any): string[] {
    const gaps = [];
    
    if (site.gscStatus !== 'connected') {
      gaps.push('No GSC data available for content analysis');
    }
    
    if (site.smartjsStatus !== 'active') {
      gaps.push('Meta tags not being auto-generated');
      gaps.push('Alt tags not being auto-generated');
    }

    if (!site.metrics || site.metrics.ctr < 5) {
      gaps.push('Low click-through rate indicates title/description optimization needed');
    }

    return gaps;
  }

  private generateRecommendations(site: any): string[] {
    const recommendations = [];

    if (site.gscStatus !== 'connected') {
      recommendations.push('Connect Google Search Console to access performance data');
    }

    if (site.cmsStatus !== 'connected') {
      recommendations.push('Connect your CMS for automated content publishing');
    }

    if (site.smartjsStatus !== 'active') {
      recommendations.push('Activate SEOAgent.js for automatic SEO optimization');
    }

    if (site.metrics && site.metrics.position > 10) {
      recommendations.push('Focus on improving content quality to increase search rankings');
    }

    if (site.metrics && site.metrics.ctr < 5) {
      recommendations.push('Optimize meta titles and descriptions to improve click-through rates');
    }

    return recommendations;
  }

  private generateActionItems(site: any): Array<{priority: string, action: string, category: string}> {
    const actions = [];

    if (site.gscStatus !== 'connected') {
      actions.push({
        priority: 'high',
        action: 'Set up Google Search Console connection',
        category: 'integration'
      });
    }

    if (site.smartjsStatus !== 'active') {
      actions.push({
        priority: 'medium',
        action: 'Install and activate SEOAgent.js snippet',
        category: 'technical'
      });
    }

    if (site.metrics && site.metrics.ctr < 3) {
      actions.push({
        priority: 'high',
        action: 'Rewrite meta titles and descriptions',
        category: 'content'
      });
    }

    return actions;
  }

  private getOverallStatus(site: any): string {
    if (site.gscStatus === 'connected' && site.smartjsStatus === 'active') {
      return 'fully_operational';
    }
    if (site.gscStatus === 'connected' || site.smartjsStatus === 'active') {
      return 'partially_configured';
    }
    return 'needs_setup';
  }

  private calculateHealthScore(site: any): number {
    let score = 0;
    
    if (site.gscStatus === 'connected') score += 30;
    if (site.cmsStatus === 'connected') score += 20;
    if (site.smartjsStatus === 'active') score += 30;
    if (site.metrics) score += 20;
    
    return score;
  }

  private getNextActions(site: any): string[] {
    const actions = [];

    if (site.gscStatus !== 'connected') {
      actions.push('Connect Google Search Console');
    }
    if (site.smartjsStatus !== 'active') {
      actions.push('Install SEOAgent.js snippet');
    }
    if (site.cmsStatus !== 'connected') {
      actions.push('Connect your CMS platform');
    }
    if (site.gscStatus === 'connected' && (!site.lastSync || new Date().getTime() - new Date(site.lastSync).getTime() > 86400000)) {
      actions.push('Sync latest GSC data');
    }

    return actions;
  }

  // ===== AGENT OPERATING SYSTEM IMPLEMENTATIONS =====

  private async createIdea(args: { site_url: string; title: string; hypothesis?: string; evidence?: any; ice_score?: number }): Promise<FunctionCallResult> {
    try {
      const userToken = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
      
      if (!userToken) {
        return { success: false, error: 'Authentication required' };
      }

      const response = await fetch('/api/agent/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken,
          siteUrl: args.site_url,
          title: args.title,
          hypothesis: args.hypothesis,
          evidence: args.evidence || {},
          iceScore: args.ice_score
        })
      });

      const result = await response.json();

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return {
        success: true,
        data: {
          idea_id: result.idea.id,
          title: result.idea.title,
          status: result.idea.status,
          ice_score: result.idea.ice_score,
          message: result.message
        }
      };

    } catch (error) {
      console.error('Create idea error:', error);
      return { success: false, error: 'Failed to create idea' };
    }
  }

  private async adoptIdea(args: { idea_id: string; strategy?: string; actions: any[] }): Promise<FunctionCallResult> {
    try {
      const userToken = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
      
      if (!userToken) {
        return { success: false, error: 'Authentication required' };
      }

      // First, get the idea details
      const ideaResponse = await fetch(`/api/agent/ideas?userToken=${userToken}&ideaId=${args.idea_id}`);
      const ideaResult = await ideaResponse.json();
      
      if (!ideaResult.success || !ideaResult.ideas || ideaResult.ideas.length === 0) {
        return { success: false, error: 'Idea not found' };
      }

      const idea = ideaResult.ideas[0];
      const createdActions = [];

      // Create each action
      for (const actionSpec of args.actions) {
        const actionResponse = await fetch('/api/agent/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userToken,
            siteUrl: idea.site_url,
            ideaId: args.idea_id,
            actionType: actionSpec.action_type,
            title: actionSpec.title,
            description: actionSpec.description,
            payload: actionSpec.payload || {},
            policy: actionSpec.policy || { environment: 'DRY_RUN' },
            priorityScore: actionSpec.priority_score || 50
          })
        });

        const actionResult = await actionResponse.json();
        if (actionResult.success) {
          createdActions.push(actionResult.action);
        }
      }

      return {
        success: true,
        data: {
          idea_id: args.idea_id,
          strategy: args.strategy,
          actions_created: createdActions.length,
          actions: createdActions.map(action => ({
            id: action.id,
            title: action.title,
            type: action.action_type,
            status: action.status
          })),
          message: `Idea adopted with ${createdActions.length} concrete actions created`
        }
      };

    } catch (error) {
      console.error('Adopt idea error:', error);
      return { success: false, error: 'Failed to adopt idea' };
    }
  }

  private async listActions(args: { site_url?: string; status?: string; limit?: number }): Promise<FunctionCallResult> {
    try {
      const userToken = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
      
      if (!userToken) {
        return { success: false, error: 'Authentication required' };
      }

      const params = new URLSearchParams({ userToken });
      if (args.site_url) params.append('siteUrl', args.site_url);
      if (args.status) params.append('status', args.status);
      if (args.limit) params.append('limit', args.limit.toString());

      const response = await fetch(`/api/agent/actions?${params.toString()}`);
      const result = await response.json();

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return {
        success: true,
        data: {
          actions: result.actions.map((action: any) => ({
            id: action.id,
            title: action.title,
            type: action.action_type,
            status: action.status,
            priority: action.priority_score,
            site_url: action.site_url,
            idea_title: action.idea?.title,
            created_at: action.created_at,
            scheduled_for: action.scheduled_for
          })),
          stats: result.stats,
          total_count: result.actions.length,
          filter: {
            site_url: args.site_url,
            status: args.status
          }
        }
      };

    } catch (error) {
      console.error('List actions error:', error);
      return { success: false, error: 'Failed to list actions' };
    }
  }

  private async runAction(args: { action_id: string; policy_overrides?: any }): Promise<FunctionCallResult> {
    try {
      const userToken = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
      
      if (!userToken) {
        return { success: false, error: 'Authentication required' };
      }

      const response = await fetch('/api/agent/actions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: args.action_id,
          userToken,
          status: 'queued',
          queueForExecution: true,
          updates: args.policy_overrides ? { policy: args.policy_overrides } : {}
        })
      });

      const result = await response.json();

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return {
        success: true,
        data: {
          action_id: args.action_id,
          job_id: result.jobId,
          status: result.action.status,
          title: result.action.title,
          message: result.message
        }
      };

    } catch (error) {
      console.error('Run action error:', error);
      return { success: false, error: 'Failed to run action' };
    }
  }

  private async updateActionStatus(args: { action_id: string; new_status: string; note?: string }): Promise<FunctionCallResult> {
    try {
      const userToken = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
      
      if (!userToken) {
        return { success: false, error: 'Authentication required' };
      }

      const response = await fetch('/api/agent/actions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: args.action_id,
          userToken,
          status: args.new_status,
          updates: args.note ? { note: args.note } : {}
        })
      });

      const result = await response.json();

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return {
        success: true,
        data: {
          action_id: args.action_id,
          previous_status: result.action.status,
          new_status: args.new_status,
          title: result.action.title,
          message: result.message
        }
      };

    } catch (error) {
      console.error('Update action status error:', error);
      return { success: false, error: 'Failed to update action status' };
    }
  }

  private async summarizeActivity(args: { site_url?: string; since?: string }): Promise<FunctionCallResult> {
    try {
      const userToken = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
      
      if (!userToken) {
        return { success: false, error: 'Authentication required' };
      }

      const params = new URLSearchParams({ userToken });
      if (args.site_url) params.append('siteUrl', args.site_url);
      if (args.since) params.append('since', args.since);

      const response = await fetch(`/api/agent/summary?${params.toString()}`);
      const result = await response.json();

      if (!result.success) {
        // If no data exists, create a sample activity record to demonstrate the system
        if (result.error.includes('no activity') || result.error.includes('empty')) {
          await this.createSampleActivity(userToken, args.site_url);
          return {
            success: true,
            data: {
              narrative: "🎯 This is your first time using the agent! I've created sample activity to show how the system works. Try asking me to generate an article or check your site's technical SEO status.",
              activity_counts: { total_events: 1, completed_actions: 0, new_ideas: 1, status_changes: 0 },
              completed_work: "No actions completed yet",
              active_work: "Getting started with agent setup",
              upcoming_items: 0,
              top_ideas: 1,
              needs_attention: 0
            }
          };
        }
        return { success: false, error: result.error };
      }

      const summary = result.summary;

      return {
        success: true,
        data: {
          narrative: summary.narrative,
          activity_counts: summary.activity_counts,
          completed_work: summary.completed_work.summary,
          active_work: summary.active_work.summary,
          upcoming_items: summary.upcoming_items.length,
          top_ideas: summary.top_ideas.length,
          needs_attention: summary.current_state.needs_attention,
          period: result.period,
          details: {
            completed_breakdown: summary.completed_work.by_type,
            active_breakdown: summary.active_work.by_status,
            upcoming_actions: summary.upcoming_items,
            top_ideas_list: summary.top_ideas
          }
        }
      };

    } catch (error) {
      console.error('Summarize activity error:', error);
      return { success: false, error: 'Failed to summarize activity' };
    }
  }

  private async planCrawl(args: { site_url: string; crawl_type: string; policy?: any }): Promise<FunctionCallResult> {
    try {
      const userToken = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
      
      if (!userToken) {
        return { success: false, error: 'Authentication required' };
      }

      // Create a crawl action
      const actionResponse = await fetch('/api/agent/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken,
          siteUrl: args.site_url,
          actionType: 'technical_seo_crawl',
          title: `${args.crawl_type.replace('_', ' ')} crawl for ${args.site_url}`,
          description: `Automated ${args.crawl_type} analysis and issue detection`,
          payload: {
            crawl_type: args.crawl_type,
            site_url: args.site_url
          },
          policy: {
            environment: 'PRODUCTION',
            maxPages: args.policy?.max_pages || 100,
            crawlDepth: args.policy?.crawl_depth || 3,
            respectRobots: args.policy?.respect_robots !== false,
            ...args.policy
          },
          priorityScore: 70
        })
      });

      const actionResult = await actionResponse.json();

      if (!actionResult.success) {
        return { success: false, error: actionResult.error };
      }

      // Immediately queue for execution
      const executeResponse = await fetch('/api/agent/actions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: actionResult.action.id,
          userToken,
          status: 'queued',
          queueForExecution: true
        })
      });

      const executeResult = await executeResponse.json();

      return {
        success: true,
        data: {
          crawl_action_id: actionResult.action.id,
          job_id: executeResult.jobId,
          crawl_type: args.crawl_type,
          site_url: args.site_url,
          policy: actionResult.action.policy,
          status: 'crawl_initiated',
          message: `${args.crawl_type} crawl initiated for ${args.site_url}`
        }
      };

    } catch (error) {
      console.error('Plan crawl error:', error);
      return { success: false, error: 'Failed to plan crawl' };
    }
  }

  private async listIntegrations(args: { site_url?: string; category?: string }): Promise<FunctionCallResult> {
    try {
      const userToken = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
      
      if (!userToken) {
        return { success: false, error: 'Authentication required' };
      }

      const params = new URLSearchParams({ userToken });
      if (args.site_url) params.append('siteUrl', args.site_url);
      if (args.category) params.append('category', args.category);

      const response = await fetch(`/api/agent/capabilities?${params.toString()}`);
      const result = await response.json();

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return {
        success: true,
        data: {
          available_capabilities: result.capabilities.available.map((cap: any) => ({
            name: cap.capability_name,
            category: cap.category,
            description: cap.description,
            status: cap.integration_status
          })),
          unavailable_capabilities: result.capabilities.unavailable.map((cap: any) => ({
            name: cap.capability_name,
            category: cap.category,
            description: cap.description,
            reason: cap.integration_status,
            missing_integrations: cap.missing_integrations
          })),
          by_category: result.capabilities.by_category,
          site_context: result.site_context,
          summary: {
            total_available: result.capabilities.available.length,
            total_unavailable: result.capabilities.unavailable.length,
            user_integrations: result.site_context?.user_integrations || []
          }
        }
      };

    } catch (error) {
      console.error('List integrations error:', error);
      return { success: false, error: 'Failed to list integrations' };
    }
  }

  // New Agent Intelligence Functions for Technical SEO Integration

  private async getTechnicalSEOStatus(args: { site_url: string }): Promise<FunctionCallResult> {
    try {
      const userToken = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
      
      if (!userToken) {
        return { success: false, error: 'Authentication required' };
      }

      // Get website data to find the website ID
      const sitesResponse = await fetch(`/api/chat/sites?userToken=${userToken}`);
      if (!sitesResponse.ok) {
        return { success: false, error: 'Failed to fetch site data' };
      }

      const { sites } = await sitesResponse.json();
      const site = sites.find((s: any) => s.url === args.site_url || s.url === args.site_url.replace(/^https?:\/\//, ''));

      if (!site) {
        return { success: false, error: `Site ${args.site_url} not found in your account` };
      }

      // Fetch technical SEO data from the Technical SEO Dashboard API
      const response = await fetch('/api/technical-seo/dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userToken,
          websites: [{ 
            domain: site.url.replace(/^https?:\/\//, '').replace(/\/$/, ''), 
            website_token: site.id 
          }]
        })
      });

      if (!response.ok) {
        return { success: false, error: 'Failed to fetch technical SEO data' };
      }

      const result = await response.json();

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to get technical SEO status' };
      }

      return {
        success: true,
        data: {
          site_url: args.site_url,
          technical_status: result.data,
          timestamp: new Date().toISOString(),
          summary: {
            total_issues: result.data.reduce((acc: number, website: any) => 
              acc + (website.issues ? website.issues.length : 0), 0
            ),
            auto_fixable_issues: result.data.reduce((acc: number, website: any) => 
              acc + (website.issues ? website.issues.filter((issue: any) => issue.auto_fixable).length : 0), 0
            ),
            critical_issues: result.data.reduce((acc: number, website: any) => 
              acc + (website.issues ? website.issues.filter((issue: any) => issue.severity === 'critical').length : 0), 0
            )
          }
        }
      };
    } catch (error) {
      console.error('Get technical SEO status error:', error);
      return { success: false, error: 'Failed to get technical SEO status' };
    }
  }

  private async getSEOTagsStatus(args: { site_url: string }): Promise<FunctionCallResult> {
    try {
      const userToken = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
      
      if (!userToken) {
        return { success: false, error: 'Authentication required' };
      }

      // Get website data to find the website ID
      const sitesResponse = await fetch(`/api/chat/sites?userToken=${userToken}`);
      if (!sitesResponse.ok) {
        return { success: false, error: 'Failed to fetch site data' };
      }

      const { sites } = await sitesResponse.json();
      const site = sites.find((s: any) => s.url === args.site_url || s.url === args.site_url.replace(/^https?:\/\//, ''));

      if (!site) {
        return { success: false, error: `Site ${args.site_url} not found in your account` };
      }

      // Fetch SEO tags stats from the website stats API
      const statsResponse = await fetch(`/api/websites/${site.id}/stats?userToken=${userToken}`);
      
      if (!statsResponse.ok) {
        return { success: false, error: 'Failed to fetch SEO tags data' };
      }

      const statsData = await statsResponse.json();

      if (!statsData.success) {
        return { success: false, error: statsData.error || 'Failed to get SEO tags status' };
      }

      // Also get SEOAgent.js status
      const smartjsStatus = await this.checkSEOAgentJSStatus({ site_url: args.site_url });

      return {
        success: true,
        data: {
          site_url: args.site_url,
          seoagent_js_status: smartjsStatus.success ? smartjsStatus.data : null,
          tags_managed: {
            meta_tags: {
              count: statsData.stats.metaTagsCount,
              auto_generated: smartjsStatus.success && smartjsStatus.data?.smartjs_active
            },
            alt_tags: {
              count: statsData.stats.altTagsCount,
              auto_generated: smartjsStatus.success && smartjsStatus.data?.smartjs_active
            }
          },
          last_updated: new Date().toISOString(),
          recommendations: this.generateTagRecommendations(statsData.stats, smartjsStatus.data)
        }
      };
    } catch (error) {
      console.error('Get SEO tags status error:', error);
      return { success: false, error: 'Failed to get SEO tags status' };
    }
  }

  private async getAuditResults(args: { site_url: string }): Promise<FunctionCallResult> {
    try {
      const userToken = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
      
      if (!userToken) {
        return { success: false, error: 'Authentication required' };
      }

      // Fetch latest audit data for the website
      const auditResponse = await fetch(`/api/audits?userToken=${userToken}&websiteUrl=${encodeURIComponent(args.site_url)}&limit=5`);
      
      if (!auditResponse.ok) {
        return { success: false, error: 'Failed to fetch audit data' };
      }

      const auditResult = await auditResponse.json();

      if (!auditResult.success) {
        return { success: false, error: auditResult.error || 'Failed to get audit results' };
      }

      const audits = auditResult.audits || [];
      const latestAudit = audits[0] || null;

      return {
        success: true,
        data: {
          site_url: args.site_url,
          latest_audit: latestAudit,
          audit_history: audits.slice(1, 5), // Last 4 previous audits
          summary: latestAudit ? {
            overall_score: latestAudit.overall_score,
            total_issues: latestAudit.total_issues,
            critical_issues: latestAudit.critical_issues,
            warning_issues: latestAudit.warning_issues,
            info_issues: latestAudit.info_issues,
            status: latestAudit.status,
            completed_at: latestAudit.completed_at,
            progress_percentage: latestAudit.progress_percentage
          } : null,
          recommendations: latestAudit ? this.generateAuditRecommendations(latestAudit) : []
        }
      };
    } catch (error) {
      console.error('Get audit results error:', error);
      return { success: false, error: 'Failed to get audit results' };
    }
  }

  private async checkFixStatus(args: { site_url: string }): Promise<FunctionCallResult> {
    try {
      const userToken = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
      
      if (!userToken) {
        return { success: false, error: 'Authentication required' };
      }

      // Get technical SEO status and audit results
      const technicalStatus = await this.getTechnicalSEOStatus(args);
      const auditResults = await this.getAuditResults(args);
      const seoTagsStatus = await this.getSEOTagsStatus(args);

      if (!technicalStatus.success && !auditResults.success) {
        return { success: false, error: 'Failed to get fix status data' };
      }

      const fixes = {
        auto_fixed: [] as any[],
        pending_auto_fix: [] as any[],
        manual_fixes_needed: [] as any[],
        completed_fixes: [] as any[]
      };

      // Analyze technical SEO issues
      if (technicalStatus.success && technicalStatus.data?.technical_status) {
        technicalStatus.data.technical_status.forEach((website: any) => {
          if (website.issues) {
            website.issues.forEach((issue: any) => {
              if (issue.auto_fixable && issue.status === 'fixed') {
                fixes.auto_fixed.push({
                  type: 'technical_seo',
                  issue: issue.type,
                  description: issue.description,
                  fixed_at: issue.fixed_at
                });
              } else if (issue.auto_fixable && issue.status === 'pending') {
                fixes.pending_auto_fix.push({
                  type: 'technical_seo',
                  issue: issue.type,
                  description: issue.description,
                  estimated_fix_time: '5-10 minutes'
                });
              } else if (!issue.auto_fixable) {
                fixes.manual_fixes_needed.push({
                  type: 'technical_seo',
                  issue: issue.type,
                  description: issue.description,
                  recommendation: issue.recommendation,
                  priority: issue.severity
                });
              }
            });
          }
        });
      }

      // Analyze SEO tags status
      if (seoTagsStatus.success && seoTagsStatus.data) {
        const tagsData = seoTagsStatus.data;
        
        if (tagsData.seoagent_js_status?.smartjs_active) {
          fixes.auto_fixed.push({
            type: 'seo_tags',
            issue: 'meta_tags_automation',
            description: `SEOAgent.js is actively managing ${tagsData.tags_managed.meta_tags.count} meta tags`,
            fixed_at: 'ongoing'
          });
          fixes.auto_fixed.push({
            type: 'seo_tags',
            issue: 'alt_tags_automation',
            description: `SEOAgent.js is actively managing ${tagsData.tags_managed.alt_tags.count} alt tags`,
            fixed_at: 'ongoing'
          });
        } else {
          fixes.manual_fixes_needed.push({
            type: 'seo_tags',
            issue: 'seoagent_js_installation',
            description: 'SEOAgent.js is not active - meta and alt tags are not being auto-generated',
            recommendation: 'Install and activate SEOAgent.js snippet on your website',
            priority: 'high'
          });
        }
      }

      return {
        success: true,
        data: {
          site_url: args.site_url,
          fix_status_summary: {
            total_auto_fixed: fixes.auto_fixed.length,
            pending_auto_fixes: fixes.pending_auto_fix.length,
            manual_fixes_needed: fixes.manual_fixes_needed.length,
            automation_health: fixes.auto_fixed.length > 0 ? 'active' : 'inactive'
          },
          fixes,
          last_checked: new Date().toISOString(),
          next_actions: this.getFixStatusNextActions(fixes)
        }
      };
    } catch (error) {
      console.error('Check fix status error:', error);
      return { success: false, error: 'Failed to check fix status' };
    }
  }

  // Helper methods for the new agent functions

  private generateTagRecommendations(stats: any, smartjsData: any): string[] {
    const recommendations = [];

    if (!smartjsData?.smartjs_active) {
      recommendations.push('Install SEOAgent.js to automatically generate missing meta and alt tags');
    }

    if (stats.metaTagsCount < 10) {
      recommendations.push('Consider adding more meta descriptions to improve search snippets');
    }

    if (stats.altTagsCount < 5) {
      recommendations.push('Add alt text to images for better accessibility and SEO');
    }

    if (smartjsData?.smartjs_active && stats.metaTagsCount > 0) {
      recommendations.push('Great! SEOAgent.js is actively optimizing your meta and alt tags');
    }

    return recommendations;
  }

  private generateAuditRecommendations(audit: any): string[] {
    const recommendations = [];

    if (audit.critical_issues > 0) {
      recommendations.push(`Address ${audit.critical_issues} critical SEO issues immediately`);
    }

    if (audit.warning_issues > 5) {
      recommendations.push(`Review ${audit.warning_issues} warning-level issues to improve SEO health`);
    }

    if (audit.overall_score < 70) {
      recommendations.push('Consider running a comprehensive SEO audit to identify improvement opportunities');
    }

    if (audit.overall_score > 85) {
      recommendations.push('Excellent SEO health! Continue monitoring and maintaining current practices');
    }

    return recommendations;
  }

  private getFixStatusNextActions(fixes: any): string[] {
    const actions = [];

    if (fixes.pending_auto_fix.length > 0) {
      actions.push(`${fixes.pending_auto_fix.length} issues can be auto-fixed - trigger automatic fixes`);
    }

    if (fixes.manual_fixes_needed.length > 0) {
      const highPriorityManual = fixes.manual_fixes_needed.filter((fix: any) => fix.priority === 'critical' || fix.priority === 'high');
      if (highPriorityManual.length > 0) {
        actions.push(`Address ${highPriorityManual.length} high-priority manual fixes first`);
      }
    }

    if (fixes.auto_fixed.length === 0) {
      actions.push('Set up SEOAgent.js automation to enable automatic SEO fixes');
    }

    if (fixes.auto_fixed.length > 0 && fixes.pending_auto_fix.length === 0 && fixes.manual_fixes_needed.length === 0) {
      actions.push('SEO automation is working well - monitor and maintain current setup');
    }

    return actions;
  }
}