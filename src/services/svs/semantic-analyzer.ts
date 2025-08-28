import OpenAI from 'openai';

// Core types for SVS analysis
export interface SVSAnalysisResult {
  overall_svs_score: number;
  component_scores: {
    entity_coverage: number;
    semantic_variety: number;
    qa_utility: number;
    citation_evidence: number;
    clarity_simplicity: number;
    topic_depth: number;
    structure_schema: number;
  };
  analysis_data: {
    entities_found: string[];
    semantic_patterns: string[];
    qa_elements: string[];
    citations_detected: string[];
    readability_metrics: {
      flesch_score: number;
      avg_sentence_length: number;
      complex_words_ratio: number;
    };
    topic_coverage: string[];
    schema_elements: string[];
    recommendations: Array<{
      category: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      title: string;
      description: string;
      potential_points: number;
      implementation_type: 'auto_fixable' | 'manual' | 'semi_automatic';
    }>;
  };
  processing_time_ms: number;
  content_length: number;
}

export interface SVSAnalysisInput {
  content: string;
  url: string;
  html?: string;
  target_topic?: string;
  industry?: string;
}

export class SemanticAnalyzer {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Main SVS analysis method
   */
  async analyzeSVS(input: SVSAnalysisInput): Promise<SVSAnalysisResult> {
    const startTime = Date.now();
    
    try {
      // Run all analysis components in parallel for speed
      const [
        entityCoverage,
        semanticVariety,
        qaUtility,
        citationEvidence,
        claritySimplicity,
        topicDepth,
        structureSchema
      ] = await Promise.all([
        this.analyzeEntityCoverage(input),
        this.analyzeSemanticVariety(input),
        this.analyzeQAUtility(input),
        this.analyzeCitationEvidence(input),
        this.analyzeClaritySimplicity(input),
        this.analyzeTopicDepth(input),
        this.analyzeStructureSchema(input)
      ]);

      // Calculate overall score (sum of all components)
      const overallScore = 
        entityCoverage.score + 
        semanticVariety.score + 
        qaUtility.score + 
        citationEvidence.score + 
        claritySimplicity.score + 
        topicDepth.score + 
        structureSchema.score;

      // Compile all recommendations
      const allRecommendations = [
        ...entityCoverage.recommendations,
        ...semanticVariety.recommendations,
        ...qaUtility.recommendations,
        ...citationEvidence.recommendations,
        ...claritySimplicity.recommendations,
        ...topicDepth.recommendations,
        ...structureSchema.recommendations
      ].sort((a, b) => {
        // Sort by priority (critical > high > medium > low) then by potential points
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.priority] - priorityOrder[a.priority]) || 
               (b.potential_points - a.potential_points);
      });

      const processingTime = Date.now() - startTime;

      return {
        overall_svs_score: Math.min(100, Math.max(0, overallScore)),
        component_scores: {
          entity_coverage: entityCoverage.score,
          semantic_variety: semanticVariety.score,
          qa_utility: qaUtility.score,
          citation_evidence: citationEvidence.score,
          clarity_simplicity: claritySimplicity.score,
          topic_depth: topicDepth.score,
          structure_schema: structureSchema.score
        },
        analysis_data: {
          entities_found: entityCoverage.entities,
          semantic_patterns: semanticVariety.patterns,
          qa_elements: qaUtility.elements,
          citations_detected: citationEvidence.citations,
          readability_metrics: claritySimplicity.metrics,
          topic_coverage: topicDepth.coverage,
          schema_elements: structureSchema.elements,
          recommendations: allRecommendations
        },
        processing_time_ms: processingTime,
        content_length: input.content.length
      };

    } catch (error) {
      console.error('[SVS] Analysis failed:', error);
      throw new Error(`SVS analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Entity Coverage Analysis (0-20 points)
   * Detects and scores named entities and their contextual relevance
   */
  private async analyzeEntityCoverage(input: SVSAnalysisInput): Promise<{
    score: number;
    entities: string[];
    recommendations: Array<any>;
  }> {
    const prompt = `Analyze this content for entity coverage and semantic meaning for AI search engines:

CONTENT: "${input.content.slice(0, 3000)}..."
URL: ${input.url}
TARGET TOPIC: ${input.target_topic || 'Not specified'}

Task: Identify and evaluate named entities (brands, products, people, locations, concepts) and their contextual relationships.

Respond with JSON:
{
  "entities": ["entity1", "entity2", ...],
  "entity_relationships": ["relationship1", "relationship2", ...],
  "context_relevance": "high/medium/low",
  "coverage_completeness": "complete/partial/minimal",
  "score": 0-20,
  "recommendations": [
    {
      "category": "entity_coverage",
      "priority": "high/medium/low",
      "title": "recommendation title",
      "description": "detailed description",
      "potential_points": 2,
      "implementation_type": "manual"
    }
  ]
}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 800,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      
      return {
        score: Math.min(20, Math.max(0, result.score || 0)),
        entities: result.entities || [],
        recommendations: result.recommendations || []
      };
    } catch (error) {
      console.error('[SVS] Entity coverage analysis failed:', error);
      return { score: 0, entities: [], recommendations: [] };
    }
  }

  /**
   * Semantic Variety Analysis (0-15 points)
   * Measures natural language patterns and synonym usage
   */
  private async analyzeSemanticVariety(input: SVSAnalysisInput): Promise<{
    score: number;
    patterns: string[];
    recommendations: Array<any>;
  }> {
    const prompt = `Analyze semantic variety and natural language patterns in this content:

CONTENT: "${input.content.slice(0, 3000)}..."

Task: Evaluate synonym usage, natural language flow, and detect keyword stuffing vs semantic variety.

Respond with JSON:
{
  "synonym_usage": "excellent/good/poor",
  "keyword_stuffing_detected": true/false,
  "natural_language_flow": "high/medium/low",
  "semantic_patterns": ["pattern1", "pattern2", ...],
  "lsi_keyword_coverage": "comprehensive/partial/minimal",
  "score": 0-15,
  "recommendations": [...]
}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 600,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      
      return {
        score: Math.min(15, Math.max(0, result.score || 0)),
        patterns: result.semantic_patterns || [],
        recommendations: result.recommendations || []
      };
    } catch (error) {
      console.error('[SVS] Semantic variety analysis failed:', error);
      return { score: 0, patterns: [], recommendations: [] };
    }
  }

  /**
   * Question/Answer Utility Analysis (0-15 points)
   * Identifies Q&A patterns and citation-worthy content
   */
  private async analyzeQAUtility(input: SVSAnalysisInput): Promise<{
    score: number;
    elements: string[];
    recommendations: Array<any>;
  }> {
    const prompt = `Analyze Q&A utility and citation-worthiness of this content:

CONTENT: "${input.content.slice(0, 3000)}..."

Task: Identify explicit Q&A patterns, completeness of answers, and potential for AI citations.

Respond with JSON:
{
  "explicit_qa_patterns": ["What is...", "How to...", ...],
  "answer_completeness": "complete/partial/incomplete",
  "citation_worthiness": "high/medium/low",
  "faq_potential": "yes/no",
  "people_also_ask_coverage": "good/fair/poor",
  "score": 0-15,
  "recommendations": [...]
}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 600,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      
      return {
        score: Math.min(15, Math.max(0, result.score || 0)),
        elements: result.explicit_qa_patterns || [],
        recommendations: result.recommendations || []
      };
    } catch (error) {
      console.error('[SVS] Q&A utility analysis failed:', error);
      return { score: 0, elements: [], recommendations: [] };
    }
  }

  /**
   * Citation & Evidence Analysis (0-15 points)
   * Detects factual backing, sources, and trustworthiness signals
   */
  private async analyzeCitationEvidence(input: SVSAnalysisInput): Promise<{
    score: number;
    citations: string[];
    recommendations: Array<any>;
  }> {
    const prompt = `Analyze citation and evidence quality in this content:

CONTENT: "${input.content.slice(0, 3000)}..."

Task: Identify references to stats, studies, credible sources, and factual backing.

Respond with JSON:
{
  "stats_references": ["stat1", "stat2", ...],
  "credible_sources": ["source1", "source2", ...],
  "factual_backing": "strong/moderate/weak",
  "opinion_vs_fact_ratio": "fact_heavy/balanced/opinion_heavy",
  "trustworthiness_signals": ["signal1", "signal2", ...],
  "score": 0-15,
  "recommendations": [...]
}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 600,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      
      return {
        score: Math.min(15, Math.max(0, result.score || 0)),
        citations: [
          ...(result.stats_references || []),
          ...(result.credible_sources || [])
        ],
        recommendations: result.recommendations || []
      };
    } catch (error) {
      console.error('[SVS] Citation evidence analysis failed:', error);
      return { score: 0, citations: [], recommendations: [] };
    }
  }

  /**
   * Clarity & Simplicity Analysis (0-10 points)
   * Measures readability and comprehensibility for AI parsing
   */
  private analyzeClaritySimplicity(input: SVSAnalysisInput): Promise<{
    score: number;
    metrics: {
      flesch_score: number;
      avg_sentence_length: number;
      complex_words_ratio: number;
    };
    recommendations: Array<any>;
  }> {
    return new Promise((resolve) => {
      try {
        // Calculate readability metrics
        const sentences = input.content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const words = input.content.split(/\s+/).filter(w => w.trim().length > 0);
        const syllableCount = words.reduce((count, word) => count + this.countSyllables(word), 0);
        
        const avgSentenceLength = words.length / sentences.length;
        const avgSyllablesPerWord = syllableCount / words.length;
        
        // Flesch Reading Ease Score
        const fleschScore = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
        
        // Complex words (3+ syllables)
        const complexWords = words.filter(word => this.countSyllables(word) >= 3);
        const complexWordsRatio = complexWords.length / words.length;
        
        // Scoring logic (0-10 points)
        let score = 10;
        if (fleschScore < 30) score -= 4; // Very difficult
        else if (fleschScore < 50) score -= 2; // Difficult
        else if (fleschScore < 60) score -= 1; // Standard
        
        if (avgSentenceLength > 25) score -= 2; // Very long sentences
        else if (avgSentenceLength > 20) score -= 1; // Long sentences
        
        if (complexWordsRatio > 0.3) score -= 2; // High complexity
        else if (complexWordsRatio > 0.2) score -= 1; // Moderate complexity
        
        const recommendations = [];
        
        if (fleschScore < 60) {
          recommendations.push({
            category: 'clarity_simplicity',
            priority: fleschScore < 30 ? 'high' : 'medium',
            title: 'Improve content readability',
            description: `Content readability score is ${Math.round(fleschScore)} (should be 60+). Use shorter sentences and simpler words.`,
            potential_points: fleschScore < 30 ? 3 : 2,
            implementation_type: 'manual'
          });
        }
        
        if (avgSentenceLength > 20) {
          recommendations.push({
            category: 'clarity_simplicity',
            priority: 'medium',
            title: 'Shorten sentence length',
            description: `Average sentence length is ${Math.round(avgSentenceLength)} words (should be under 20). Break up long sentences.`,
            potential_points: 1,
            implementation_type: 'manual'
          });
        }

        resolve({
          score: Math.min(10, Math.max(0, score)),
          metrics: {
            flesch_score: Math.round(fleschScore),
            avg_sentence_length: Math.round(avgSentenceLength * 10) / 10,
            complex_words_ratio: Math.round(complexWordsRatio * 1000) / 1000
          },
          recommendations
        });
        
      } catch (error) {
        console.error('[SVS] Clarity analysis failed:', error);
        resolve({
          score: 5, // Default middle score on error
          metrics: { flesch_score: 50, avg_sentence_length: 15, complex_words_ratio: 0.15 },
          recommendations: []
        });
      }
    });
  }

  /**
   * Topic Coverage & Depth Analysis (0-15 points)
   * Analyzes semantic completeness and topical authority
   */
  private async analyzeTopicDepth(input: SVSAnalysisInput): Promise<{
    score: number;
    coverage: string[];
    recommendations: Array<any>;
  }> {
    const prompt = `Analyze topic coverage and semantic depth:

CONTENT: "${input.content.slice(0, 3000)}..."
TARGET TOPIC: ${input.target_topic || 'General'}

Task: Evaluate topic comprehensiveness, semantic completeness, and coverage of related subtopics.

Respond with JSON:
{
  "main_topic_coverage": "comprehensive/partial/minimal",
  "subtopics_covered": ["subtopic1", "subtopic2", ...],
  "missing_subtopics": ["missing1", "missing2", ...],
  "topical_authority_signals": ["signal1", "signal2", ...],
  "semantic_completeness": "complete/partial/incomplete",
  "score": 0-15,
  "recommendations": [...]
}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 700,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      
      return {
        score: Math.min(15, Math.max(0, result.score || 0)),
        coverage: [
          ...(result.subtopics_covered || []),
          ...(result.topical_authority_signals || [])
        ],
        recommendations: result.recommendations || []
      };
    } catch (error) {
      console.error('[SVS] Topic depth analysis failed:', error);
      return { score: 0, coverage: [], recommendations: [] };
    }
  }

  /**
   * Structure & Schema Analysis (0-10 points)
   * Evaluates HTML structure and schema markup for AI understanding
   */
  private analyzeStructureSchema(input: SVSAnalysisInput): Promise<{
    score: number;
    elements: string[];
    recommendations: Array<any>;
  }> {
    return new Promise((resolve) => {
      try {
        const html = input.html || '';
        const elements = [];
        const recommendations = [];
        let score = 0;

        // Check heading hierarchy
        const h1Count = (html.match(/<h1/gi) || []).length;
        const h2Count = (html.match(/<h2/gi) || []).length;
        const h3Count = (html.match(/<h3/gi) || []).length;

        if (h1Count === 1) {
          score += 2;
          elements.push('Single H1 tag');
        } else if (h1Count === 0) {
          recommendations.push({
            category: 'structure_schema',
            priority: 'high',
            title: 'Add H1 heading tag',
            description: 'Page is missing an H1 tag. Add a clear, descriptive H1 heading.',
            potential_points: 2,
            implementation_type: 'manual'
          });
        } else if (h1Count > 1) {
          recommendations.push({
            category: 'structure_schema',
            priority: 'medium',
            title: 'Fix multiple H1 tags',
            description: `Page has ${h1Count} H1 tags. Use only one H1 per page.`,
            potential_points: 1,
            implementation_type: 'manual'
          });
        }

        if (h2Count > 0) {
          score += 1;
          elements.push(`${h2Count} H2 headings`);
        }

        if (h3Count > 0) {
          score += 1;
          elements.push(`${h3Count} H3 headings`);
        }

        // Check for schema markup
        const schemaPatterns = [
          /application\/ld\+json/gi,
          /schema\.org/gi,
          /itemtype=/gi,
          /itemscope/gi
        ];

        let schemaFound = false;
        schemaPatterns.forEach(pattern => {
          if (pattern.test(html)) {
            schemaFound = true;
          }
        });

        if (schemaFound) {
          score += 3;
          elements.push('Schema markup detected');
        } else {
          recommendations.push({
            category: 'structure_schema',
            priority: 'medium',
            title: 'Add structured data markup',
            description: 'Add schema.org markup (JSON-LD) to help AI understand content context.',
            potential_points: 3,
            implementation_type: 'semi_automatic'
          });
        }

        // Check for semantic HTML elements
        const semanticElements = ['article', 'section', 'nav', 'aside', 'header', 'footer', 'main'];
        const foundSemanticElements = semanticElements.filter(element => 
          new RegExp(`<${element}`, 'gi').test(html)
        );

        if (foundSemanticElements.length >= 3) {
          score += 2;
          elements.push('Good semantic HTML structure');
        } else if (foundSemanticElements.length > 0) {
          score += 1;
          elements.push('Some semantic HTML elements');
        } else {
          recommendations.push({
            category: 'structure_schema',
            priority: 'low',
            title: 'Use semantic HTML elements',
            description: 'Use semantic HTML5 elements (article, section, header, etc.) for better structure.',
            potential_points: 2,
            implementation_type: 'manual'
          });
        }

        // Check for lists and navigation
        if (html.includes('<ul') || html.includes('<ol')) {
          score += 1;
          elements.push('Structured lists present');
        }

        resolve({
          score: Math.min(10, Math.max(0, score)),
          elements,
          recommendations
        });

      } catch (error) {
        console.error('[SVS] Structure analysis failed:', error);
        resolve({ score: 0, elements: [], recommendations: [] });
      }
    });
  }

  /**
   * Helper method to count syllables in a word (approximation)
   */
  private countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  /**
   * Get SVS grade based on score
   */
  static getSVSGrade(score: number): { grade: string; label: string; color: string } {
    if (score >= 90) return { grade: 'A+', label: 'Exceptional', color: '#10B981' };
    if (score >= 85) return { grade: 'A', label: 'Excellent', color: '#34D399' };
    if (score >= 80) return { grade: 'A-', label: 'Very Good', color: '#6EE7B7' };
    if (score >= 75) return { grade: 'B+', label: 'Good', color: '#84CC16' };
    if (score >= 70) return { grade: 'B', label: 'Above Average', color: '#A3E635' };
    if (score >= 65) return { grade: 'B-', label: 'Average', color: '#FBBF24' };
    if (score >= 60) return { grade: 'C+', label: 'Below Average', color: '#F59E0B' };
    if (score >= 55) return { grade: 'C', label: 'Needs Work', color: '#F97316' };
    if (score >= 50) return { grade: 'C-', label: 'Poor', color: '#EF4444' };
    if (score >= 40) return { grade: 'D', label: 'Very Poor', color: '#DC2626' };
    return { grade: 'F', label: 'Critical', color: '#B91C1C' };
  }
}