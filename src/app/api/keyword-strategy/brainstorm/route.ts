import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  // Guardrail to avoid long hangs within serverless limits
  timeout: 25000
});

// Heuristic fallback generator when OpenAI times out or fails
function heuristicGenerateKeywords(opts: {
  domain: string;
  baseKeywords: string[];
  topicFocus: string;
  generateCount: number;
}) {
  const intents = ['informational','commercial','transactional'] as const;
  const clusters = [
    'translation benefits',
    'cost and ROI',
    'workflows and tools',
    'use cases',
    'localization strategy'
  ];
  const seeds = (opts.baseKeywords && opts.baseKeywords.length > 0)
    ? opts.baseKeywords
    : (opts.topicFocus ? [opts.topicFocus] : ['translation benefits']);
  const out: any[] = [];
  const templates = [
    'benefits of {seed} for youtube',
    'why translate youtube videos for {seed}',
    '{seed} translation for youtube shorts',
    'how to increase reach with {seed} translation',
    'best tools for {seed} on youtube',
    'youtube translation roi {seed}',
    '{seed} vs subtitles for youtube growth',
    'does {seed} improve watch time on youtube',
    'localize youtube channel with {seed}',
    '{seed} translation pricing for creators'
  ];
  let i = 0;
  while (out.length < Math.max(5, Math.min(opts.generateCount, 30)) && i < 200) {
    i++;
    const seed = seeds[Math.floor(Math.random()*seeds.length)] || 'translation benefits';
    const t = templates[Math.floor(Math.random()*templates.length)];
    const kw = t.replace('{seed}', seed);
    if (out.some(k => k.keyword.toLowerCase() === kw.toLowerCase())) continue;
    out.push({
      keyword: kw,
      search_intent: intents[out.length % intents.length],
      keyword_type: 'long_tail',
      suggested_topic_cluster: clusters[out.length % clusters.length],
      rationale: `Relevant to ${opts.domain} audience seeking ${seed} outcomes`
    });
  }
  return out;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userToken, 
      websiteToken, 
      domain,
      baseKeywords = [],
      topicFocus = '',
      generateCount = 10,
      avoidDuplicates = true
    } = body;

    if (!userToken) {
      return NextResponse.json({ error: 'User token is required' }, { status: 401 });
    }

    console.log('[KEYWORD BRAINSTORM] Generating keywords for user:', userToken);

    // Find website token if domain provided
    let targetWebsiteToken = websiteToken;
    if (!targetWebsiteToken && domain) {
      const { data: website, error: websiteError } = await supabase
        .from('websites')
        .select('website_token')
        .eq('user_token', userToken)
        .or(`domain.eq.${domain},cleaned_domain.eq.${domain}`)
        .single();

      if (websiteError || !website) {
        return NextResponse.json({ error: 'Website not found' }, { status: 404 });
      }

      targetWebsiteToken = website.website_token;
    }

    if (!targetWebsiteToken) {
      return NextResponse.json({ error: 'Website token or domain is required' }, { status: 400 });
    }

    // Get existing keywords to avoid duplicates (cap to reduce token size)
    let existingKeywords = [] as string[];
    if (avoidDuplicates) {
      const { data: existing, error: existingError } = await supabase
        .from('website_keywords')
        .select('keyword')
        .eq('website_token', targetWebsiteToken);

      if (!existingError && existing) {
        existingKeywords = existing.map(k => k.keyword.toLowerCase()).slice(0, 80);
      }
    }

    // Get website context for better suggestions
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('domain, cleaned_domain')
      .eq('website_token', targetWebsiteToken)
      .eq('user_token', userToken)
      .single();

    if (websiteError || !website) {
      return NextResponse.json({ error: 'Website not found or access denied' }, { status: 404 });
    }

    const websiteDomain = website.cleaned_domain || website.domain;

    // Create prompt for OpenAI
    const baseKeywordsList = baseKeywords.length > 0 ? baseKeywords.join(', ') : '';
    const existingKeywordsList = existingKeywords.length > 0 ? existingKeywords.join(', ') : '';

    const prompt = `Generate ${generateCount} long-tail keyword variations for SEO content strategy.

Website: ${websiteDomain}
${baseKeywordsList ? `Base keywords: ${baseKeywordsList}` : ''}
${topicFocus ? `Topic focus: ${topicFocus}` : ''}
${existingKeywordsList ? `Existing keywords to AVOID duplicating: ${existingKeywordsList}` : ''}

Requirements:
- Generate long-tail keywords (3-6 words each)
- Focus on search intent: informational, commercial, and transactional
- Include question-based keywords (how, what, why, when, where)
- Include comparison keywords (vs, best, top, review)
- Include location-based variations where relevant
- Make them specific and actionable
- Ensure they're relevant to the website's domain
${existingKeywords.length > 0 ? '- MUST avoid duplicating existing keywords' : ''}

Format as a JSON array of objects with this structure:
{
  "keyword": "long tail keyword phrase",
  "search_intent": "informational|commercial|transactional",
  "keyword_type": "long_tail",
  "suggested_topic_cluster": "suggested cluster name",
  "rationale": "brief explanation of why this keyword is valuable"
}

Return only the JSON array, no other text.`;

    // Generate keywords using a faster model with smaller token budget
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an SEO keyword research expert. Generate strategic long-tail keywords that will help websites rank for valuable search traffic."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.6,
      max_tokens: 900
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      // Fallback to heuristic generation if LLM did not respond
      const generatedKeywords = heuristicGenerateKeywords({
        domain: websiteDomain,
        baseKeywords,
        topicFocus,
        generateCount
      });
      return NextResponse.json({
        success: true,
        generated_keywords: generatedKeywords,
        total_generated: generatedKeywords.length,
        existing_keywords_avoided: existingKeywords.length,
        topic_cluster_suggestions: [],
        website_token: targetWebsiteToken,
        website_domain: websiteDomain,
        suggestions: {
          next_steps: [
            "Review the generated keywords and select the most relevant ones",
            "Organize selected keywords into topic clusters",
            "Create content calendar based on keyword priorities"
          ]
        }
      });
    }

    // Parse the JSON response
    let generatedKeywords = [];
    try {
      generatedKeywords = JSON.parse(response);
    } catch (parseError) {
      console.error('[KEYWORD BRAINSTORM] Error parsing OpenAI response:', parseError);
      console.error('[KEYWORD BRAINSTORM] Raw response:', response);
      // Fallback to heuristic generation on parse errors
      generatedKeywords = heuristicGenerateKeywords({
        domain: websiteDomain,
        baseKeywords,
        topicFocus,
        generateCount
      });
    }

    // Filter out any duplicates that might have slipped through
    if (avoidDuplicates && existingKeywords.length > 0) {
      generatedKeywords = generatedKeywords.filter((kw: any) => 
        !existingKeywords.includes(kw.keyword.toLowerCase())
      );
    }

    // Organize by suggested topic clusters
    const keywordsByCluster: { [key: string]: any[] } = {};
    generatedKeywords.forEach((kw: any) => {
      const cluster = kw.suggested_topic_cluster || 'uncategorized';
      if (!keywordsByCluster[cluster]) {
        keywordsByCluster[cluster] = [];
      }
      keywordsByCluster[cluster].push(kw);
    });

    // Get suggestions for organizing existing keywords into clusters
    const topicClusterSuggestions = [];
    for (const [clusterName, keywords] of Object.entries(keywordsByCluster)) {
      if (keywords.length > 0) {
        topicClusterSuggestions.push({
          cluster_name: clusterName,
          keyword_count: keywords.length,
          keywords: keywords,
          rationale: `Group of ${keywords.length} related keywords focusing on ${clusterName.toLowerCase()} topics`
        });
      }
    }

    return NextResponse.json({
      success: true,
      generated_keywords: generatedKeywords,
      total_generated: generatedKeywords.length,
      existing_keywords_avoided: existingKeywords.length,
      topic_cluster_suggestions: topicClusterSuggestions,
      website_token: targetWebsiteToken,
      website_domain: websiteDomain,
      suggestions: {
        next_steps: [
          "Review the generated keywords and select the most relevant ones",
          "Organize selected keywords into topic clusters",
          "Create content calendar based on keyword priorities",
          "Start with high-intent commercial keywords for quick wins"
        ],
        content_opportunities: generatedKeywords.filter((kw: any) => kw.search_intent === 'commercial').length > 0
          ? `Found ${generatedKeywords.filter((kw: any) => kw.search_intent === 'commercial').length} commercial keywords for revenue-focused content`
          : "Consider adding more commercial intent keywords for monetization"
      }
    });

  } catch (error) {
    console.error('[KEYWORD BRAINSTORM] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const websiteToken = searchParams.get('websiteToken');
    const domain = searchParams.get('domain');

    if (!userToken) {
      return NextResponse.json({ error: 'User token is required' }, { status: 401 });
    }

    // Find website token if domain provided
    let targetWebsiteToken = websiteToken;
    if (!targetWebsiteToken && domain) {
      const { data: website, error: websiteError } = await supabase
        .from('websites')
        .select('website_token')
        .eq('user_token', userToken)
        .or(`domain.eq.${domain},cleaned_domain.eq.${domain}`)
        .single();

      if (websiteError || !website) {
        return NextResponse.json({ error: 'Website not found' }, { status: 404 });
      }

      targetWebsiteToken = website.website_token;
    }

    if (!targetWebsiteToken) {
      return NextResponse.json({ error: 'Website token or domain is required' }, { status: 400 });
    }

    // Get keyword research context for brainstorming
    const { data: keywords, error: keywordsError } = await supabase
      .from('website_keywords')
      .select('keyword, keyword_type, topic_cluster')
      .eq('website_token', targetWebsiteToken)
      .order('created_at', { ascending: false });

    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('domain, cleaned_domain')
      .eq('website_token', targetWebsiteToken)
      .eq('user_token', userToken)
      .single();

    // Get existing topic clusters
    const { data: clusters, error: clustersError } = await supabase
      .from('topic_cluster_content')
      .select('topic_cluster')
      .eq('website_token', targetWebsiteToken)
      .order('topic_cluster');

    const uniqueClusters = clusters 
      ? Array.from(new Set(clusters.map((c: any) => c.topic_cluster)))
      : [];

    return NextResponse.json({
      success: true,
      website_domain: website ? (website.cleaned_domain || website.domain) : '',
      existing_keywords: keywords || [],
      existing_topic_clusters: uniqueClusters,
      brainstorm_suggestions: {
        base_keywords: (keywords || [])
          .filter(k => k.keyword_type === 'primary')
          .map(k => k.keyword)
          .slice(0, 5),
        topic_focus_options: uniqueClusters.slice(0, 3),
        recommended_count: Math.max(10 - (keywords?.length || 0), 5)
      }
    });

  } catch (error) {
    console.error('[KEYWORD BRAINSTORM] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
