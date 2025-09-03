/**
 * Keyword Strategy Ability
 * 
 * Handles all keyword strategy and topic cluster functions including:
 * - Keyword strategy management
 * - Long-tail keyword generation
 * - Topic cluster organization
 * - Internal link opportunities
 */

import { BaseAbility, FunctionCallResult } from './base-ability';

export class KeywordStrategyAbility extends BaseAbility {
  getFunctionNames(): string[] {
    return [
      'get_keyword_strategy',
      'update_keyword_strategy', 
      'brainstorm_keywords',
      'organize_topic_clusters',
      'get_internal_link_opportunities',
      'create_internal_link',
      'analyze_keyword_gaps',
      'suggest_content_from_keywords',
      // Modern function names (KEYWORDS_ prefixed)
      'KEYWORDS_get_strategy',
      'KEYWORDS_brainstorm',
      'KEYWORDS_organize_clusters',
      'KEYWORDS_suggest_content',
      'KEYWORDS_analyze_gaps'
    ];
  }

  async executeFunction(name: string, args: any): Promise<FunctionCallResult> {
    switch (name) {
      case 'get_keyword_strategy':
      case 'KEYWORDS_get_strategy':
        return await this.getKeywordStrategy(args);
      case 'update_keyword_strategy':
        return await this.updateKeywordStrategy(args);
      case 'brainstorm_keywords':
      case 'KEYWORDS_brainstorm':
        return await this.brainstormKeywords(args);
      case 'organize_topic_clusters':
      case 'KEYWORDS_organize_clusters':
        return await this.organizeTopicClusters(args);
      case 'get_internal_link_opportunities':
        return await this.getInternalLinkOpportunities(args);
      case 'create_internal_link':
        return await this.createInternalLink(args);
      case 'analyze_keyword_gaps':
      case 'KEYWORDS_analyze_gaps':
        return await this.analyzeKeywordGaps(args);
      case 'suggest_content_from_keywords':
      case 'KEYWORDS_suggest_content':
        return await this.suggestContentFromKeywords(args);
      default:
        return this.error(`Unknown keyword strategy function: ${name}`);
    }
  }

  /**
   * Get existing keyword strategy for a website
   */
  private async getKeywordStrategy(args: { 
    site_url?: string;
    website_token?: string;
    include_opportunities?: boolean;
  }): Promise<FunctionCallResult> {
    try {
      if (!args.site_url && !args.website_token) {
        return this.error('Either site_url or website_token is required');
      }

      const params = new URLSearchParams({
        userToken: this.userToken || '',
        ...(args.website_token ? { websiteToken: args.website_token } : {}),
        ...(args.site_url ? { domain: this.cleanDomain(args.site_url) } : {})
      });

      const response = await this.fetchAPI(`/api/keyword-strategy?${params}`);
      
      if (!response.success) {
        return this.error(response.error || 'Failed to fetch keyword strategy');
      }

      // Format for agent context
      const strategy = {
        has_strategy: response.hasStrategy,
        total_keywords: response.totalKeywords,
        keyword_breakdown: {
          primary: response.primaryKeywords,
          secondary: response.secondaryKeywords,
          long_tail: response.longTailKeywords
        },
        topic_clusters: response.topicClusters.map((cluster: any) => ({
          name: cluster.name,
          keyword_count: cluster.keywords.length,
          content_count: cluster.content.length,
          top_keywords: cluster.keywords.slice(0, 5).map((k: any) => k.keyword)
        })),
        internal_links: {
          total: response.totalInternalLinks,
          by_cluster: response.topicClusters.reduce((acc: any, cluster: any) => {
            if (cluster.internal_links.length > 0) {
              acc[cluster.name] = cluster.internal_links.length;
            }
            return acc;
          }, {})
        },
        next_steps: this.generateNextSteps(response)
      };

      return this.success({
        strategy,
        raw_data: response,
        recommendations: this.generateRecommendations(response)
      });

    } catch (error) {
      return this.error('Failed to get keyword strategy', error);
    }
  }

  /**
   * Update keyword strategy with new keywords and clusters
   */
  private async updateKeywordStrategy(args: {
    site_url?: string;
    website_token?: string;
    keywords?: Array<{
      keyword: string;
      keyword_type: 'primary' | 'secondary' | 'long_tail';
      topic_cluster?: string;
    }>;
    topic_clusters?: Array<{
      topic_cluster: string;
      article_title?: string;
      article_url?: string;
      primary_keyword?: string;
    }>;
  }): Promise<FunctionCallResult> {
    try {
      if (!args.site_url && !args.website_token) {
        return this.error('Either site_url or website_token is required');
      }

      const payload = {
        userToken: this.userToken,
        ...(args.website_token ? { websiteToken: args.website_token } : {}),
        ...(args.site_url ? { domain: this.cleanDomain(args.site_url) } : {}),
        keywords: args.keywords || [],
        topicClusters: args.topic_clusters || []
      };

      const response = await this.fetchAPI('/api/keyword-strategy', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!response.success) {
        return this.error(response.error || 'Failed to update keyword strategy');
      }

      return this.success({
        message: 'Keyword strategy updated successfully',
        updated_strategy: response.strategy,
        summary: {
          keywords_added: args.keywords?.length || 0,
          clusters_updated: args.topic_clusters?.length || 0,
          total_keywords: response.strategy?.totalKeywords || 0,
          total_clusters: response.strategy?.totalClusters || 0
        }
      });

    } catch (error) {
      return this.error('Failed to update keyword strategy', error);
    }
  }

  /**
   * Generate new long-tail keyword ideas
   */
  private async brainstormKeywords(args: {
    site_url?: string;
    website_token?: string;
    base_keywords?: string[];
    topic_focus?: string;
    generate_count?: number;
    avoid_duplicates?: boolean;
  }): Promise<FunctionCallResult> {
    try {
      if (!args.site_url && !args.website_token) {
        return this.error('Either site_url or website_token is required');
      }

      const payload = {
        userToken: this.userToken,
        ...(args.website_token ? { websiteToken: args.website_token } : {}),
        ...(args.site_url ? { domain: this.cleanDomain(args.site_url) } : {}),
        baseKeywords: args.base_keywords || [],
        topicFocus: args.topic_focus || '',
        generateCount: args.generate_count || 10,
        avoidDuplicates: args.avoid_duplicates !== false
      };

      const response = await this.fetchAPI('/api/keyword-strategy/brainstorm', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!response.success) {
        return this.error(response.error || 'Failed to brainstorm keywords');
      }

      // Format for agent use
      const keywordsByIntent = {
        informational: response.generated_keywords.filter((k: any) => k.search_intent === 'informational'),
        commercial: response.generated_keywords.filter((k: any) => k.search_intent === 'commercial'),
        transactional: response.generated_keywords.filter((k: any) => k.search_intent === 'transactional')
      };

      return this.success({
        generated_keywords: response.generated_keywords,
        keywords_by_intent: keywordsByIntent,
        topic_cluster_suggestions: response.topic_cluster_suggestions,
        statistics: {
          total_generated: response.total_generated,
          existing_avoided: response.existing_keywords_avoided,
          high_intent_keywords: keywordsByIntent.commercial.length + keywordsByIntent.transactional.length
        },
        next_steps: response.suggestions.next_steps,
        ready_for_content: {
          commercial_opportunities: keywordsByIntent.commercial.length,
          informational_topics: keywordsByIntent.informational.length,
          suggested_first_articles: keywordsByIntent.commercial.slice(0, 3).map((k: any) => ({
            keyword: k.keyword,
            cluster: k.suggested_topic_cluster,
            rationale: k.rationale
          }))
        }
      });

    } catch (error) {
      return this.error('Failed to brainstorm keywords', error);
    }
  }

  /**
   * Organize existing keywords into topic clusters
   */
  private async organizeTopicClusters(args: {
    site_url?: string;
    website_token?: string;
    auto_organize?: boolean;
    cluster_suggestions?: Array<{
      cluster_name: string;
      keywords: string[];
    }>;
  }): Promise<FunctionCallResult> {
    try {
      // First get current keyword strategy
      const strategyResult = await this.getKeywordStrategy({
        site_url: args.site_url,
        website_token: args.website_token
      });

      if (!strategyResult.success) {
        return strategyResult;
      }

      const currentStrategy = strategyResult.data.raw_data;
      
      if (!currentStrategy.hasStrategy) {
        return this.error('No keywords found to organize. Please add keywords first.');
      }

      // If auto-organize requested, use AI to suggest clusters
      if (args.auto_organize) {
        const brainstormResult = await this.brainstormKeywords({
          site_url: args.site_url,
          website_token: args.website_token,
          base_keywords: currentStrategy.keywords.map((k: any) => k.keyword),
          generate_count: 0 // Don't generate new keywords, just organize existing
        });

        if (brainstormResult.success) {
          return this.success({
            organization_type: 'auto',
            suggested_clusters: brainstormResult.data.topic_cluster_suggestions,
            current_keywords: currentStrategy.keywords,
            recommendations: [
              'Review the suggested topic clusters',
              'Confirm cluster assignments for your keywords',
              'Use update_keyword_strategy to save the new organization'
            ]
          });
        }
      }

      // Manual organization with provided cluster suggestions
      if (args.cluster_suggestions) {
        const updates = [];
        
        for (const suggestion of args.cluster_suggestions) {
          for (const keyword of suggestion.keywords) {
            const existingKeyword = currentStrategy.keywords.find(
              (k: any) => k.keyword.toLowerCase() === keyword.toLowerCase()
            );
            
            if (existingKeyword) {
              updates.push({
                keyword: existingKeyword.keyword,
                keyword_type: existingKeyword.keyword_type,
                topic_cluster: suggestion.cluster_name
              });
            }
          }
        }

        if (updates.length > 0) {
          const updateResult = await this.updateKeywordStrategy({
            site_url: args.site_url,
            website_token: args.website_token,
            keywords: updates
          });

          if (updateResult.success) {
            return this.success({
              organization_type: 'manual',
              clusters_created: args.cluster_suggestions.length,
              keywords_organized: updates.length,
              updated_strategy: updateResult.data.updated_strategy
            });
          }
        }
      }

      // Return current organization status
      return this.success({
        organization_type: 'status',
        current_clusters: currentStrategy.topicClusters,
        unorganized_keywords: currentStrategy.keywords.filter(
          (k: any) => !k.topic_cluster || k.topic_cluster === 'uncategorized'
        ).length,
        suggestions: [
          'Use auto_organize: true to get AI suggestions for organizing keywords',
          'Or provide cluster_suggestions with manual organization'
        ]
      });

    } catch (error) {
      return this.error('Failed to organize topic clusters', error);
    }
  }

  /**
   * Get internal link opportunities
   */
  private async getInternalLinkOpportunities(args: {
    site_url?: string;
    website_token?: string;
    topic_cluster?: string;
  }): Promise<FunctionCallResult> {
    try {
      if (!args.site_url && !args.website_token) {
        return this.error('Either site_url or website_token is required');
      }

      const params = new URLSearchParams({
        userToken: this.userToken || '',
        action: 'opportunities',
        ...(args.website_token ? { websiteToken: args.website_token } : {}),
        ...(args.site_url ? { domain: this.cleanDomain(args.site_url) } : {}),
        ...(args.topic_cluster ? { topicCluster: args.topic_cluster } : {})
      });

      const response = await this.fetchAPI(`/api/keyword-strategy/internal-links?${params}`);

      if (!response.success) {
        return this.error(response.error || 'Failed to get internal link opportunities');
      }

      return this.success({
        total_opportunities: response.total_opportunities,
        opportunities_by_cluster: response.opportunities_by_cluster,
        priority_clusters: response.recommendations.priority_clusters,
        opportunities: response.opportunities,
        action_items: this.generateLinkingActionItems(response)
      });

    } catch (error) {
      return this.error('Failed to get internal link opportunities', error);
    }
  }

  /**
   * Create an internal link
   */
  private async createInternalLink(args: {
    site_url?: string;
    website_token?: string;
    source_article_id: number;
    target_article_id?: number;
    target_url?: string;
    anchor_text: string;
    topic_cluster?: string;
    link_context?: string;
  }): Promise<FunctionCallResult> {
    try {
      if (!args.site_url && !args.website_token) {
        return this.error('Either site_url or website_token is required');
      }

      const payload = {
        userToken: this.userToken,
        ...(args.website_token ? { websiteToken: args.website_token } : {}),
        ...(args.site_url ? { domain: this.cleanDomain(args.site_url) } : {}),
        sourceArticleId: args.source_article_id,
        targetArticleId: args.target_article_id,
        targetUrl: args.target_url,
        anchorText: args.anchor_text,
        topicCluster: args.topic_cluster,
        linkContext: args.link_context
      };

      const response = await this.fetchAPI('/api/keyword-strategy/internal-links', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!response.success) {
        return this.error(response.error || 'Failed to create internal link');
      }

      return this.success({
        message: 'Internal link created successfully',
        link: response.link,
        suggestions: [
          'Continue adding internal links between related articles',
          'Monitor the impact on SEO performance',
          'Consider adding reciprocal links where relevant'
        ]
      });

    } catch (error) {
      return this.error('Failed to create internal link', error);
    }
  }

  /**
   * Analyze keyword gaps and opportunities
   */
  private async analyzeKeywordGaps(args: {
    site_url?: string;
    website_token?: string;
    competitor_domains?: string[];
    focus_topics?: string[];
  }): Promise<FunctionCallResult> {
    try {
      const strategyResult = await this.getKeywordStrategy({
        site_url: args.site_url,
        website_token: args.website_token
      });

      if (!strategyResult.success) {
        return strategyResult;
      }

      const currentStrategy = strategyResult.data.strategy;
      
      // Analyze gaps in keyword strategy
      const gaps = {
        missing_long_tail: currentStrategy.keyword_breakdown.long_tail < 
          (currentStrategy.keyword_breakdown.primary + currentStrategy.keyword_breakdown.secondary) * 3,
        
        missing_commercial: currentStrategy.keyword_breakdown.primary < 3,
        
        unorganized_clusters: currentStrategy.topic_clusters.filter((c: any) => 
          c.name === 'uncategorized'
        ).length > 0,
        
        missing_internal_links: currentStrategy.internal_links.total < 
          currentStrategy.total_keywords * 0.5,
          
        sparse_content: currentStrategy.topic_clusters.filter((c: any) => 
          c.content_count === 0
        ).length > 0
      };

      const recommendations = [];
      
      if (gaps.missing_long_tail) {
        recommendations.push({
          priority: 'high',
          action: 'Generate more long-tail keywords',
          rationale: 'Long-tail keywords are easier to rank for and drive targeted traffic'
        });
      }

      if (gaps.missing_commercial) {
        recommendations.push({
          priority: 'medium',
          action: 'Add commercial intent keywords',
          rationale: 'Commercial keywords help drive revenue-focused traffic'
        });
      }

      if (gaps.missing_internal_links) {
        recommendations.push({
          priority: 'high',
          action: 'Create more internal links between related content',
          rationale: 'Internal links improve SEO and user experience'
        });
      }

      return this.success({
        keyword_gaps: gaps,
        recommendations,
        current_strategy_health: {
          total_score: this.calculateStrategyScore(currentStrategy, gaps),
          strengths: this.identifyStrengths(currentStrategy),
          improvement_areas: recommendations.map(r => r.action)
        },
        next_actions: recommendations.slice(0, 3).map(r => r.action)
      });

    } catch (error) {
      return this.error('Failed to analyze keyword gaps', error);
    }
  }

  /**
   * Suggest content ideas based on keyword strategy
   */
  private async suggestContentFromKeywords(args: {
    site_url?: string;
    website_token?: string;
    topic_cluster?: string;
    content_type?: 'blog' | 'guide' | 'faq' | 'comparison';
    max_suggestions?: number;
  }): Promise<FunctionCallResult> {
    try {
      const strategyResult = await this.getKeywordStrategy({
        site_url: args.site_url,
        website_token: args.website_token
      });

      if (!strategyResult.success) {
        return strategyResult;
      }

      const strategy = strategyResult.data.strategy;
      
      if (!strategy.has_strategy) {
        return this.error('No keyword strategy found. Please create a keyword strategy first.');
      }

      // Filter by topic cluster if specified
      let targetClusters = strategy.topic_clusters;
      if (args.topic_cluster) {
        targetClusters = targetClusters.filter((c: any) => 
          c.name.toLowerCase() === args.topic_cluster.toLowerCase()
        );
      }

      const contentSuggestions = [];
      
      for (const cluster of targetClusters) {
        if (cluster.keyword_count === 0) continue;
        
        // Suggest content based on keywords in this cluster
        const suggestion = {
          topic_cluster: cluster.name,
          suggested_title: this.generateTitleFromKeywords(cluster.top_keywords),
          target_keywords: cluster.top_keywords.slice(0, 3),
          content_type: args.content_type || this.suggestContentType(cluster.top_keywords),
          rationale: `Create content for ${cluster.keyword_count} keywords in the ${cluster.name} cluster`,
          existing_content: cluster.content_count,
          priority_score: this.calculateContentPriority(cluster)
        };
        
        contentSuggestions.push(suggestion);
      }

      // Sort by priority
      contentSuggestions.sort((a, b) => b.priority_score - a.priority_score);
      
      const maxSuggestions = args.max_suggestions || 5;
      const topSuggestions = contentSuggestions.slice(0, maxSuggestions);

      return this.success({
        content_suggestions: topSuggestions,
        total_available: contentSuggestions.length,
        strategy_overview: {
          total_clusters: strategy.topic_clusters.length,
          clusters_with_content: strategy.topic_clusters.filter((c: any) => c.content_count > 0).length,
          content_gap_opportunities: strategy.topic_clusters.filter((c: any) => 
            c.keyword_count > 0 && c.content_count === 0
          ).length
        },
        next_steps: [
          'Review suggested content ideas and select priorities',
          'Use the content generation functions to create articles',
          'Internal links will be automatically added between related content'
        ]
      });

    } catch (error) {
      return this.error('Failed to suggest content from keywords', error);
    }
  }

  // Helper methods
  private cleanDomain(url: string): string {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
  }

  private generateNextSteps(strategy: any): string[] {
    const steps = [];
    
    if (!strategy.hasStrategy) {
      steps.push('Create your first keyword strategy by brainstorming relevant keywords');
      steps.push('Organize keywords into topic clusters for better content planning');
    } else {
      if (strategy.longTailKeywords < strategy.primaryKeywords * 2) {
        steps.push('Generate more long-tail keyword variations for easier ranking');
      }
      
      if (strategy.totalClusters === 0) {
        steps.push('Organize your keywords into topic clusters');
      }
      
      if (strategy.totalContent === 0) {
        steps.push('Start creating content based on your keyword strategy');
      }
      
      if (strategy.totalInternalLinks < strategy.totalKeywords) {
        steps.push('Add internal links between related articles');
      }
    }
    
    return steps;
  }

  private generateRecommendations(strategy: any): string[] {
    const recommendations = [];
    
    const keywordRatio = strategy.totalKeywords > 0 
      ? strategy.longTailKeywords / strategy.totalKeywords 
      : 0;
      
    if (keywordRatio < 0.6) {
      recommendations.push('Focus on long-tail keywords (60%+ of your strategy) for better ranking opportunities');
    }
    
    if (strategy.totalClusters > 0 && strategy.totalContent / strategy.totalClusters < 2) {
      recommendations.push('Create more content for each topic cluster to establish topical authority');
    }
    
    return recommendations;
  }

  private generateLinkingActionItems(response: any): string[] {
    const items = [];
    
    if (response.total_opportunities === 0) {
      items.push('No internal linking opportunities found - create more content first');
    } else {
      items.push(`Found ${response.total_opportunities} internal linking opportunities`);
      
      if (response.recommendations.priority_clusters.length > 0) {
        const topCluster = response.recommendations.priority_clusters[0];
        items.push(`Start with "${topCluster.cluster}" cluster (${topCluster.opportunity_count} opportunities)`);
      }
      
      items.push('Focus on high-impact clusters to maximize SEO benefit');
    }
    
    return items;
  }

  private calculateStrategyScore(strategy: any, gaps: any): number {
    let score = 100;
    
    if (gaps.missing_long_tail) score -= 20;
    if (gaps.missing_commercial) score -= 15;
    if (gaps.unorganized_clusters) score -= 10;
    if (gaps.missing_internal_links) score -= 25;
    if (gaps.sparse_content) score -= 15;
    
    return Math.max(0, score);
  }

  private identifyStrengths(strategy: any): string[] {
    const strengths = [];
    
    if (strategy.total_keywords > 10) {
      strengths.push('Comprehensive keyword coverage');
    }
    
    if (strategy.topic_clusters.length > 3) {
      strengths.push('Well-organized topic clusters');
    }
    
    if (strategy.internal_links.total > 0) {
      strengths.push('Internal linking established');
    }
    
    return strengths;
  }

  private generateTitleFromKeywords(keywords: string[]): string {
    if (!keywords || keywords.length === 0) return '';
    
    const primaryKeyword = keywords[0];
    
    // Simple title generation based on keyword patterns
    if (primaryKeyword.includes('how to')) {
      return `${primaryKeyword.charAt(0).toUpperCase() + primaryKeyword.slice(1)}: Complete Guide`;
    } else if (primaryKeyword.includes('best')) {
      return `${primaryKeyword.charAt(0).toUpperCase() + primaryKeyword.slice(1)} [2024 Guide]`;
    } else {
      return `The Complete Guide to ${primaryKeyword.charAt(0).toUpperCase() + primaryKeyword.slice(1)}`;
    }
  }

  private suggestContentType(keywords: string[]): string {
    if (!keywords || keywords.length === 0) return 'blog';
    
    const keywordText = keywords.join(' ').toLowerCase();
    
    if (keywordText.includes('how to') || keywordText.includes('guide')) {
      return 'guide';
    } else if (keywordText.includes('vs') || keywordText.includes('comparison')) {
      return 'comparison';
    } else if (keywordText.includes('what is') || keywordText.includes('faq')) {
      return 'faq';
    } else {
      return 'blog';
    }
  }

  private calculateContentPriority(cluster: any): number {
    let priority = 0;
    
    // Higher priority for more keywords
    priority += cluster.keyword_count * 2;
    
    // Higher priority if no existing content
    if (cluster.content_count === 0) {
      priority += 10;
    }
    
    // Lower priority if already has lots of content
    priority -= cluster.content_count * 3;
    
    return Math.max(0, priority);
  }
}