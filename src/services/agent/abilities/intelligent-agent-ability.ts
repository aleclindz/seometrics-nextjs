/**
 * Intelligent Agent Ability
 *
 * Handles intelligent analysis functions for the agent including:
 * - Website crawling and business analysis
 * - Competitor research and positioning analysis
 * - Keyword strategy generation
 * - Topic clustering and content planning
 * - Content gap analysis
 */

import { BaseAbility, FunctionCallResult } from './base-ability';

export class IntelligentAgentAbility extends BaseAbility {
  getFunctionNames(): string[] {
    return [
      'WEBSITE_crawl_and_analyze',
      'COMPETITOR_research_and_crawl',
      'KEYWORDS_brainstorm_strategy',
      'TOPICS_create_clusters',
      'CONTENT_gap_analysis'
    ];
  }

  async executeFunction(name: string, args: any): Promise<FunctionCallResult> {
    switch (name) {
      case 'WEBSITE_crawl_and_analyze':
        return await this.crawlAndAnalyzeWebsite(args);

      case 'COMPETITOR_research_and_crawl':
        return await this.researchCompetitors(args);

      case 'KEYWORDS_brainstorm_strategy':
        return await this.brainstormKeywordStrategy(args);

      case 'TOPICS_create_clusters':
        return await this.createTopicClusters(args);

      case 'CONTENT_gap_analysis':
        return await this.analyzeContentGaps(args);

      default:
        return this.error(`Unknown function: ${name}`);
    }
  }

  /**
   * Crawl and analyze a website to extract business intelligence
   */
  private async crawlAndAnalyzeWebsite(args: any): Promise<FunctionCallResult> {
    try {
      const { site_url, max_pages } = args;

      if (!site_url) {
        return this.error('site_url is required for website analysis');
      }

      const response = await this.fetchAPI('/api/agent/website-analyze', {
        method: 'POST',
        body: JSON.stringify({
          site_url,
          max_pages: max_pages || 5
        })
      });

      if (!response.success) {
        return this.error(response.error || 'Failed to analyze website');
      }

      return this.success({
        business_analysis: response.data.analysis,
        pages_analyzed: response.data.pages_analyzed,
        scraped_pages: response.data.scraped_pages,
        site_url: response.data.site_url
      });

    } catch (error) {
      return this.error('Failed to crawl and analyze website', error);
    }
  }

  /**
   * Research competitors by crawling and analyzing their websites
   */
  private async researchCompetitors(args: any): Promise<FunctionCallResult> {
    try {
      const { competitor_urls, focus_areas, user_business_context } = args;

      if (!competitor_urls || !Array.isArray(competitor_urls) || competitor_urls.length === 0) {
        return this.error('competitor_urls array is required for competitor research');
      }

      const response = await this.fetchAPI('/api/agent/competitor-research', {
        method: 'POST',
        body: JSON.stringify({
          competitor_urls,
          focus_areas: focus_areas || [],
          user_business_context
        })
      });

      if (!response.success) {
        return this.error(response.error || 'Failed to research competitors');
      }

      return this.success({
        competitor_analysis: response.data.competitor_analysis,
        competitive_insights: response.data.competitive_insights,
        competitors_analyzed: response.data.competitors_analyzed
      });

    } catch (error) {
      return this.error('Failed to research competitors', error);
    }
  }

  /**
   * Generate comprehensive keyword strategy based on business and competitor analysis
   */
  private async brainstormKeywordStrategy(args: any): Promise<FunctionCallResult> {
    try {
      const {
        business_analysis,
        competitor_data,
        target_keywords,
        focus_areas,
        keyword_count
      } = args;

      if (!business_analysis) {
        return this.error('business_analysis is required for keyword strategy generation');
      }

      const response = await this.fetchAPI('/api/agent/keywords-brainstorm', {
        method: 'POST',
        body: JSON.stringify({
          business_analysis,
          competitor_data,
          target_keywords: target_keywords || [],
          focus_areas: focus_areas || [],
          keyword_count: keyword_count || 50
        })
      });

      if (!response.success) {
        return this.error(response.error || 'Failed to generate keyword strategy');
      }

      return this.success({
        keyword_strategy: response.data.keyword_strategy,
        business_context: response.data.business_context,
        generated_at: response.data.generated_at
      });

    } catch (error) {
      return this.error('Failed to generate keyword strategy', error);
    }
  }

  /**
   * Create topic clusters from keyword strategy
   */
  private async createTopicClusters(args: any): Promise<FunctionCallResult> {
    try {
      const { keyword_strategy, user_token, site_url, cluster_count, business_context } = args;

      if (!keyword_strategy || !user_token || !site_url) {
        return this.error('keyword_strategy, user_token, and site_url are required for topic clustering');
      }

      const response = await this.fetchAPI('/api/agent/topics-create-clusters', {
        method: 'POST',
        body: JSON.stringify({
          keyword_strategy,
          user_token: user_token || this.userToken,
          site_url,
          cluster_count: cluster_count || 8,
          business_context
        })
      });

      if (!response.success) {
        return this.error(response.error || 'Failed to create topic clusters');
      }

      return this.success({
        topic_clusters: response.data.topic_clusters,
        clustering_strategy: response.data.clustering_strategy,
        content_calendar: response.data.content_calendar,
        saved_clusters: response.data.saved_clusters,
        keywords_processed: response.data.keywords_processed
      });

    } catch (error) {
      return this.error('Failed to create topic clusters', error);
    }
  }

  /**
   * Analyze content gaps compared to competitors
   */
  private async analyzeContentGaps(args: any): Promise<FunctionCallResult> {
    try {
      const {
        user_website_analysis,
        competitor_analysis,
        topic_clusters,
        focus_content_types
      } = args;

      if (!user_website_analysis || !competitor_analysis) {
        return this.error('user_website_analysis and competitor_analysis are required for content gap analysis');
      }

      const response = await this.fetchAPI('/api/agent/content-gap-analysis', {
        method: 'POST',
        body: JSON.stringify({
          user_website_analysis,
          competitor_analysis,
          topic_clusters,
          focus_content_types: focus_content_types || ['blog', 'guides', 'comparisons']
        })
      });

      if (!response.success) {
        return this.error(response.error || 'Failed to analyze content gaps');
      }

      return this.success({
        gap_analysis: response.data.gap_analysis,
        content_recommendations: response.data.content_recommendations,
        user_existing_content: response.data.user_existing_content,
        competitors_analyzed: response.data.competitors_analyzed,
        methodology: response.data.methodology
      });

    } catch (error) {
      return this.error('Failed to analyze content gaps', error);
    }
  }
}