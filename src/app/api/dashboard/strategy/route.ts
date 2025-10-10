import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const domain = searchParams.get('domain');

    if (!userToken || !domain) {
      return NextResponse.json({ error: 'User token and domain required' }, { status: 400 });
    }

    console.log('[STRATEGY DASHBOARD] Fetching strategy data for:', { domain });

    // Initialize strategy data
    let strategyData = {
      keywords: {
        tracked: 0,
        clusters: 0,
        opportunities: 0,
        topKeywords: [] as any[],
        status: 'no_data' as string
      },
      opportunities: {
        quickWins: 0,
        contentGaps: 0,
        technicalIssues: 0,
        items: [] as any[],
        status: 'no_data' as string
      },
      hasData: false,
      lastUpdated: new Date(),
      message: 'Connect Google Search Console to unlock keyword strategy insights'
    };

    try {
      // Check for GSC performance data that contains keyword information
      const cleanDomain = domain.replace(/^sc-domain:/, '').replace(/^https?:\/\//, '').replace(/\/$/, '');
      
      // Get GSC connection and property
      const { data: gscConnection } = await supabase
        .from('gsc_connections')
        .select('id')
        .eq('user_token', userToken)
        .eq('is_active', true)
        .single();

      if (gscConnection) {
        // Try to find GSC property
        const domainVariants = [
          domain,
          `sc-domain:${domain}`,
          `sc-domain:${cleanDomain}`,
          cleanDomain
        ];

        let property = null;
        for (const variant of domainVariants) {
          const { data } = await supabase
            .from('gsc_properties')
            .select('id')
            .eq('connection_id', gscConnection.id)
            .eq('site_url', variant)
            .eq('is_active', true)
            .single();
          
          if (data) {
            property = data;
            break;
          }
        }

        if (property) {
          // Get recent performance data to extract keyword insights
          const { data: performanceData } = await supabase
            .from('gsc_performance_data')
            .select('queries, total_impressions, total_clicks')
            .eq('property_id', property.id)
            .eq('user_token', userToken)
            .order('date_end', { ascending: false })
            .limit(5);

          if (performanceData && performanceData.length > 0) {
            strategyData.hasData = true;
            strategyData.message = 'Strategy insights based on Google Search Console data';

            // Process keyword data from GSC queries
            const allQueries = new Map();
            performanceData.forEach(data => {
              if (data.queries && Array.isArray(data.queries)) {
                data.queries.forEach((query: any) => {
                  const key = query.query;
                  if (!allQueries.has(key)) {
                    allQueries.set(key, {
                      keyword: key,
                      impressions: 0,
                      clicks: 0,
                      position: query.position || 0
                    });
                  }
                  const existing = allQueries.get(key);
                  existing.impressions += query.impressions || 0;
                  existing.clicks += query.clicks || 0;
                });
              }
            });

            const keywordList = Array.from(allQueries.values())
              .sort((a, b) => b.impressions - a.impressions)
              .slice(0, 20);

            strategyData.keywords = {
              tracked: keywordList.length,
              clusters: Math.ceil(keywordList.length / 5), // Rough clustering
              opportunities: keywordList.filter(k => k.position > 10 && k.impressions > 100).length,
              topKeywords: keywordList.slice(0, 10),
              status: keywordList.length > 0 ? 'good' : 'no_data'
            };

            // Generate opportunities based on keyword data
            const quickWins = keywordList.filter(k => k.position > 3 && k.position <= 10 && k.impressions > 50);
            const contentGaps = keywordList.filter(k => k.position > 20 && k.impressions > 100);
            
            strategyData.opportunities = {
              quickWins: quickWins.length,
              contentGaps: contentGaps.length,
              technicalIssues: 0, // Would need technical SEO data integration
              items: [
                ...quickWins.slice(0, 3).map(k => ({
                  type: 'quick_win',
                  title: `Optimize for "${k.keyword}"`,
                  description: `Currently ranking #${Math.round(k.position)} with ${k.impressions} impressions`,
                  priority: 'high'
                })),
                ...contentGaps.slice(0, 2).map(k => ({
                  type: 'content_gap',
                  title: `Create content for "${k.keyword}"`,
                  description: `High search volume (${k.impressions} impressions) but ranking below #20`,
                  priority: 'medium'
                }))
              ].slice(0, 5),
              status: (quickWins.length + contentGaps.length) > 0 ? 'good' : 'no_data'
            };
          }
        }
      }
    } catch (error) {
      console.log('[STRATEGY DASHBOARD] Error processing GSC data:', error);
    }

    // Also incorporate tracked keywords from our own strategy tables so users can add via chat
    try {
      const cleanDomain = domain.replace(/^sc-domain:/, '').replace(/^https?:\/\//, '').replace(/\/$/, '');

      // Resolve website_token from domain
      const { data: website } = await supabase
        .from('websites')
        .select('website_token, domain, cleaned_domain')
        .eq('user_token', userToken)
        .or(`domain.eq.${domain},domain.eq.${cleanDomain},cleaned_domain.eq.${cleanDomain}`)
        .single();

      if (website?.website_token) {
        const websiteToken = website.website_token;

        // Fetch tracked keywords and topic clusters from NEW Master Discovery system
        const { data: keywords } = await supabase
          .from('website_keywords')
          .select('keyword, keyword_type, topic_cluster')
          .eq('website_token', websiteToken);

        // Query NEW topic_clusters table (from Master Discovery)
        const { data: topicClusters } = await supabase
          .from('topic_clusters')
          .select('cluster_name, primary_keyword, secondary_keywords, pillar_count, supporting_count')
          .eq('website_token', websiteToken)
          .order('created_at', { ascending: true });

        // Query article_roles table to see how many articles are planned
        const { data: articleRoles } = await supabase
          .from('article_roles')
          .select('id, title, role, cluster, primary_keyword')
          .eq('website_token', websiteToken);

        // Prefer new topic_clusters data if available
        if (topicClusters && topicClusters.length > 0) {
          const totalKeywords = topicClusters.reduce((sum, cluster) =>
            sum + 1 + (cluster.secondary_keywords?.length || 0), 0
          );
          const totalArticles = articleRoles?.length || 0;
          const pillarArticles = articleRoles?.filter(a => a.role === 'PILLAR').length || 0;
          const supportingArticles = articleRoles?.filter(a => a.role === 'SUPPORTING').length || 0;

          strategyData.keywords = {
            tracked: totalKeywords,
            clusters: topicClusters.length,
            opportunities: totalArticles,
            topKeywords: topicClusters.map(c => ({
              keyword: c.primary_keyword,
              cluster: c.cluster_name,
              impressions: 0
            })),
            status: 'good'
          };

          strategyData.opportunities = {
            quickWins: pillarArticles,
            contentGaps: supportingArticles,
            technicalIssues: 0,
            items: topicClusters.slice(0, 5).map(c => ({
              type: 'cluster',
              title: c.cluster_name,
              description: `${c.pillar_count || 0} pillar + ${c.supporting_count || 0} supporting articles planned`,
              priority: 'high'
            })),
            status: 'good'
          };

          strategyData.hasData = true;
          strategyData.message = `Strategy initialized with ${topicClusters.length} topic clusters and ${totalArticles} articles planned`;
        } else if (keywords && keywords.length > 0) {
          // Fallback to old keyword tracking system
          const clusterSet = new Set<string>();
          const keywordsByCluster: Record<string, number> = {};
          (keywords || []).forEach(k => {
            const cluster = k.topic_cluster || 'uncategorized';
            clusterSet.add(cluster);
            keywordsByCluster[cluster] = (keywordsByCluster[cluster] || 0) + 1;
          });

          const contentGaps = 0; // No way to calculate without cluster content

          // Update keywords card to reflect tracked keywords
          strategyData.keywords = {
            tracked: keywords.length,
            clusters: clusterSet.size,
            opportunities: contentGaps,
            topKeywords: keywords.slice(0, 10).map(k => ({ keyword: k.keyword, impressions: 0 })),
            status: 'good'
          };

          // Update opportunities card with simple counts from tracked keywords
          strategyData.opportunities = {
            quickWins: (keywords || []).filter(k => (k.keyword_type || 'long_tail') === 'secondary').length,
            contentGaps: contentGaps,
            technicalIssues: strategyData.opportunities.technicalIssues || 0,
            items: (keywords || []).slice(0, 5).map(k => ({
              type: 'quick_win',
              title: `Track "${k.keyword}" in ${k.topic_cluster || 'uncategorized'}`,
              description: `Keyword type: ${k.keyword_type || 'long_tail'}`,
              priority: 'medium'
            })),
            status: 'good'
          };

          strategyData.hasData = true;
          if (!strategyData.message || strategyData.message.includes('Google Search Console')) {
            strategyData.message = 'Strategy reflects your tracked keywords and clusters';
          }
        }
      }
    } catch (error) {
      console.log('[STRATEGY DASHBOARD] Error incorporating tracked keywords:', error);
    }

    return NextResponse.json({
      success: true,
      data: strategyData
    });

  } catch (error) {
    console.error('[STRATEGY DASHBOARD] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
