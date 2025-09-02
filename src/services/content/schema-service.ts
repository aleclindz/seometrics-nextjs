/**
 * Schema Service
 * 
 * Handles JSON-LD schema generation for different article types:
 * - HowTo schema
 * - ItemList (for listicles)
 * - FAQPage schema
 * - BlogPosting schema
 * - Article schema with structured data
 */

import { ArticleType } from './article-templates-service';

export interface SchemaParams {
  articleType: ArticleType;
  title: string;
  description: string;
  url: string;
  images: string[];
  authorName: string;
  datePublishedISO: string;
  faqItems: Array<{ question: string; answer: string }>;
  listItems: Array<{ name: string; position: number; description?: string; url?: string }>;
}

export class SchemaService {
  constructor() {}

  /**
   * Build comprehensive JSON-LD schema for an article
   */
  buildSchemaForArticle(params: SchemaParams): any {
    const {
      articleType,
      title,
      description,
      url,
      images,
      authorName,
      datePublishedISO,
      faqItems,
      listItems
    } = params;

    // Base BlogPosting schema
    const baseSchema = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: title,
      description,
      url,
      author: {
        '@type': 'Person',
        name: authorName
      },
      datePublished: datePublishedISO,
      dateModified: datePublishedISO,
      image: images.length > 0 ? images : undefined,
      publisher: {
        '@type': 'Organization',
        name: authorName
      }
    } as any;

    // Add type-specific schema enhancements
    switch (articleType) {
      case 'how_to':
        return this.enhanceWithHowToSchema(baseSchema, params);
      
      case 'listicle':
        return this.enhanceWithListSchema(baseSchema, params);
      
      case 'faq':
        return this.enhanceWithFaqSchema(baseSchema, params);
      
      case 'comparison':
        return this.enhanceWithComparisonSchema(baseSchema, params);
      
      default:
        return this.enhanceWithArticleSchema(baseSchema, params);
    }
  }

  /**
   * Enhance schema with HowTo structured data
   */
  private enhanceWithHowToSchema(baseSchema: any, params: SchemaParams): any {
    const steps = this.extractStepsFromContent(params.title);
    
    return {
      ...baseSchema,
      '@type': 'HowTo',
      step: steps.map((step, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        name: step.name,
        text: step.description,
        url: `${params.url}#step-${index + 1}`
      })),
      totalTime: this.estimateTimeFromSteps(steps),
      supply: [],
      tool: []
    };
  }

  /**
   * Enhance schema with ItemList for listicles
   */
  private enhanceWithListSchema(baseSchema: any, params: SchemaParams): any {
    if (params.listItems.length === 0) {
      // Generate basic list items if none provided
      const generatedItems = this.generateListItemsFromTitle(params.title, params.url);
      params.listItems = generatedItems;
    }

    return {
      ...baseSchema,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: params.listItems.length,
        itemListElement: params.listItems.map(item => ({
          '@type': 'ListItem',
          position: item.position,
          name: item.name,
          description: item.description,
          url: item.url || `${params.url}#item-${item.position}`
        }))
      }
    };
  }

  /**
   * Enhance schema with FAQPage structured data
   */
  private enhanceWithFaqSchema(baseSchema: any, params: SchemaParams): any {
    if (params.faqItems.length === 0) {
      // Generate basic FAQ items if none provided
      params.faqItems = this.generateFaqItemsFromTitle(params.title);
    }

    return {
      ...baseSchema,
      '@type': 'FAQPage',
      mainEntity: params.faqItems.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }))
    };
  }

  /**
   * Enhance schema for comparison articles
   */
  private enhanceWithComparisonSchema(baseSchema: any, params: SchemaParams): any {
    return {
      ...baseSchema,
      about: {
        '@type': 'Thing',
        name: params.title.replace(/comparison|vs|versus/gi, '').trim()
      },
      mentions: this.extractMentionsFromTitle(params.title)
    };
  }

  /**
   * Enhance with standard Article schema
   */
  private enhanceWithArticleSchema(baseSchema: any, params: SchemaParams): any {
    const enhanced = {
      ...baseSchema,
      articleSection: 'Blog',
      wordCount: this.estimateWordCount(params.description),
      keywords: this.extractKeywordsFromTitle(params.title)
    };

    // Add FAQ section if available
    if (params.faqItems.length > 0) {
      enhanced.mainEntity = {
        '@type': 'FAQPage',
        mainEntity: params.faqItems.map(faq => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer
          }
        }))
      };
    }

    return enhanced;
  }

  /**
   * Add breadcrumb schema
   */
  addBreadcrumbSchema(baseSchema: any, url: string, title: string): any {
    const urlParts = new URL(url);
    const domain = `${urlParts.protocol}//${urlParts.hostname}`;
    
    baseSchema.breadcrumb = {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: domain
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Blog',
          item: `${domain}/blog`
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: title,
          item: url
        }
      ]
    };

    return baseSchema;
  }

  /**
   * Extract FAQ items from HTML content
   */
  extractFaqFromHtml(html: string): Array<{ question: string; answer: string }> {
    const items: Array<{ question: string; answer: string }> = [];
    
    // Look for FAQ section in HTML
    const faqSection = html.split(/<h2[^>]*>\s*FAQ/i)[1];
    if (!faqSection) return items;
    
    // Extract H3 questions and their answers
    const questions = faqSection.split(/<h3[^>]*>/).slice(1);
    
    for (const questionBlock of questions) {
      const parts = questionBlock.split('</h3>');
      const question = this.stripHtml(parts[0] || '').trim();
      const answer = this.stripHtml((parts[1] || '').split(/<h[23]|<\/h[23]/i)[0] || '').trim();
      
      if (question && answer) {
        items.push({ question, answer });
      }
    }
    
    return items;
  }

  /**
   * Extract list items from HTML content for listicles
   */
  extractListItemsFromHtml(html: string): Array<{ name: string; position: number; description?: string; url?: string }> {
    const items: any[] = [];
    
    // Match numbered list items (H2 with numbers)
    const listBlocks = html.match(/<h2[^>]*>\s*\d+\.\s*[^<]+<\/h2>[\s\S]*?(?=<h2|$)/gi) || [];
    
    let position = 1;
    for (const block of listBlocks) {
      const titleMatch = block.match(/<h2[^>]*>\s*(\d+)\.\s*([^<]+)<\/h2>/i);
      const name = titleMatch?.[2]?.trim();
      const description = this.stripHtml(block.replace(titleMatch?.[0] || '', '')).slice(0, 280);
      
      if (name) {
        items.push({
          name,
          position: position++,
          description
        });
      }
    }
    
    return items;
  }

  /**
   * Helper methods
   */
  private extractStepsFromContent(title: string): Array<{ name: string; description: string }> {
    // Generate basic steps from title - in real implementation, this would parse the actual content
    const steps = [
      { name: `Step 1: Getting Started with ${title}`, description: 'Initial setup and preparation' },
      { name: `Step 2: Implementation`, description: 'Core implementation process' },
      { name: `Step 3: Testing and Verification`, description: 'Verify the results' }
    ];
    return steps;
  }

  private estimateTimeFromSteps(steps: Array<{ name: string; description: string }>): string {
    const minutesPerStep = 10;
    const totalMinutes = steps.length * minutesPerStep;
    return `PT${totalMinutes}M`;
  }

  private generateListItemsFromTitle(title: string, url: string): Array<{ name: string; position: number; description?: string; url?: string }> {
    // Generate sample list items - in real implementation, this would parse the actual content
    return [
      { name: `Top Option for ${title}`, position: 1, description: 'Best overall choice' },
      { name: `Budget-Friendly Option`, position: 2, description: 'Great value for money' },
      { name: `Premium Choice`, position: 3, description: 'High-end features' }
    ];
  }

  private generateFaqItemsFromTitle(title: string): Array<{ question: string; answer: string }> {
    // Generate basic FAQ items - in real implementation, this would parse the actual content
    return [
      {
        question: `What is ${title}?`,
        answer: `${title} is a comprehensive topic that covers various aspects and considerations.`
      },
      {
        question: `How do I get started with ${title}?`,
        answer: `Getting started with ${title} involves understanding the basics and following best practices.`
      }
    ];
  }

  private extractMentionsFromTitle(title: string): any[] {
    // Extract product/service mentions from comparison titles
    const mentions = title.split(/\s+vs\s+|\s+versus\s+|\s+or\s+/i);
    return mentions.map(mention => ({
      '@type': 'Thing',
      name: mention.trim()
    }));
  }

  private extractKeywordsFromTitle(title: string): string[] {
    // Extract keywords from title
    return title.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 5);
  }

  private estimateWordCount(description: string): number {
    return Math.max(800, description.split(/\s+/).length * 20);
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}