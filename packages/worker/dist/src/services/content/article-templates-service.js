"use strict";
/**
 * Article Templates Service
 *
 * Handles type-aware article templates and structures for:
 * - How-To articles
 * - Listicles
 * - Guides
 * - FAQ articles
 * - Comparison articles
 * - Evergreen/Regular blog articles
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArticleTemplatesService = void 0;
class ArticleTemplatesService {
    constructor() {
        this.templates = {
            how_to: {
                type: 'how_to',
                structure: this.getHowToStructure(),
                wordTargetMultiplier: 1.0,
                requiredSections: ['Prerequisites', 'Step-by-step', 'Troubleshooting'],
                optionalSections: ['Best practices', 'FAQ']
            },
            listicle: {
                type: 'listicle',
                structure: this.getListicleStructure(),
                wordTargetMultiplier: 1.1,
                requiredSections: ['Numbered list items', 'Comparison table'],
                optionalSections: ['How we chose', 'FAQ']
            },
            guide: {
                type: 'guide',
                structure: this.getGuideStructure(),
                wordTargetMultiplier: 1.2,
                requiredSections: ['Core concepts', 'Framework/methodology', 'Examples'],
                optionalSections: ['Tools & resources', 'Pitfalls & anti-patterns']
            },
            faq: {
                type: 'faq',
                structure: this.getFaqStructure(),
                wordTargetMultiplier: 0.8,
                requiredSections: ['FAQ Section'],
                optionalSections: ['Related links']
            },
            comparison: {
                type: 'comparison',
                structure: this.getComparisonStructure(),
                wordTargetMultiplier: 1.3,
                requiredSections: ['Feature comparison table', 'Deep-dives per option'],
                optionalSections: ['Decision tree', 'Recommendation by persona']
            },
            evergreen: {
                type: 'evergreen',
                structure: this.getEvergreenStructure(),
                wordTargetMultiplier: 1.1,
                requiredSections: ['History & context', 'Present landscape', 'Practical applications'],
                optionalSections: ['Future outlook']
            },
            blog: {
                type: 'blog',
                structure: this.getBlogStructure(),
                wordTargetMultiplier: 1.0,
                requiredSections: ['Main content sections', 'Examples'],
                optionalSections: ['Personal insights', 'Call-to-action']
            }
        };
    }
    /**
     * Get template for specific article type
     */
    getTemplate(type) {
        return this.templates[type] || this.templates.blog;
    }
    /**
     * Get all available article types
     */
    getAvailableTypes() {
        return Object.keys(this.templates);
    }
    /**
     * Calculate word target based on length and type
     */
    calculateWordTarget(contentLength, articleType) {
        const baseTargets = {
            short: 800,
            medium: 1100,
            long: 1600
        };
        const baseTarget = baseTargets[contentLength] || baseTargets.medium;
        const template = this.getTemplate(articleType);
        return Math.round(baseTarget * template.wordTargetMultiplier);
    }
    /**
     * How-To article structure
     */
    getHowToStructure() {
        return `
ARTICLE STRUCTURE (How-To):
1. TL;DR callout box with key steps summary
2. Introduction: problem statement + outcome preview
3. Prerequisites section (tools, skills, requirements)
4. Step-by-step instructions (H2 per major step, numbered)
   - Each step should include: what to do, why it matters, expected result
5. Troubleshooting common issues
6. Best practices and tips
7. FAQ section (3-5 questions)
8. Conclusion with clear call-to-action
`.trim();
    }
    /**
     * Listicle article structure
     */
    getListicleStructure() {
        return `
ARTICLE STRUCTURE (Listicle):
1. TL;DR callout with top 3 picks
2. Introduction: selection criteria and methodology
3. Numbered list items (minimum 7 items), each with:
   - What it is (brief description)
   - Why it matters (key benefits)
   - Real-world example or use case
   - Key metric or standout feature
4. Comparison table (HTML) summarizing all options
5. "How we chose" methodology section
6. FAQ section (3-4 questions)
7. Conclusion with top recommendation and CTA
`.trim();
    }
    /**
     * Guide article structure
     */
    getGuideStructure() {
        return `
ARTICLE STRUCTURE (Comprehensive Guide):
1. TL;DR callout with key takeaways
2. Introduction: scope definition + target audience
3. Definitions & core concepts (foundation knowledge)
4. Framework/methodology (the systematic approach)
5. Practical examples and case studies
6. Common pitfalls & anti-patterns to avoid
7. Tools & resources section
8. FAQ section with advanced questions
9. Conclusion with next steps and action items
`.trim();
    }
    /**
     * FAQ article structure
     */
    getFaqStructure() {
        return `
ARTICLE STRUCTURE (FAQ):
1. TL;DR callout with most important answers
2. Brief introduction to the topic
3. FAQ Section: 10+ questions organized by category
   - Use <h3> tags for each question
   - Provide comprehensive, quotable answers
   - Include relevant examples and specifics
4. Related topics and links
5. Conclusion with additional resources
`.trim();
    }
    /**
     * Comparison article structure
     */
    getComparisonStructure() {
        return `
ARTICLE STRUCTURE (Comparison):
1. TL;DR callout with winner by category
2. Introduction: what we're comparing + evaluation criteria
3. Side-by-side feature comparison table (HTML)
4. Deep-dive sections for each option:
   - Pros and cons
   - Who it's best for
   - Pricing/value analysis
   - Real user feedback
5. Decision tree (bulleted guide)
6. FAQ addressing common comparison questions
7. Conclusion with specific recommendations by user persona
`.trim();
    }
    /**
     * Evergreen article structure
     */
    getEvergreenStructure() {
        return `
ARTICLE STRUCTURE (Evergreen):
1. TL;DR callout with timeless insights
2. Introduction to the topic's significance
3. History & context (foundational background)
4. Present landscape (current state of affairs)
5. Practical applications and use cases
6. Future outlook and trends
7. FAQ with questions that remain relevant over time
8. Conclusion with lasting takeaways
`.trim();
    }
    /**
     * Regular blog article structure
     */
    getBlogStructure() {
        return `
ARTICLE STRUCTURE (Blog Post):
1. TL;DR callout box with key points
2. Engaging introduction with hook + preview
3. Main content sections (3-5 sections with H2 headings):
   - Problem/context section
   - Solution/approach section  
   - Benefits/results section
   - Implementation/examples section
4. Personal insights or opinion (what makes this unique)
5. Real-world examples with specific details
6. Best practices and actionable tips
7. FAQ section (3-4 questions)
8. Conclusion with clear call-to-action
`.trim();
    }
    /**
     * Get citation rules based on article type
     */
    getCitationRules(articleType, includeCitations, referenceStyle) {
        if (!includeCitations) {
            return 'Do not include references; avoid unverifiable claims and focus on general knowledge.';
        }
        const typeSpecificRules = {
            how_to: 'Focus citations on technical specifications, official documentation, and expert recommendations.',
            listicle: 'Cite sources for statistics, rankings, and feature comparisons. Include publication dates for relevance.',
            guide: 'Emphasize authoritative sources, academic papers, and industry reports for foundational concepts.',
            faq: 'Reference official documentation, support articles, and verified community discussions.',
            comparison: 'Include vendor specifications, user reviews, independent test results, and pricing sources.',
            evergreen: 'Focus on historical sources, authoritative references, and well-established research.',
            blog: 'Mix of recent news, studies, expert opinions, and personal insights with clear attribution.'
        };
        const formatRules = referenceStyle === 'apa'
            ? 'APA-style format: Author/Organization (Year). Title. Include full URL.'
            : 'Simple format: Title – Source – URL';
        return `
CITATION RULES:
- Insert inline markers like [^1], [^2] exactly where claims need verification
- ${typeSpecificRules[articleType]}
- End with <h2>References</h2> section listing only sources cited inline
- Reference format: ${formatRules}  
- All links must be valid http(s) URLs from research sources
- Avoid making claims that cannot be supported by provided sources
`.trim();
    }
}
exports.ArticleTemplatesService = ArticleTemplatesService;
