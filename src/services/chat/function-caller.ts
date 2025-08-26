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
  async executeFunction(name: string, args: any): Promise<FunctionCallResult> {
    try {
      switch (name) {
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
      const response = await this.fetchAPI('/api/technical-seo/connect-gsc', {
        method: 'POST',
        body: JSON.stringify(args)
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
      const response = await this.fetchAPI('/api/technical-seo/sync-gsc', {
        method: 'POST',
        body: JSON.stringify(args)
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
      const params = new URLSearchParams({
        siteUrl: args.site_url
      });

      const response = await this.fetchAPI(`/api/agent/capabilities?${params}`, {
        method: 'GET'
      });

      return response.success ? 
        { success: true, data: response } :
        { success: false, error: response.error || 'Status check failed' };
    } catch (error) {
      return { success: false, error: 'Failed to get site status' };
    }
  }

  private async auditSite(args: { site_url: string; include_gsc_data?: boolean; audit_type?: string }): Promise<FunctionCallResult> {
    try {
      const response = await this.fetchAPI('/api/technical-seo/audit', {
        method: 'POST',
        body: JSON.stringify(args)
      });

      return response.success ? 
        { success: true, data: response } :
        { success: false, error: response.error || 'Site audit failed' };
    } catch (error) {
      return { success: false, error: 'Failed to audit site' };
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
}