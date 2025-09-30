import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const {
      keyword_strategy,
      user_token,
      site_url,
      cluster_count = 8,
      business_context
    } = await request.json();

    if (!keyword_strategy || !user_token || !site_url) {
      return NextResponse.json({
        success: false,
        error: 'keyword_strategy, user_token, and site_url are required'
      }, { status: 400 });
    }

    console.log('[TOPICS CLUSTERING] Creating topic clusters for:', site_url);

    // Extract all keywords from the strategy
    const allKeywords = [
      ...(keyword_strategy.primary_keywords || []),
      ...(keyword_strategy.long_tail_keywords || []),
      ...(keyword_strategy.secondary_keywords || []),
      ...(keyword_strategy.content_keywords || [])
    ];

    if (allKeywords.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No keywords found in strategy'
      }, { status: 400 });
    }

    // Create clustering prompt for OpenAI
    const clusteringPrompt = `
Analyze these ${allKeywords.length} SEO keywords and organize them into ${cluster_count} strategic topic clusters for content planning.

BUSINESS CONTEXT:
${business_context ? `
Industry: ${business_context.industry}
Business Model: ${business_context.business_model}
Target Audience: ${business_context.target_audience?.join(', ')}
` : 'Business context not provided'}

KEYWORDS TO CLUSTER:
${allKeywords.map(kw => `"${kw.keyword}" (${kw.search_intent}, ${kw.difficulty} difficulty, ${kw.priority} priority)`).join('\n')}

Create ${cluster_count} topic clusters that group semantically related keywords for content creation. Each cluster should represent a cohesive content theme or pillar page opportunity.

NON-NEGOTIABLE RULES (avoid cannibalization):
1) One primary keyword per page with a distinct intent (informational, transactional, comparison, pricing, location). Do NOT plan multiple pages targeting the exact same head term + same intent.
2) If the same head term appears with clearly different intents, separate pages are allowed (e.g., comparison vs. pricing vs. how-to). Otherwise consolidate.
3) For each cluster, define a pillar (hub) page and supporting pages. Supporting pages link up to the pillar; related pages cross-link with varied, descriptive anchors.
4) Prefer specific, intent-labeled content opportunities (e.g., 'bulk lemons supplier Miami' [location+commercial]) over generic duplicates.

Return in this JSON format:
{
  "topic_clusters": [
    {
      "cluster_name": "SEO Fundamentals",
      "description": "Core SEO concepts and basic optimization techniques for beginners",
      "keywords": [
        {
          "keyword": "what is SEO",
          "search_intent": "informational",
          "difficulty": "low",
          "priority": "high",
          "rationale": "Primary entry point for SEO education content"
        }
      ],
      "content_opportunities": [
        "Ultimate SEO guide for beginners",
        "SEO checklist for new websites",
        "Common SEO mistakes to avoid"
      ],
      "pillar_page_suggestion": "Complete SEO Guide for [Business Type]",
      "cluster_priority": "high",
      "estimated_articles": 5
    }
  ],
  "clustering_strategy": {
    "total_keywords_clustered": ${allKeywords.length},
    "clusters_created": ${cluster_count},
    "methodology": "Semantic grouping by search intent and topic relevance",
    "content_calendar_months": 3
  }
}

Guidelines:
1. Group keywords by semantic similarity and search intent
2. Each cluster should have 3-12 keywords (avoid too large or too small clusters)
3. Prioritize clusters based on business relevance and keyword difficulty
4. Suggest specific content opportunities for each cluster with clear intent labels and unique primaries
5. Balance informational, commercial, transactional, comparison, pricing, and location intents across clusters
6. Consider content calendar planning with realistic article counts
7. Avoid planning multiple pages for the same head term + same intent; recommend consolidation when detected`;

    try { console.log('[TOPIC CLUSTERS][LLM] model=gpt-4o (clustering)', { keywords: allKeywords.length, clusters: cluster_count }); } catch {}
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert content strategist specializing in SEO topic clustering and content pillar planning. Always return valid, well-structured JSON with actionable content strategies.'
        },
        { role: 'user', content: clusteringPrompt }
      ],
      temperature: 0.3,
      max_tokens: 4000
    });

    let clustersData;
    try {
      clustersData = JSON.parse(completion.choices[0]?.message?.content || '{}');
    } catch (parseError) {
      console.error('[TOPICS CLUSTERING] Failed to parse OpenAI response:', parseError);
      return NextResponse.json({
        success: false,
        error: 'Failed to generate topic clusters - invalid response format'
      }, { status: 500 });
    }

    // Save clusters to database
    const savedClusters = [];

    for (const cluster of clustersData.topic_clusters || []) {
      try {
        const { data: savedCluster, error } = await supabase
          .from('topic_clusters')
          .insert({
            user_token,
            site_url,
            cluster_name: cluster.cluster_name,
            description: cluster.description,
            keywords: cluster.keywords,
            content_opportunities: cluster.content_opportunities || [],
            pillar_page_suggestion: cluster.pillar_page_suggestion,
            cluster_priority: cluster.cluster_priority || 'medium',
            estimated_articles: cluster.estimated_articles || 3,
            keyword_count: cluster.keywords?.length || 0,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          console.error('[TOPICS CLUSTERING] Database error:', error);
          // Continue with other clusters even if one fails
        } else {
          savedClusters.push(savedCluster);
        }
      } catch (dbError) {
        console.error('[TOPICS CLUSTERING] Failed to save cluster:', cluster.cluster_name, dbError);
      }
    }

    // Create content calendar suggestions
    const contentCalendar = await generateContentCalendar(clustersData.topic_clusters, business_context);

    console.log('[TOPICS CLUSTERING] Created', savedClusters.length, 'topic clusters with', allKeywords.length, 'keywords');

    return NextResponse.json({
      success: true,
      data: {
        topic_clusters: clustersData.topic_clusters,
        clustering_strategy: clustersData.clustering_strategy,
        content_calendar: contentCalendar,
        saved_clusters: savedClusters.length,
        keywords_processed: allKeywords.length,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[TOPICS CLUSTERING] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create topic clusters'
    }, { status: 500 });
  }
}

async function generateContentCalendar(clusters: any[], businessContext: any) {
  try {
    const calendarPrompt = `
Create a 3-month content calendar based on these topic clusters:

BUSINESS CONTEXT:
${businessContext ? `
Industry: ${businessContext.industry}
Business Model: ${businessContext.business_model}
Target Audience: ${businessContext.target_audience?.join(', ')}
` : 'Business context not provided'}

TOPIC CLUSTERS:
${clusters.map(c => `
Cluster: ${c.cluster_name}
Keywords: ${c.keywords?.length || 0} keywords
Priority: ${c.cluster_priority}
Estimated Articles: ${c.estimated_articles}
`).join('\n')}

Create a balanced content calendar in this JSON format:
{
  "content_calendar": {
    "month_1": [
      {
        "week": 1,
        "article_title": "Ultimate Guide to SEO for Small Businesses",
        "cluster": "SEO Fundamentals",
        "target_keywords": ["SEO for small business", "small business SEO"],
        "content_type": "Pillar Page",
        "priority": "high",
        "estimated_words": 3000
      }
    ],
    "month_2": [],
    "month_3": []
  },
  "publishing_strategy": {
    "articles_per_week": 2,
    "total_articles": 24,
    "content_mix": "60% informational, 30% commercial, 10% transactional"
  }
}

Guidelines:
1. Start with high-priority clusters and pillar pages
2. Maintain consistent publishing schedule (2 articles/week)
3. Mix content types: pillar pages, how-to guides, comparisons
4. Balance search intents across the calendar
5. Consider seasonal relevance if applicable`;

    try { console.log('[TOPIC CLUSTERS][LLM] model=gpt-4o-mini (calendar)'); } catch {}
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a content calendar specialist. Create realistic, balanced content calendars that support SEO growth. Always return valid JSON.'
        },
        { role: 'user', content: calendarPrompt }
      ],
      temperature: 0.4,
      max_tokens: 2000
    });

    return JSON.parse(completion.choices[0]?.message?.content || '{}');
  } catch (error) {
    console.error('[TOPICS CLUSTERING] Failed to generate content calendar:', error);
    return {
      content_calendar: {},
      publishing_strategy: {
        articles_per_week: 2,
        total_articles: 24,
        content_mix: "Balanced informational and commercial content"
      }
    };
  }
}
