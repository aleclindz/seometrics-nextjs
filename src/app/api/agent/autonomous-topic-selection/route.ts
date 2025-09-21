import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface QueryOpportunity {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  opportunityScore: number;
  opportunityType: 'underperforming_asset' | 'low_hanging_fruit' | 'content_gap' | 'trending_opportunity';
  reasoning: string;
  suggestedAction: string;
  estimatedTrafficGain: number;
}

interface TopicCluster {
  mainTopic: string;
  relatedQueries: string[];
  totalImpressions: number;
  totalClicks: number;
  averagePosition: number;
  opportunityScore: number;
  suggestedTitle: string;
  contentBrief: string;
  suggestedFormat: ArticleFormat;
  targetKeywords: string[];
  authorityLevel: 'foundation' | 'intermediate' | 'advanced';
}

interface ArticleFormat {
  type: 'listicle' | 'how-to' | 'guide' | 'faq' | 'comparison' | 'update' | 'case-study' | 'beginner-guide';
  template: string;
  wordCountRange: [number, number];
}

/**
 * Autonomous Topic Selection API
 * Analyzes GSC data using investor-style approach to select next blog post topics
 *
 * Strategy:
 * 1. Audit the Data Like an Investor
 *    - High impressions, low CTR = underperforming assets (rewrite/improve)
 *    - Page 1 positions (5-15) not #1 = low hanging fruit
 * 2. Cluster & Prioritize
 *    - Group related queries into topic clusters
 *    - Score opportunities by traffic potential and difficulty
 * 3. Strategic Selection
 *    - Choose topics that maximize ROI potential
 */
export async function POST(request: NextRequest) {
  try {
    const { userToken, websiteToken, domain, analysisType = 'comprehensive', generateCount = 3 } = await request.json();

    if (!userToken || !domain) {
      return NextResponse.json(
        { success: false, error: 'User token and domain are required' },
        { status: 400 }
      );
    }

    console.log('[AUTONOMOUS TOPIC] Starting analysis for:', { domain, analysisType, generateCount });

    // Step 1: Fetch GSC Data for Analysis
    const gscData = await fetchGSCDataForAnalysis(userToken, domain);

    // Step 1.5: Fetch Keyword Strategy and Topic Clusters for Authority Building
    const strategyData = await fetchKeywordStrategy(userToken, domain);

    if (!gscData.success && !strategyData.success) {
      return NextResponse.json({
        success: false,
        error: gscData.error || 'Failed to fetch data sources',
        fallback: await generateFallbackTopics(domain, userToken, generateCount)
      });
    }

    // Step 2: Identify Query Opportunities (Investor Approach)
    const opportunities = await identifyQueryOpportunities(gscData.queries || []);

    // Step 3: Cluster Related Topics with Authority Building
    const topicClusters = await clusterTopicOpportunitiesWithStrategy(
      opportunities,
      strategyData.clusters || [],
      strategyData.keywords || []
    );

    // Step 4: Score and Rank Topics for Authority Building
    const rankedTopics = await scoreAndRankTopicsForAuthority(
      topicClusters,
      { ...gscData.context, ...strategyData.context },
      generateCount
    );

    // Step 5: Select Topics with Format Variety
    const selectedTopics = await selectTopicsWithFormatVariety(rankedTopics, generateCount);

    // Step 6: Generate Enhanced Content Briefs with Authority Focus
    const contentBriefs = await generateEnhancedContentBriefs(
      selectedTopics,
      { ...gscData.context, ...strategyData.context }
    );

    console.log('[AUTONOMOUS TOPIC] Analysis complete:', {
      queriesAnalyzed: (gscData.queries || []).length,
      opportunitiesFound: opportunities.length,
      clustersCreated: topicClusters.length,
      topicsSelected: selectedTopics.length
    });

    return NextResponse.json({
      success: true,
      analysis: {
        domain,
        analysisDate: new Date().toISOString(),
        dataRange: gscData.context?.dateRange || { start: 'N/A', end: 'N/A' },
        queriesAnalyzed: (gscData.queries || []).length
      },
      selectedTopics: contentBriefs,
      opportunities: opportunities.slice(0, 10), // Top 10 individual opportunities
      clusters: topicClusters,
      recommendations: {
        immediate: selectedTopics.slice(0, 1),
        thisWeek: selectedTopics.slice(0, 3),
        nextWeek: rankedTopics.slice(3, 6)
      }
    });

  } catch (error) {
    console.error('[AUTONOMOUS TOPIC] Analysis error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to analyze topics' },
      { status: 500 }
    );
  }
}

// Step 1.5: Fetch keyword strategy and topic clusters from database
async function fetchKeywordStrategy(userToken: string, domain: string) {
  try {
    const cleanDomain = domain.replace(/^sc-domain:/, '').replace(/^https?:\/\//, '').replace(/\/$/, '');

    // Fetch keyword strategy data
    const { data: strategyData, error: strategyError } = await supabase
      .from('keyword_strategies')
      .select(`
        *,
        keyword_clusters (
          id,
          cluster_name,
          primary_keyword,
          keywords,
          intent,
          priority,
          status
        ),
        generated_keywords (
          keyword,
          search_volume,
          difficulty,
          intent,
          priority
        )
      `)
      .eq('user_token', userToken)
      .ilike('domain', `%${cleanDomain}%`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (strategyError || !strategyData || strategyData.length === 0) {
      console.log('[AUTONOMOUS TOPIC] No keyword strategy found, using GSC data only');
      return { success: false, error: 'No keyword strategy found' };
    }

    const strategy = strategyData[0];

    return {
      success: true,
      clusters: strategy.keyword_clusters || [],
      keywords: strategy.generated_keywords || [],
      context: {
        domain: cleanDomain,
        strategyId: strategy.id,
        totalClusters: (strategy.keyword_clusters || []).length,
        totalKeywords: (strategy.generated_keywords || []).length
      }
    };

  } catch (error) {
    console.error('[AUTONOMOUS TOPIC] Error fetching keyword strategy:', error);
    return { success: false, error: 'Failed to fetch keyword strategy' };
  }
}

// Step 1: Fetch and prepare GSC data for analysis
async function fetchGSCDataForAnalysis(userToken: string, domain: string) {
  try {
    // Calculate date ranges - last 28 days vs previous 28 days
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 28);

    const endDateStr = endDate.toISOString().split('T')[0];
    const startDateStr = startDate.toISOString().split('T')[0];

    // Clean domain for GSC property lookup
    const cleanDomain = domain.replace(/^sc-domain:/, '').replace(/^https?:\/\//, '').replace(/\/$/, '');
    const siteVariants = [
      domain,
      `sc-domain:${domain}`,
      `sc-domain:${cleanDomain}`,
      cleanDomain,
      `https://${cleanDomain}`,
      `https://www.${cleanDomain.replace(/^www\./, '')}`
    ];

    // Fetch query-level data for analysis
    const { data: queryData, error: queryError } = await supabase
      .from('gsc_search_analytics')
      .select('query, clicks, impressions, ctr, position, date')
      .eq('user_token', userToken)
      .in('site_url', siteVariants)
      .not('query', 'is', null)
      .gte('clicks', 1) // Only queries with at least 1 click
      .gte('impressions', 10) // Only queries with meaningful impressions
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .order('impressions', { ascending: false })
      .limit(500); // Top 500 queries for analysis

    if (queryError || !queryData || queryData.length === 0) {
      console.error('[AUTONOMOUS TOPIC] No GSC query data found:', queryError);
      return { success: false, error: 'No GSC query data available' };
    }

    // Aggregate query data by query (sum across dates)
    const queryMap = new Map();
    queryData.forEach(row => {
      if (!queryMap.has(row.query)) {
        queryMap.set(row.query, {
          query: row.query,
          clicks: 0,
          impressions: 0,
          ctr: 0,
          position: 0,
          dataPoints: 0
        });
      }

      const existing = queryMap.get(row.query);
      existing.clicks += row.clicks || 0;
      existing.impressions += row.impressions || 0;
      existing.position += (row.position || 0);
      existing.dataPoints += 1;
    });

    // Calculate averages and finalize query data
    const queries = Array.from(queryMap.values()).map(q => ({
      ...q,
      ctr: q.impressions > 0 ? (q.clicks / q.impressions) * 100 : 0,
      position: q.dataPoints > 0 ? q.position / q.dataPoints : 0
    })).filter(q => q.impressions >= 10); // Minimum threshold

    return {
      success: true,
      queries,
      context: {
        domain: cleanDomain,
        dateRange: { start: startDateStr, end: endDateStr },
        totalQueries: queries.length
      }
    };

  } catch (error) {
    console.error('[AUTONOMOUS TOPIC] Error fetching GSC data:', error);
    return { success: false, error: 'Failed to fetch GSC data' };
  }
}

// Step 2: Identify query opportunities using investor approach
async function identifyQueryOpportunities(queries: any[]): Promise<QueryOpportunity[]> {
  const opportunities: QueryOpportunity[] = [];

  for (const query of queries) {
    const { clicks, impressions, ctr, position } = query;

    // Skip queries with insufficient data
    if (impressions < 10 || clicks < 1) continue;

    let opportunityScore = 0;
    let opportunityType: QueryOpportunity['opportunityType'] = 'trending_opportunity';
    let reasoning = '';
    let suggestedAction = '';
    let estimatedTrafficGain = 0;

    // Investor Analysis: High impressions, low CTR = underperforming asset
    if (impressions >= 100 && ctr < 3) {
      opportunityScore += impressions * 0.1; // Weight by impression volume
      opportunityScore += (3 - ctr) * 10; // Penalty for low CTR
      opportunityType = 'underperforming_asset';
      reasoning = `High impressions (${impressions}) but low CTR (${ctr.toFixed(1)}%). Strong demand exists but content/title needs improvement.`;
      suggestedAction = 'Create comprehensive article targeting this query with optimized title and meta description';
      estimatedTrafficGain = Math.floor(impressions * 0.03); // Potential to reach 3% CTR
    }

    // Investor Analysis: Page 1 but not #1 = low hanging fruit
    else if (position >= 4 && position <= 15 && impressions >= 50) {
      opportunityScore += (16 - position) * 5; // Higher score for better positions
      opportunityScore += impressions * 0.05;
      opportunityType = 'low_hanging_fruit';
      reasoning = `Currently ranking at position ${position.toFixed(1)} with ${impressions} impressions. Moving to position 1-3 could significantly increase traffic.`;
      suggestedAction = 'Create superior content or enhance existing content to outrank competitors';
      estimatedTrafficGain = Math.floor(impressions * (1 / position) * 2); // Estimate based on position improvement
    }

    // Content Gap: High impressions, very low clicks
    else if (impressions >= 200 && clicks < 5) {
      opportunityScore += impressions * 0.08;
      opportunityType = 'content_gap';
      reasoning = `Massive search volume (${impressions}) but almost no clicks (${clicks}). Major content gap opportunity.`;
      suggestedAction = 'Create definitive guide/resource targeting this high-volume query';
      estimatedTrafficGain = Math.floor(impressions * 0.05); // Conservative 5% capture rate
    }

    // Trending Opportunity: Good position, decent CTR, growing impressions
    else if (position <= 10 && ctr >= 2 && impressions >= 30) {
      opportunityScore += position <= 5 ? 20 : 10;
      opportunityScore += ctr * 3;
      opportunityScore += impressions * 0.02;
      opportunityType = 'trending_opportunity';
      reasoning = `Well-positioned (${position.toFixed(1)}) with good CTR (${ctr.toFixed(1)}%). Building on this momentum could capture more traffic.`;
      suggestedAction = 'Create related content or expand existing content to dominate this topic cluster';
      estimatedTrafficGain = Math.floor(clicks * 1.5); // 50% increase potential
    }

    if (opportunityScore > 0) {
      opportunities.push({
        query: query.query,
        clicks,
        impressions,
        ctr,
        position,
        opportunityScore,
        opportunityType,
        reasoning,
        suggestedAction,
        estimatedTrafficGain
      });
    }
  }

  return opportunities.sort((a, b) => b.opportunityScore - a.opportunityScore);
}

// Step 3: Enhanced topic clustering with strategy integration
async function clusterTopicOpportunitiesWithStrategy(
  opportunities: QueryOpportunity[],
  strategyClusters: any[],
  strategyKeywords: any[]
): Promise<TopicCluster[]> {
  const clusters = new Map<string, QueryOpportunity[]>();

  // First, try to match opportunities to existing strategy clusters
  const matchedClusters = new Map<string, any>();
  for (const cluster of strategyClusters) {
    matchedClusters.set(cluster.cluster_name.toLowerCase(), cluster);
  }

  // Enhanced clustering with strategy awareness
  for (const opportunity of opportunities) {
    let assignedCluster = extractMainTopic(opportunity.query);

    // Try to match to existing strategy clusters
    for (const [clusterName, cluster] of Array.from(matchedClusters.entries())) {
      const keywords = cluster.keywords || [];
      const primaryKeyword = cluster.primary_keyword || '';

      if (keywords.some((kw: string) => opportunity.query.toLowerCase().includes(kw.toLowerCase())) ||
          opportunity.query.toLowerCase().includes(primaryKeyword.toLowerCase())) {
        assignedCluster = cluster.cluster_name;
        break;
      }
    }

    if (!clusters.has(assignedCluster)) {
      clusters.set(assignedCluster, []);
    }
    clusters.get(assignedCluster)!.push(opportunity);
  }

  // Convert to enhanced topic clusters
  const topicClusters: TopicCluster[] = [];

  for (const [topic, relatedOpportunities] of Array.from(clusters.entries())) {
    if (relatedOpportunities.length === 0) continue;

    const totalImpressions = relatedOpportunities.reduce((sum, opp) => sum + opp.impressions, 0);
    const totalClicks = relatedOpportunities.reduce((sum, opp) => sum + opp.clicks, 0);
    const averagePosition = relatedOpportunities.reduce((sum, opp) => sum + opp.position, 0) / relatedOpportunities.length;
    const opportunityScore = relatedOpportunities.reduce((sum, opp) => sum + opp.opportunityScore, 0);

    // Find matching strategy cluster for keywords and authority level
    const matchingCluster = matchedClusters.get(topic.toLowerCase());
    const targetKeywords = matchingCluster ? (matchingCluster.keywords || []) : [topic];
    const intent = matchingCluster?.intent || 'informational';

    // Determine authority level based on competition and complexity
    let authorityLevel: 'foundation' | 'intermediate' | 'advanced' = 'foundation';
    if (averagePosition > 20 || totalImpressions < 50) authorityLevel = 'advanced';
    else if (averagePosition > 10 || intent === 'commercial') authorityLevel = 'intermediate';

    // Select format based on topic and authority level
    const suggestedFormat = selectArticleFormat(topic, authorityLevel, intent, relatedOpportunities);

    topicClusters.push({
      mainTopic: topic,
      relatedQueries: relatedOpportunities.map(opp => opp.query),
      totalImpressions,
      totalClicks,
      averagePosition,
      opportunityScore,
      suggestedTitle: generateSuggestedTitleWithFormat(topic, suggestedFormat, relatedOpportunities),
      contentBrief: generateContentBriefWithFormat(topic, suggestedFormat, relatedOpportunities),
      suggestedFormat,
      targetKeywords,
      authorityLevel
    });
  }

  return topicClusters.sort((a, b) => b.opportunityScore - a.opportunityScore);
}

// Article format selection based on topic and authority level
function selectArticleFormat(
  topic: string,
  authorityLevel: 'foundation' | 'intermediate' | 'advanced',
  intent: string,
  opportunities: QueryOpportunity[]
): ArticleFormat {
  const formats: ArticleFormat[] = [
    {
      type: 'listicle',
      template: 'X Best/Top [Topic] for [Year]',
      wordCountRange: [1200, 2000]
    },
    {
      type: 'how-to',
      template: 'How to [Action] with [Topic]: Step-by-Step Guide',
      wordCountRange: [1500, 2500]
    },
    {
      type: 'guide',
      template: 'The Complete Guide to [Topic]',
      wordCountRange: [2000, 3500]
    },
    {
      type: 'faq',
      template: '[Topic] FAQ: Common Questions Answered',
      wordCountRange: [1000, 1800]
    },
    {
      type: 'comparison',
      template: '[Topic A] vs [Topic B]: Which is Better?',
      wordCountRange: [1500, 2200]
    },
    {
      type: 'update',
      template: '[Topic] in [Year]: Latest Updates and Trends',
      wordCountRange: [1200, 2000]
    },
    {
      type: 'case-study',
      template: 'How We [Achieved Result] with [Topic]',
      wordCountRange: [1800, 2800]
    },
    {
      type: 'beginner-guide',
      template: '[Topic] for Beginners: Everything You Need to Know',
      wordCountRange: [1500, 2500]
    }
  ];

  // Format selection logic based on signals
  const hasQuestionWords = opportunities.some(opp =>
    /^(what|how|why|when|where|which)\b/i.test(opp.query)
  );
  const hasComparison = opportunities.some(opp =>
    /\b(vs|versus|compare|best|top|better)\b/i.test(opp.query)
  );
  const hasBeginner = opportunities.some(opp =>
    /\b(beginner|start|basic|intro|learn)\b/i.test(opp.query)
  );
  const hasListWords = opportunities.some(opp =>
    /\b(best|top|list|examples|types)\b/i.test(opp.query)
  );

  // Select format based on signals
  if (hasBeginner && authorityLevel === 'foundation') {
    return formats.find(f => f.type === 'beginner-guide') || formats[0];
  } else if (hasListWords) {
    return formats.find(f => f.type === 'listicle') || formats[0];
  } else if (hasQuestionWords) {
    return Math.random() < 0.5 ?
      (formats.find(f => f.type === 'how-to') || formats[0]) :
      (formats.find(f => f.type === 'faq') || formats[0]);
  } else if (hasComparison) {
    return formats.find(f => f.type === 'comparison') || formats[0];
  } else if (authorityLevel === 'advanced') {
    return formats.find(f => f.type === 'guide') || formats[0];
  } else if (intent === 'commercial') {
    return formats.find(f => f.type === 'case-study') || formats[0];
  }

  // Rotate through formats for variety
  const varietyIndex = Math.floor(Math.random() * formats.length);
  return formats[varietyIndex];
}

// Step 4: Enhanced scoring for authority building
async function scoreAndRankTopicsForAuthority(
  clusters: TopicCluster[],
  context: any,
  targetCount: number
): Promise<TopicCluster[]> {
  // Enhanced scoring that considers authority building
  const scoredClusters = clusters.map(cluster => {
    let authorityScore = cluster.opportunityScore;

    // Boost score for authority building progression
    if (cluster.authorityLevel === 'foundation') authorityScore *= 1.3; // Build foundation first
    if (cluster.authorityLevel === 'intermediate') authorityScore *= 1.1;

    // Boost score for strategic keyword clusters
    if (cluster.targetKeywords.length > 1) authorityScore *= 1.2;

    return { ...cluster, authorityScore };
  });

  return scoredClusters
    .sort((a, b) => b.authorityScore - a.authorityScore)
    .slice(0, Math.max(targetCount * 2, 10)); // Give more options for variety selection
}

// Step 5: Select topics with format variety
async function selectTopicsWithFormatVariety(
  rankedTopics: TopicCluster[],
  targetCount: number
): Promise<TopicCluster[]> {
  const selectedTopics: TopicCluster[] = [];
  const usedFormats = new Set<string>();

  // First pass: Select one of each format type for variety
  for (const topic of rankedTopics) {
    if (selectedTopics.length >= targetCount) break;

    if (!usedFormats.has(topic.suggestedFormat.type)) {
      selectedTopics.push(topic);
      usedFormats.add(topic.suggestedFormat.type);
    }
  }

  // Second pass: Fill remaining slots with highest scoring topics
  for (const topic of rankedTopics) {
    if (selectedTopics.length >= targetCount) break;

    if (!selectedTopics.some(selected => selected.mainTopic === topic.mainTopic)) {
      selectedTopics.push(topic);
    }
  }

  return selectedTopics.slice(0, targetCount);
}

// Step 6: Generate enhanced content briefs with format details
async function generateEnhancedContentBriefs(topics: TopicCluster[], context: any) {
  return topics.map((topic, index) => ({
    priority: index + 1,
    title: topic.suggestedTitle,
    mainTopic: topic.mainTopic,
    targetQueries: topic.relatedQueries.slice(0, 5),
    targetKeywords: topic.targetKeywords,
    articleFormat: topic.suggestedFormat,
    authorityLevel: topic.authorityLevel,
    estimatedTrafficPotential: Math.floor(topic.totalImpressions * 0.03),
    currentPerformance: {
      totalImpressions: topic.totalImpressions,
      totalClicks: topic.totalClicks,
      averagePosition: Math.round(topic.averagePosition * 10) / 10,
      ctr: topic.totalImpressions > 0 ? Math.round((topic.totalClicks / topic.totalImpressions) * 1000) / 10 : 0
    },
    contentBrief: topic.contentBrief,
    recommendedLength: topic.suggestedFormat.wordCountRange[1],
    urgency: index < 3 ? 'high' : 'medium',
    reasoning: `${topic.authorityLevel.charAt(0).toUpperCase() + topic.authorityLevel.slice(1)} authority piece using ${topic.suggestedFormat.type} format. Opportunity score: ${Math.round(topic.opportunityScore)}.`,
    scheduledFor: null, // Will be set when added to queue
    status: 'draft' // Start as draft for user review
  }));
}

// Helper function to extract main topic from query
function extractMainTopic(query: string): string {
  // Remove common words and extract key terms
  const stopWords = ['how', 'to', 'what', 'is', 'are', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'for', 'with', 'by'];
  const words = query.toLowerCase().split(' ').filter(word => !stopWords.includes(word));

  // Find the most important 2-3 words
  if (words.length <= 2) return words.join(' ');
  if (words.length === 3) return words.join(' ');

  // For longer queries, take first 2-3 significant words
  return words.slice(0, 3).join(' ');
}

// Helper function to generate format-aware titles
function generateSuggestedTitleWithFormat(mainTopic: string, format: ArticleFormat, opportunities: QueryOpportunity[]): string {
  const topic = mainTopic.split(' ').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');

  const currentYear = new Date().getFullYear();

  switch (format.type) {
    case 'listicle':
      const listCount = Math.floor(Math.random() * 6) + 5; // 5-10 items
      return `${listCount} Best ${topic} Tools for ${currentYear}`;

    case 'how-to':
      const actionWord = opportunities.find(o => /\b(how to|create|build|make|do)\b/i.test(o.query))?.query
        .match(/how to (\w+)/i)?.[1] || 'master';
      return `How to ${actionWord.charAt(0).toUpperCase() + actionWord.slice(1)} ${topic}: Step-by-Step Guide`;

    case 'guide':
      return `The Complete Guide to ${topic} in ${currentYear}`;

    case 'faq':
      return `${topic}: Frequently Asked Questions (${currentYear} Edition)`;

    case 'comparison':
      return `${topic} Comparison: Which Solution is Right for You?`;

    case 'update':
      return `${topic} in ${currentYear}: Latest Updates and Best Practices`;

    case 'case-study':
      return `How We Improved Our ${topic} Results by 200%`;

    case 'beginner-guide':
      return `${topic} for Beginners: Everything You Need to Know`;

    default:
      return `The Ultimate Guide to ${topic}`;
  }
}

// Helper function to generate format-aware content briefs
function generateContentBriefWithFormat(mainTopic: string, format: ArticleFormat, opportunities: QueryOpportunity[]): string {
  const topQueries = opportunities.slice(0, 3).map(opp => opp.query);
  const baseDescription = `targeting "${mainTopic}" that addresses these key queries: ${topQueries.join(', ')}.`;

  switch (format.type) {
    case 'listicle':
      return `Create an engaging listicle ${baseDescription} Structure as numbered list with actionable items, include pros/cons, and provide clear recommendations for each item.`;

    case 'how-to':
      return `Create a comprehensive step-by-step tutorial ${baseDescription} Include detailed instructions, screenshots/examples, common pitfalls to avoid, and actionable tips.`;

    case 'guide':
      return `Create an authoritative, comprehensive guide ${baseDescription} Cover all aspects from basics to advanced, include expert insights, data/statistics, and practical examples.`;

    case 'faq':
      return `Create a thorough FAQ-style article ${baseDescription} Address common questions, provide detailed answers, and include troubleshooting tips.`;

    case 'comparison':
      return `Create a detailed comparison piece ${baseDescription} Include side-by-side analysis, pros/cons tables, pricing comparisons, and clear recommendations.`;

    case 'update':
      return `Create a timely update article ${baseDescription} Include latest trends, recent changes, new features, and future predictions with current data.`;

    case 'case-study':
      return `Create a compelling case study ${baseDescription} Include problem description, solution implementation, results with metrics, and lessons learned.`;

    case 'beginner-guide':
      return `Create a beginner-friendly guide ${baseDescription} Start with basics, define key terms, provide step-by-step progression, and include helpful resources.`;

    default:
      return `Create comprehensive content ${baseDescription} Focus on providing actionable insights and practical examples.`;
  }
}

// Original helper function (keeping for backward compatibility)
function generateSuggestedTitle(mainTopic: string, opportunities: QueryOpportunity[]): string {
  const topQuery = opportunities[0];
  const topic = mainTopic.split(' ').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');

  // Generate title based on opportunity type
  if (topQuery.opportunityType === 'underperforming_asset') {
    return `The Complete Guide to ${topic}`;
  } else if (topQuery.opportunityType === 'low_hanging_fruit') {
    return `${topic}: Everything You Need to Know`;
  } else if (topQuery.opportunityType === 'content_gap') {
    return `Ultimate ${topic} Guide for 2024`;
  } else {
    return `How to Master ${topic}: A Comprehensive Guide`;
  }
}

// Helper function to generate content brief
function generateContentBrief(mainTopic: string, opportunities: QueryOpportunity[]): string {
  const topQueries = opportunities.slice(0, 3).map(opp => opp.query);
  return `Create comprehensive content targeting "${mainTopic}" that addresses these key queries: ${topQueries.join(', ')}. Focus on providing actionable insights and practical examples. Include relevant statistics and case studies where appropriate.`;
}

// Fallback topic generation when GSC data is unavailable
async function generateFallbackTopics(domain: string, userToken: string, count: number = 3) {
  // Generate industry-generic topics with variety as fallback
  const baseTopics = [
    { topic: 'seo best practices', format: 'guide' as const },
    { topic: 'content marketing', format: 'how-to' as const },
    { topic: 'digital marketing strategy', format: 'listicle' as const },
    { topic: 'website optimization', format: 'faq' as const },
    { topic: 'social media marketing', format: 'beginner-guide' as const },
    { topic: 'email marketing', format: 'case-study' as const },
    { topic: 'conversion optimization', format: 'comparison' as const },
    { topic: 'analytics and tracking', format: 'update' as const }
  ];

  const fallbackTopics = baseTopics.slice(0, count).map((item, index) => ({
    priority: index + 1,
    title: generateFallbackTitle(item.topic, item.format, domain),
    mainTopic: item.topic,
    targetQueries: [`${item.topic} tips`, `${item.topic} guide`, `${item.topic} strategy`],
    targetKeywords: [item.topic],
    articleFormat: {
      type: item.format,
      template: `Template for ${item.format}`,
      wordCountRange: [1500, 2500] as [number, number]
    },
    authorityLevel: 'foundation' as const,
    estimatedTrafficPotential: 100,
    contentBrief: `Create comprehensive ${item.format} content about ${item.topic}. Include actionable tips and practical examples.`,
    recommendedLength: 2000,
    urgency: 'medium' as const,
    reasoning: 'Fallback topic - no GSC data available',
    scheduledFor: null,
    status: 'draft' as const
  }));

  return fallbackTopics;
}

function generateFallbackTitle(topic: string, format: string, domain: string): string {
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const currentYear = new Date().getFullYear();

  const formattedTopic = topic.split(' ').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');

  switch (format) {
    case 'guide': return `The Complete ${formattedTopic} Guide for ${cleanDomain}`;
    case 'how-to': return `How to Master ${formattedTopic} in ${currentYear}`;
    case 'listicle': return `10 Essential ${formattedTopic} Tips for ${currentYear}`;
    case 'faq': return `${formattedTopic} FAQ: Common Questions Answered`;
    case 'beginner-guide': return `${formattedTopic} for Beginners: Getting Started`;
    case 'case-study': return `How We Improved Our ${formattedTopic} Results`;
    case 'comparison': return `${formattedTopic} Tools: Comparing Your Options`;
    case 'update': return `${formattedTopic} Trends and Updates for ${currentYear}`;
    default: return `Ultimate Guide to ${formattedTopic}`;
  }
}