/**
 * Performance Ability
 * 
 * Handles all site performance and analytics related functions including:
 * - Site performance metrics
 * - Analytics data
 * - Performance monitoring
 */

import { BaseAbility, FunctionCallResult } from './base-ability';

export class PerformanceAbility extends BaseAbility {
  getFunctionNames(): string[] {
    return [
      'get_site_performance',
      'get_site_status',
      'analyze_metrics',
      'get_performance_trends',
      'compare_performance'
    ];
  }

  async executeFunction(name: string, args: any): Promise<FunctionCallResult> {
    switch (name) {
      case 'get_site_performance':
        return await this.getSitePerformance(args);
      case 'get_site_status':
        return await this.getSiteStatus(args);
      case 'analyze_metrics':
        return await this.analyzeMetrics(args);
      case 'get_performance_trends':
        return await this.getPerformanceTrends(args);
      case 'compare_performance':
        return await this.comparePerformance(args);
      default:
        return this.error(`Unknown performance function: ${name}`);
    }
  }

  /**
   * Get site performance data from GSC
   */
  private async getSitePerformance(args: { 
    site_url: string; 
    date_range?: string 
  }): Promise<FunctionCallResult> {
    try {
      const params = new URLSearchParams({
        site_url: args.site_url,
        date_range: args.date_range || '30d'
      });

      if (this.userToken) {
        params.append('userToken', this.userToken);
      }

      const response = await this.fetchAPI(`/api/performance/site?${params}`, {
        method: 'GET'
      });

      return response.success ? 
        this.success(response) :
        this.error(response.error || 'Failed to get site performance');
    } catch (error) {
      return this.error('Failed to get site performance', error);
    }
  }

  /**
   * Get overall site status and health
   */
  private async getSiteStatus(args: { site_url: string }): Promise<FunctionCallResult> {
    try {
      const params = new URLSearchParams({
        site_url: args.site_url
      });

      if (this.userToken) {
        params.append('userToken', this.userToken);
      }

      const response = await this.fetchAPI(`/api/site/status?${params}`, {
        method: 'GET'
      });

      return response.success ? 
        this.success(response) :
        this.error(response.error || 'Failed to get site status');
    } catch (error) {
      return this.error('Failed to get site status', error);
    }
  }

  /**
   * Analyze performance metrics and provide insights
   */
  private async analyzeMetrics(args: { 
    site_url: string; 
    metric_types?: string[]; 
    date_range?: string 
  }): Promise<FunctionCallResult> {
    try {
      const response = await this.fetchAPI('/api/analytics/analyze', {
        method: 'POST',
        body: JSON.stringify({
          ...args,
          userToken: this.userToken
        })
      });

      return response.success ? 
        this.success(response) :
        this.error(response.error || 'Metrics analysis failed');
    } catch (error) {
      return this.error('Failed to analyze metrics', error);
    }
  }

  /**
   * Get performance trends over time
   */
  private async getPerformanceTrends(args: { 
    site_url: string; 
    period?: string; 
    metrics?: string[] 
  }): Promise<FunctionCallResult> {
    try {
      const params = new URLSearchParams({
        site_url: args.site_url,
        period: args.period || '90d'
      });

      if (args.metrics) {
        params.append('metrics', args.metrics.join(','));
      }

      if (this.userToken) {
        params.append('userToken', this.userToken);
      }

      const response = await this.fetchAPI(`/api/performance/trends?${params}`, {
        method: 'GET'
      });

      return response.success ? 
        this.success(response) :
        this.error(response.error || 'Failed to get performance trends');
    } catch (error) {
      return this.error('Failed to get performance trends', error);
    }
  }

  /**
   * Compare performance between different time periods
   */
  private async comparePerformance(args: { 
    site_url: string; 
    compare_period?: string; 
    base_period?: string 
  }): Promise<FunctionCallResult> {
    try {
      const response = await this.fetchAPI('/api/performance/compare', {
        method: 'POST',
        body: JSON.stringify({
          site_url: args.site_url,
          compare_period: args.compare_period || '30d',
          base_period: args.base_period || '60d',
          userToken: this.userToken
        })
      });

      return response.success ? 
        this.success(response) :
        this.error(response.error || 'Performance comparison failed');
    } catch (error) {
      return this.error('Failed to compare performance', error);
    }
  }
}