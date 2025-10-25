/**
 * Database Query Ability
 *
 * Enables the agent to query database tables for performance insights,
 * content status, technical issues, and conversation history.
 *
 * Includes both pre-built queries and flexible query capability with strict security.
 */

import { BaseAbility, FunctionCallResult } from './base-ability';

export class DatabaseQueryAbility extends BaseAbility {
  getFunctionNames(): string[] {
    return [
      'DATABASE_get_gsc_performance',
      'DATABASE_get_published_article_performance',
      'DATABASE_get_technical_issues',
      'DATABASE_get_content_queue_status',
      'DATABASE_get_conversation_history',
      'DATABASE_query'
    ];
  }

  async executeFunction(name: string, args: any): Promise<FunctionCallResult> {
    switch (name) {
      case 'DATABASE_get_gsc_performance':
        return await this.getGSCPerformance(args);
      case 'DATABASE_get_published_article_performance':
        return await this.getPublishedArticlePerformance(args);
      case 'DATABASE_get_technical_issues':
        return await this.getTechnicalIssues(args);
      case 'DATABASE_get_content_queue_status':
        return await this.getContentQueueStatus(args);
      case 'DATABASE_get_conversation_history':
        return await this.getConversationHistory(args);
      case 'DATABASE_query':
        return await this.flexibleQuery(args);
      default:
        return this.error(`Unknown database query function: ${name}`);
    }
  }

  /**
   * Get Google Search Console performance summary
   */
  private async getGSCPerformance(args: {
    site_url?: string;
    website_token?: string;
    conversation_id?: string;
    date_range?: string;
    metric?: string;
    limit?: number;
  }): Promise<FunctionCallResult> {
    try {
      // Resolve website token
      const websiteToken = await this.resolveWebsiteToken({
        website_token: args.website_token,
        site_url: args.site_url,
        conversation_id: args.conversation_id
      });

      if (!websiteToken) {
        return this.error('Could not determine which website to query GSC performance for');
      }

      // Calculate date range
      const days = args.date_range === '7d' ? 7 : args.date_range === '90d' ? 90 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Query gsc_performance_data
      const response = await this.fetchAPI('/api/agent/database/query', {
        method: 'POST',
        body: JSON.stringify({
          query_type: 'flexible',
          table_name: 'gsc_performance_data',
          columns: ['date_start', 'date_end', 'total_clicks', 'total_impressions', 'avg_ctr', 'avg_position', 'queries', 'pages'],
          where_clause: `date_start>='${startDateStr}'`,
          order_by: 'date_end DESC',
          limit: args.limit || 10,
          user_token: this.userToken
        })
      });

      if (!response.success) {
        return this.error(response.error || 'Failed to query GSC performance data');
      }

      // Process and format results
      const performanceData = response.data || [];
      const summary = {
        total_clicks: 0,
        total_impressions: 0,
        avg_ctr: 0,
        avg_position: 0,
        date_range: `${startDateStr} to ${new Date().toISOString().split('T')[0]}`,
        data_points: performanceData.length
      };

      for (const row of performanceData) {
        summary.total_clicks += row.total_clicks || 0;
        summary.total_impressions += row.total_impressions || 0;
      }

      if (performanceData.length > 0) {
        summary.avg_ctr = performanceData.reduce((sum: number, row: any) => sum + (row.avg_ctr || 0), 0) / performanceData.length;
        summary.avg_position = performanceData.reduce((sum: number, row: any) => sum + (row.avg_position || 0), 0) / performanceData.length;
      }

      // Extract top queries and pages from most recent data
      const latestData = performanceData[0] || { queries: [], pages: [] };
      const topQueries = (latestData.queries || []).slice(0, 10);
      const topPages = (latestData.pages || []).slice(0, 10);

      return this.success({
        summary,
        top_queries: topQueries,
        top_pages: topPages,
        raw_data: performanceData
      });

    } catch (error) {
      return this.error('Failed to get GSC performance data', error);
    }
  }

  /**
   * Get performance data for published articles
   */
  private async getPublishedArticlePerformance(args: {
    site_url?: string;
    website_token?: string;
    conversation_id?: string;
    limit?: number;
    sort_by?: string;
  }): Promise<FunctionCallResult> {
    try {
      // Resolve website token
      const websiteToken = await this.resolveWebsiteToken({
        website_token: args.website_token,
        site_url: args.site_url,
        conversation_id: args.conversation_id
      });

      if (!websiteToken) {
        return this.error('Could not determine which website to query article performance for');
      }

      // First, get published articles from article_queue
      const articlesResponse = await this.fetchAPI('/api/agent/database/query', {
        method: 'POST',
        body: JSON.stringify({
          query_type: 'flexible',
          table_name: 'article_queue',
          columns: ['id', 'title', 'public_url', 'published_at', 'target_keywords'],
          where_clause: "status='published'",
          order_by: 'published_at DESC',
          limit: args.limit || 20,
          user_token: this.userToken
        })
      });

      if (!articlesResponse.success) {
        return this.error(articlesResponse.error || 'Failed to query published articles');
      }

      const articles = articlesResponse.data || [];

      // Now get GSC performance data
      const gscResponse = await this.fetchAPI('/api/agent/database/query', {
        method: 'POST',
        body: JSON.stringify({
          query_type: 'flexible',
          table_name: 'gsc_performance_data',
          columns: ['pages'],
          order_by: 'date_end DESC',
          limit: 5,
          user_token: this.userToken
        })
      });

      if (!gscResponse.success) {
        return this.error(gscResponse.error || 'Failed to query GSC data');
      }

      const gscData = gscResponse.data || [];

      // Match articles with GSC page data
      const articlesWithPerformance = articles.map((article: any) => {
        if (!article.public_url) {
          return {
            ...article,
            clicks: 0,
            impressions: 0,
            ctr: 0,
            position: 0,
            has_gsc_data: false
          };
        }

        // Find matching page data in GSC
        let totalClicks = 0;
        let totalImpressions = 0;
        let avgCtr = 0;
        let avgPosition = 0;
        let dataPoints = 0;

        for (const gscRow of gscData) {
          const pages = gscRow.pages || [];
          const matchingPage = pages.find((p: any) => p.page === article.public_url);

          if (matchingPage) {
            totalClicks += matchingPage.clicks || 0;
            totalImpressions += matchingPage.impressions || 0;
            avgCtr += matchingPage.ctr || 0;
            avgPosition += matchingPage.position || 0;
            dataPoints++;
          }
        }

        return {
          ...article,
          clicks: totalClicks,
          impressions: totalImpressions,
          ctr: dataPoints > 0 ? (avgCtr / dataPoints) * 100 : 0,
          position: dataPoints > 0 ? avgPosition / dataPoints : 0,
          has_gsc_data: dataPoints > 0
        };
      });

      // Sort by requested metric
      const sortBy = args.sort_by || 'clicks';
      articlesWithPerformance.sort((a: any, b: any) => (b[sortBy] || 0) - (a[sortBy] || 0));

      return this.success({
        articles: articlesWithPerformance,
        total_count: articles.length,
        with_gsc_data: articlesWithPerformance.filter((a: any) => a.has_gsc_data).length
      });

    } catch (error) {
      return this.error('Failed to get published article performance', error);
    }
  }

  /**
   * Get technical SEO issues from URL inspections
   */
  private async getTechnicalIssues(args: {
    site_url?: string;
    website_token?: string;
    conversation_id?: string;
    severity?: string;
    limit?: number;
  }): Promise<FunctionCallResult> {
    try {
      // Resolve website token
      const websiteToken = await this.resolveWebsiteToken({
        website_token: args.website_token,
        site_url: args.site_url,
        conversation_id: args.conversation_id
      });

      if (!websiteToken) {
        return this.error('Could not determine which website to query technical issues for');
      }

      // Query url_inspections for issues
      let whereClause = "index_status!='PASS'";
      if (args.severity === 'high') {
        whereClause += " AND can_be_indexed='false'";
      }

      const response = await this.fetchAPI('/api/agent/database/query', {
        method: 'POST',
        body: JSON.stringify({
          query_type: 'flexible',
          table_name: 'url_inspections',
          columns: [
            'inspected_url',
            'index_status',
            'can_be_indexed',
            'fetch_status',
            'mobile_usable',
            'mobile_usability_issues',
            'rich_results_valid',
            'robots_txt_state',
            'inspected_at'
          ],
          where_clause: whereClause,
          order_by: 'inspected_at DESC',
          limit: args.limit || 50,
          user_token: this.userToken
        })
      });

      if (!response.success) {
        return this.error(response.error || 'Failed to query technical issues');
      }

      const issues = response.data || [];

      // Categorize issues
      const categorized = {
        indexing_issues: issues.filter((i: any) => !i.can_be_indexed),
        mobile_issues: issues.filter((i: any) => !i.mobile_usable || i.mobile_usability_issues > 0),
        fetch_issues: issues.filter((i: any) => i.fetch_status !== 'SUCCESS'),
        robots_issues: issues.filter((i: any) => i.robots_txt_state === 'DISALLOWED'),
        rich_results_issues: issues.filter((i: any) => !i.rich_results_valid),
        total_issues: issues.length
      };

      return this.success({
        issues: categorized,
        all_issues: issues
      });

    } catch (error) {
      return this.error('Failed to get technical issues', error);
    }
  }

  /**
   * Get content queue status and pipeline overview
   */
  private async getContentQueueStatus(args: {
    site_url?: string;
    website_token?: string;
    conversation_id?: string;
    status_filter?: string;
    limit?: number;
  }): Promise<FunctionCallResult> {
    try {
      // Resolve website token
      const websiteToken = await this.resolveWebsiteToken({
        website_token: args.website_token,
        site_url: args.site_url,
        conversation_id: args.conversation_id
      });

      if (!websiteToken) {
        return this.error('Could not determine which website to query content queue for');
      }

      // Build where clause
      let whereClause = args.status_filter ? `status='${args.status_filter}'` : undefined;

      const response = await this.fetchAPI('/api/agent/database/query', {
        method: 'POST',
        body: JSON.stringify({
          query_type: 'flexible',
          table_name: 'article_queue',
          columns: ['id', 'title', 'status', 'scheduled_for', 'published_at', 'target_keywords', 'quality_score', 'word_count', 'created_at'],
          where_clause: whereClause,
          order_by: 'created_at DESC',
          limit: args.limit || 50,
          user_token: this.userToken
        })
      });

      if (!response.success) {
        return this.error(response.error || 'Failed to query content queue');
      }

      const articles = response.data || [];

      // Calculate statistics by status
      const stats = {
        total: articles.length,
        by_status: {} as Record<string, number>,
        upcoming_scheduled: articles.filter((a: any) => a.scheduled_for && new Date(a.scheduled_for) > new Date()),
        recently_published: articles.filter((a: any) => a.status === 'published').slice(0, 10)
      };

      for (const article of articles) {
        const status = article.status || 'unknown';
        stats.by_status[status] = (stats.by_status[status] || 0) + 1;
      }

      return this.success({
        statistics: stats,
        articles
      });

    } catch (error) {
      return this.error('Failed to get content queue status', error);
    }
  }

  /**
   * Get conversation history for context
   */
  private async getConversationHistory(args: {
    conversation_id: string;
    limit?: number;
    include_function_calls?: boolean;
  }): Promise<FunctionCallResult> {
    try {
      if (!args.conversation_id) {
        return this.error('conversation_id is required');
      }

      const columns = args.include_function_calls
        ? ['message_role', 'message_content', 'function_call', 'message_order', 'created_at']
        : ['message_role', 'message_content', 'message_order', 'created_at'];

      const response = await this.fetchAPI('/api/agent/database/query', {
        method: 'POST',
        body: JSON.stringify({
          query_type: 'flexible',
          table_name: 'agent_conversations',
          columns,
          order_by: 'message_order ASC',
          limit: Math.min(args.limit || 10, 50),
          user_token: this.userToken,
          conversation_id: args.conversation_id
        })
      });

      if (!response.success) {
        return this.error(response.error || 'Failed to query conversation history');
      }

      const messages = response.data || [];

      return this.success({
        conversation_id: args.conversation_id,
        message_count: messages.length,
        messages
      });

    } catch (error) {
      return this.error('Failed to get conversation history', error);
    }
  }

  /**
   * Flexible database query tool
   */
  private async flexibleQuery(args: {
    table_name: string;
    columns?: string[];
    where_clause?: string;
    order_by?: string;
    limit?: number;
    conversation_id?: string;
  }): Promise<FunctionCallResult> {
    try {
      if (!args.table_name) {
        return this.error('table_name is required');
      }

      const response = await this.fetchAPI('/api/agent/database/query', {
        method: 'POST',
        body: JSON.stringify({
          query_type: 'flexible',
          table_name: args.table_name,
          columns: args.columns,
          where_clause: args.where_clause,
          order_by: args.order_by,
          limit: args.limit || 100,
          user_token: this.userToken,
          conversation_id: args.conversation_id
        })
      });

      if (!response.success) {
        return this.error(response.error || 'Query execution failed');
      }

      return this.success({
        table: args.table_name,
        rows: response.data || [],
        metadata: response.metadata
      });

    } catch (error) {
      return this.error('Failed to execute flexible query', error);
    }
  }
}
