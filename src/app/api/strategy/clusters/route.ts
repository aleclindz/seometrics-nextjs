/**
 * GET /api/strategy/clusters?websiteToken=xxx&clusterId=xxx (optional)
 *
 * Returns topic clusters for a website, with optional filtering by cluster ID
 * If clusterId is provided, includes full article list for that cluster
 *
 * Response:
 * {
 *   clusters: Array<{
 *     id: number
 *     clusterName: string
 *     primaryKeyword: string
 *     secondaryKeywords: string[]
 *     notes?: string
 *     pillarCount: number
 *     supportingCount: number
 *     totalArticles: number
 *     articles?: Array<...> // Only if clusterId is specified
 *   }>
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getWebsiteClusters,
  getClusterArticles
} from '@/services/strategy/discovery-persistence';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const websiteToken = searchParams.get('websiteToken');
    const clusterIdParam = searchParams.get('clusterId');

    if (!websiteToken) {
      return NextResponse.json(
        { error: 'Missing websiteToken parameter' },
        { status: 400 }
      );
    }

    const clusters = await getWebsiteClusters(websiteToken);

    if (!clusters || clusters.length === 0) {
      return NextResponse.json({ clusters: [] });
    }

    // If clusterId is specified, fetch articles for that cluster
    if (clusterIdParam) {
      const clusterId = parseInt(clusterIdParam, 10);
      const articles = await getClusterArticles(websiteToken, clusterId);

      // Find the requested cluster and add articles
      const enrichedClusters = clusters.map(cluster => {
        if (cluster.cluster_id === clusterId) {
          return {
            ...formatCluster(cluster),
            articles: articles.map(formatArticle)
          };
        }
        return formatCluster(cluster);
      });

      return NextResponse.json({ clusters: enrichedClusters });
    }

    // Return clusters without article details
    return NextResponse.json({
      clusters: clusters.map(formatCluster)
    });

  } catch (error) {
    console.error('[STRATEGY CLUSTERS API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch clusters',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function formatCluster(cluster: any) {
  return {
    id: cluster.cluster_id,
    clusterName: cluster.cluster_name,
    primaryKeyword: cluster.primary_keyword,
    secondaryKeywords: cluster.secondary_keywords,
    notes: cluster.notes,
    pillarCount: cluster.pillar_count || 0,
    supportingCount: cluster.supporting_count || 0,
    totalArticles: cluster.total_articles || 0,
    createdAt: cluster.created_at,
    updatedAt: cluster.updated_at
  };
}

function formatArticle(article: any) {
  return {
    id: article.id,
    discoveryArticleId: article.discovery_article_id,
    role: article.role,
    title: article.title,
    primaryKeyword: article.primary_keyword,
    secondaryKeywords: article.secondary_keywords,
    linksTo: article.links_to_article_ids,
    sectionMap: article.section_map,
    articleBriefId: article.article_brief_id,
    articleQueueId: article.article_queue_id,
    createdAt: article.created_at
  };
}
