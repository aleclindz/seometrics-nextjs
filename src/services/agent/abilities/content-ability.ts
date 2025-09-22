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
import { enqueueContentGeneration } from '@/services/queue/content-producer';

export class ContentAbility extends BaseAbility {
  getFunctionNames(): string[] {
    return [
      'generate_article',
      'generate_enhanced_article', // NEW: Enhanced article generation
      'generate_article_with_internal_links', // NEW: Article generation with automatic internal links
      'suggest_content_ideas', // NEW: Intelligent content suggestions
      'get_content_context', // NEW: Get website content context
      'optimize_content',
      'publish_content',
      'analyze_content_performance',
      // Modern function names (CONTENT_ prefixed)
      'CONTENT_generate_article',
      'CONTENT_generate_and_publish',
      'CONTENT_generate_with_links',
      'CONTENT_suggest_ideas',
      'CONTENT_get_context',
      'CONTENT_analyze_gsc_topics', // NEW: Autonomous GSC-based topic analysis
      'CONTENT_generate_bulk_ideas', // NEW: Bulk article idea generation
      'CONTENT_manage_queue', // NEW: Queue management (view, edit, reorder)
      'CONTENT_add_to_queue', // NEW: Add specific topics to queue
      'CONTENT_remove_from_queue', // NEW: Remove topics from queue
      'CONTENT_reorder_queue' // NEW: Reorder queue priorities
    ];
  }

  async executeFunction(name: string, args: any): Promise<FunctionCallResult> {
    switch (name) {
      case 'generate_article':
      case 'CONTENT_generate_article':
        return await this.generateArticle(args);
      case 'CONTENT_generate_and_publish':
        return await this.generateAndPublish(args);
      case 'generate_enhanced_article':
        return await this.generateEnhancedArticle(args);
      case 'generate_article_with_internal_links':
      case 'CONTENT_generate_with_links':
        return await this.generateArticleWithInternalLinks(args);
      case 'suggest_content_ideas':
      case 'CONTENT_suggest_ideas':
        return await this.suggestContentIdeas(args);
      case 'get_content_context':
      case 'CONTENT_get_context':
        return await this.getContentContext(args);
      case 'CONTENT_analyze_gsc_topics':
        return await this.analyzeGSCTopics(args);
      case 'CONTENT_generate_bulk_ideas':
        return await this.generateBulkIdeas(args);
      case 'CONTENT_manage_queue':
        return await this.manageQueue(args);
      case 'CONTENT_add_to_queue':
        return await this.addToQueue(args);
      case 'CONTENT_remove_from_queue':
        return await this.removeFromQueue(args);
      case 'CONTENT_reorder_queue':
        return await this.reorderQueue(args);
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
   * Generate an article using the enhanced generator (simplified; no internal-link injection)
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
      const topic = args.specific_topic || args.topic || 'Article Topic';
      const articleType = (args.article_type || (args.content_type === 'guide' ? 'guide' : 'blog')) as any;
      const tone = (args.tone || 'professional') as 'professional' | 'casual' | 'technical';

      // Directly use the enhanced generator (no internal links, no SVS)
      return await this.generateEnhancedArticle({
        topic,
        target_keywords: args.target_keywords,
        site_url: args.site_url,
        article_type: articleType,
        word_count: args.word_count,
        tone,
        include_citations: true,
        include_images: true
      });

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
      // Get website ID if not provided (use /api/websites which returns numeric id)
      let websiteId = args.website_id;
      if (!websiteId && args.site_url) {
        const sites = await this.fetchAPI(`/api/websites?userToken=${this.userToken}`);
        if (sites?.success && sites.websites?.length) {
          const clean = (s: string) => s?.replace(/^https?:\/\//, '').replace(/\/$/, '');
          const target = clean(args.site_url);
          const match = sites.websites.find((w: any) => clean(w.domain) === target);
          websiteId = match?.id || sites.websites[0]?.id;
        }
      }

      if (!websiteId) {
        return this.error('Website ID is required. Please specify site_url or website_id parameter.');
      }

      // Enqueue article generation (background queue)
      const queueResponse = await this.fetchAPI('/api/articles/generate/start', {
        method: 'POST',
        body: JSON.stringify({
          userToken: this.userToken,
          websiteId,
          title: args.topic,
          targetKeywords: args.target_keywords || []
        })
      });

      if (!queueResponse.success) {
        return this.error(queueResponse.error || 'Failed to create article');
      }

      const articleId = queueResponse.articleId;

      // Enqueue on BullMQ (Upstash). Fall back to background call if enqueue fails.
      try {
        await enqueueContentGeneration(`generate-article-${articleId}`, {
          userToken: this.userToken,
          articleId,
          websiteId,
          topic: args.topic,
          targetKeywords: args.target_keywords || [],
          conversationId: (args as any)?.conversation_id || null
        });
      } catch (e) {
        try {
          const base = (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.startsWith('http'))
            ? process.env.NEXT_PUBLIC_APP_URL
            : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
          fetch(`${base}/api/articles/generate/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Vercel-Background': '1' },
            body: JSON.stringify({ userToken: this.userToken, articleId })
          }).catch(() => {});
        } catch {}
      }

      // Return immediately with progress info
      return this.success({
        message: 'Article generation started. I will notify you when the draft is ready.',
        articleId,
        actionCard: {
          type: 'progress',
          data: {
            title: 'Article Generation Started',
            description: 'Creating a draft without images to ensure fast delivery. Images can be added later.',
            progress: 10,
            status: 'running',
            estimatedTime: '~1 minute',
            currentStep: 'Generating draft content',
            totalSteps: 2,
            currentStepIndex: 1
          }
        }
      });
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
   * Orchestrate: create -> generate -> publish with a progress-style response
   */
  private async generateAndPublish(args: {
    site_url: string;
    title: string;
    target_keywords?: string[];
    article_type?: 'how_to' | 'listicle' | 'guide' | 'faq' | 'comparison' | 'evergreen' | 'blog';
    tone?: 'professional' | 'casual' | 'technical';
    publish?: boolean;
    include_citations?: boolean;
    image_provider?: 'openai' | 'stability' | 'unsplash';
    num_images?: number;
  }): Promise<FunctionCallResult> {
    try {
      // Resolve website and CMS connection
      const sitesResponse = await this.fetchAPI(`/api/websites?userToken=${this.userToken}`);
      if (!sitesResponse?.success || !sitesResponse.websites?.length) {
        return this.error('No websites found for this user.');
      }
      const clean = (s: string) => s?.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const target = clean(args.site_url);
      const site = sitesResponse.websites.find((s: any) => clean(s.domain) === target) || sitesResponse.websites[0];
      const websiteId = site.id;

      // Attempt to fetch CMS connections for the domain
      const cmsResp = await this.fetchAPI(`/api/cms/connections?userToken=${this.userToken}&domain=${encodeURIComponent(site.domain)}`);
      const cms = cmsResp?.connections?.[0];

      // Step 1: create article
      const createResp = await this.fetchAPI('/api/articles', {
        method: 'POST',
        body: JSON.stringify({
          userToken: this.userToken,
          websiteId,
          cmsConnectionId: cms?.id,
          title: args.title,
          targetKeywords: args.target_keywords || []
        })
      });
      if (!createResp?.success) return this.error(createResp?.error || 'Failed to create article');
      const articleId = createResp.article.id;

      // Step 2: generate enhanced content (SVS-oriented)
      const genResp = await this.fetchAPI('/api/articles/generate', {
        method: 'POST',
        body: JSON.stringify({
          userToken: this.userToken,
          articleId,
          targetKeywords: args.target_keywords || [],
          contentLength: 'medium',
          tone: args.tone || 'professional',
          includeImages: true,
          articleType: args.article_type || 'blog',
          includeCitations: args.include_citations ?? true,
          referenceStyle: 'link',
          numImages: args.num_images || 2,
          imageProvider: args.image_provider || 'openai',
          imageStyle: 'clean, modern, web illustration, professional'
        })
      });
      if (!genResp?.success) return this.error(genResp?.error || 'Article generation failed');

      // Step 3: publish
      let publishDetails: any = {};
      if (args.publish !== false && cms?.id) {
        const pubResp = await this.fetchAPI('/api/articles/publish', {
          method: 'POST',
          body: JSON.stringify({
            userToken: this.userToken,
            articleId,
            publishDraft: false
          })
        });
        if (!pubResp?.success) return this.error(pubResp?.error || 'Publishing failed');
        publishDetails = pubResp;
      }

      // Build progress-style action card data
      const links = [] as Array<{ label: string; url: string }>;

      // Try to load CMS/public links from the updated article record
      try {
        const list = await this.fetchAPI(`/api/articles?userToken=${this.userToken}`);
        const found = (list?.articles || []).find((a: any) => a.id === articleId);
        if (found?.public_url) links.push({ label: 'View Live', url: found.public_url });
        if (found?.cms_admin_url) links.push({ label: 'Open in CMS', url: found.cms_admin_url });
      } catch {}

      const actionCard = {
        type: 'progress',
        data: {
          title: args.publish === false ? 'Article Generated (Draft Ready)' : 'Article Generated & Published',
          description: args.publish === false ? 'Draft is ready in your CMS. You can review and publish.' : 'Content published to your connected CMS.',
          progress: 100,
          status: 'completed',
          estimatedTime: 'Completed',
          currentStep: args.publish === false ? 'Generation complete' : 'Published',
          totalSteps: 3,
          currentStepIndex: 3,
          links
        }
      };

      return this.success({
        articleId,
        websiteId,
        cmsConnectionId: cms?.id,
        published: args.publish !== false && !!cms?.id,
        cmsArticleId: publishDetails?.cmsArticleId,
        actionCard
      });

    } catch (error) {
      return this.error('Failed to generate and publish article', error);
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
          siteUrl = websitesResponse.sites[0].url || websitesResponse.sites[0].domain;
        } else {
          return this.error('No website found. Please provide site_url parameter.');
        }
      }

      if (!siteUrl) {
        return this.error('Site URL is required but could not be determined.');
      }

      // Step 1: Analyze the website to understand business context
      console.log('[CONTENT_suggest_ideas] Analyzing website:', siteUrl);
      const websiteAnalysis = await this.fetchAPI('/api/agent/website-analyze', {
        method: 'POST',
        body: JSON.stringify({
          site_url: siteUrl,
          max_pages: 3
        })
      });

      if (!websiteAnalysis.success) {
        // Fallback to old method if analysis fails
        return await this.fallbackContentSuggestions(siteUrl, args.max_suggestions || 5);
      }

      const businessAnalysis = websiteAnalysis.data.analysis;

      // Step 2: Generate intelligent keyword strategy
      console.log('[CONTENT_suggest_ideas] Generating keyword strategy');
      const keywordStrategy = await this.fetchAPI('/api/agent/keywords-brainstorm', {
        method: 'POST',
        body: JSON.stringify({
          business_analysis: businessAnalysis,
          keyword_count: 30,
          focus_areas: ['content marketing', 'blog topics']
        })
      });

      let suggestions: any[] = [];
      let keywordOpportunities: any[] = [];

      if (keywordStrategy.success) {
        // Extract content-focused keywords for topic suggestions
        const contentKeywords = keywordStrategy.data.keyword_strategy.content_keywords || [];
        const longTailKeywords = keywordStrategy.data.keyword_strategy.long_tail_keywords || [];

        // Create topic suggestions from keywords
        suggestions = [...contentKeywords, ...longTailKeywords]
          .filter((kw: any) => kw.search_intent === 'informational' || kw.search_intent === 'commercial')
          .slice(0, args.max_suggestions || 5)
          .map((kw: any) => ({
            title: this.generateArticleTitle(kw.keyword, kw.search_intent),
            keyword: kw.keyword,
            search_intent: kw.search_intent,
            difficulty: kw.difficulty,
            priority: kw.priority,
            rationale: kw.rationale,
            content_type: this.suggestContentType(kw.keyword, kw.search_intent)
          }));

        keywordOpportunities = [...contentKeywords, ...longTailKeywords]
          .slice(0, 10)
          .map((kw: any) => ({
            keyword: kw.keyword,
            search_intent: kw.search_intent,
            difficulty: kw.difficulty,
            priority: kw.priority
          }));
      }

      return this.success({
        message: `Generated ${suggestions.length} intelligent content suggestions based on website analysis and keyword research`,
        website: siteUrl,
        business_context: {
          industry: businessAnalysis.industry,
          business_model: businessAnalysis.business_model,
          target_audience: businessAnalysis.target_audience
        },
        topic_suggestions: suggestions,
        keyword_opportunities: keywordOpportunities,
        content_gaps: this.identifyContentGaps(businessAnalysis, suggestions),
        summary: {
          total_keywords: keywordOpportunities.length,
          high_potential_keywords: suggestions.filter((s: any) => s.priority === 'high').length,
          cms_connected: false, // Will be updated when CMS integration is checked
          suggested_articles: suggestions.length
        },
        analysis_method: 'intelligent_website_analysis'
      });

    } catch (error) {
      console.error('[CONTENT_suggest_ideas] Error:', error);
      return this.error('Failed to generate intelligent content suggestions', error);
    }
  }

  /**
   * Fallback to original content suggestion method if intelligent analysis fails
   */
  private async fallbackContentSuggestions(siteUrl: string, maxSuggestions: number): Promise<FunctionCallResult> {
    try {
      const intelligenceService = new ContentIntelligenceService();
      const context = await intelligenceService.getWebsiteContentContext(this.userToken!, siteUrl);

      const suggestions = context.topic_suggestions.slice(0, maxSuggestions);
      const topKeywords = context.keywords.slice(0, 10);

      return this.success({
        message: `Found ${suggestions.length} content suggestions based on your website's search performance (fallback method)`,
        website: context.domain,
        cms_info: context.cms_info,
        topic_suggestions: suggestions,
        keyword_opportunities: topKeywords,
        content_gaps: context.content_gaps,
        summary: {
          total_keywords: context.keywords.length,
          high_potential_keywords: context.keywords.filter((k: any) => k.potential === 'high').length,
          cms_connected: !!context.cms_info?.is_connected,
          suggested_articles: suggestions.length
        },
        analysis_method: 'search_performance_based'
      });
    } catch (error) {
      return this.error('Failed to generate fallback content suggestions', error);
    }
  }

  /**
   * Generate an article title from a keyword and search intent
   */
  private generateArticleTitle(keyword: string, searchIntent: string): string {
    const templates = {
      informational: [
        `The Ultimate Guide to ${keyword}`,
        `Everything You Need to Know About ${keyword}`,
        `${keyword}: A Complete Beginner's Guide`,
        `How ${keyword} Works: Explained Simply`
      ],
      commercial: [
        `Best ${keyword} Solutions in 2024`,
        `${keyword}: Top Options and Pricing Guide`,
        `How to Choose the Right ${keyword}`,
        `${keyword} vs Alternatives: Complete Comparison`
      ]
    };

    const intentTemplates = templates[searchIntent as keyof typeof templates] || templates.informational;
    const randomTemplate = intentTemplates[Math.floor(Math.random() * intentTemplates.length)];

    // Capitalize the keyword properly
    const capitalizedKeyword = keyword.split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');

    return randomTemplate.replace(keyword, capitalizedKeyword);
  }

  /**
   * Suggest content type based on keyword and search intent
   */
  private suggestContentType(keyword: string, searchIntent: string): string {
    const typeMapping = {
      informational: 'guide',
      commercial: 'comparison',
      transactional: 'review',
      navigational: 'tutorial'
    };

    return typeMapping[searchIntent as keyof typeof typeMapping] || 'blog';
  }

  /**
   * Identify content gaps based on business analysis and suggestions
   */
  private identifyContentGaps(businessAnalysis: any, suggestions: any[]): string[] {
    const gaps = [];

    // Check for missing foundational content
    if (businessAnalysis.services_products?.length > 0 && suggestions.length < 3) {
      gaps.push('Foundational content about your core services');
    }

    // Check for missing how-to content
    const hasHowToContent = suggestions.some((s: any) => s.title.toLowerCase().includes('how to'));
    if (!hasHowToContent) {
      gaps.push('How-to guides for your industry');
    }

    // Check for missing comparison content
    const hasComparisonContent = suggestions.some((s: any) => s.content_type === 'comparison');
    if (!hasComparisonContent) {
      gaps.push('Product/service comparison articles');
    }

    return gaps;
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
          siteUrl = websitesResponse.sites[0].url || websitesResponse.sites[0].domain;
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

  /**
   * Generate article with automatic internal links based on topic clusters
   */
  private async generateArticleWithInternalLinks(args: {
    topic: string;
    site_url?: string;
    website_token?: string;
    target_keywords?: string[];
    article_type?: 'blog' | 'guide' | 'faq' | 'comparison' | 'listicle';
    word_count?: number;
    tone?: 'professional' | 'casual' | 'technical';
    topic_cluster?: string;
  }): Promise<FunctionCallResult> {
    try {
      if (!args.topic) {
        return this.error('Topic is required for article generation');
      }

      if (!args.site_url && !args.website_token) {
        return this.error('Either site_url or website_token is required');
      }

      // Step 1: Get keyword strategy to determine topic cluster and find related content
      const keywordStrategyParams = new URLSearchParams({
        userToken: this.userToken || '',
        ...(args.website_token ? { websiteToken: args.website_token } : {}),
        ...(args.site_url ? { domain: this.cleanDomain(args.site_url) } : {})
      });

      const keywordStrategyResponse = await this.fetchAPI(`/api/keyword-strategy?${keywordStrategyParams}`);
      
      let topicCluster = args.topic_cluster;
      let relatedKeywords = args.target_keywords || [];
      let linkableContent: any[] = [];

      if (keywordStrategyResponse.success && keywordStrategyResponse.hasStrategy) {
        // Find the best matching topic cluster for this article
        if (!topicCluster) {
          const clusters = keywordStrategyResponse.topicClusters || [];
          const matchingCluster = clusters.find((cluster: any) => 
            cluster.keywords.some((k: any) => 
              args.topic.toLowerCase().includes(k.keyword.toLowerCase()) ||
              k.keyword.toLowerCase().includes(args.topic.toLowerCase())
            )
          );

          if (matchingCluster) {
            topicCluster = matchingCluster.name;
            relatedKeywords = matchingCluster.keywords.slice(0, 5).map((k: any) => k.keyword);
          }
        }

        // Get content from this and related clusters for internal linking
        const clusters = keywordStrategyResponse.topicClusters || [];
        for (const cluster of clusters) {
          if (cluster.content && cluster.content.length > 0) {
            linkableContent = linkableContent.concat(cluster.content.map((content: any) => ({
              ...content,
              cluster_name: cluster.name,
              is_same_cluster: cluster.name === topicCluster,
              keywords: cluster.keywords.map((k: any) => k.keyword)
            })));
          }
        }
      }

      // Step 2: Generate the base article content
      const articleArgs = {
        topic: args.topic,
        target_keywords: relatedKeywords.length > 0 ? relatedKeywords : [args.topic],
        site_url: args.site_url,
        article_type: args.article_type || 'blog',
        word_count: args.word_count || 800,
        tone: args.tone || 'professional'
      };

      const baseArticleResult = await this.generateEnhancedArticle(articleArgs);
      
      if (!baseArticleResult.success) {
        return baseArticleResult;
      }

      let articleContent = baseArticleResult.data.article?.content || baseArticleResult.data.content;
      const articleTitle = baseArticleResult.data.article?.title || args.topic;

      // Step 3: Automatically insert internal links
      const internalLinksAdded = [];

      if (linkableContent.length > 0 && articleContent) {
        // Prioritize content from the same topic cluster
        const sameClusterContent = linkableContent.filter(content => content.is_same_cluster);
        const relatedClusterContent = linkableContent.filter(content => !content.is_same_cluster);
        
        // Combine with same cluster first
        const prioritizedContent = [...sameClusterContent, ...relatedClusterContent].slice(0, 5);

        for (const linkableItem of prioritizedContent) {
          if (!linkableItem.article_title || !linkableItem.article_url) continue;

          // Find the best keyword to use as anchor text
          const anchorKeyword = this.findBestAnchorText(
            linkableItem.keywords || [],
            linkableItem.article_title,
            articleContent
          );

          if (anchorKeyword) {
            // Insert the internal link naturally into the content
            const linkInserted = this.insertInternalLink(
              articleContent,
              linkableItem.article_url,
              anchorKeyword,
              linkableItem.article_title
            );

            if (linkInserted.success) {
              articleContent = linkInserted.content;
              internalLinksAdded.push({
                target_url: linkableItem.article_url,
                anchor_text: anchorKeyword,
                target_title: linkableItem.article_title,
                topic_cluster: linkableItem.cluster_name,
                context: linkInserted.context
              });
            }
          }
        }
      }

      // Step 4: Store the article with topic cluster information
      const enhancedResult = {
        ...baseArticleResult.data,
        article: {
          ...baseArticleResult.data.article,
          content: articleContent,
          topic_cluster: topicCluster,
          target_keywords: relatedKeywords,
          internal_links_added: internalLinksAdded
        },
        content: articleContent,
        internal_linking: {
          links_added: internalLinksAdded.length,
          topic_cluster: topicCluster,
          linkable_content_found: linkableContent.length,
          links_by_cluster: internalLinksAdded.reduce((acc: any, link) => {
            const cluster = link.topic_cluster || 'uncategorized';
            acc[cluster] = (acc[cluster] || 0) + 1;
            return acc;
          }, {}),
          recommendations: this.generateLinkingRecommendations(internalLinksAdded, linkableContent.length)
        }
      };

      // Step 5: If we have an article ID, record the internal links in the database
      if (enhancedResult.article?.id && internalLinksAdded.length > 0) {
        for (const link of internalLinksAdded) {
          try {
            await this.fetchAPI('/api/keyword-strategy/internal-links', {
              method: 'POST',
              body: JSON.stringify({
                userToken: this.userToken,
                websiteToken: args.website_token,
                domain: args.site_url ? this.cleanDomain(args.site_url) : undefined,
                sourceArticleId: enhancedResult.article.id,
                targetUrl: link.target_url,
                anchorText: link.anchor_text,
                topicCluster: link.topic_cluster,
                linkContext: link.context
              })
            });
          } catch (error) {
            console.error('Failed to record internal link:', error);
            // Don't fail the whole operation if link recording fails
          }
        }
      }

      return this.success({
        message: `Article generated successfully with ${internalLinksAdded.length} internal links automatically added`,
        ...enhancedResult
      });

    } catch (error) {
      return this.error('Failed to generate article with internal links', error);
    }
  }

  // Helper methods for internal linking
  private cleanDomain(url: string): string {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
  }

  private findBestAnchorText(keywords: string[], articleTitle: string, content: string): string | null {
    // Check if any keywords appear in the content
    for (const keyword of keywords) {
      const keywordRegex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      if (keywordRegex.test(content)) {
        return keyword;
      }
    }

    // Fallback to article title if no keywords match
    const titleWords = articleTitle.toLowerCase().split(' ');
    for (const word of titleWords) {
      if (word.length > 3 && content.toLowerCase().includes(word)) {
        return word;
      }
    }

    return null;
  }

  private insertInternalLink(content: string, targetUrl: string, anchorText: string, targetTitle: string): {
    success: boolean;
    content: string;
    context?: string;
  } {
    try {
      // Find the first occurrence of the anchor text
      const anchorRegex = new RegExp(`\\b${anchorText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      const match = content.match(anchorRegex);
      
      if (!match) {
        return { success: false, content };
      }

      // Get the context around the match for recording
      const matchIndex = content.indexOf(match[0]);
      const contextStart = Math.max(0, matchIndex - 50);
      const contextEnd = Math.min(content.length, matchIndex + match[0].length + 50);
      const context = content.substring(contextStart, contextEnd);

      // Create the internal link
      const internalLink = `[${match[0]}](${targetUrl})`;
      
      // Replace the first occurrence
      const newContent = content.replace(anchorRegex, internalLink);

      return {
        success: true,
        content: newContent,
        context
      };

    } catch (error) {
      console.error('Error inserting internal link:', error);
      return { success: false, content };
    }
  }

  private generateLinkingRecommendations(linksAdded: any[], totalLinkableContent: number): string[] {
    const recommendations = [];

    if (linksAdded.length === 0) {
      recommendations.push('No internal links were added - consider creating more content in related topic clusters');
    } else {
      recommendations.push(`Successfully added ${linksAdded.length} internal links to improve SEO and user experience`);
      
      if (totalLinkableContent > linksAdded.length) {
        recommendations.push(`${totalLinkableContent - linksAdded.length} additional linking opportunities available in other topic clusters`);
      }
    }

    if (linksAdded.length > 0) {
      const clusters = Array.from(new Set(linksAdded.map(l => l.topic_cluster)));
      recommendations.push(`Links connect to content in ${clusters.length} topic cluster${clusters.length > 1 ? 's' : ''}: ${clusters.join(', ')}`);
    }

    return recommendations;
  }

  /**
   * Analyze GSC data to identify optimal blog post topics using investor approach
   * Finds underperforming assets (high impressions, low CTR) and low-hanging fruit
   */
  private async analyzeGSCTopics(args: {
    site_url?: string;
    analysis_type?: 'comprehensive' | 'quick';
    focus_area?: string;
  }): Promise<FunctionCallResult> {
    try {
      // Get the primary site URL if not provided
      let siteUrl = args.site_url;
      if (!siteUrl) {
        const sites = await this.fetchAPI(`/api/websites?userToken=${this.userToken}`);
        if (sites?.success && sites.websites?.length) {
          siteUrl = sites.websites[0]?.domain;
        }
      }

      if (!siteUrl) {
        return this.error('No website found. Please connect a website first or specify site_url.');
      }

      // Call the autonomous topic selection API
      const response = await this.fetchAPI('/api/agent/autonomous-topic-selection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userToken: this.userToken,
          domain: siteUrl,
          analysisType: args.analysis_type || 'comprehensive',
          focusArea: args.focus_area
        })
      });

      if (!response.success) {
        return this.error(`Topic analysis failed: ${response.error}`, response.error);
      }

      const { selectedTopics, opportunities, analysis } = response;

      // Format the response for the LLM
      let result = `🎯 **GSC Topic Analysis for ${siteUrl}**\n\n`;

      result += `📊 **Analysis Summary:**\n`;
      result += `- Analyzed ${analysis.queriesAnalyzed} search queries\n`;
      result += `- Found ${opportunities.length} optimization opportunities\n`;
      result += `- Date range: ${analysis.dataRange.start} to ${analysis.dataRange.end}\n\n`;

      if (selectedTopics && selectedTopics.length > 0) {
        result += `🚀 **Top Recommended Topics** (Priority Order):\n\n`;

        selectedTopics.slice(0, 5).forEach((topic: any, index: number) => {
          result += `**${index + 1}. ${topic.title}**\n`;
          result += `- **Traffic Potential:** ${topic.estimatedTrafficPotential} monthly visitors\n`;
          result += `- **Current Performance:** ${topic.currentPerformance.totalImpressions} impressions, ${topic.currentPerformance.totalClicks} clicks\n`;
          result += `- **Target Queries:** ${topic.targetQueries.slice(0, 3).join(', ')}\n`;
          result += `- **Content Brief:** ${topic.contentBrief}\n`;
          result += `- **Recommended Length:** ${topic.recommendedLength} words\n`;
          result += `- **Urgency:** ${topic.urgency}\n\n`;
        });
      }

      if (opportunities && opportunities.length > 0) {
        result += `💡 **Key Opportunities Found:**\n\n`;

        const opportunityTypes = {
          underperforming_asset: '📈 Underperforming Assets (High Impressions, Low CTR)',
          low_hanging_fruit: '🍎 Low Hanging Fruit (Page 1, Not #1)',
          content_gap: '🔍 Content Gaps (High Volume, Low Clicks)',
          trending_opportunity: '🔥 Trending Opportunities'
        };

        const groupedOps = opportunities.reduce((acc: any, opp: any) => {
          if (!acc[opp.opportunityType]) acc[opp.opportunityType] = [];
          acc[opp.opportunityType].push(opp);
          return acc;
        }, {});

        Object.entries(groupedOps).forEach(([type, ops]: [string, any]) => {
          result += `**${opportunityTypes[type as keyof typeof opportunityTypes]}**\n`;
          (ops as any[]).slice(0, 3).forEach((opp: any) => {
            result += `- "${opp.query}" (${opp.impressions} impressions, position ${opp.position.toFixed(1)})\n`;
            result += `  ${opp.reasoning}\n`;
          });
          result += '\n';
        });
      }

      result += `📝 **Next Steps:**\n`;
      result += `1. Choose one of the top recommended topics above\n`;
      result += `2. Use the generate_article function with the suggested title and keywords\n`;
      result += `3. Focus on the specific queries mentioned for each topic\n`;
      result += `4. Follow the content brief recommendations\n\n`;
      result += `💡 **Pro Tip:** Start with Priority 1 topic for maximum impact based on GSC data analysis.`;

      return this.success({
        message: result,
        selectedTopics,
        opportunities: opportunities.slice(0, 10),
        analysis,
        nextActions: [
          'Choose a topic from the recommendations above',
          'Generate article using the suggested title and target queries',
          'Monitor GSC performance after publishing'
        ]
      });

    } catch (error) {
      return this.error('Failed to analyze GSC topics for content strategy', error);
    }
  }

  /**
   * Generate bulk article ideas for a specified period
   * Perfect for planning content calendars and maintaining consistent publishing
   */
  private async generateBulkIdeas(args: {
    site_url?: string;
    period?: 'week' | 'month';
    count?: number;
    add_to_queue?: boolean;
    website_token?: string;
  }): Promise<FunctionCallResult> {
    try {
      // Get the primary site URL if not provided
      let siteUrl = args.site_url;
      if (!siteUrl) {
        const sites = await this.fetchAPI(`/api/websites?userToken=${this.userToken}`);
        if (sites?.success && sites.websites?.length) {
          siteUrl = sites.websites[0]?.domain;
        }
      }

      if (!siteUrl) {
        return this.error('No website found. Please connect a website first or specify site_url.');
      }

      const period = args.period || 'week';
      const count = args.count || (period === 'week' ? 7 : 30);
      const addToQueue = args.add_to_queue || false;

      // Call bulk article ideas API
      const response = await this.fetchAPI('/api/content/bulk-article-ideas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userToken: this.userToken,
          websiteToken: args.website_token,
          domain: siteUrl,
          period,
          count,
          addToQueue
        })
      });

      if (!response.success) {
        return this.error(`Bulk idea generation failed: ${response.error}`, response.error);
      }

      const { articleIdeas, summary } = response;

      // Format the response for the LLM
      let result = `🚀 **Generated ${count} Article Ideas for ${period === 'week' ? 'This Week' : 'This Month'}**\n\n`;

      result += `📊 **Generation Summary:**\n`;
      result += `- Total Ideas: ${summary.totalIdeas}\n`;
      result += `- Estimated Traffic Potential: +${summary.estimatedTotalTraffic} monthly visits\n`;
      result += `- Format Variety: ${Object.entries(summary.formatBreakdown).map(([format, count]) => `${count} ${format}`).join(', ')}\n`;
      result += `- Authority Levels: ${Object.entries(summary.authorityLevels).map(([level, count]) => `${count} ${level}`).join(', ')}\n`;

      if (addToQueue) {
        result += `- ✅ Added to content queue for automatic generation\n`;
      } else {
        result += `- 📝 Generated as drafts (not yet queued)\n`;
      }
      result += '\n';

      if (articleIdeas && articleIdeas.length > 0) {
        result += `📝 **Article Ideas:**\n\n`;

        articleIdeas.slice(0, 10).forEach((idea: any, index: number) => {
          const publishDate = new Date(idea.suggestedPublishDate).toLocaleDateString();
          result += `**${index + 1}. ${idea.title}**\n`;
          result += `- 📅 Suggested Publish: ${publishDate}\n`;
          result += `- 📊 Format: ${idea.articleFormat?.type} (${idea.recommendedLength} words)\n`;
          result += `- 🎯 Authority Level: ${idea.authorityLevel}\n`;
          result += `- 🔑 Target Keywords: ${(idea.targetKeywords || []).slice(0, 3).join(', ')}\n`;
          result += `- 📈 Traffic Potential: +${idea.estimatedTrafficPotential} monthly visits\n`;
          result += `- 💡 Brief: ${idea.contentBrief.substring(0, 100)}...\n\n`;
        });
      }

      result += `🎯 **Next Steps:**\n`;
      if (addToQueue) {
        result += `1. ✅ Ideas added to your content queue - they'll generate automatically\n`;
        result += `2. 📝 Review the upcoming articles in your Content tab\n`;
        result += `3. ✏️ Edit titles, schedules, or keywords as needed\n`;
      } else {
        result += `1. 📋 Review the ideas above and select your favorites\n`;
        result += `2. 🗂️ Use the "Add to Queue" function to schedule them\n`;
        result += `3. ✏️ Customize titles, keywords, or publish dates\n`;
      }
      result += `4. 📊 Monitor performance after publishing to optimize future topics\n\n`;
      result += `💡 **Pro Tip:** These topics are selected based on your GSC data and keyword strategy for maximum authority building and traffic potential.`;

      return this.success({
        message: result,
        articleIdeas: articleIdeas.slice(0, 10), // Return top 10 for LLM context
        summary,
        period,
        addedToQueue: addToQueue,
        nextActions: [
          addToQueue ? 'Review queued articles in Content tab' : 'Select ideas to add to queue',
          'Customize titles or schedules if needed',
          'Monitor performance after publishing'
        ]
      });

    } catch (error) {
      return this.error('Failed to generate bulk article ideas', error);
    }
  }

  /**
   * Manage content queue - view, filter, and analyze upcoming articles
   */
  private async manageQueue(args: {
    site_url?: string;
    website_token?: string;
    action?: 'view' | 'analyze' | 'status';
    limit?: number;
    status_filter?: 'draft' | 'pending' | 'generating' | 'completed';
  }): Promise<FunctionCallResult> {
    try {
      const limit = args.limit || 20;
      const action = args.action || 'view';

      // Call queue API
      let queryParams = `userToken=${this.userToken}&limit=${limit}`;
      if (args.website_token) queryParams += `&websiteToken=${args.website_token}`;
      if (args.status_filter) queryParams += `&status=${args.status_filter}`;

      const response = await this.fetchAPI(`/api/content/article-queue?${queryParams}`);

      if (!response.success) {
        return this.error(`Failed to fetch queue: ${response.error}`, response.error);
      }

      const queue = response.queue || [];

      if (action === 'status') {
        const statusCounts = queue.reduce((acc: any, item: any) => {
          acc[item.status] = (acc[item.status] || 0) + 1;
          return acc;
        }, {});

        return this.success({
          message: `📊 **Queue Status Summary**\n\nTotal Items: ${queue.length}\nStatus Breakdown: ${Object.entries(statusCounts).map(([status, count]) => `${status}: ${count}`).join(', ')}\nNext Scheduled: ${queue[0]?.scheduledFor ? new Date(queue[0].scheduledFor).toLocaleString() : 'None'}`,
          statusCounts,
          totalItems: queue.length,
          nextScheduled: queue[0]?.scheduledFor || null
        });
      }

      // Format queue for display
      let result = `📝 **Content Queue (${queue.length} items)**\n\n`;

      if (queue.length === 0) {
        result += `No articles in queue. Use \`generate_bulk_ideas\` to add topics.\n\n`;
        result += `💡 **Quick Actions:**\n`;
        result += `- Generate ideas: "Generate 10 article ideas for next week"\n`;
        result += `- Add specific topic: "Add 'SEO best practices' to my content queue"`;

        return this.success({
          message: result,
          queue: [],
          isEmpty: true
        });
      }

      queue.slice(0, limit).forEach((item: any, index: number) => {
        const scheduledDate = new Date(item.scheduledFor).toLocaleDateString();
        const status = item.status || 'draft';
        const statusEmoji: Record<string, string> = {
          draft: '📝',
          pending: '⏳',
          generating: '🔄',
          completed: '✅',
          failed: '❌'
        };
        const emoji = statusEmoji[status] || '📝';

        result += `**${index + 1}. ${item.title}**\n`;
        result += `- 📅 Scheduled: ${scheduledDate}\n`;
        result += `- ${emoji} Status: ${status}\n`;

        if (item.articleFormat?.type) {
          result += `- 📊 Format: ${item.articleFormat.type}\n`;
        }

        if (item.targetKeywords && item.targetKeywords.length > 0) {
          result += `- 🔑 Keywords: ${item.targetKeywords.slice(0, 3).join(', ')}\n`;
        }

        if (item.estimatedTrafficPotential > 0) {
          result += `- 📈 Traffic Potential: +${item.estimatedTrafficPotential}/month\n`;
        }

        if (item.authorityLevel) {
          result += `- 🎯 Authority: ${item.authorityLevel}\n`;
        }

        result += '\n';
      });

      result += `🛠️ **Management Actions:**\n`;
      result += `- Edit queue: "Move article 3 to position 1" or "Change title of article 2"\n`;
      result += `- Remove items: "Remove article about X from queue"\n`;
      result += `- Add topics: "Add article about Y to queue with high priority"\n`;
      result += `- Reorder: "Reorder queue by priority" or "Put SEO articles first"`;

      return this.success({
        message: result,
        queue: queue.slice(0, limit),
        totalItems: queue.length,
        hasMore: queue.length > limit,
        actions: ['edit', 'reorder', 'remove', 'add']
      });

    } catch (error) {
      return this.error('Failed to manage content queue', error);
    }
  }

  /**
   * Add a specific topic to the content queue
   */
  private async addToQueue(args: {
    topic: string;
    site_url?: string;
    website_token?: string;
    priority?: number;
    scheduled_date?: string;
    keywords?: string[];
    format?: string;
    authority_level?: 'foundation' | 'intermediate' | 'advanced';
    word_count?: number;
  }): Promise<FunctionCallResult> {
    try {
      if (!args.topic) {
        return this.error('Topic is required to add to queue');
      }

      // Determine website token if not provided
      let websiteToken = args.website_token;
      if (!websiteToken && args.site_url) {
        const sites = await this.fetchAPI(`/api/websites?userToken=${this.userToken}`);
        if (sites?.success && sites.websites?.length) {
          const site = sites.websites.find((w: any) =>
            w.domain === args.site_url || w.cleaned_domain === args.site_url
          );
          websiteToken = site?.website_token;
        }
      }

      if (!websiteToken) {
        return this.error('Website token or site URL is required');
      }

      // Create queue item data
      const scheduledFor = args.scheduled_date
        ? new Date(args.scheduled_date).toISOString()
        : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Default: 24 hours from now

      const queueItem = {
        topic: args.topic,
        priority: args.priority || 1,
        scheduledFor,
        targetKeywords: args.keywords || [],
        articleFormat: args.format ? { type: args.format } : {},
        authorityLevel: args.authority_level || 'foundation',
        wordCount: args.word_count || 1500,
        status: 'draft'
      };

      // Add to queue via API
      const response = await this.fetchAPI('/api/content/article-queue', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken: this.userToken,
          websiteToken,
          action: 'add',
          item: queueItem
        })
      });

      if (!response.success) {
        return this.error(`Failed to add to queue: ${response.error}`, response.error);
      }

      return this.success({
        message: `✅ Added "${args.topic}" to content queue\n\n📅 Scheduled for: ${new Date(scheduledFor).toLocaleDateString()}\n🎯 Priority: ${args.priority || 1}\n📊 Format: ${args.format || 'auto-detect'}\n🔑 Keywords: ${(args.keywords || []).join(', ') || 'auto-generate'}`,
        addedItem: response.item,
        nextActions: [
          'View queue: "Show me my content queue"',
          'Modify: "Change priority of this article"',
          'Generate more: "Generate 5 more article ideas"'
        ]
      });

    } catch (error) {
      return this.error('Failed to add topic to queue', error);
    }
  }

  /**
   * Remove topics from the content queue
   */
  private async removeFromQueue(args: {
    identifier: string | number; // Can be queue ID, topic title, or position
    site_url?: string;
    website_token?: string;
  }): Promise<FunctionCallResult> {
    try {
      if (!args.identifier) {
        return this.error('Article identifier (ID, title, or position) is required');
      }

      // First, get the current queue to find the item
      let queryParams = `userToken=${this.userToken}&limit=50`;
      if (args.website_token) queryParams += `&websiteToken=${args.website_token}`;

      const queueResponse = await this.fetchAPI(`/api/content/article-queue?${queryParams}`);

      if (!queueResponse.success) {
        return this.error('Failed to fetch queue for removal');
      }

      const queue = queueResponse.queue || [];
      let itemToRemove = null;

      // Find item by different identifier types
      if (typeof args.identifier === 'number') {
        // Could be ID or position
        itemToRemove = queue.find((item: any) => item.id === args.identifier) ||
                      queue[args.identifier - 1]; // Position (1-indexed)
      } else {
        // String - search by title
        const searchTerm = String(args.identifier).toLowerCase();
        itemToRemove = queue.find((item: any) =>
          item.title.toLowerCase().includes(searchTerm)
        );
      }

      if (!itemToRemove) {
        return this.error(`Could not find article matching "${args.identifier}" in queue`);
      }

      // Remove via API
      const response = await this.fetchAPI(
        `/api/content/article-queue?id=${itemToRemove.id}&userToken=${this.userToken}`,
        { method: 'DELETE' }
      );

      if (!response.success) {
        return this.error(`Failed to remove item: ${response.error}`);
      }

      return this.success({
        message: `✅ Removed "${itemToRemove.title}" from content queue\n\n📊 Queue now has ${queue.length - 1} items remaining`,
        removedItem: itemToRemove,
        remainingCount: queue.length - 1
      });

    } catch (error) {
      return this.error('Failed to remove from queue', error);
    }
  }

  /**
   * Reorder the content queue
   */
  private async reorderQueue(args: {
    strategy?: 'priority' | 'date' | 'format' | 'authority' | 'traffic';
    custom_order?: Array<{ id: number; position: number }>;
    site_url?: string;
    website_token?: string;
  }): Promise<FunctionCallResult> {
    try {
      // Get current queue
      let queryParams = `userToken=${this.userToken}&limit=50`;
      if (args.website_token) queryParams += `&websiteToken=${args.website_token}`;

      const queueResponse = await this.fetchAPI(`/api/content/article-queue?${queryParams}`);

      if (!queueResponse.success) {
        return this.error('Failed to fetch queue for reordering');
      }

      let queue = queueResponse.queue || [];

      if (queue.length === 0) {
        return this.error('Queue is empty - nothing to reorder');
      }

      let reorderedQueue = [];

      if (args.custom_order) {
        // Custom reordering based on provided order
        const orderMap = new Map(args.custom_order.map(item => [item.id, item.position]));
        reorderedQueue = queue.sort((a: any, b: any) => {
          const posA = orderMap.get(a.id) || 999;
          const posB = orderMap.get(b.id) || 999;
          return posA - posB;
        });
      } else {
        // Strategy-based reordering
        switch (args.strategy) {
          case 'priority':
            reorderedQueue = queue.sort((a: any, b: any) => (a.priority || 999) - (b.priority || 999));
            break;
          case 'date':
            reorderedQueue = queue.sort((a: any, b: any) =>
              new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
            );
            break;
          case 'traffic':
            reorderedQueue = queue.sort((a: any, b: any) =>
              (b.estimatedTrafficPotential || 0) - (a.estimatedTrafficPotential || 0)
            );
            break;
          case 'authority':
            const authorityOrder = { foundation: 1, intermediate: 2, advanced: 3 };
            reorderedQueue = queue.sort((a: any, b: any) =>
              (authorityOrder[a.authorityLevel as keyof typeof authorityOrder] || 999) -
              (authorityOrder[b.authorityLevel as keyof typeof authorityOrder] || 999)
            );
            break;
          case 'format':
            reorderedQueue = queue.sort((a: any, b: any) =>
              (a.articleFormat?.type || 'zzz').localeCompare(b.articleFormat?.type || 'zzz')
            );
            break;
          default:
            reorderedQueue = queue.sort((a: any, b: any) =>
              (a.priority || 999) - (b.priority || 999)
            );
        }
      }

      // Send reordered queue to API
      const response = await this.fetchAPI('/api/content/article-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reorderedItems: reorderedQueue.map((item: any, index: number) => ({
            id: item.id,
            position: index + 1
          })),
          userToken: this.userToken
        })
      });

      if (!response.success) {
        return this.error(`Failed to reorder queue: ${response.error}`);
      }

      const strategy = args.strategy || 'custom';
      let result = `✅ **Queue Reordered by ${strategy}**\n\n`;

      result += `📋 **New Order:**\n`;
      reorderedQueue.slice(0, 10).forEach((item: any, index: number) => {
        result += `${index + 1}. ${item.title}\n`;
      });

      if (reorderedQueue.length > 10) {
        result += `... and ${reorderedQueue.length - 10} more items\n`;
      }

      result += `\n🎯 **Strategy Used:** ${strategy === 'priority' ? 'By priority level' :
                                       strategy === 'date' ? 'By scheduled date' :
                                       strategy === 'traffic' ? 'By traffic potential (highest first)' :
                                       strategy === 'authority' ? 'By authority level (foundation → advanced)' :
                                       strategy === 'format' ? 'By article format type' : 'Custom order'}`;

      return this.success({
        message: result,
        reorderedQueue: reorderedQueue.slice(0, 10),
        strategy,
        totalReordered: reorderedQueue.length
      });

    } catch (error) {
      return this.error('Failed to reorder queue', error);
    }
  }
}
