import OpenAI from 'openai';

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
}

interface FunctionCallResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class OpenAIFunctionClient {
  private openai: OpenAI;
  private functionCaller: FunctionCaller;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    this.functionCaller = new FunctionCaller();
  }

  private getFunctionSchemas() {
    return [
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
        name: 'check_smartjs_status',
        description: 'Check Smart.js installation and performance status',
        parameters: {
          type: 'object',
          properties: {
            site_url: { 
              type: 'string', 
              description: 'Website to check Smart.js status for' 
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
      const systemPrompt = this.buildSystemPrompt(context);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          ...context.history,
          { role: 'user', content: message }
        ],
        functions: this.getFunctionSchemas(),
        function_call: 'auto',
        temperature: 0.7,
        max_tokens: 1500
      });

      const choice = response.choices[0];
      const messageContent = choice.message;

      // Handle function calls
      if (messageContent.function_call) {
        const functionName = messageContent.function_call.name;
        const functionArgs = JSON.parse(messageContent.function_call.arguments || '{}');
        
        console.log(`Executing function: ${functionName}`, functionArgs);
        
        // Execute the function
        const result = await this.functionCaller.executeFunction(functionName, functionArgs);
        
        // Generate a follow-up response with the function result
        const followUpResponse = await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            ...context.history,
            { role: 'user', content: message },
            { 
              role: 'assistant', 
              content: null,
              function_call: messageContent.function_call
            },
            {
              role: 'function',
              name: functionName,
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

  private buildSystemPrompt(context: ChatContext): string {
    let prompt = `You are an expert SEO assistant for SEOMetrics.ai. You help users with:

1. **Google Search Console Integration**: Connect websites, sync performance data, analyze search metrics
2. **Content Optimization**: Generate SEO articles, analyze content gaps, optimize existing pages
3. **Technical SEO**: Monitor Smart.js performance, check website health, provide recommendations
4. **CMS Management**: Connect WordPress, Webflow, and other platforms for content publishing
5. **Performance Analytics**: Track rankings, traffic, and conversion metrics

**Available Functions**: You have access to powerful functions to help users. When a user asks to do something, use the appropriate function rather than just explaining how to do it.

**Smart.js Integration**: The user's websites use Smart.js for automatic meta tags and alt text generation. You can check its status and performance.

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

    return prompt;
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
        case 'check_smartjs_status':
          return await this.checkSmartJSStatus(args);
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

  private async checkSmartJSStatus(args: { site_url: string }): Promise<FunctionCallResult> {
    // TODO: Implement actual Smart.js status check
    return {
      success: true,
      data: {
        site_url: args.site_url,
        smartjs_installed: true,
        features: {
          auto_meta_tags: true,
          auto_alt_tags: true,
          performance_tracking: true
        },
        last_activity: new Date().toISOString(),
        performance: {
          meta_tags_generated: 145,
          alt_tags_generated: 89,
          pages_optimized: 23
        }
      }
    };
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
}