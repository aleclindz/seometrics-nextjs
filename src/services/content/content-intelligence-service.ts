/**
 * Content Intelligence Service
 * 
 * Provides intelligent suggestions for content generation by:
 * - Extracting target keywords from GSC performance data
 * - Suggesting article topics based on keyword opportunities
 * - Getting CMS configuration for the website
 * - Analyzing content gaps and opportunities
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface KeywordOpportunity {
  keyword: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  potential: 'high' | 'medium' | 'low';
  reason: string;
}

export interface TopicSuggestion {
  title: string;
  keywords: string[];
  rationale: string;
  article_type: 'how_to' | 'listicle' | 'guide' | 'faq' | 'comparison' | 'evergreen' | 'blog';
  estimated_impact: 'high' | 'medium' | 'low';
}

export interface CMSInfo {
  type: string;
  connection_name: string;
  is_connected: boolean;
  config: any;
}

export interface WebsiteContentContext {
  domain: string;
  keywords: KeywordOpportunity[];
  cms_info: CMSInfo | null;
  topic_suggestions: TopicSuggestion[];
  content_gaps: string[];
}

export class ContentIntelligenceService {
  constructor() {}

  /**
   * Get comprehensive content context for a website
   */
  async getWebsiteContentContext(userToken: string, siteUrl: string): Promise<WebsiteContentContext> {
    // Clean the site URL
    const domain = this.cleanDomain(siteUrl);
    
    // Get website record
    const website = await this.getWebsiteRecord(userToken, domain);
    if (!website) {
      throw new Error(`Website not found: ${domain}`);
    }

    // Get all the data in parallel
    const [keywords, cmsInfo, existingContent] = await Promise.all([
      this.getKeywordOpportunities(userToken, domain),
      this.getCMSInfo(userToken, website.id),
      this.getExistingContent(userToken, website.id)
    ]);

    // Generate topic suggestions based on keywords
    const topicSuggestions = this.generateTopicSuggestions(keywords, existingContent);
    
    // Identify content gaps
    const contentGaps = this.identifyContentGaps(keywords, existingContent);

    return {
      domain,
      keywords,
      cms_info: cmsInfo,
      topic_suggestions: topicSuggestions,
      content_gaps: contentGaps
    };
  }

  /**
   * Get keyword opportunities from GSC performance data
   */
  async getKeywordOpportunities(userToken: string, domain: string): Promise<KeywordOpportunity[]> {
    try {
      // Get the latest GSC performance data for this domain
      const { data: performanceData, error } = await supabase
        .from('gsc_performance_data')
        .select('queries')
        .eq('user_token', userToken)
        .order('date_start', { ascending: false })
        .limit(5); // Get last 5 data points

      if (error) {
        console.log('[CONTENT INTELLIGENCE] GSC data error:', error);
        return [];
      }

      if (!performanceData || performanceData.length === 0) {
        console.log('[CONTENT INTELLIGENCE] No GSC performance data found');
        return [];
      }

      // Aggregate all queries from recent data
      const allQueries: any[] = [];
      performanceData.forEach(data => {
        if (data.queries && Array.isArray(data.queries)) {
          allQueries.push(...data.queries);
        }
      });

      // Aggregate and analyze queries
      const queryMap = new Map<string, any>();
      allQueries.forEach(query => {
        if (queryMap.has(query.query)) {
          const existing = queryMap.get(query.query);
          existing.clicks += query.clicks || 0;
          existing.impressions += query.impressions || 0;
          existing.total_position += query.position || 0;
          existing.count += 1;
        } else {
          queryMap.set(query.query, {
            keyword: query.query,
            clicks: query.clicks || 0,
            impressions: query.impressions || 0,
            total_position: query.position || 0,
            count: 1
          });
        }
      });

      // Convert to keyword opportunities
      const opportunities: KeywordOpportunity[] = [];
      queryMap.forEach((data) => {
        const avgPosition = data.total_position / data.count;
        const ctr = data.impressions > 0 ? (data.clicks / data.impressions) : 0;

        // Skip very low performing or branded queries
        if (data.impressions < 10 || data.keyword.length < 3) return;

        // Determine potential based on position and impressions
        let potential: 'high' | 'medium' | 'low' = 'low';
        let reason = '';

        if (avgPosition > 3 && avgPosition <= 10 && data.impressions > 100) {
          potential = 'high';
          reason = `Ranking #${Math.round(avgPosition)} with ${data.impressions} impressions - could improve to page 1`;
        } else if (avgPosition > 10 && avgPosition <= 20 && data.impressions > 50) {
          potential = 'medium';
          reason = `Ranking #${Math.round(avgPosition)} with good search volume - needs content optimization`;
        } else if (data.impressions > 200 && ctr < 0.05) {
          potential = 'medium';
          reason = `High impressions (${data.impressions}) but low CTR (${(ctr * 100).toFixed(1)}%) - needs better title/meta`;
        } else if (data.clicks > 5) {
          potential = 'low';
          reason = `Already generating ${data.clicks} clicks - optimize for more volume`;
        }

        opportunities.push({
          keyword: data.keyword,
          clicks: data.clicks,
          impressions: data.impressions,
          ctr: ctr,
          position: avgPosition,
          potential,
          reason
        });
      });

      // Sort by potential and impressions
      opportunities.sort((a, b) => {
        const potentialOrder = { high: 3, medium: 2, low: 1 };
        if (a.potential !== b.potential) {
          return potentialOrder[b.potential] - potentialOrder[a.potential];
        }
        return b.impressions - a.impressions;
      });

      return opportunities.slice(0, 20); // Return top 20 opportunities

    } catch (error) {
      console.error('[CONTENT INTELLIGENCE] Error getting keyword opportunities:', error);
      return [];
    }
  }

  /**
   * Get CMS information for a website
   */
  async getCMSInfo(userToken: string, websiteId: number): Promise<CMSInfo | null> {
    try {
      const { data: cmsConnection, error } = await supabase
        .from('cms_connections')
        .select('*')
        .eq('user_token', userToken)
        .eq('website_id', websiteId)
        .eq('is_active', true)
        .single();

      if (error || !cmsConnection) {
        console.log('[CONTENT INTELLIGENCE] No CMS connection found');
        return null;
      }

      return {
        type: cmsConnection.cms_type,
        connection_name: cmsConnection.connection_name,
        is_connected: cmsConnection.is_active,
        config: cmsConnection.connection_config || {}
      };

    } catch (error) {
      console.error('[CONTENT INTELLIGENCE] Error getting CMS info:', error);
      return null;
    }
  }

  /**
   * Get existing content for this website
   */
  private async getExistingContent(userToken: string, websiteId: number): Promise<string[]> {
    try {
      const { data: articles, error } = await supabase
        .from('article_queue')
        .select('title, target_keywords')
        .eq('user_token', userToken)
        .eq('website_id', websiteId)
        .eq('status', 'generated');

      if (error || !articles) return [];

      return articles.map(article => article.title.toLowerCase());

    } catch (error) {
      console.error('[CONTENT INTELLIGENCE] Error getting existing content:', error);
      return [];
    }
  }

  /**
   * Generate intelligent topic suggestions based on keyword opportunities
   */
  private generateTopicSuggestions(keywords: KeywordOpportunity[], existingContent: string[]): TopicSuggestion[] {
    const suggestions: TopicSuggestion[] = [];

    // Group keywords by themes
    const themes = this.groupKeywordsByTheme(keywords);

    themes.forEach(theme => {
      // Skip if we already have content for this theme
      const themeWords = theme.keywords.map(k => k.keyword.toLowerCase());
      const hasExistingContent = existingContent.some(title => 
        themeWords.some(word => title.includes(word))
      );

      if (hasExistingContent) return;

      // Determine article type based on keyword patterns
      const articleType = this.suggestArticleType(theme.keywords);
      
      // Generate title based on main keywords
      const title = this.generateTitle(theme.keywords, articleType);
      
      // Calculate estimated impact
      const totalImpressions = theme.keywords.reduce((sum, k) => sum + k.impressions, 0);
      const estimatedImpact = totalImpressions > 1000 ? 'high' : totalImpressions > 300 ? 'medium' : 'low';

      suggestions.push({
        title,
        keywords: theme.keywords.map(k => k.keyword),
        rationale: `Based on ${theme.keywords.length} related keywords with ${totalImpressions} total monthly impressions. ${theme.keywords.filter(k => k.potential === 'high').length} high-potential keywords.`,
        article_type: articleType,
        estimated_impact: estimatedImpact
      });
    });

    return suggestions.slice(0, 5); // Return top 5 suggestions
  }

  /**
   * Group keywords by semantic similarity/theme
   */
  private groupKeywordsByTheme(keywords: KeywordOpportunity[]): Array<{ theme: string; keywords: KeywordOpportunity[] }> {
    const themes: Array<{ theme: string; keywords: KeywordOpportunity[] }> = [];
    const used = new Set<string>();

    keywords.forEach(keyword => {
      if (used.has(keyword.keyword)) return;

      // Find related keywords
      const related = keywords.filter(k => 
        !used.has(k.keyword) && 
        this.areKeywordsRelated(keyword.keyword, k.keyword)
      );

      if (related.length > 0) {
        const theme = this.extractTheme(related.map(k => k.keyword));
        themes.push({ theme, keywords: related });
        
        related.forEach(k => used.add(k.keyword));
      }
    });

    return themes;
  }

  /**
   * Check if two keywords are semantically related
   */
  private areKeywordsRelated(keyword1: string, keyword2: string): boolean {
    const words1 = keyword1.toLowerCase().split(/\s+/);
    const words2 = keyword2.toLowerCase().split(/\s+/);
    
    // Check for common words (excluding stop words)
    const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'how', 'what', 'why', 'when', 'where'];
    const meaningful1 = words1.filter(w => !stopWords.includes(w) && w.length > 2);
    const meaningful2 = words2.filter(w => !stopWords.includes(w) && w.length > 2);
    
    const commonWords = meaningful1.filter(w => meaningful2.includes(w));
    
    return commonWords.length >= 1; // At least one meaningful word in common
  }

  /**
   * Extract main theme from a group of keywords
   */
  private extractTheme(keywords: string[]): string {
    // Count word frequency
    const wordCount = new Map<string, number>();
    const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'how', 'what', 'why', 'when', 'where'];
    
    keywords.forEach(keyword => {
      keyword.toLowerCase().split(/\s+/).forEach(word => {
        if (!stopWords.includes(word) && word.length > 2) {
          wordCount.set(word, (wordCount.get(word) || 0) + 1);
        }
      });
    });

    // Get most common word
    let mostCommon = '';
    let maxCount = 0;
    wordCount.forEach((count, word) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = word;
      }
    });

    return mostCommon;
  }

  /**
   * Suggest article type based on keyword patterns
   */
  private suggestArticleType(keywords: KeywordOpportunity[]): 'how_to' | 'listicle' | 'guide' | 'faq' | 'comparison' | 'evergreen' | 'blog' {
    const keywordText = keywords.map(k => k.keyword.toLowerCase()).join(' ');

    if (keywordText.includes('how to') || keywordText.includes('how do') || keywordText.includes('step')) {
      return 'how_to';
    }
    if (keywordText.includes('best') || keywordText.includes('top') || /\d+/.test(keywordText)) {
      return 'listicle';
    }
    if (keywordText.includes('vs') || keywordText.includes('versus') || keywordText.includes('compare')) {
      return 'comparison';
    }
    if (keywordText.includes('what is') || keywordText.includes('why') || keywordText.includes('faq')) {
      return 'faq';
    }
    if (keywordText.includes('guide') || keywordText.includes('complete') || keywordText.includes('ultimate')) {
      return 'guide';
    }
    if (keywordText.includes('trend') || keywordText.includes('future') || keywordText.includes('history')) {
      return 'evergreen';
    }
    
    return 'blog';
  }

  /**
   * Generate an engaging title based on keywords and article type
   */
  private generateTitle(keywords: KeywordOpportunity[], articleType: string): string {
    const mainKeyword = keywords[0].keyword;
    const capitalizedKeyword = mainKeyword.charAt(0).toUpperCase() + mainKeyword.slice(1);

    switch (articleType) {
      case 'how_to':
        return `How to ${mainKeyword.startsWith('how to') ? mainKeyword.slice(7) : mainKeyword}`;
      case 'listicle':
        return `Top 10 ${capitalizedKeyword} You Need to Know`;
      case 'comparison':
        return `${capitalizedKeyword}: Complete Comparison Guide`;
      case 'faq':
        return `${capitalizedKeyword}: Frequently Asked Questions`;
      case 'guide':
        return `The Complete Guide to ${capitalizedKeyword}`;
      case 'evergreen':
        return `Everything You Need to Know About ${capitalizedKeyword}`;
      default:
        return `${capitalizedKeyword}: What You Need to Know`;
    }
  }

  /**
   * Identify content gaps based on keyword data
   */
  private identifyContentGaps(keywords: KeywordOpportunity[], existingContent: string[]): string[] {
    const gaps: string[] = [];

    // High-impressions keywords without content
    const highOpportunityKeywords = keywords.filter(k => 
      k.potential === 'high' && 
      !existingContent.some(title => title.includes(k.keyword.toLowerCase()))
    );

    if (highOpportunityKeywords.length > 0) {
      gaps.push(`${highOpportunityKeywords.length} high-opportunity keywords without dedicated content`);
    }

    // Position 11-20 keywords (page 2) that could be improved
    const page2Keywords = keywords.filter(k => k.position > 10 && k.position <= 20);
    if (page2Keywords.length > 5) {
      gaps.push(`${page2Keywords.length} keywords ranking on page 2 that could be optimized`);
    }

    // Low CTR but high impressions
    const lowCtrKeywords = keywords.filter(k => k.impressions > 100 && k.ctr < 0.02);
    if (lowCtrKeywords.length > 0) {
      gaps.push(`${lowCtrKeywords.length} keywords with high impressions but low CTR need title/meta optimization`);
    }

    return gaps;
  }

  /**
   * Helper methods
   */
  private cleanDomain(url: string): string {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').toLowerCase();
  }

  private async getWebsiteRecord(userToken: string, domain: string): Promise<any> {
    const { data: website, error } = await supabase
      .from('websites')
      .select('*')
      .eq('user_token', userToken)
      .or(`domain.eq.${domain},cleaned_domain.eq.${domain}`)
      .single();

    return error ? null : website;
  }
}