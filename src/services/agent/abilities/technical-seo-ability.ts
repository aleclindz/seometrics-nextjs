/**
 * Technical SEO Ability
 * 
 * Handles all technical SEO related functions including:
 * - Site auditing
 * - Technical SEO analysis
 * - Crawling and indexing issues
 * - Site structure optimization
 */

import { BaseAbility, FunctionCallResult } from './base-ability';

export class TechnicalSEOAbility extends BaseAbility {
  getFunctionNames(): string[] {
    return [
      'audit_site',
      'check_technical_seo',
      'plan_crawl',
      'analyze_crawl',
      'check_indexing',
      'analyze_site_structure',
      'check_page_speed',
      'validate_schema'
    ];
  }

  async executeFunction(name: string, args: any): Promise<FunctionCallResult> {
    switch (name) {
      case 'audit_site':
        return await this.auditSite(args);
      case 'check_technical_seo':
        return await this.checkTechnicalSEO(args);
      case 'plan_crawl':
        return await this.planCrawl(args);
      case 'analyze_crawl':
        return await this.analyzeCrawl(args);
      case 'check_indexing':
        return await this.checkIndexing(args);
      case 'analyze_site_structure':
        return await this.analyzeSiteStructure(args);
      case 'check_page_speed':
        return await this.checkPageSpeed(args);
      case 'validate_schema':
        return await this.validateSchema(args);
      default:
        return this.error(`Unknown technical SEO function: ${name}`);
    }
  }

  /**
   * Perform comprehensive site audit
   */
  private async auditSite(args: { 
    site_url: string; 
    audit_type?: string; 
    include_performance?: boolean 
  }): Promise<FunctionCallResult> {
    try {
      const response = await this.fetchAPI('/api/technical-seo/audit', {
        method: 'POST',
        body: JSON.stringify({
          ...args,
          userToken: this.userToken
        })
      });

      return response.success ? 
        this.success(response) :
        this.error(response.error || 'Site audit failed');
    } catch (error) {
      return this.error('Failed to audit site', error);
    }
  }

  /**
   * Check technical SEO issues
   */
  private async checkTechnicalSEO(args: { 
    site_url: string; 
    focus_areas?: string[] 
  }): Promise<FunctionCallResult> {
    try {
      const response = await this.fetchAPI('/api/technical-seo/check', {
        method: 'POST',
        body: JSON.stringify({
          ...args,
          userToken: this.userToken
        })
      });

      return response.success ? 
        this.success(response) :
        this.error(response.error || 'Technical SEO check failed');
    } catch (error) {
      return this.error('Failed to check technical SEO', error);
    }
  }

  /**
   * Plan a crawling strategy for the site
   */
  private async planCrawl(args: { 
    site_url: string; 
    max_pages?: number; 
    crawl_depth?: number 
  }): Promise<FunctionCallResult> {
    try {
      const response = await this.fetchAPI('/api/crawl/plan', {
        method: 'POST',
        body: JSON.stringify({
          ...args,
          userToken: this.userToken
        })
      });

      return response.success ? 
        this.success(response) :
        this.error(response.error || 'Crawl planning failed');
    } catch (error) {
      return this.error('Failed to plan crawl', error);
    }
  }

  /**
   * Analyze crawl results
   */
  private async analyzeCrawl(args: { 
    crawl_id: string; 
    analysis_type?: string 
  }): Promise<FunctionCallResult> {
    try {
      const params = new URLSearchParams({
        crawl_id: args.crawl_id
      });

      if (args.analysis_type) {
        params.append('analysis_type', args.analysis_type);
      }

      if (this.userToken) {
        params.append('userToken', this.userToken);
      }

      const response = await this.fetchAPI(`/api/crawl/analyze?${params}`, {
        method: 'GET'
      });

      return response.success ? 
        this.success(response) :
        this.error(response.error || 'Crawl analysis failed');
    } catch (error) {
      return this.error('Failed to analyze crawl', error);
    }
  }

  /**
   * Check page indexing status
   */
  private async checkIndexing(args: { 
    site_url: string; 
    pages?: string[] 
  }): Promise<FunctionCallResult> {
    try {
      const response = await this.fetchAPI('/api/technical-seo/indexing', {
        method: 'POST',
        body: JSON.stringify({
          ...args,
          userToken: this.userToken
        })
      });

      return response.success ? 
        this.success(response) :
        this.error(response.error || 'Indexing check failed');
    } catch (error) {
      return this.error('Failed to check indexing', error);
    }
  }

  /**
   * Analyze site structure and architecture
   */
  private async analyzeSiteStructure(args: { 
    site_url: string; 
    include_internal_links?: boolean 
  }): Promise<FunctionCallResult> {
    try {
      const response = await this.fetchAPI('/api/technical-seo/structure', {
        method: 'POST',
        body: JSON.stringify({
          ...args,
          userToken: this.userToken
        })
      });

      return response.success ? 
        this.success(response) :
        this.error(response.error || 'Site structure analysis failed');
    } catch (error) {
      return this.error('Failed to analyze site structure', error);
    }
  }

  /**
   * Check page speed and performance
   */
  private async checkPageSpeed(args: { 
    page_url: string; 
    device?: string 
  }): Promise<FunctionCallResult> {
    try {
      const params = new URLSearchParams({
        page_url: args.page_url,
        device: args.device || 'desktop'
      });

      if (this.userToken) {
        params.append('userToken', this.userToken);
      }

      const response = await this.fetchAPI(`/api/technical-seo/pagespeed?${params}`, {
        method: 'GET'
      });

      return response.success ? 
        this.success(response) :
        this.error(response.error || 'Page speed check failed');
    } catch (error) {
      return this.error('Failed to check page speed', error);
    }
  }

  /**
   * Validate structured data schema
   */
  private async validateSchema(args: { 
    page_url: string; 
    schema_types?: string[] 
  }): Promise<FunctionCallResult> {
    try {
      const response = await this.fetchAPI('/api/technical-seo/schema', {
        method: 'POST',
        body: JSON.stringify({
          ...args,
          userToken: this.userToken
        })
      });

      return response.success ? 
        this.success(response) :
        this.error(response.error || 'Schema validation failed');
    } catch (error) {
      return this.error('Failed to validate schema', error);
    }
  }
}