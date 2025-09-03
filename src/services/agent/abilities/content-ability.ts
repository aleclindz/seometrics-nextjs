/**
 * Content Ability
 * 
 * Handles all content-related functions including:
 * - Article generation
 * - Content optimization
 * - Content publishing
 */

import { BaseAbility, FunctionCallResult } from './base-ability';
import { ContentIntelligenceService } from '../../content/content-intelligence-service';

export class ContentAbility extends BaseAbility {
  getFunctionNames(): string[] {
    return [
      'generate_article',
      'generate_enhanced_article', // NEW: Enhanced article generation
      'suggest_content_ideas', // NEW: Intelligent content suggestions
      'get_content_context', // NEW: Get website content context
      'optimize_content',
      'publish_content',
      'analyze_content_performance',
      // Modern function names (CONTENT_ prefixed)
      'CONTENT_generate_article',
      'CONTENT_suggest_ideas',
      'CONTENT_get_context'
    ];
  }

  async executeFunction(name: string, args: any): Promise<FunctionCallResult> {
    switch (name) {
      case 'generate_article':
      case 'CONTENT_generate_article':
        return await this.generateArticle(args);
      case 'generate_enhanced_article':
        return await this.generateEnhancedArticle(args);
      case 'suggest_content_ideas':
      case 'CONTENT_suggest_ideas':
        return await this.suggestContentIdeas(args);
      case 'get_content_context':
      case 'CONTENT_get_context':
        return await this.getContentContext(args);
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
   * Generate an article using smart suggestions (updated for new flow)
   */
  private async generateArticle(args: { 
    site_url?: string;
    specific_topic?: string;
    article_type?: string;
    tone?: string;
    // Legacy support
    topic?: string; 
    target_keywords?: string[]; 
    content_type?: string; 
    word_count?: number; 
    website_id?: number;
  }): Promise<FunctionCallResult> {
    try {
      // Handle legacy parameters (backward compatibility)
      const specificTopic = args.specific_topic || args.topic;
      const articleType = args.article_type || (args.content_type === 'guide' ? 'guide' : 'blog');
      const tone = args.tone || 'professional';

      // Use the new smart article generation
      const smartArgs = {
        site_url: args.site_url,
        specific_topic: specificTopic,
        article_type: articleType,
        tone: tone
      };

      return await this.generateSmartArticle(smartArgs);

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
   * Generate enhanced article with research, images, and schema
   */
  private async generateEnhancedArticle(args: {
    topic: string;
    target_keywords?: string[];
    website_id?: number;
    site_url?: string;
    word_count?: number;
    tone?: 'professional' | 'casual' | 'technical';
    article_type?: 'how_to' | 'listicle' | 'guide' | 'faq' | 'comparison' | 'evergreen' | 'blog';
    include_citations?: boolean;
    reference_style?: 'link' | 'apa';
    include_images?: boolean;
    num_images?: number;
    image_provider?: 'openai' | 'stability' | 'unsplash';
    image_style?: string;
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

      // Then generate the enhanced content
      const response = await this.fetchAPI('/api/articles/generate', {
        method: 'POST',
        body: JSON.stringify({
          userToken: this.userToken,
          articleId: articleId,
          targetKeywords: args.target_keywords || [],
          contentLength: this.mapWordCountToLength(args.word_count),
          tone: args.tone || 'professional',
          includeImages: args.include_images ?? true,
          
          // Enhanced options
          articleType: args.article_type || 'blog',
          includeCitations: args.include_citations ?? true,
          referenceStyle: args.reference_style || 'link',
          numImages: args.num_images || 2,
          imageProvider: args.image_provider || 'openai',
          imageStyle: args.image_style || 'clean, modern, web illustration, professional'
        })
      });

      return response.success ? 
        this.success({
          ...response,
          message: 'Enhanced article generated successfully with research, images, and schema',
          features_used: {
            research: args.include_citations ?? true,
            images: args.include_images ?? true,
            schema: true,
            article_type: args.article_type || 'blog'
          }
        }) :
        this.error(response.error || 'Enhanced article generation failed');
    } catch (error) {
      return this.error('Failed to generate enhanced article', error);
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

  /**
   * Get intelligent content suggestions based on website performance data
   */
  private async suggestContentIdeas(args: {
    site_url?: string;
    website_id?: number;
    max_suggestions?: number;
  }): Promise<FunctionCallResult> {
    try {
      // Get site URL from args or user's websites
      let siteUrl = args.site_url;
      if (!siteUrl) {
        const websitesResponse = await this.fetchAPI(`/api/chat/sites?userToken=${this.userToken}`);
        if (websitesResponse.success && websitesResponse.sites?.length > 0) {
          siteUrl = websitesResponse.sites[0].domain;
        } else {
          return this.error('No website found. Please provide site_url parameter.');
        }
      }

      if (!siteUrl) {
        return this.error('Site URL is required but could not be determined.');
      }

      const intelligenceService = new ContentIntelligenceService();
      const context = await intelligenceService.getWebsiteContentContext(this.userToken!, siteUrl);

      // Format response for the agent
      const suggestions = context.topic_suggestions.slice(0, args.max_suggestions || 5);
      const topKeywords = context.keywords.slice(0, 10);

      return this.success({
        message: `Found ${suggestions.length} content suggestions based on your website's search performance`,
        website: context.domain,
        cms_info: context.cms_info,
        topic_suggestions: suggestions,
        keyword_opportunities: topKeywords,
        content_gaps: context.content_gaps,
        summary: {
          total_keywords: context.keywords.length,
          high_potential_keywords: context.keywords.filter(k => k.potential === 'high').length,
          cms_connected: !!context.cms_info?.is_connected,
          suggested_articles: suggestions.length
        }
      });

    } catch (error) {
      return this.error('Failed to get content suggestions', error);
    }
  }

  /**
   * Get comprehensive content context for a website
   */
  private async getContentContext(args: {
    site_url?: string;
  }): Promise<FunctionCallResult> {
    try {
      // Get site URL from args or user's websites
      let siteUrl = args.site_url;
      if (!siteUrl) {
        const websitesResponse = await this.fetchAPI(`/api/chat/sites?userToken=${this.userToken}`);
        if (websitesResponse.success && websitesResponse.sites?.length > 0) {
          siteUrl = websitesResponse.sites[0].domain;
        } else {
          return this.error('No website found. Please provide site_url parameter.');
        }
      }

      if (!siteUrl) {
        return this.error('Site URL is required but could not be determined.');
      }

      const intelligenceService = new ContentIntelligenceService();
      const context = await intelligenceService.getWebsiteContentContext(this.userToken!, siteUrl);

      return this.success({
        message: 'Website content context retrieved successfully',
        context: context,
        ready_for_content: {
          has_keywords: context.keywords.length > 0,
          cms_connected: !!context.cms_info?.is_connected,
          cms_type: context.cms_info?.type || 'none',
          opportunities_count: context.keywords.filter(k => k.potential === 'high').length,
          suggested_topics: context.topic_suggestions.length
        }
      });

    } catch (error) {
      return this.error('Failed to get content context', error);
    }
  }

  /**
   * Enhanced article generation that uses intelligent suggestions
   */
  async generateSmartArticle(args: {
    site_url?: string;
    specific_topic?: string;
    use_suggestion?: number; // Index of suggested topic to use
    article_type?: string;
    tone?: string;
  }): Promise<FunctionCallResult> {
    try {
      // First get content context
      const contextResult = await this.getContentContext({ site_url: args.site_url });
      if (!contextResult.success) {
        return contextResult;
      }

      const context = contextResult.data.context;
      let topic = args.specific_topic;
      let keywords: string[] = [];
      let articleType = args.article_type || 'blog';

      // If no specific topic provided, use suggestions
      if (!topic) {
        if (args.use_suggestion !== undefined && context.topic_suggestions[args.use_suggestion]) {
          const suggestion = context.topic_suggestions[args.use_suggestion];
          topic = suggestion.title;
          keywords = suggestion.keywords;
          articleType = suggestion.article_type;
        } else if (context.topic_suggestions.length > 0) {
          // Use the top suggestion
          const suggestion = context.topic_suggestions[0];
          topic = suggestion.title;
          keywords = suggestion.keywords;
          articleType = suggestion.article_type;
        } else {
          return this.error('No topic provided and no suggestions available. Please provide a specific_topic or ensure your website has keyword data.');
        }
      } else {
        // Find relevant keywords for the provided topic
        keywords = context.keywords
          .filter((k: any) => topic!.toLowerCase().includes(k.keyword.toLowerCase()) || k.keyword.toLowerCase().includes(topic!.toLowerCase()))
          .slice(0, 5)
          .map((k: any) => k.keyword);
        
        if (keywords.length === 0) {
          keywords = context.keywords.slice(0, 3).map((k: any) => k.keyword);
        }
      }

      // Ensure topic is defined at this point
      if (!topic) {
        return this.error('Unable to determine article topic. Please provide a specific_topic or ensure your website has keyword data.');
      }

      // Generate the enhanced article
      const enhancedArgs = {
        topic: topic,
        target_keywords: keywords,
        site_url: args.site_url,
        article_type: articleType as any,
        tone: (args.tone || 'professional') as 'professional' | 'casual' | 'technical',
        include_citations: true,
        include_images: true
      };

      return await this.generateEnhancedArticle(enhancedArgs);

    } catch (error) {
      return this.error('Failed to generate smart article', error);
    }
  }
}