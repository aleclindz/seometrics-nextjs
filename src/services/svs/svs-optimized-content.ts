import OpenAI from 'openai';

export interface SVSOptimizedContentRequest {
  title: string;
  keywords: string[];
  websiteDomain?: string;
  targetTopic?: string;
  industry?: string;
  contentLength?: 'short' | 'medium' | 'long';
  tone?: 'professional' | 'casual' | 'technical';
  targetSVSScore?: number; // Target SVS score to aim for
}

export interface SVSOptimizedContentResult {
  content: string;
  metaTitle: string;
  metaDescription: string;
  contentOutline: string[];
  svsOptimizations: {
    entities_included: string[];
    qa_sections: string[];
    citations_added: string[];
    semantic_keywords: string[];
    structure_enhancements: string[];
  };
  estimatedSVSScore: number;
  svsRecommendations: string[];
  wordCount: number;
}

export class SVSOptimizedContentGenerator {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async generateSVSOptimizedArticle(request: SVSOptimizedContentRequest): Promise<SVSOptimizedContentResult> {
    const {
      title,
      keywords,
      websiteDomain,
      targetTopic = title,
      industry,
      contentLength = 'medium',
      tone = 'professional',
      targetSVSScore = 85
    } = request;

    // Generate content with SVS optimization in mind
    const prompt = this.buildSVSOptimizedPrompt(request);
    
    console.log(`[SVS CONTENT] Generating SVS-optimized article: "${title}" (Target SVS: ${targetSVSScore})`);

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are SEOAgent's expert content writer specializing in Semantic Visibility Score (SVS) optimization. Create content that excels at communicating meaning to AI search engines like ChatGPT, Claude, and Perplexity.

Your content should maximize the SVS scoring framework:
- Entity Coverage (20pts): Clear entity mentions and relationships
- Semantic Variety (15pts): Natural language, synonyms, avoid keyword stuffing  
- Q&A Utility (15pts): Explicit questions and complete answers
- Citation Evidence (15pts): Stats, studies, credible sources
- Clarity Simplicity (10pts): Readable, AI-parseable language
- Topic Depth (15pts): Comprehensive coverage of subtopics
- Structure Schema (10pts): Clean HTML structure, schema-ready

Always respond with JSON in this exact format:
{
  "content": "Full article content with HTML structure...",
  "metaTitle": "SEO-optimized title (50-60 chars)",
  "metaDescription": "Compelling description (150-160 chars)", 
  "contentOutline": ["Section 1", "Section 2", ...],
  "svsOptimizations": {
    "entities_included": ["Entity 1", "Entity 2", ...],
    "qa_sections": ["What is...", "How to...", ...],
    "citations_added": ["Stat 1", "Study 2", ...],
    "semantic_keywords": ["synonym 1", "related term 2", ...],
    "structure_enhancements": ["H1 hierarchy", "FAQ schema", ...]
  },
  "estimatedSVSScore": 85,
  "svsRecommendations": ["recommendation 1", "recommendation 2", ...]
}`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      });

      const responseContent = completion.choices[0].message.content;
      if (!responseContent) {
        throw new Error('No response from OpenAI');
      }

      const result = JSON.parse(responseContent) as SVSOptimizedContentResult;
      
      // Calculate actual word count
      result.wordCount = result.content.split(/\s+/).filter(word => word.length > 0).length;

      console.log(`[SVS CONTENT] Generated article: ${result.wordCount} words, estimated SVS: ${result.estimatedSVSScore}/100`);

      return result;

    } catch (error) {
      console.error('[SVS CONTENT] Generation failed:', error);
      throw new Error(`Failed to generate SVS-optimized content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildSVSOptimizedPrompt(request: SVSOptimizedContentRequest): string {
    const {
      title,
      keywords,
      websiteDomain,
      targetTopic,
      industry,
      contentLength,
      tone,
      targetSVSScore
    } = request;

    const wordTargets = {
      short: '800-1200',
      medium: '1500-2500', 
      long: '3000-4500'
    };

    return `Create a highly SEO-optimized article that will score ${targetSVSScore}+ on the Semantic Visibility Score (SVS).

**ARTICLE REQUIREMENTS:**
- Title: "${title}"
- Primary Keywords: ${keywords.join(', ')}
- Target Topic: ${targetTopic}
- Industry: ${industry || 'General'}
- Content Length: ${wordTargets[contentLength!]} words
- Tone: ${tone}
- Website Context: ${websiteDomain ? `Writing for ${websiteDomain}` : 'Generic website'}

**SVS OPTIMIZATION REQUIREMENTS:**

**Entity Coverage (Target: 18+/20 points):**
- Include 8-12 specific, relevant named entities (brands, products, people, locations)
- Create clear relationships between entities
- Use entities naturally in context, not just as mentions
- Example entities for "${targetTopic}": [Suggest 3-5 relevant entities]

**Semantic Variety (Target: 13+/15 points):**
- Use 15+ semantic variations and synonyms for main keywords
- Avoid keyword stuffing - maintain natural language flow
- Include LSI (Latent Semantic Indexing) keywords
- Vary sentence structure and vocabulary

**Q&A Utility (Target: 13+/15 points):**
- Include explicit Q&A sections with "What is...", "How to...", "Why does..." patterns
- Provide complete, quotable answers
- Add FAQ section with 3-5 common questions
- Structure content for "People Also Ask" optimization

**Citation Evidence (Target: 12+/15 points):**
- Include 5-8 specific statistics or data points
- Reference 3-5 credible sources or studies (use realistic industry sources)
- Add "According to..." or "Research shows..." statements
- Balance facts with opinions - make content fact-heavy

**Clarity & Simplicity (Target: 8+/10 points):**
- Keep average sentence length under 20 words
- Use simple, clear language (Flesch score 60+)
- Minimize jargon and complex terminology
- Structure for easy AI parsing

**Topic Depth (Target: 13+/15 points):**
- Cover main topic comprehensively
- Include 5-8 related subtopics
- Address different aspects and use cases
- Show topical authority through detailed coverage

**Structure & Schema (Target: 8+/10 points):**
- Use proper heading hierarchy (one H1, multiple H2s, H3s as needed)
- Include semantic HTML structure
- Add FAQ section formatted for schema markup
- Create clean, organized content structure

**CONTENT STRUCTURE:**
1. Engaging introduction with primary keyword
2. Table of contents (for longer articles)
3. 5-7 main sections with H2 headings
4. FAQ section with 3-5 questions
5. Conclusion with call-to-action

**OUTPUT FORMAT:**
Return as JSON with all required fields. Make the content engaging, informative, and highly optimized for both users and AI search engines.`;
  }

  /**
   * Generate a batch of SVS-optimized articles
   */
  async generateBatch(requests: SVSOptimizedContentRequest[]): Promise<SVSOptimizedContentResult[]> {
    console.log(`[SVS CONTENT] Starting batch generation of ${requests.length} articles`);
    
    const results = [];
    const batchSize = 3; // Limit concurrent requests to avoid rate limits

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (request, index) => {
        try {
          console.log(`[SVS CONTENT] Generating article ${i + index + 1}/${requests.length}: "${request.title}"`);
          return await this.generateSVSOptimizedArticle(request);
        } catch (error) {
          console.error(`[SVS CONTENT] Failed to generate article "${request.title}":`, error);
          throw error;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`[SVS CONTENT] Batch item ${i + index} failed:`, result.reason);
          throw new Error(`Failed to generate article: ${result.reason}`);
        }
      });

      // Small delay between batches
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`[SVS CONTENT] Batch generation completed: ${results.length} articles`);
    return results;
  }

  /**
   * Analyze existing content and suggest SVS improvements
   */
  async analyzeSVSOpportunities(content: string, title: string, keywords: string[]): Promise<{
    currentEstimatedSVS: number;
    improvements: Array<{
      category: string;
      priority: 'high' | 'medium' | 'low';
      description: string;
      potentialGain: number;
      implementation: string;
    }>;
    optimizedVersion?: string;
  }> {
    const prompt = `Analyze this content for SVS (Semantic Visibility Score) optimization opportunities:

**TITLE:** ${title}
**KEYWORDS:** ${keywords.join(', ')}
**CONTENT:** ${content.slice(0, 4000)}${content.length > 4000 ? '...' : ''}

Evaluate against SVS framework (Entity Coverage 20pts, Semantic Variety 15pts, Q&A Utility 15pts, Citation Evidence 15pts, Clarity 10pts, Topic Depth 15pts, Structure 10pts).

Respond with JSON:
{
  "currentEstimatedSVS": 65,
  "improvements": [
    {
      "category": "entity_coverage",
      "priority": "high",
      "description": "Add specific brand and product entity mentions",
      "potentialGain": 5,
      "implementation": "Include mentions of relevant tools like [specific examples]"
    }
  ]
}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(completion.choices[0].message.content || '{}');
    } catch (error) {
      console.error('[SVS CONTENT] Analysis failed:', error);
      throw new Error('Failed to analyze SVS opportunities');
    }
  }
}