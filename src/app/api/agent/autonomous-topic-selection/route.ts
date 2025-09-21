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
    const { userToken, websiteToken, domain, analysisType = 'comprehensive' } = await request.json();

    if (!userToken || !domain) {
      return NextResponse.json(
        { success: false, error: 'User token and domain are required' },
        { status: 400 }
      );
    }

    console.log('[AUTONOMOUS TOPIC] Starting analysis for:', { domain, analysisType });

    // Step 1: Fetch GSC Data for Analysis
    const gscData = await fetchGSCDataForAnalysis(userToken, domain);

    if (!gscData.success) {
      return NextResponse.json({
        success: false,
        error: gscData.error || 'Failed to fetch GSC data',
        fallback: await generateFallbackTopics(domain, userToken)
      });
    }

    // Step 2: Identify Query Opportunities (Investor Approach)
    const opportunities = await identifyQueryOpportunities(gscData.queries || []);

    // Step 3: Cluster Related Topics
    const topicClusters = await clusterTopicOpportunities(opportunities);

    // Step 4: Score and Rank Topics
    const rankedTopics = await scoreAndRankTopics(topicClusters, gscData.context || {});

    // Step 5: Select Top 3 Topics for Weekly Content
    const selectedTopics = rankedTopics.slice(0, 3);

    // Step 6: Generate Content Briefs
    const contentBriefs = await generateContentBriefs(selectedTopics, gscData.context || {});

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

// Step 3: Cluster related topics
async function clusterTopicOpportunities(opportunities: QueryOpportunity[]): Promise<TopicCluster[]> {
  const clusters = new Map<string, QueryOpportunity[]>();

  // Simple clustering by common keywords/phrases
  for (const opportunity of opportunities) {
    const mainTopic = extractMainTopic(opportunity.query);

    if (!clusters.has(mainTopic)) {
      clusters.set(mainTopic, []);
    }
    clusters.get(mainTopic)!.push(opportunity);
  }

  // Convert to topic clusters with aggregated metrics
  const topicClusters: TopicCluster[] = [];

  for (const [topic, relatedOpportunities] of Array.from(clusters.entries())) {
    if (relatedOpportunities.length === 0) continue;

    const totalImpressions = relatedOpportunities.reduce((sum, opp) => sum + opp.impressions, 0);
    const totalClicks = relatedOpportunities.reduce((sum, opp) => sum + opp.clicks, 0);
    const averagePosition = relatedOpportunities.reduce((sum, opp) => sum + opp.position, 0) / relatedOpportunities.length;
    const opportunityScore = relatedOpportunities.reduce((sum, opp) => sum + opp.opportunityScore, 0);

    topicClusters.push({
      mainTopic: topic,
      relatedQueries: relatedOpportunities.map(opp => opp.query),
      totalImpressions,
      totalClicks,
      averagePosition,
      opportunityScore,
      suggestedTitle: generateSuggestedTitle(topic, relatedOpportunities),
      contentBrief: generateContentBrief(topic, relatedOpportunities)
    });
  }

  return topicClusters.sort((a, b) => b.opportunityScore - a.opportunityScore);
}

// Step 4: Score and rank topics
async function scoreAndRankTopics(clusters: TopicCluster[], context: any): Promise<TopicCluster[]> {
  // Already sorted by opportunity score in clusterTopicOpportunities
  return clusters.slice(0, 10); // Top 10 clusters
}

// Step 5: Generate detailed content briefs
async function generateContentBriefs(topics: TopicCluster[], context: any) {
  return topics.map((topic, index) => ({
    priority: index + 1,
    title: topic.suggestedTitle,
    mainTopic: topic.mainTopic,
    targetQueries: topic.relatedQueries.slice(0, 5), // Top 5 related queries
    estimatedTrafficPotential: Math.floor(topic.totalImpressions * 0.03), // 3% capture rate
    currentPerformance: {
      totalImpressions: topic.totalImpressions,
      totalClicks: topic.totalClicks,
      averagePosition: Math.round(topic.averagePosition * 10) / 10,
      ctr: topic.totalImpressions > 0 ? Math.round((topic.totalClicks / topic.totalImpressions) * 1000) / 10 : 0
    },
    contentBrief: topic.contentBrief,
    recommendedLength: topic.totalImpressions > 500 ? 2000 : 1500,
    urgency: index < 3 ? 'high' : 'medium',
    reasoning: `Opportunity score: ${Math.round(topic.opportunityScore)}. This topic cluster shows strong search demand with room for improvement.`
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

// Helper function to generate suggested title
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
async function generateFallbackTopics(domain: string, userToken: string) {
  // Generate industry-generic topics as fallback
  const fallbackTopics = [
    {
      priority: 1,
      title: `SEO Best Practices for ${domain.replace(/^https?:\/\//, '').replace(/\/$/, '')}`,
      mainTopic: 'seo best practices',
      targetQueries: ['seo tips', 'search engine optimization', 'seo guide'],
      estimatedTrafficPotential: 100,
      contentBrief: 'Create a comprehensive guide covering modern SEO best practices.',
      urgency: 'medium',
      reasoning: 'Fallback topic - no GSC data available'
    }
  ];

  return fallbackTopics;
}