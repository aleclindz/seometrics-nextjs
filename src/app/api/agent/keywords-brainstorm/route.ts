import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const {
      business_analysis,
      competitor_data,
      target_keywords = [],
      focus_areas = [],
      keyword_count = 50
    } = await request.json();

    if (!business_analysis) {
      return NextResponse.json({
        success: false,
        error: 'business_analysis is required'
      }, { status: 400 });
    }

    console.log('[KEYWORDS BRAINSTORM] Starting keyword strategy generation');

    // Create comprehensive keyword strategy prompt
    const keywordPrompt = `
Generate a comprehensive keyword strategy based on this analysis:

BUSINESS ANALYSIS:
Business Model: ${business_analysis.business_model}
Target Audience: ${business_analysis.target_audience?.join(', ')}
Services/Products: ${business_analysis.services_products?.join(', ')}
Industry: ${business_analysis.industry}
Website Type: ${business_analysis.website_type}
Existing Keywords: ${business_analysis.primary_keywords_used?.join(', ') || 'None identified'}

${competitor_data ? `
COMPETITOR INSIGHTS:
${competitor_data.competitive_insights ? `
- Market Gaps: ${competitor_data.competitive_insights.market_gaps?.join(', ')}
- Keyword Opportunities: ${competitor_data.competitive_insights.keyword_opportunities?.join(', ')}
- Content Opportunities: ${competitor_data.competitive_insights.content_opportunities?.join(', ')}
` : 'Basic competitor analysis available'}
` : ''}

${target_keywords.length > 0 ? `USER SPECIFIED KEYWORDS: ${target_keywords.join(', ')}` : ''}
${focus_areas.length > 0 ? `FOCUS AREAS: ${focus_areas.join(', ')}` : ''}

Generate ${keyword_count} strategic keywords organized by intent and difficulty. Return in this JSON format:

{
  "primary_keywords": [
    {
      "keyword": "main service keyword",
      "search_intent": "commercial|informational|navigational|transactional",
      "difficulty": "high|medium|low",
      "priority": "high|medium|low",
      "rationale": "Why this keyword is strategic"
    }
  ],
  "long_tail_keywords": [
    {
      "keyword": "specific long tail phrase",
      "search_intent": "commercial|informational|navigational|transactional",
      "difficulty": "high|medium|low",
      "priority": "high|medium|low",
      "rationale": "Why this keyword is strategic"
    }
  ],
  "secondary_keywords": [
    {
      "keyword": "related supporting keyword",
      "search_intent": "commercial|informational|navigational|transactional",
      "difficulty": "high|medium|low",
      "priority": "high|medium|low",
      "rationale": "Why this keyword is strategic"
    }
  ],
  "content_keywords": [
    {
      "keyword": "blog/content topic keyword",
      "search_intent": "informational",
      "difficulty": "high|medium|low",
      "priority": "high|medium|low",
      "rationale": "Why this keyword is strategic"
    }
  ],
  "strategy_summary": {
    "total_keywords": 50,
    "distribution": {
      "primary": 10,
      "long_tail": 25,
      "secondary": 10,
      "content": 15
    },
    "focus_approach": "Brief explanation of the strategic approach",
    "quick_wins": ["keyword 1", "keyword 2", "keyword 3"]
  }
}

Focus on:
1. Mix of high-intent commercial keywords and informational content keywords
2. Long-tail keywords (60%+) for better ranking opportunities
3. Keywords that differentiate from competitors
4. Balance between search volume potential and ranking difficulty
5. Keywords that align with the user's business model and goals`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert SEO strategist with deep knowledge of keyword research and search intent. Always return valid, well-structured JSON with strategic keyword recommendations.'
        },
        { role: 'user', content: keywordPrompt }
      ],
      temperature: 0.4,
      max_tokens: 3000
    });

    let keywordStrategy;
    try {
      keywordStrategy = JSON.parse(completion.choices[0]?.message?.content || '{}');
    } catch (parseError) {
      console.error('[KEYWORDS BRAINSTORM] Failed to parse OpenAI response:', parseError);
      return NextResponse.json({
        success: false,
        error: 'Failed to generate keyword strategy - invalid response format'
      }, { status: 500 });
    }

    // Validate and enrich the strategy
    const enrichedStrategy = await enrichKeywordStrategy(keywordStrategy, business_analysis);

    console.log('[KEYWORDS BRAINSTORM] Generated strategy with',
      (keywordStrategy.primary_keywords?.length || 0) +
      (keywordStrategy.long_tail_keywords?.length || 0) +
      (keywordStrategy.secondary_keywords?.length || 0) +
      (keywordStrategy.content_keywords?.length || 0), 'keywords');

    return NextResponse.json({
      success: true,
      data: {
        keyword_strategy: enrichedStrategy,
        generated_at: new Date().toISOString(),
        business_context: {
          industry: business_analysis.industry,
          business_model: business_analysis.business_model,
          target_audience: business_analysis.target_audience
        }
      }
    });

  } catch (error) {
    console.error('[KEYWORDS BRAINSTORM] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate keyword strategy'
    }, { status: 500 });
  }
}

async function enrichKeywordStrategy(strategy: any, businessAnalysis: any) {
  // Add additional metadata and validation
  const enriched = { ...strategy };

  // Ensure all keyword arrays exist
  enriched.primary_keywords = enriched.primary_keywords || [];
  enriched.long_tail_keywords = enriched.long_tail_keywords || [];
  enriched.secondary_keywords = enriched.secondary_keywords || [];
  enriched.content_keywords = enriched.content_keywords || [];

  // Calculate actual totals
  const totalKeywords =
    enriched.primary_keywords.length +
    enriched.long_tail_keywords.length +
    enriched.secondary_keywords.length +
    enriched.content_keywords.length;

  // Update strategy summary
  enriched.strategy_summary = {
    ...enriched.strategy_summary,
    total_keywords: totalKeywords,
    actual_distribution: {
      primary: enriched.primary_keywords.length,
      long_tail: enriched.long_tail_keywords.length,
      secondary: enriched.secondary_keywords.length,
      content: enriched.content_keywords.length
    },
    business_alignment: {
      industry: businessAnalysis.industry,
      website_type: businessAnalysis.website_type,
      target_audience: businessAnalysis.target_audience
    }
  };

  return enriched;
}