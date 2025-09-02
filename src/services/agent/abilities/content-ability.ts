/**
 * Content Ability
 * 
 * Handles all content-related functions including:
 * - Article generation
 * - Content optimization
 * - Content publishing
 */

import { BaseAbility, FunctionCallResult } from './base-ability';

export class ContentAbility extends BaseAbility {
  getFunctionNames(): string[] {
    return [
      'generate_article',
      'optimize_content',
      'publish_content',
      'analyze_content_performance'
    ];
  }

  async executeFunction(name: string, args: any): Promise<FunctionCallResult> {
    switch (name) {
      case 'generate_article':
        return await this.generateArticle(args);
      case 'optimize_content':
        return await this.optimizeContent(args);
      case 'publish_content':
        return await this.publishContent(args);
      case 'analyze_content_performance':
        return await this.analyzeContentPerformance(args);
      default:
        return this.error(`Unknown content function: ${name}`);
    }
  }

  /**
   * Generate an article based on topic and keywords
   */
  private async generateArticle(args: { 
    topic: string; 
    target_keywords?: string[]; 
    content_type?: string; 
    word_count?: number; 
    site_url?: string;
    website_id?: number;
  }): Promise<FunctionCallResult> {
    try {
      // Get website ID if not provided
      let websiteId = args.website_id;
      if (!websiteId && args.site_url) {
        const websitesResponse = await this.fetchAPI(`/api/chat/sites?userToken=${this.userToken}`);
        if (websitesResponse.success && websitesResponse.sites?.length > 0) {
          const matchingSite = websitesResponse.sites.find((site: any) => 
            site.domain === args.site_url || site.domain.includes(args.site_url)
          );
          websiteId = matchingSite?.id || websitesResponse.sites[0].id;
        }
      }

      if (!websiteId) {
        return this.error('Website ID is required. Please specify site_url or website_id parameter.');
      }

      // First, create an article in the queue
      const queueResponse = await this.fetchAPI('/api/articles', {
        method: 'POST',
        body: JSON.stringify({
          title: args.topic,
          userToken: this.userToken,
          websiteId: websiteId,
          targetKeywords: args.target_keywords || []
        })
      });

      if (!queueResponse.success) {
        return this.error(queueResponse.error || 'Failed to create article');
      }

      const articleId = queueResponse.article.id;

      // Then generate the content
      const response = await this.fetchAPI('/api/articles/generate', {
        method: 'POST',
        body: JSON.stringify({
          userToken: this.userToken,
          articleId: articleId,
          targetKeywords: args.target_keywords || [],
          contentLength: this.mapWordCountToLength(args.word_count),
          tone: 'professional',
          includeImages: true
        })
      });

      return response.success ? 
        this.success(response) :
        this.error(response.error || 'Article generation failed');
    } catch (error) {
      return this.error('Failed to generate article', error);
    }
  }

  /**
   * Map word count to content length
   */
  private mapWordCountToLength(wordCount?: number): 'short' | 'medium' | 'long' {
    if (!wordCount) return 'medium';
    if (wordCount < 700) return 'short';
    if (wordCount > 1000) return 'long';
    return 'medium';
  }

  /**
   * Optimize existing content for SEO
   */
  private async optimizeContent(args: { 
    content: string; 
    target_keywords?: string[]; 
    optimization_type?: string 
  }): Promise<FunctionCallResult> {
    try {
      // For now, return a placeholder since there's no specific optimization endpoint
      // This could use SVS optimization or other content analysis tools
      return this.success({
        message: 'Content optimization functionality will use SVS optimization tools',
        recommendation: 'Use the SVS ability for advanced content optimization',
        suggestions: [
          'Add more semantic keywords naturally',
          'Include relevant entities and citations', 
          'Improve content structure with clear headings',
          'Add FAQ sections for better search visibility'
        ]
      });
    } catch (error) {
      return this.error('Failed to optimize content', error);
    }
  }

  /**
   * Publish content to connected CMS
   */
  private async publishContent(args: { 
    title: string; 
    content: string; 
    article_id?: string;
    cms_connection_id?: string; 
    site_url?: string;
    meta_description?: string;
    tags?: string[]
  }): Promise<FunctionCallResult> {
    try {
      const response = await this.fetchAPI('/api/articles/publish', {
        method: 'POST',
        body: JSON.stringify({
          userToken: this.userToken,
          articleId: args.article_id,
          cmsConnectionId: args.cms_connection_id,
          title: args.title,
          content: args.content,
          metaDescription: args.meta_description,
          tags: args.tags || []
        })
      });

      return response.success ? 
        this.success(response) :
        this.error(response.error || 'Content publishing failed');
    } catch (error) {
      return this.error('Failed to publish content', error);
    }
  }

  /**
   * Analyze content performance metrics
   */
  private async analyzeContentPerformance(args: { 
    article_id?: string; 
    site_url?: string; 
    date_range?: string 
  }): Promise<FunctionCallResult> {
    try {
      const params = new URLSearchParams();
      if (this.userToken) params.append('userToken', this.userToken);

      // Get articles list and their metrics
      const response = await this.fetchAPI(`/api/articles?${params}`, {
        method: 'GET'
      });

      if (!response.success) {
        return this.error(response.error || 'Failed to fetch articles');
      }

      const articles = response.articles || [];
      
      // Filter by article_id if provided
      const filteredArticles = args.article_id 
        ? articles.filter((article: any) => article.id === args.article_id)
        : articles;

      // Calculate basic performance metrics
      const performanceData = filteredArticles.map((article: any) => ({
        id: article.id,
        title: article.title,
        word_count: article.word_count,
        quality_score: article.quality_score,
        seo_score: article.seo_score,
        readability_score: article.readability_score,
        status: article.status,
        created_at: article.created_at,
        published_at: article.published_at
      }));

      return this.success({
        articles: performanceData,
        summary: {
          total_articles: performanceData.length,
          average_quality_score: performanceData.reduce((sum: number, a: any) => sum + (a.quality_score || 0), 0) / performanceData.length,
          average_seo_score: performanceData.reduce((sum: number, a: any) => sum + (a.seo_score || 0), 0) / performanceData.length,
          total_word_count: performanceData.reduce((sum: number, a: any) => sum + (a.word_count || 0), 0)
        }
      });
    } catch (error) {
      return this.error('Failed to analyze content performance', error);
    }
  }
}