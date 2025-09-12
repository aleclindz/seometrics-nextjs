"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaService = void 0;
class SchemaService {
    constructor() { }
    /**
     * Build comprehensive JSON-LD schema for an article
     */
    buildSchemaForArticle(params) {
        const { articleType, title, description, url, images, authorName, datePublishedISO, faqItems, listItems } = params;
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
        };
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
    enhanceWithHowToSchema(baseSchema, params) {
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
    enhanceWithListSchema(baseSchema, params) {
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
    enhanceWithFaqSchema(baseSchema, params) {
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
    enhanceWithComparisonSchema(baseSchema, params) {
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
    enhanceWithArticleSchema(baseSchema, params) {
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
    addBreadcrumbSchema(baseSchema, url, title) {
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
    extractFaqFromHtml(html) {
        const items = [];
        // Look for FAQ section in HTML
        const faqSection = html.split(/<h2[^>]*>\s*FAQ/i)[1];
        if (!faqSection)
            return items;
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
    extractListItemsFromHtml(html) {
        var _a;
        const items = [];
        // Match numbered list items (H2 with numbers)
        const listBlocks = html.match(/<h2[^>]*>\s*\d+\.\s*[^<]+<\/h2>[\s\S]*?(?=<h2|$)/gi) || [];
        let position = 1;
        for (const block of listBlocks) {
            const titleMatch = block.match(/<h2[^>]*>\s*(\d+)\.\s*([^<]+)<\/h2>/i);
            const name = (_a = titleMatch === null || titleMatch === void 0 ? void 0 : titleMatch[2]) === null || _a === void 0 ? void 0 : _a.trim();
            const description = this.stripHtml(block.replace((titleMatch === null || titleMatch === void 0 ? void 0 : titleMatch[0]) || '', '')).slice(0, 280);
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
    extractStepsFromContent(title) {
        // Generate basic steps from title - in real implementation, this would parse the actual content
        const steps = [
            { name: `Step 1: Getting Started with ${title}`, description: 'Initial setup and preparation' },
            { name: `Step 2: Implementation`, description: 'Core implementation process' },
            { name: `Step 3: Testing and Verification`, description: 'Verify the results' }
        ];
        return steps;
    }
    estimateTimeFromSteps(steps) {
        const minutesPerStep = 10;
        const totalMinutes = steps.length * minutesPerStep;
        return `PT${totalMinutes}M`;
    }
    generateListItemsFromTitle(title, url) {
        // Generate sample list items - in real implementation, this would parse the actual content
        return [
            { name: `Top Option for ${title}`, position: 1, description: 'Best overall choice' },
            { name: `Budget-Friendly Option`, position: 2, description: 'Great value for money' },
            { name: `Premium Choice`, position: 3, description: 'High-end features' }
        ];
    }
    generateFaqItemsFromTitle(title) {
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
    extractMentionsFromTitle(title) {
        // Extract product/service mentions from comparison titles
        const mentions = title.split(/\s+vs\s+|\s+versus\s+|\s+or\s+/i);
        return mentions.map(mention => ({
            '@type': 'Thing',
            name: mention.trim()
        }));
    }
    extractKeywordsFromTitle(title) {
        // Extract keywords from title
        return title.toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 3)
            .slice(0, 5);
    }
    estimateWordCount(description) {
        return Math.max(800, description.split(/\s+/).length * 20);
    }
    stripHtml(html) {
        return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
}
exports.SchemaService = SchemaService;
