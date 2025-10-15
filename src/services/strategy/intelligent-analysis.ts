/**
 * Intelligent Strategy Analysis Service
 *
 * Analyzes user content requests and makes intelligent decisions about:
 * - Creating new topic clusters
 * - Expanding existing clusters with new keywords
 * - Identifying already-covered topics
 *
 * Prevents keyword cannibalization and builds topical authority systematically.
 */

export interface StrategyCluster {
  cluster_name: string;
  primary_keyword: string;
  secondary_keywords: string[];
  articleCount: number;
}

export interface StrategyDecision {
  decision: 'new_cluster' | 'expand_cluster' | 'covered';
  cluster_name: string;
  primary_keyword: string;
  secondary_keywords: string[];
  reasoning: string;
  confidence: number; // 0-1
  expand_cluster_id?: number; // If expanding existing cluster
}

export interface UserIntentAnalysis {
  user_intent: string;
  extracted_topic: string;
  geo_modifier: string | null; // e.g., "south florida", "miami"
  intent_type: 'informational' | 'transactional' | 'comparison' | 'local';
  suggested_keywords: string[];
  strategy_decision: StrategyDecision;
}

/**
 * Analyzes user's content request against existing strategy
 * Uses LLM to make intelligent cluster/keyword decisions
 */
export async function analyzeUserIntent(
  userContext: string,
  existingClusters: StrategyCluster[],
  domain: string,
  openaiApiKey: string
): Promise<UserIntentAnalysis> {
  const system = `You are a strategic SEO content strategist analyzing user requests.

Your job:
1. Analyze the user's topic request
2. Evaluate existing topic clusters
3. Determine strategy action needed:
   - NEW_CLUSTER: Topic not represented in existing strategy (create new cluster)
   - EXPAND_CLUSTER: Topic fits existing cluster (add keyword variations)
   - COVERED: Topic already well-covered (no action needed)

Guidelines:
- NEW_CLUSTER when: Main topic has no semantic match in existing clusters
- EXPAND_CLUSTER when: Topic relates to existing cluster but needs more keyword angles
- COVERED when: Topic already has 3+ articles covering it

Return strategic analysis with keyword recommendations.`;

  const user = {
    instruction: 'Analyze this content request and decide strategy action.',
    user_request: userContext,
    domain: domain,
    existing_clusters: existingClusters.map(c => ({
      name: c.cluster_name,
      primary: c.primary_keyword,
      keywords_count: c.secondary_keywords.length,
      article_count: c.articleCount
    })),
    output_format: {
      extracted_topic: 'string (main topic from request)',
      geo_modifier: 'string|null (e.g., "south florida", "miami")',
      intent_type: 'informational|transactional|comparison|local',
      decision: 'new_cluster|expand_cluster|covered',
      cluster_name: 'string (new or existing cluster name)',
      primary_keyword: 'string (main keyword)',
      secondary_keywords: ['string[] (5-10 keyword variations)'],
      reasoning: 'string (why this decision)',
      confidence: 'number (0-1 confidence score)',
      expand_cluster_name: 'string|null (if expanding, which cluster)'
    }
  };

  try {
    console.log('[STRATEGY ANALYSIS] Analyzing user intent:', userContext);
    console.log('[STRATEGY ANALYSIS] Existing clusters:', existingClusters.length);

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: JSON.stringify(user) }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3, // Lower temperature for more consistent decisions
        max_tokens: 800
      }),
      signal: AbortSignal.timeout(20000)
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error('[STRATEGY ANALYSIS] LLM error:', resp.status, errorText);
      throw new Error(`LLM analysis failed: ${resp.status}`);
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    const analysis = JSON.parse(content);

    console.log('[STRATEGY ANALYSIS] Decision:', analysis.decision);
    console.log('[STRATEGY ANALYSIS] Cluster:', analysis.cluster_name);
    console.log('[STRATEGY ANALYSIS] Reasoning:', analysis.reasoning);

    return {
      user_intent: userContext,
      extracted_topic: analysis.extracted_topic || userContext,
      geo_modifier: analysis.geo_modifier || null,
      intent_type: analysis.intent_type || 'informational',
      suggested_keywords: analysis.secondary_keywords || [],
      strategy_decision: {
        decision: analysis.decision || 'new_cluster',
        cluster_name: analysis.cluster_name || userContext,
        primary_keyword: analysis.primary_keyword || userContext.toLowerCase(),
        secondary_keywords: analysis.secondary_keywords || [],
        reasoning: analysis.reasoning || 'Automated analysis',
        confidence: analysis.confidence || 0.7,
        expand_cluster_id: analysis.expand_cluster_name
          ? existingClusters.find(c =>
              c.cluster_name.toLowerCase() === analysis.expand_cluster_name.toLowerCase()
            )?.articleCount // Using articleCount as proxy for ID (needs proper lookup)
          : undefined
      }
    };
  } catch (error) {
    console.error('[STRATEGY ANALYSIS] Analysis failed:', error);

    // Fallback: Simple rule-based analysis
    return fallbackAnalysis(userContext, existingClusters, domain);
  }
}

/**
 * Fallback rule-based analysis when LLM fails
 */
function fallbackAnalysis(
  userContext: string,
  existingClusters: StrategyCluster[],
  domain: string
): UserIntentAnalysis {
  console.log('[STRATEGY ANALYSIS] Using fallback rule-based analysis');

  const contextLower = userContext.toLowerCase();

  // Extract geo modifier (common patterns)
  const geoPatterns = [
    /in\s+(south\s+florida|miami|broward|palm\s+beach|florida)/i,
    /(south\s+florida|miami|broward|palm\s+beach)\s+/i
  ];
  let geo_modifier: string | null = null;
  for (const pattern of geoPatterns) {
    const match = userContext.match(pattern);
    if (match) {
      geo_modifier = match[1] || match[0];
      break;
    }
  }

  // Check if matches existing cluster
  const matchingCluster = existingClusters.find(c =>
    contextLower.includes(c.cluster_name.toLowerCase()) ||
    contextLower.includes(c.primary_keyword.toLowerCase()) ||
    c.secondary_keywords.some(k => contextLower.includes(k.toLowerCase()))
  );

  if (matchingCluster && matchingCluster.articleCount < 3) {
    // Expand existing cluster
    return {
      user_intent: userContext,
      extracted_topic: matchingCluster.cluster_name,
      geo_modifier,
      intent_type: geo_modifier ? 'local' : 'informational',
      suggested_keywords: generateKeywordVariations(userContext, geo_modifier),
      strategy_decision: {
        decision: 'expand_cluster',
        cluster_name: matchingCluster.cluster_name,
        primary_keyword: userContext.toLowerCase().trim(),
        secondary_keywords: generateKeywordVariations(userContext, geo_modifier),
        reasoning: `Expands existing "${matchingCluster.cluster_name}" cluster (${matchingCluster.articleCount} articles)`,
        confidence: 0.75,
        expand_cluster_id: matchingCluster.articleCount // Proxy for ID
      }
    };
  } else if (matchingCluster && matchingCluster.articleCount >= 3) {
    // Already covered
    return {
      user_intent: userContext,
      extracted_topic: matchingCluster.cluster_name,
      geo_modifier,
      intent_type: 'informational',
      suggested_keywords: [],
      strategy_decision: {
        decision: 'covered',
        cluster_name: matchingCluster.cluster_name,
        primary_keyword: userContext.toLowerCase().trim(),
        secondary_keywords: [],
        reasoning: `Topic already covered with ${matchingCluster.articleCount} articles`,
        confidence: 0.9
      }
    };
  } else {
    // Create new cluster
    const clusterName = toTitleCase(userContext);
    return {
      user_intent: userContext,
      extracted_topic: clusterName,
      geo_modifier,
      intent_type: geo_modifier ? 'local' : 'informational',
      suggested_keywords: generateKeywordVariations(userContext, geo_modifier),
      strategy_decision: {
        decision: 'new_cluster',
        cluster_name: clusterName,
        primary_keyword: userContext.toLowerCase().trim(),
        secondary_keywords: generateKeywordVariations(userContext, geo_modifier),
        reasoning: 'No matching cluster found - creating new topic cluster',
        confidence: 0.8
      }
    };
  }
}

/**
 * Generate keyword variations for a topic
 */
function generateKeywordVariations(topic: string, geoModifier: string | null): string[] {
  const base = topic.toLowerCase().trim();
  const variations: string[] = [];

  // Core variations
  variations.push(base);
  variations.push(`${base} guide`);
  variations.push(`${base} tips`);
  variations.push(`how to ${base}`);
  variations.push(`best ${base}`);

  // Geo variations
  if (geoModifier) {
    variations.push(`${base} ${geoModifier}`);
    variations.push(`${geoModifier} ${base}`);
    variations.push(`${base} in ${geoModifier}`);
  }

  // Business/commercial variations
  variations.push(`${base} services`);
  variations.push(`${base} companies`);
  variations.push(`${base} suppliers`);

  return variations
    .filter((v, i, arr) => arr.indexOf(v) === i) // Unique
    .slice(0, 10); // Max 10
}

/**
 * Convert string to title case
 */
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(/[\s-_]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
