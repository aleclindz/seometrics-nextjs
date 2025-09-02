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
    site_url?: string 
  }): Promise<FunctionCallResult> {
    try {
      const response = await this.fetchAPI('/api/content/generate-article', {
        method: 'POST',
        body: JSON.stringify({
          ...args,
          userToken: this.userToken
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
   * Optimize existing content for SEO
   */
  private async optimizeContent(args: { 
    content: string; 
    target_keywords?: string[]; 
    optimization_type?: string 
  }): Promise<FunctionCallResult> {
    try {
      const response = await this.fetchAPI('/api/content/optimize', {
        method: 'POST',
        body: JSON.stringify({
          ...args,
          userToken: this.userToken
        })
      });

      return response.success ? 
        this.success(response) :
        this.error(response.error || 'Content optimization failed');
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
    cms_id?: string; 
    site_url?: string;
    meta_description?: string;
    tags?: string[]
  }): Promise<FunctionCallResult> {
    try {
      const response = await this.fetchAPI('/api/content/publish', {
        method: 'POST',
        body: JSON.stringify({
          ...args,
          userToken: this.userToken
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
    content_id?: string; 
    site_url?: string; 
    date_range?: string 
  }): Promise<FunctionCallResult> {
    try {
      const params = new URLSearchParams();
      if (args.content_id) params.append('content_id', args.content_id);
      if (args.site_url) params.append('site_url', args.site_url);
      if (args.date_range) params.append('date_range', args.date_range);
      if (this.userToken) params.append('userToken', this.userToken);

      const response = await this.fetchAPI(`/api/content/performance?${params}`, {
        method: 'GET'
      });

      return response.success ? 
        this.success(response) :
        this.error(response.error || 'Content performance analysis failed');
    } catch (error) {
      return this.error('Failed to analyze content performance', error);
    }
  }
}