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
import { DomainUtils } from '@/lib/utils/DomainUtils';

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
      'KEYWORDS_add_keywords',
      'KEYWORDS_brainstorm',
      'KEYWORDS_brainstorm_auto',
      'KEYWORDS_organize_clusters',
      'KEYWORDS_suggest_content',
      'KEYWORDS_analyze_gaps',
      // Strategy initialization
      'STRATEGY_initialize'
    ];
  }

  async executeFunction(name: string, args: any): Promise<FunctionCallResult> {
    switch (name) {
      case 'get_keyword_strategy':
      case 'KEYWORDS_get_strategy':
        return await this.getKeywordStrategy(args);
      case 'KEYWORDS_add_keywords':
        return await this.addKeywords(args);
      case 'update_keyword_strategy':
        return await this.updateKeywordStrategy(args);
      case 'brainstorm_keywords':
      case 'KEYWORDS_brainstorm':
        return await this.brainstormKeywords(args);
      case 'KEYWORDS_brainstorm_auto':
        return await this.brainstormFromSite(args);
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
      case 'STRATEGY_initialize':
        return await this.initializeStrategy(args);
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
   * Auto-brainstorm keywords by inferring seed terms from GSC data or a quick homepage crawl
   */
  private async brainstormFromSite(args: {
    site_url?: string;
    website_token?: string;
    generate_count?: number;
    avoid_duplicates?: boolean;
  }): Promise<FunctionCallResult> {
    try {
      if (!args.site_url && !args.website_token) {
        return this.error('Either site_url or website_token is required');
      }

      const domain = args.site_url ? this.cleanDomain(args.site_url) : undefined;

      // First try to get seeds from GSC performance data
      let seeds: string[] = [];
      let seedSource: 'gsc' | 'crawl' | 'none' = 'none';
      try {
        const { ContentIntelligenceService } = await import('../../content/content-intelligence-service');
        const cis = new ContentIntelligenceService();
        const opportunities = await cis.getKeywordOpportunities(this.userToken || '', domain || '');
        if (opportunities && opportunities.length > 0) {
          seeds = opportunities.slice(0, 8).map((o: any) => o.keyword);
          seedSource = 'gsc';
        }
      } catch (e) {
        // Non-fatal; fall back to crawl
        console.log('[KEYWORDS AUTO] GSC seed fetch failed or unavailable. Falling back to crawl.');
      }

      // If no GSC seeds, try a quick homepage crawl for title/description/headings via Firecrawl
      if (seeds.length === 0 && domain) {
        try {
          const url = domain.startsWith('http') ? domain : `https://${domain}`;
          const scrape = await this.fetchAPI('/api/crawl/firecrawl', {
            method: 'POST',
            body: JSON.stringify({ action: 'scrape', url })
          });
          const html = scrape?.page?.html || '';
          seeds = this.extractSeedsFromHTML(html).slice(0, 8);
          if (seeds.length > 0) seedSource = 'crawl';
        } catch (e) {
          console.log('[KEYWORDS AUTO] Homepage fetch failed:', e);
        }
      }

      if (seeds.length === 0) {
        // Fallback: generate sensible seeds from domain context
        const hints: string[] = [];
        if (domain) {
          const d = domain.toLowerCase();
          if (d.includes('florida')) hints.push('south florida', 'florida');
          if (d.includes('import')) hints.push('importer', 'imports');
          if (d.includes('fruit') || d.includes('produce')) hints.push('fruit', 'produce');
        }
        const genericSeeds = [
          'wholesale', 'bulk supplier', 'importer', 'distributor', 'b2b', 'wholesale pricing'
        ];
        const domainSeeds = [
          ...(hints.includes('fruit') || hints.includes('produce') ? ['wholesale produce', 'wholesale fruit'] : []),
          ...(hints.includes('importer') || hints.includes('imports') ? ['bulk imports', 'import services'] : []),
          ...(hints.includes('south florida') ? ['south florida wholesale', 'south florida distributor'] : []),
        ];
        const specialized = Array.from(new Set([
          ...domainSeeds,
          ...genericSeeds,
          // Common B2B variations
          'bulk orders', 'commercial supply', 'trade pricing'
        ]));
        seeds = specialized.slice(0, 8);
        seedSource = 'none';
      }

      // Reuse existing brainstorm API with inferred seeds
      const payload = {
        userToken: this.userToken,
        ...(args.website_token ? { websiteToken: args.website_token } : {}),
        ...(domain ? { domain } : {}),
        baseKeywords: seeds,
        topicFocus: '',
        generateCount: args.generate_count || 15,
        avoidDuplicates: args.avoid_duplicates !== false
      };

      const response = await this.fetchAPI('/api/keyword-strategy/brainstorm', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!response.success) {
        return this.error(response.error || 'Failed to brainstorm keywords');
      }

      return this.success({
        generated_keywords: response.generated_keywords,
        seed_keywords: seeds,
        seed_source: seedSource,
        total_generated: response.total_generated,
        suggestions: response.suggestions
      });

    } catch (error) {
      return this.error('Failed to auto-brainstorm keywords', error);
    }
  }

  // Simple HTML seed extraction from title/meta/headers
  private extractSeedsFromHTML(html: string): string[] {
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*name=["']description["'][^>]*>/i);
    const h1Matches = Array.from(html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)).map(m => this.stripTags(m[1]));
    const h2Matches = Array.from(html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)).map(m => this.stripTags(m[1]));

    const text = [titleMatch?.[1] || '', metaMatch?.[1] || '', ...h1Matches, ...h2Matches]
      .join(' ')
      .toLowerCase();

    const words = text
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !STOPWORDS.has(w));

    const freq = new Map<string, number>();
    for (const w of words) {
      freq.set(w, (freq.get(w) || 0) + 1);
    }
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([w]) => w);
  }

  private stripTags(s: string): string {
    return s.replace(/<[^>]*>/g, ' ');
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
   * Add keywords to strategy (wrapper around updateKeywordStrategy)
   */
  private async addKeywords(args: {
    site_url?: string;
    website_token?: string;
    keywords: Array<{ keyword: string; keyword_type?: 'primary' | 'secondary' | 'long_tail'; topic_cluster?: string }>
  }): Promise<FunctionCallResult> {
    try {
      if (!args.keywords || args.keywords.length === 0) {
        return this.error('No keywords provided');
      }

      const normalized = args.keywords.map(k => ({
        keyword: k.keyword,
        keyword_type: k.keyword_type || 'long_tail',
        topic_cluster: k.topic_cluster
      }));

      const res = await this.updateKeywordStrategy({
        site_url: args.site_url,
        website_token: args.website_token,
        keywords: normalized
      } as any);

      if (!res.success) return res;

      return this.success({
        message: 'Keywords added to strategy',
        added: normalized.length,
        updated_strategy: res.data?.updated_strategy
      });
    } catch (error) {
      return this.error('Failed to add keywords', error);
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
        const clusterName = args.topic_cluster.toLowerCase();
        targetClusters = targetClusters.filter((c: any) => 
          c.name.toLowerCase() === clusterName
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

  /**
   * Initialize SEO content strategy using Master Discovery
   */
  private async initializeStrategy(args: {
    site_url: string;
    brand: string;
    geo_focus: string[];
    seed_topics: string[];
    seed_urls?: string[];
    raw_owner_context?: string;
    max_clusters?: number;
    min_clusters?: number;
    include_local_slices?: boolean;
  }): Promise<FunctionCallResult> {
    try {
      // Extract domain from site_url
      const domain = this.cleanDomain(args.site_url);

      console.log('[STRATEGY INIT] Starting strategy initialization for domain:', domain);

      // Find website token
      const websiteToken = await this.getWebsiteToken(domain);
      if (!websiteToken) {
        console.error('[STRATEGY INIT] Failed to find website token for domain:', domain);
        return this.error(
          `Website not found for domain: ${domain}. ` +
          `Please ensure this website is added and managed in your account. ` +
          `Try visiting the Dashboard and verifying the domain is listed.`
        );
      }

      console.log('[STRATEGY INIT] Found website token, calling discovery API...');

      // Call discovery API
      const response = await this.fetchAPI('/api/strategy/discover', {
        method: 'POST',
        body: JSON.stringify({
          websiteToken,
          domain,
          brand: args.brand,
          geoFocus: args.geo_focus,
          seedTopics: args.seed_topics,
          seedUrls: args.seed_urls || [],
          rawOwnerContext: args.raw_owner_context,
          discoveryType: 'initial',
          controls: {
            maxClusters: args.max_clusters,
            minClusters: args.min_clusters,
            mapSections: true,
            includeLocalSlices: args.include_local_slices
          }
        })
      });

      if (!response.success) {
        return this.error(response.message || 'Strategy discovery failed');
      }

      // Format response for agent
      const summary = {
        success: true,
        discovery_id: response.discoveryId,
        clusters_created: response.summary.clusters,
        articles_planned: response.summary.articles,
        breakdown: {
          pillar_articles: response.summary.pillars,
          supporting_articles: response.summary.supporting
        },
        clusters: response.output.clusters.map((cluster: any) => ({
          name: cluster.pillar_title,
          primary_keyword: cluster.primary_keyword,
          keyword_count: 1 + cluster.secondary_keywords.length
        })),
        next_steps: [
          'Strategy initialized successfully',
          `Created ${response.summary.clusters} topic clusters with ${response.summary.articles} articles`,
          `${response.summary.pillars} pillar articles and ${response.summary.supporting} supporting articles planned`,
          'You can now view the strategy in the Strategy tab',
          'Generate article briefs for any of the planned articles'
        ]
      };

      return this.success(summary);

    } catch (error) {
      return this.error('Failed to initialize strategy', error);
    }
  }

  /**
   * Helper to get website token from domain
   */
  private async getWebsiteToken(domain: string): Promise<string | null> {
    try {
      const params = new URLSearchParams({
        userToken: this.userToken || ''
      });

      console.log('[STRATEGY INIT] Looking up website token for domain:', domain);

      const response = await this.fetchAPI(`/api/chat/sites?${params}`);

      if (!response.success || !response.sites) {
        console.log('[STRATEGY INIT] No sites returned from API');
        return null;
      }

      console.log('[STRATEGY INIT] Found', response.sites.length, 'sites for user');

      // Use DomainUtils to clean both input and stored domains for accurate matching
      const cleanInput = DomainUtils.cleanDomain(domain);
      console.log('[STRATEGY INIT] Cleaned input domain:', cleanInput);

      const site = response.sites.find((s: any) => {
        const cleanStored = DomainUtils.cleanDomain(s.url || s.domain || '');
        const match = cleanStored === cleanInput;
        console.log('[STRATEGY INIT] Comparing:', {
          input: cleanInput,
          stored: cleanStored,
          originalStored: s.url || s.domain,
          match
        });
        return match;
      });

      if (site) {
        console.log('[STRATEGY INIT] Match found! Website token:', site.website_token);
      } else {
        console.log('[STRATEGY INIT] No matching site found. Available domains:',
          response.sites.map((s: any) => DomainUtils.cleanDomain(s.url || s.domain || '')).join(', ')
        );
      }

      return site?.website_token || null;
    } catch (error) {
      console.error('[STRATEGY INIT] Error fetching website token:', error);
      return null;
    }
  }
}

// Minimal stopword set for seed extraction
const STOPWORDS = new Set<string>([
  'the','and','for','with','that','this','from','your','you','are','was','were','will','have','has','not','but','about','into','over','under','than','then','they','them','their','our','ours','who','what','when','where','why','how','can','all','any','more','most','some','such','only','other','its','also','just','like','been','being','into','out','onto','off','because','while','between','within','across','after','before','again','same','each'
]);
