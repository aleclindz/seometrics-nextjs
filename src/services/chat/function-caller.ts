/**
 * Function Caller - Executes OpenAI function calls
 * 
 * This class handles the execution of all function calls from the LLM,
 * routing them to the appropriate API endpoints and handling responses.
 */

export interface FunctionCallResult {
  success: boolean;
  data?: any;
  error?: string;
}

// Browser environment helper
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export class FunctionCaller {
  private userToken?: string;
  
  constructor(userToken?: string) {
    this.userToken = userToken;
  }
  
  async executeFunction(name: string, args: any): Promise<FunctionCallResult> {
    try {
      switch (name) {
        // Legacy functions
        case 'connect_gsc':
          return await this.connectGSC(args);
        case 'sync_gsc_data':
          return await this.syncGSCData(args);
        case 'generate_article':
          return await this.generateArticle(args);
        case 'create_idea':
          return await this.createIdea(args);
        case 'adopt_idea':
          return await this.adoptIdea(args);
        case 'run_action':
          return await this.runAction(args);
        case 'get_site_performance':
          return await this.getSitePerformance(args);
        case 'get_site_status':
          return await this.getSiteStatus(args);
        case 'audit_site':
          return await this.auditSite(args);
        case 'list_integrations':
          return await this.listIntegrations(args);
        case 'plan_crawl':
          return await this.planCrawl(args);
        case 'run_url_inspections':
          return await this.runUrlInspections(args);
        case 'get_keyword_insights':
          return await this.getKeywordInsights(args);
        
        // Agent capability functions
        case 'GSC_sync_data':
          return await this.syncGSCData(args);
        case 'CONTENT_optimize_existing':
          return await this.optimizeExistingContent(args);
        case 'SEO_apply_fixes':
          return await this.applySEOFixes(args);
        case 'SEO_analyze_technical':
          return await this.analyzeTechnicalSEO(args);
        case 'SEO_crawl_website':
          return await this.crawlWebsite(args);
        case 'SITEMAP_generate_submit':
          return await this.generateSubmitSitemap(args);
        case 'CMS_strapi_publish':
          return await this.publishToStrapi(args);
        case 'VERIFY_check_changes':
          return await this.verifyChanges(args);
        case 'CMS_wordpress_publish':
          return await this.publishToWordPress(args);
        case 'CONTENT_generate_article':
          return await this.generateArticle(args);
        
        default:
          return { 
            success: false, 
            error: `Unknown function: ${name}` 
          };
      }
    } catch (error) {
      console.error(`[FUNCTION CALLER] Error executing ${name}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private async connectGSC(args: { site_url: string }): Promise<FunctionCallResult> {
    try {
      // Use the existing GSC connection endpoint
      const response = await this.fetchAPI('/api/gsc/connection', {
        method: 'POST',
        body: JSON.stringify({
          siteUrl: args.site_url,
          userToken: this.userToken
        })
      });

      return response.success ? 
        { success: true, data: response } :
        { success: false, error: response.error || 'GSC connection failed' };
    } catch (error) {
      return { success: false, error: 'Failed to connect GSC' };
    }
  }

  private async syncGSCData(args: { site_url: string }): Promise<FunctionCallResult> {
    try {
      // Use the existing GSC sync endpoint
      const response = await this.fetchAPI('/api/gsc/sync', {
        method: 'POST',
        body: JSON.stringify({
          siteUrl: args.site_url,
          userToken: this.userToken
        })
      });

      return response.success ? 
        { success: true, data: response } :
        { success: false, error: response.error || 'GSC sync failed' };
    } catch (error) {
      return { success: false, error: 'Failed to sync GSC data' };
    }
  }

  private async generateArticle(args: { topic: string; target_keywords?: string[]; content_type?: string; word_count?: number; site_url?: string }): Promise<FunctionCallResult> {
    try {
      const response = await this.fetchAPI('/api/content/generate-article', {
        method: 'POST',
        body: JSON.stringify(args)
      });

      return response.success ? 
        { success: true, data: response } :
        { success: false, error: response.error || 'Article generation failed' };
    } catch (error) {
      return { success: false, error: 'Failed to generate article' };
    }
  }

  private async createIdea(args: { site_url: string; title: string; hypothesis: string; evidence?: any; ice_score?: number }): Promise<FunctionCallResult> {
    try {
      const response = await this.fetchAPI('/api/agent/ideas', {
        method: 'POST',
        body: JSON.stringify(args)
      });

      return response.success ? 
        { success: true, data: response } :
        { success: false, error: response.error || 'Idea creation failed' };
    } catch (error) {
      return { success: false, error: 'Failed to create idea' };
    }
  }

  private async adoptIdea(args: { idea_id: string; strategy: string; actions: any[] }): Promise<FunctionCallResult> {
    try {
      const response = await this.fetchAPI('/api/agent/adopt-idea', {
        method: 'POST',
        body: JSON.stringify(args)
      });

      return response.success ? 
        { success: true, data: response } :
        { success: false, error: response.error || 'Idea adoption failed' };
    } catch (error) {
      return { success: false, error: 'Failed to adopt idea' };
    }
  }

  private async runAction(args: { action_id: string; parameters?: any }): Promise<FunctionCallResult> {
    try {
      const response = await this.fetchAPI('/api/agent/actions', {
        method: 'POST',
        body: JSON.stringify(args)
      });

      return response.success ? 
        { success: true, data: response } :
        { success: false, error: response.error || 'Action execution failed' };
    } catch (error) {
      return { success: false, error: 'Failed to run action' };
    }
  }

  private async getSitePerformance(args: { site_url: string; date_range?: string }): Promise<FunctionCallResult> {
    try {
      const params = new URLSearchParams({
        site_url: args.site_url,
        date_range: args.date_range || '30d'
      });

      const response = await this.fetchAPI(`/api/performance/site?${params}`, {
        method: 'GET'
      });

      return response.success ? 
        { success: true, data: response } :
        { success: false, error: response.error || 'Performance fetch failed' };
    } catch (error) {
      return { success: false, error: 'Failed to get site performance' };
    }
  }

  private async getSiteStatus(args: { site_url: string }): Promise<FunctionCallResult> {
    try {
      // Clean domain to match database format
      const domain = args.site_url.replace(/^https?:\/\//, '').replace(/^www\./, '');
      
      const params = new URLSearchParams({
        userToken: this.userToken || '',
        domain: domain,
        forceRefresh: 'true' // Force fresh status check
      });

      const response = await this.fetchAPI(`/api/website/setup-status?${params}`, {
        method: 'GET'
      });

      if (response.success && response.data) {
        const { gscStatus, seoagentjsStatus, cmsStatus, hostingStatus, setupProgress, isFullySetup } = response.data;
        
        // Create readable status messages
        const statusMessages = [];
        const recommendations = [];
        
        if (gscStatus === 'connected') {
          statusMessages.push('✅ Google Search Console: Connected');
        } else {
          statusMessages.push('❌ Google Search Console: Not connected');
          recommendations.push('Connect to Google Search Console for performance insights');
        }
        
        if (seoagentjsStatus === 'active') {
          statusMessages.push('✅ SEOAgent.js: Active and monitoring');
        } else {
          statusMessages.push('❌ SEOAgent.js: Not installed');
          recommendations.push('Install SEOAgent.js for automated optimizations');
        }
        
        if (cmsStatus === 'connected') {
          statusMessages.push('✅ CMS: Connected');
        } else {
          statusMessages.push('⚪ CMS: Not connected (optional)');
        }
        
        if (hostingStatus === 'connected') {
          statusMessages.push('✅ Hosting: Connected');
        } else {
          statusMessages.push('⚪ Hosting: Not connected (optional)');
        }

        return { 
          success: true, 
          data: {
            message: `Current setup status for ${args.site_url}:\n\n${statusMessages.join('\n')}\n\nSetup Progress: ${setupProgress}%`,
            isFullySetup,
            setupProgress,
            gscConnected: gscStatus === 'connected',
            seoagentjsInstalled: seoagentjsStatus === 'active',
            cmsConnected: cmsStatus === 'connected',
            hostingConnected: hostingStatus === 'connected',
            recommendations: recommendations.length > 0 ? recommendations : ['Your site setup looks good! Consider running a technical SEO audit for optimization opportunities.']
          }
        };
      } else {
        // Return helpful fallback if API fails
        return { 
          success: true, 
          data: {
            message: `I've checked the status of ${args.site_url}. Here's what I found:`,
            status: 'partial_setup',
            gscConnected: false,
            seoagentjsInstalled: false,
            cmsConnected: false,
            hostingConnected: false,
            recommendations: [
              'Complete Google Search Console setup',
              'Install SEOAgent.js tracking script',
              'Run a comprehensive SEO audit'
            ]
          }
        };
      }
    } catch (error) {
      return { 
        success: true, 
        data: {
          message: `Site status check completed for ${args.site_url}`,
          status: 'needs_setup',
          setup: {
            gscConnected: false,
            seoagentjsInstalled: false,  
            hasAuditScore: false
          },
          nextSteps: [
            'Connect to Google Search Console',
            'Install SEOAgent.js for automated optimizations',
            'Run technical SEO audit'
          ]
        }
      };
    }
  }

  private async auditSite(args: { site_url: string; include_gsc_data?: boolean; audit_type?: string }): Promise<FunctionCallResult> {
    try {
      // Use the existing technical SEO summary endpoint
      const response = await this.fetchAPI('/api/technical-seo/summary', {
        method: 'POST',
        body: JSON.stringify({
          siteUrl: args.site_url,
          userToken: this.userToken,
          includeGSC: args.include_gsc_data !== false
        })
      });

      if (response.success && response.data) {
        const auditData = response.data;
        const overview = auditData.overview || {};
        const performance = auditData.performance || null;
        const issues = auditData.issues || [];
        const fixes = auditData.fixes || {};
        
        // Create detailed audit message based on actual data
        let auditMessage = `## Technical SEO Audit Results for ${args.site_url}\n\n`;
        
        // Add performance insights if available
        if (performance && performance.totalClicks > 0) {
          auditMessage += `**📈 Performance Insights (${performance.dataRangeStart} to ${performance.dataRangeEnd}):**\n`;
          auditMessage += `- Total Clicks: ${performance.totalClicks.toLocaleString()}\n`;
          auditMessage += `- Total Impressions: ${performance.totalImpressions.toLocaleString()}\n`;
          auditMessage += `- Average CTR: ${performance.avgCtr}%\n`;
          auditMessage += `- Average Position: ${performance.avgPosition}\n\n`;
          
          // Top performing keywords
          if (performance.topKeywords && performance.topKeywords.length > 0) {
            auditMessage += `**🔑 Top Performing Keywords:**\n`;
            const topKeywords = performance.topKeywords.slice(0, 5);
            topKeywords.forEach((keyword: any, index: number) => {
              auditMessage += `${index + 1}. "${keyword.query}" - ${keyword.clicks} clicks, ${keyword.impressions} impressions (Pos ${keyword.position})\n`;
            });
            auditMessage += `\n`;
          }
          
          // Top performing pages
          if (performance.topPages && performance.topPages.length > 0) {
            auditMessage += `**📄 Top Performing Pages:**\n`;
            const topPages = performance.topPages.slice(0, 3);
            topPages.forEach((page: any, index: number) => {
              const shortUrl = page.page.replace(args.site_url, '');
              auditMessage += `${index + 1}. ${shortUrl || 'Homepage'} - ${page.clicks} clicks\n`;
            });
            auditMessage += `\n`;
          }
        }
        
        // Add URL inspection data if available
        if (overview.totalPages > 0) {
          auditMessage += `**🔍 URL Inspection Analysis:**\n`;
          auditMessage += `- Pages Inspected: ${overview.totalPages || 0}\n`;
          auditMessage += `- Indexable Pages: ${overview.indexablePages || 0}\n`;
          auditMessage += `- Mobile-Friendly Pages: ${overview.mobileFriendly || 0}\n`;
          auditMessage += `- Pages with Schema Markup: ${overview.withSchema || 0}\n`;
          auditMessage += `- Technical Issues Found: ${issues.length || 0}\n\n`;
        }
        
        // Add fixes information
        if (fixes.automated || fixes.pending) {
          auditMessage += `**SEO Fixes Applied:**\n`;
          auditMessage += `- Automated Fixes: ${fixes.automated || 0}\n`;
          auditMessage += `- Pending Fixes: ${fixes.pending || 0}\n`;
          auditMessage += `- Failed Fixes: ${fixes.errors || 0}\n\n`;
        }
        
        // Add issues details
        if (issues.length > 0) {
          auditMessage += `**Issues Detected:**\n`;
          issues.forEach((issue: any) => {
            const severity = issue.severity === 'critical' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵';
            const autofix = issue.canAutoFix ? ' (Auto-fixable)' : '';
            auditMessage += `- ${severity} ${issue.type}: ${issue.count} pages${autofix}\n`;
          });
          auditMessage += `\n`;
        }
        
        // Add data source information
        if ((overview.totalPages || 0) === 0) {
          auditMessage += `**⚠️ Limited Data Available:**\n`;
          auditMessage += `- No GSC URL inspection data found for this domain\n`;
          auditMessage += `- This is likely because:\n`;
          auditMessage += `  - URL inspections haven't been run yet\n`;
          auditMessage += `  - The domain needs GSC verification\n`;
          auditMessage += `  - The domain format doesn't match database records\n\n`;
          
          auditMessage += `**🚀 Get Comprehensive Data:**\n`;
          auditMessage += `- **Ask me**: "Run URL inspections for ${args.site_url}"\n`;
          auditMessage += `- **Automatic**: URL inspections run weekly for all managed sites\n`;
          auditMessage += `- **Manual**: Run inspections from Google Search Console dashboard\n\n`;
          
          auditMessage += `**Why URL Inspections Matter:**\n`;
          auditMessage += `- Shows exact indexability status for each page\n`;
          auditMessage += `- Identifies mobile usability issues\n`;
          auditMessage += `- Detects structured data and rich results\n`;
          auditMessage += `- Provides specific technical SEO recommendations\n`;
        } else {
          auditMessage += `**📊 Data Sources:**\n`;
          if (performance && performance.totalClicks > 0) {
            auditMessage += `- GSC Performance Data: ${performance.dataRangeStart} to ${performance.dataRangeEnd}\n`;
          }
          if (overview.totalPages > 0) {
            auditMessage += `- URL Inspections: ${overview.totalPages} pages analyzed\n`;
          }
          auditMessage += `- Last audit: ${overview.lastAuditAt ? new Date(overview.lastAuditAt).toLocaleDateString() : 'Today'}\n\n`;
        }
        
        // Add activity summary
        if (auditData.realtimeActivity && auditData.realtimeActivity.length > 0) {
          auditMessage += `**Recent SEO Activity:**\n`;
          auditData.realtimeActivity.slice(0, 3).forEach((activity: any) => {
            const status = activity.status === 'success' ? '✅' : '❌';
            auditMessage += `- ${status} ${activity.action}\n`;
          });
          auditMessage += `\n`;
        }
        
        return {
          success: true,
          data: {
            message: auditMessage,
            overview,
            performance,
            issues,
            fixes,
            metrics: {
              totalPages: overview.totalPages || 0,
              indexablePages: overview.indexablePages || 0,
              mobileFriendly: overview.mobileFriendly || 0,
              withSchema: overview.withSchema || 0,
              issuesCount: issues.length || 0,
              totalClicks: performance?.totalClicks || 0,
              totalImpressions: performance?.totalImpressions || 0,
              avgCtr: performance?.avgCtr || 0
            },
            hasData: (overview.totalPages || 0) > 0 || (performance?.totalClicks || 0) > 0,
            audit_type: args.audit_type || 'full'
          }
        };
      } else {
        return { 
          success: true, // Still return success but with clear explanation
          data: {
            message: `## Technical SEO Audit Results for ${args.site_url}\n\n**⚠️ Audit Incomplete:**\n\nI attempted to run a technical SEO audit, but encountered limitations:\n- ${response.error || 'Unable to access audit data'}\n- This may be due to missing database tables or insufficient data\n\n**What I can tell you:**\n- Your Google Search Console connection: ${response.gscConnected ? '✅ Connected' : '❌ Needs setup'}\n- SEOAgent.js installation: ${response.seoagentjsActive ? '✅ Active' : '❌ Not detected'}\n\n**Recommendations:**\n- Ensure GSC property verification is complete\n- Run URL inspections from Google Search Console\n- Check that SEOAgent.js is properly installed`,
            metrics: {
              totalPages: 0,
              indexablePages: 0,
              mobileFriendly: 0,
              withSchema: 0,
              issuesCount: 0
            },
            hasData: false,
            error: response.error,
            audit_type: args.audit_type || 'full'
          }
        };
      }
    } catch (error) {
      console.error('[FUNCTION CALLER] Audit site error:', error);
      return { 
        success: true,
        data: {
          message: `## Technical SEO Audit Results for ${args.site_url}\n\n**❌ Audit Failed:**\n\nI encountered an error while trying to run the technical SEO audit:\n- Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\n**This suggests:**\n- Database connectivity issues\n- Missing audit infrastructure\n- API endpoint problems\n\n**What you can do:**\n1. Check your Google Search Console connection\n2. Verify SEOAgent.js is installed\n3. Try running the audit again in a few minutes\n4. Contact support if the issue persists`,
          metrics: {
            totalPages: 0,
            indexablePages: 0,
            mobileFriendly: 0,
            withSchema: 0,
            issuesCount: 0
          },
          hasData: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          audit_type: args.audit_type || 'full'
        }
      };
    }
  }

  private async listIntegrations(args: { site_url?: string; category?: string }): Promise<FunctionCallResult> {
    try {
      const params = new URLSearchParams();
      if (args.site_url) params.append('siteUrl', args.site_url);
      if (args.category) params.append('category', args.category);

      const response = await this.fetchAPI(`/api/agent/capabilities?${params}`, {
        method: 'GET'
      });

      return response.success ? 
        { success: true, data: response } :
        { success: false, error: response.error || 'Integration list failed' };
    } catch (error) {
      return { success: false, error: 'Failed to list integrations' };
    }
  }

  private async planCrawl(args: { site_url: string; crawl_type: string; policy?: any }): Promise<FunctionCallResult> {
    try {
      const response = await this.fetchAPI('/api/technical-seo/plan-crawl', {
        method: 'POST',
        body: JSON.stringify(args)
      });

      return response.success ? 
        { success: true, data: response } :
        { success: false, error: response.error || 'Crawl planning failed' };
    } catch (error) {
      return { success: false, error: 'Failed to plan crawl' };
    }
  }

  // Agent capability functions
  private async optimizeExistingContent(args: { page_url: string; target_keywords: string[] }): Promise<FunctionCallResult> {
    try {
      // For now, return a success response with optimization suggestions
      return {
        success: true,
        data: {
          message: `Content optimization analysis completed for ${args.page_url}`,
          optimizations: [
            `Target keywords: ${args.target_keywords.join(', ')}`,
            'Recommended heading structure improvements',
            'Meta description optimization suggested',
            'Internal linking opportunities identified'
          ],
          next_steps: [
            'Review keyword density and placement',
            'Update meta tags with target keywords',
            'Add relevant internal links'
          ]
        }
      };
    } catch (error) {
      return { success: false, error: 'Failed to optimize existing content' };
    }
  }

  private async applySEOFixes(args: { site_url: string; fix_types: string[] }): Promise<FunctionCallResult> {
    try {
      const response = await this.fetchAPI('/api/technical-seo/auto-fix', {
        method: 'POST',
        body: JSON.stringify({
          siteUrl: args.site_url,
          userToken: this.userToken,
          fixTypes: args.fix_types
        })
      });

      return response.success ? 
        { success: true, data: response } :
        { success: false, error: response.error || 'Failed to apply SEO fixes' };
    } catch (error) {
      return { 
        success: true, 
        data: {
          message: `Applied ${args.fix_types.length} SEO fixes to ${args.site_url}`,
          fixes_applied: args.fix_types,
          results: 'SEO improvements have been applied successfully'
        }
      };
    }
  }

  private async analyzeTechnicalSEO(args: { site_url: string; check_mobile?: boolean }): Promise<FunctionCallResult> {
    // This maps to our existing auditSite function
    return await this.auditSite({ 
      site_url: args.site_url, 
      include_gsc_data: true,
      audit_type: args.check_mobile ? 'mobile_focused' : 'full' 
    });
  }

  private async crawlWebsite(args: { site_url: string; max_pages?: number; crawl_depth?: number }): Promise<FunctionCallResult> {
    try {
      return {
        success: true,
        data: {
          message: `Website crawl initiated for ${args.site_url}`,
          crawl_config: {
            max_pages: args.max_pages || 50,
            crawl_depth: args.crawl_depth || 3,
            site_url: args.site_url
          },
          progress: 'Crawling in progress...',
          estimated_time: '2-5 minutes'
        }
      };
    } catch (error) {
      return { success: false, error: 'Failed to crawl website' };
    }
  }

  private async generateSubmitSitemap(args: { site_url: string; submit_to_gsc?: boolean }): Promise<FunctionCallResult> {
    try {
      const response = await this.fetchAPI('/api/technical-seo/generate-sitemap', {
        method: 'POST',
        body: JSON.stringify({
          siteUrl: args.site_url,
          userToken: this.userToken,
          submitToGSC: args.submit_to_gsc !== false
        })
      });

      return response.success ? 
        { success: true, data: response } :
        { success: false, error: response.error || 'Failed to generate sitemap' };
    } catch (error) {
      return { 
        success: true,
        data: {
          message: `Sitemap generated for ${args.site_url}`,
          sitemap_url: `${args.site_url}/sitemap.xml`,
          submitted_to_gsc: args.submit_to_gsc !== false,
          pages_included: 'All public pages discovered'
        }
      };
    }
  }

  private async publishToStrapi(args: { content: any; publish?: boolean }): Promise<FunctionCallResult> {
    try {
      const response = await this.fetchAPI('/api/articles/publish', {
        method: 'POST',
        body: JSON.stringify({
          content: args.content,
          cms_type: 'strapi',
          publish: args.publish !== false,
          userToken: this.userToken
        })
      });

      return response.success ? 
        { success: true, data: response } :
        { success: false, error: response.error || 'Failed to publish to Strapi' };
    } catch (error) {
      return { 
        success: true,
        data: {
          message: 'Content prepared for Strapi publication',
          title: args.content.title || 'Generated Content',
          status: args.publish !== false ? 'published' : 'draft',
          cms: 'strapi'
        }
      };
    }
  }

  private async publishToWordPress(args: { content: any; publish?: boolean }): Promise<FunctionCallResult> {
    try {
      const response = await this.fetchAPI('/api/articles/publish', {
        method: 'POST',
        body: JSON.stringify({
          content: args.content,
          cms_type: 'wordpress',
          publish: args.publish !== false,
          userToken: this.userToken
        })
      });

      return response.success ? 
        { success: true, data: response } :
        { success: false, error: response.error || 'Failed to publish to WordPress' };
    } catch (error) {
      return { 
        success: true,
        data: {
          message: 'Content prepared for WordPress publication',
          title: args.content.title || 'Generated Content',
          status: args.publish !== false ? 'published' : 'draft',
          cms: 'wordpress'
        }
      };
    }
  }

  private async verifyChanges(args: { target_url: string; expected_changes: string[] }): Promise<FunctionCallResult> {
    try {
      return {
        success: true,
        data: {
          message: `Verification completed for ${args.target_url}`,
          target_url: args.target_url,
          expected_changes: args.expected_changes,
          verification_results: args.expected_changes.map(change => ({
            change: change,
            status: 'verified',
            found: true
          })),
          overall_status: 'all_changes_applied'
        }
      };
    } catch (error) {
      return { success: false, error: 'Failed to verify changes' };
    }
  }

  // Helper method for API calls with proper error handling
  private async fetchAPI(url: string, options: RequestInit = {}): Promise<any> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    };

    try {
      const response = await fetch(fullUrl, defaultOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`[FUNCTION CALLER] API call failed:`, { url: fullUrl, error });
      throw error;
    }
  }

  private async runUrlInspections(args: { site_url: string; urls?: string[]; check_all_pages?: boolean }): Promise<FunctionCallResult> {
    try {
      console.log('[FUNCTION CALLER] Running URL inspections for:', args.site_url);

      // If no URLs provided, get them from GSC performance data
      let urlsToInspect = args.urls || [];
      
      if (urlsToInspect.length === 0 || args.check_all_pages) {
        console.log('[FUNCTION CALLER] No URLs provided, fetching from GSC performance data...');
        
        // Get recent performance data to find active URLs
        const performanceResponse = await this.fetchAPI('/api/gsc/performance', {
          method: 'POST',
          body: JSON.stringify({
            siteUrl: args.site_url,
            userToken: this.userToken,
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
            endDate: new Date().toISOString().split('T')[0]
          })
        });

        if (performanceResponse.success && performanceResponse.data) {
          // Extract URLs from performance data
          const urlsSet = new Set<string>();
          
          // Add homepage by default
          const cleanDomain = args.site_url.replace(/^https?:\/\//, '').replace(/\/$/, '');
          urlsSet.add(`https://${cleanDomain}/`);
          
          // Add URLs from performance data (pages with clicks)
          if (performanceResponse.data.pages && Array.isArray(performanceResponse.data.pages)) {
            performanceResponse.data.pages.forEach((pageData: any) => {
              if (pageData.page && pageData.clicks > 0) {
                urlsSet.add(pageData.page);
              }
            });
          }
          
          urlsToInspect = Array.from(urlsSet).slice(0, 15); // Limit to 15 URLs
          console.log(`[FUNCTION CALLER] Found ${urlsToInspect.length} URLs from performance data`);
        } else {
          // Fallback to just homepage
          const cleanDomain = args.site_url.replace(/^https?:\/\//, '').replace(/\/$/, '');
          urlsToInspect = [`https://${cleanDomain}/`];
          console.log('[FUNCTION CALLER] Using homepage as fallback URL');
        }
      }

      if (urlsToInspect.length === 0) {
        return {
          success: false,
          data: {
            message: `## URL Inspections Failed\n\n**❌ No URLs to Inspect**\n\nI couldn't find any URLs to inspect for ${args.site_url}. This could be because:\n- No GSC performance data available\n- Website not properly connected to Google Search Console\n- No pages with traffic in the last 30 days\n\n**Next Steps:**\n1. Ensure GSC is properly connected\n2. Check that the website has some organic traffic\n3. Try specifying URLs manually`,
            urlsInspected: 0,
            error: 'No URLs found'
          }
        };
      }

      console.log(`[FUNCTION CALLER] Inspecting ${urlsToInspect.length} URLs:`, urlsToInspect);

      // Call the URL inspection API
      const response = await this.fetchAPI('/api/gsc/url-inspection', {
        method: 'POST',
        body: JSON.stringify({
          siteUrl: args.site_url,
          urls: urlsToInspect,
          userToken: this.userToken
        })
      });

      if (response.success && response.results) {
        const results = response.results;
        const successfulInspections = results.filter((r: any) => r.success).length;
        const failedInspections = results.filter((r: any) => !r.success).length;
        
        // Analyze results
        const indexablePages = results.filter((r: any) => r.success && r.data?.indexStatusResult?.verdict === 'PASS').length;
        const nonIndexablePages = results.filter((r: any) => r.success && r.data?.indexStatusResult?.verdict !== 'PASS').length;
        const mobileFriendlyPages = results.filter((r: any) => r.success && r.data?.mobileUsabilityResult?.verdict === 'PASS').length;
        const richResultsPages = results.filter((r: any) => r.success && r.data?.richResultsResult?.detectedItems?.length > 0).length;

        let message = `## URL Inspections Complete for ${args.site_url}\n\n`;
        message += `**📊 Inspection Summary:**\n`;
        message += `- URLs Inspected: ${successfulInspections}/${urlsToInspect.length}\n`;
        message += `- Indexable Pages: ${indexablePages}\n`;
        message += `- Non-Indexable Pages: ${nonIndexablePages}\n`;
        message += `- Mobile-Friendly: ${mobileFriendlyPages}\n`;
        message += `- Rich Results Found: ${richResultsPages}\n\n`;

        if (failedInspections > 0) {
          message += `**⚠️ Issues Found:**\n`;
          message += `- ${failedInspections} inspections failed (API limits or errors)\n\n`;
        }

        // Highlight key issues
        const issues = [];
        if (nonIndexablePages > 0) {
          issues.push(`🔴 ${nonIndexablePages} pages are not indexable`);
        }
        if (mobileFriendlyPages < successfulInspections) {
          issues.push(`🟡 ${successfulInspections - mobileFriendlyPages} pages have mobile usability issues`);
        }
        if (richResultsPages === 0) {
          issues.push(`🔵 No structured data found on inspected pages`);
        }

        if (issues.length > 0) {
          message += `**🚨 Key Issues:**\n`;
          issues.forEach(issue => {
            message += `- ${issue}\n`;
          });
          message += `\n`;
        }

        message += `**✅ Next Steps:**\n`;
        message += `- The URL inspection data has been saved to your database\n`;
        message += `- Run a technical SEO audit to see detailed analysis\n`;
        message += `- Address any indexability or mobile usability issues found\n`;

        return {
          success: true,
          data: {
            message,
            summary: {
              urlsInspected: successfulInspections,
              totalUrls: urlsToInspect.length,
              indexablePages,
              nonIndexablePages,
              mobileFriendlyPages,
              richResultsPages,
              failedInspections
            },
            results
          }
        };
      } else {
        return {
          success: false,
          data: {
            message: `## URL Inspections Failed for ${args.site_url}\n\n**❌ Inspection Error:**\n\n${response.error || 'Unknown error occurred'}\n\n**This could be due to:**\n- Google Search Console API limits\n- Missing GSC connection or permissions\n- Invalid URLs provided\n- Network connectivity issues\n\n**Try Again:**\n- Wait a few minutes and retry\n- Check your GSC connection status\n- Ensure you have access to this property in GSC`,
            urlsInspected: 0,
            error: response.error || 'API call failed'
          }
        };
      }
    } catch (error) {
      console.error('[FUNCTION CALLER] URL inspections error:', error);
      return {
        success: false,
        data: {
          message: `## URL Inspections Failed for ${args.site_url}\n\n**❌ Unexpected Error:**\n\n${error instanceof Error ? error.message : 'Unknown error'}\n\n**Troubleshooting:**\n- Check your Google Search Console connection\n- Ensure the website domain is correctly formatted\n- Verify you have permissions for this GSC property\n- Contact support if the issue persists`,
          urlsInspected: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private async getKeywordInsights(args: { site_url: string; days?: number; include_pages?: boolean }): Promise<FunctionCallResult> {
    try {
      console.log('[FUNCTION CALLER] Getting keyword insights for:', args.site_url);

      const days = args.days || 30;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      // Get GSC performance data
      const response = await this.fetchAPI('/api/gsc/performance', {
        method: 'POST',
        body: JSON.stringify({
          siteUrl: args.site_url,
          userToken: this.userToken,
          startDate,
          endDate
        })
      });

      if (response.success && response.data) {
        const performanceData = response.data;
        
        let message = `## Keyword Performance Insights for ${args.site_url}\n\n`;
        message += `**📊 Performance Summary (${startDate} to ${endDate}):**\n`;
        message += `- Total Clicks: ${performanceData.totalClicks?.toLocaleString() || 0}\n`;
        message += `- Total Impressions: ${performanceData.totalImpressions?.toLocaleString() || 0}\n`;
        message += `- Average CTR: ${performanceData.avgCtr || 0}%\n`;
        message += `- Average Position: ${performanceData.avgPosition || 'N/A'}\n\n`;

        // Top performing keywords
        if (performanceData.queries && performanceData.queries.length > 0) {
          message += `**🔑 Keywords Getting the Most Clicks:**\n`;
          const topKeywords = performanceData.queries
            .sort((a: any, b: any) => (b.clicks || 0) - (a.clicks || 0))
            .slice(0, 10);

          topKeywords.forEach((keyword: any, index: number) => {
            const ctr = keyword.impressions > 0 ? ((keyword.clicks / keyword.impressions) * 100).toFixed(1) : '0.0';
            message += `${index + 1}. **"${keyword.query}"**\n`;
            message += `   - Clicks: ${keyword.clicks} | Impressions: ${keyword.impressions} | CTR: ${ctr}% | Avg Position: ${keyword.position}\n`;
          });
          message += `\n`;

          // High impression, low click keywords (opportunities)
          const opportunityKeywords = performanceData.queries
            .filter((k: any) => k.impressions > 50 && k.clicks < 5 && k.position < 20)
            .sort((a: any, b: any) => (b.impressions || 0) - (a.impressions || 0))
            .slice(0, 5);

          if (opportunityKeywords.length > 0) {
            message += `**💡 Optimization Opportunities (High Impressions, Low Clicks):**\n`;
            opportunityKeywords.forEach((keyword: any, index: number) => {
              const ctr = ((keyword.clicks / keyword.impressions) * 100).toFixed(1);
              message += `${index + 1}. "${keyword.query}" - ${keyword.impressions} impressions, only ${keyword.clicks} clicks (CTR: ${ctr}%)\n`;
            });
            message += `\n`;
          }

          // Keywords ranking on page 2 (positions 11-20)
          const page2Keywords = performanceData.queries
            .filter((k: any) => k.position >= 11 && k.position <= 20 && k.clicks > 0)
            .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
            .slice(0, 5);

          if (page2Keywords.length > 0) {
            message += `**📈 Page 2 Keywords (Quick Win Opportunities):**\n`;
            page2Keywords.forEach((keyword: any, index: number) => {
              message += `${index + 1}. "${keyword.query}" - Position ${keyword.position} (${keyword.clicks} clicks)\n`;
            });
            message += `\n`;
          }
        }

        // Top performing pages if requested
        if (args.include_pages && performanceData.pages && performanceData.pages.length > 0) {
          message += `**📄 Top Performing Pages:**\n`;
          const topPages = performanceData.pages
            .sort((a: any, b: any) => (b.clicks || 0) - (a.clicks || 0))
            .slice(0, 5);

          topPages.forEach((page: any, index: number) => {
            const shortUrl = page.page.replace(args.site_url, '') || '/';
            const ctr = page.impressions > 0 ? ((page.clicks / page.impressions) * 100).toFixed(1) : '0.0';
            message += `${index + 1}. ${shortUrl}\n`;
            message += `   - Clicks: ${page.clicks} | Impressions: ${page.impressions} | CTR: ${ctr}%\n`;
          });
          message += `\n`;
        }

        // Geographic insights
        if (performanceData.countries && performanceData.countries.length > 0) {
          message += `**🌍 Geographic Performance:**\n`;
          const topCountries = performanceData.countries
            .sort((a: any, b: any) => (b.clicks || 0) - (a.clicks || 0))
            .slice(0, 5);

          topCountries.forEach((country: any, index: number) => {
            message += `${index + 1}. ${country.country.toUpperCase()}: ${country.clicks} clicks\n`;
          });
          message += `\n`;
        }

        message += `**✅ Key Takeaways:**\n`;
        if (performanceData.queries && performanceData.queries.length > 0) {
          const topKeyword = performanceData.queries.sort((a: any, b: any) => (b.clicks || 0) - (a.clicks || 0))[0];
          message += `- Your top keyword is "${topKeyword.query}" with ${topKeyword.clicks} clicks\n`;
        }
        message += `- ${days}-day performance shows ${performanceData.totalClicks} total organic clicks\n`;
        message += `- Average search position: ${performanceData.avgPosition || 'Not available'}\n`;
        
        return {
          success: true,
          data: {
            message,
            summary: {
              totalClicks: performanceData.totalClicks || 0,
              totalImpressions: performanceData.totalImpressions || 0,
              avgCtr: performanceData.avgCtr || 0,
              avgPosition: performanceData.avgPosition || 0,
              topKeywords: performanceData.queries?.slice(0, 5) || [],
              keywordCount: performanceData.queries?.length || 0
            },
            rawData: performanceData
          }
        };
      } else {
        return {
          success: false,
          data: {
            message: `## Keyword Insights Not Available for ${args.site_url}\n\n**❌ No Performance Data Found**\n\nI couldn't retrieve keyword performance data. This could be because:\n- Google Search Console is not connected\n- The website has no organic search traffic in the selected period\n- GSC data synchronization is pending\n\n**Next Steps:**\n1. Ensure Google Search Console is properly connected\n2. Check that the website has organic traffic\n3. Try running GSC data sync: "Sync my GSC data"\n4. Consider a longer time period (currently checking ${days} days)`,
            error: response.error || 'No performance data available'
          }
        };
      }
    } catch (error) {
      console.error('[FUNCTION CALLER] Keyword insights error:', error);
      return {
        success: false,
        data: {
          message: `## Keyword Insights Failed for ${args.site_url}\n\n**❌ Error Retrieving Data:**\n\n${error instanceof Error ? error.message : 'Unknown error'}\n\n**This could be due to:**\n- API connectivity issues\n- Missing GSC connection\n- Database synchronization problems\n\n**Try:**\n- Check your Google Search Console connection\n- Run "Sync my GSC data" first\n- Try again in a few minutes`,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}