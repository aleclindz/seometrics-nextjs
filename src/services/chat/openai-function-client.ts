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
      const systemPrompt = this.buildSystemPrompt(context);
      
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
        case 'audit_site':
          return await this.auditSite(args);
        case 'get_site_status':
          return await this.getSiteStatus(args);
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
      recommendations.push('Activate Smart.js for automatic SEO optimization');
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
        action: 'Install and activate Smart.js snippet',
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
      actions.push('Install Smart.js snippet');
    }
    if (site.cmsStatus !== 'connected') {
      actions.push('Connect your CMS platform');
    }
    if (site.gscStatus === 'connected' && (!site.lastSync || new Date().getTime() - new Date(site.lastSync).getTime() > 86400000)) {
      actions.push('Sync latest GSC data');
    }

    return actions;
  }
}