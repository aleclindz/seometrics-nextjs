/**
 * Enhanced Article Generator
 * 
 * Orchestrates the complete article generation process with:
 * - Research-first drafting
 * - Type-aware templates
 * - Image generation
 * - Schema generation
 * - Citation handling
 */

import { ResearchService, ResearchSource } from './research-service';
import { ImageGenerationService, GeneratedImage, ImageProvider } from './image-generation-service';
import { ArticleTemplatesService, ArticleType } from './article-templates-service';
import { SchemaService } from './schema-service';
import { getPromptManager } from '../../prompts';

export interface EnhancedArticleRequest {
  title: string;
  keywords: string[];
  websiteDomain?: string;
  websiteDescription?: string;
  contentLength: 'short' | 'medium' | 'long';
  tone: 'professional' | 'casual' | 'technical';
  
  // Enhanced options
  articleType: ArticleType;
  includeCitations: boolean;
  referenceStyle: 'link' | 'apa';
  includeImages: boolean;
  numImages: number;
  imageProvider: ImageProvider;
  imageStyle: string;
}

export interface EnhancedArticleResult {
  content: string;
  metaTitle: string;
  metaDescription: string;
  contentOutline: Array<{ id: string; title: string; summary: string }>;
  citations: ResearchSource[];
  images: GeneratedImage[];
  schemaJson: any;
  articleType: ArticleType;
  slug: string;
}

export class EnhancedArticleGenerator {
  private researchService: ResearchService;
  private imageService: ImageGenerationService;
  private templatesService: ArticleTemplatesService;
  private schemaService: SchemaService;

  constructor() {
    this.researchService = new ResearchService();
    this.imageService = new ImageGenerationService();
    this.templatesService = new ArticleTemplatesService();
    this.schemaService = new SchemaService();
  }

  /**
   * Generate a comprehensive article with all enhancements
   */
  async generateComprehensiveArticle(request: EnhancedArticleRequest): Promise<EnhancedArticleResult> {
    const {
      title,
      keywords,
      websiteDomain,
      contentLength,
      tone,
      articleType,
      includeCitations,
      referenceStyle,
      includeImages,
      numImages,
      imageProvider,
      imageStyle
    } = request;

    console.log(`[ENHANCED GENERATOR] Starting generation: "${title}" (${articleType})`);

    // Step 1: Research (if citations enabled)
    let researchResult = { sources: [] as ResearchSource[], brief: '' };
    if (includeCitations) {
      try {
        researchResult = await this.researchService.performResearch({
          title,
          keywords,
          maxResults: 3
        });
        console.log(`[ENHANCED GENERATOR] Research completed: ${researchResult.sources.length} sources`);
      } catch (error) {
        console.log('[ENHANCED GENERATOR] Research failed, proceeding without citations:', error);
      }
    }

    // Step 2: Generate content using OpenAI
    const contentResult = await this.generateArticleContent({
      ...request,
      researchSources: researchResult.sources
    });

    // Step 3: Generate images (if enabled)
    let images: GeneratedImage[] = [];
    if (includeImages && numImages > 0) {
      try {
        images = await this.imageService.generateImagesForArticle({
          title,
          outline: contentResult.contentOutline,
          numImages,
          provider: imageProvider,
          imageStyle
        });
        
        if (images.length > 0) {
          contentResult.content = this.imageService.injectImagesIntoHtml(contentResult.content, images);
        }
        
        console.log(`[ENHANCED GENERATOR] Images generated: ${images.length}/${numImages}`);
      } catch (error) {
        console.log('[ENHANCED GENERATOR] Image generation failed:', error);
      }
    }

    // Step 4: Generate schema
    const schemaJson = this.generateSchema({
      articleType,
      title,
      description: contentResult.metaDescription,
      url: websiteDomain ? `https://${websiteDomain}/${this.slugify(title)}` : '',
      images: images.map(img => img.url),
      authorName: websiteDomain || 'Editorial Team',
      contentResult
    });

    // Step 5: Extract citations from content
    const citations = this.extractCitationsFromContent(contentResult.content, researchResult.sources);

    return {
      content: contentResult.content,
      metaTitle: contentResult.metaTitle,
      metaDescription: contentResult.metaDescription,
      contentOutline: contentResult.contentOutline,
      citations,
      images,
      schemaJson,
      articleType,
      slug: this.slugify(title)
    };
  }

  /**
   * Generate article content using OpenAI with enhanced prompts
   */
  private async generateArticleContent(params: EnhancedArticleRequest & { researchSources: ResearchSource[] }): Promise<{
    content: string;
    metaTitle: string;
    metaDescription: string;
    contentOutline: Array<{ id: string; title: string; summary: string }>;
  }> {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const template = this.templatesService.getTemplate(params.articleType);
    const wordTarget = this.templatesService.calculateWordTarget(params.contentLength, params.articleType);
    
    const stylePrompt = this.getStylePrompt(params.tone);
    const citationRules = this.templatesService.getCitationRules(
      params.articleType, 
      params.includeCitations, 
      params.referenceStyle
    );

    const researchBlock = params.researchSources.length > 0 
      ? `RESEARCH SOURCES:\n${params.researchSources.map((s, i) => 
          `[${i + 1}] ${s.title} — ${s.source || ''} — ${s.url}${s.published ? ` — ${s.published}` : ''}`
        ).join('\n')}\n`
      : 'RESEARCH: Use general knowledge but avoid unverifiable claims.\n';

    const prompt = `
Write a comprehensive SEO article for: "${params.title}"

TARGET KEYWORDS: ${params.keywords.join(', ')}
ARTICLE TYPE: ${params.articleType.toUpperCase()}
WORD COUNT TARGET: ${wordTarget} words
TONE: ${stylePrompt}
DOMAIN CONTEXT: ${params.websiteDomain || 'general website'}

SITE CONTEXT INSTRUCTIONS:
- Ground examples, use cases, and references in the site's niche inferred from the domain when possible.
- If the domain clearly indicates a niche, tailor content to it (e.g., for a domain like translateyoutubevideos.com, include YouTube-focused translation workflows, examples, and terminology where relevant).
- Keep this contextualization natural and relevant; do not force irrelevant mentions.

${template.structure}

QUALITY REQUIREMENTS:
- Start with <div class="tldr-box"><h3>TL;DR</h3><ul>...</ul></div>
- Use semantic HTML: <h2>, <h3>, <p>, <strong>, <ul>, <li>, <em>
- Include specific examples, data points, and actionable advice
- Create scannable content with clear headings and bullet points
- Include semantic keywords naturally throughout
- Each major section should have 2-3 well-developed paragraphs
- Use transition phrases between sections for flow
 - Include a dedicated FAQ section with 3-5 common questions and concise answers
 - Use clear structure; keep sentences readable (avoid overly long sentences)

META REQUIREMENTS:
- metaTitle: 50-60 characters, include primary keyword "${params.keywords[0] || ''}"
- metaDescription: 150-160 characters, compelling with clear value proposition
- contentOutline: array of section objects with id, title, and summary

${researchBlock}

${citationRules}

RESPONSE FORMAT: Return ONLY valid JSON (no markdown backticks):
{
  "metaTitle": "SEO-optimized title with primary keyword",
  "metaDescription": "Compelling description with clear value and CTA", 
  "contentOutline": [
    {"id": "section-1", "title": "Section Title", "summary": "What this section covers"}
  ],
  "content": "Complete HTML article with proper structure, headings, and ${params.includeCitations ? 'inline citations [^n] plus References section' : 'no references'}"
}
`.trim();

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: getPromptManager().getPrompt('content', 'ENHANCED_SEO_CONTENT_WRITER', {
                articleType: params.articleType
              })
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2,
          max_tokens: 2200
        }),
        // Allow up to ~55s for model completion to align with function budget
        signal: AbortSignal.timeout(55000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || '';
      
      try {
        const parsed = JSON.parse(aiResponse);
        return {
          content: parsed.content,
          metaTitle: parsed.metaTitle,
          metaDescription: parsed.metaDescription,
          contentOutline: parsed.contentOutline || []
        };
      } catch (parseError) {
        console.error('[ENHANCED GENERATOR] Failed to parse AI response:', parseError);
        console.error('[ENHANCED GENERATOR] AI Response:', aiResponse.slice(0, 500));
        
        // Fallback response
        return {
          content: aiResponse,
          metaTitle: params.title.length <= 60 ? params.title : params.title.substring(0, 57) + '...',
          metaDescription: `Learn about ${params.keywords[0] || params.title} in this comprehensive ${params.articleType} guide.`,
          contentOutline: [
            { id: 'overview', title: 'Overview', summary: 'Introduction to the topic' }
          ]
        };
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Article generation timed out. Please try again with shorter requirements.');
      }
      throw new Error(`Content generation failed: ${error.message}`);
    }
  }

  /**
   * Generate schema for the article
   */
  private generateSchema(params: {
    articleType: ArticleType;
    title: string;
    description: string;
    url: string;
    images: string[];
    authorName: string;
    contentResult: any;
  }): any {
    const faqItems = this.schemaService.extractFaqFromHtml(params.contentResult.content);
    const listItems = this.schemaService.extractListItemsFromHtml(params.contentResult.content);

    const schema = this.schemaService.buildSchemaForArticle({
      articleType: params.articleType,
      title: params.title,
      description: params.description,
      url: params.url,
      images: params.images,
      authorName: params.authorName,
      datePublishedISO: new Date().toISOString(),
      faqItems,
      listItems
    });

    return this.schemaService.addBreadcrumbSchema(schema, params.url, params.title);
  }

  /**
   * Extract citations from generated content
   */
  private extractCitationsFromContent(content: string, researchSources: ResearchSource[]): ResearchSource[] {
    const citations: ResearchSource[] = [];
    
    // Look for References section
    const referencesSection = content.split(/<h2[^>]*>\s*References\s*<\/h2>/i)[1];
    if (!referencesSection) return citations;
    
    // Extract URLs from the references section
    const urls = Array.from(referencesSection.matchAll(/https?:\/\/[^\s"')<]+/gi)).map(m => m[0]);
    
    for (const url of urls) {
      const found = researchSources.find(source => 
        this.normalizeUrl(source.url) === this.normalizeUrl(url)
      );
      if (found && !citations.find(c => this.normalizeUrl(c.url) === this.normalizeUrl(found.url))) {
        citations.push(found);
      }
    }
    
    return citations;
  }

  /**
   * Helper methods
   */
  private getStylePrompt(tone: string): string {
    switch (tone) {
      case 'casual':
        return 'Use a conversational, friendly tone with concrete examples and relatable language.';
      case 'technical':
        return 'Use precise, technical language with detailed explanations and industry-specific terminology.';
      case 'professional':
      default:
        return 'Use a professional, authoritative yet accessible tone that builds trust.';
    }
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private normalizeUrl(url?: string): string {
    if (!url) return '';
    try {
      const urlObj = new URL(url);
      urlObj.hash = '';
      urlObj.search = '';
      return urlObj.toString();
    } catch {
      return url;
    }
  }
}
