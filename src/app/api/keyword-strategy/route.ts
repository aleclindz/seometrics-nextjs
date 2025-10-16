import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const websiteToken = searchParams.get('websiteToken');
    const domain = searchParams.get('domain');

    if (!userToken) {
      return NextResponse.json({ error: 'User token is required' }, { status: 401 });
    }

    console.log('[KEYWORD STRATEGY] Getting keyword strategy for user:', userToken);

    // If websiteToken provided, get strategy for specific website
    if (websiteToken) {
      return await getWebsiteKeywordStrategy(userToken, websiteToken);
    }

    // If domain provided, find website by domain first
    if (domain) {
      console.log('[KEYWORD STRATEGY GET] Looking up website by domain:', domain);

      const { data: website, error: websiteError } = await supabase
        .from('websites')
        .select('website_token, domain, cleaned_domain')
        .eq('user_token', userToken)
        .or(`domain.eq.${domain},cleaned_domain.eq.${domain}`)
        .single();

      console.log('[KEYWORD STRATEGY GET] Found website:', { website_token: website?.website_token, domain: website?.domain, cleaned_domain: website?.cleaned_domain });

      if (websiteError || !website) {
        return NextResponse.json({
          error: 'Website not found',
          hasStrategy: false,
          keywords: [],
          topicClusters: []
        }, { status: 404 });
      }

      return await getWebsiteKeywordStrategy(userToken, website.website_token);
    }

    // Get strategy for all user's websites
    const { data: websites, error: websitesError } = await supabase
      .from('websites')
      .select('website_token, domain, cleaned_domain')
      .eq('user_token', userToken)
      .eq('is_managed', true);

    if (websitesError) {
      console.error('[KEYWORD STRATEGY] Error fetching websites:', websitesError);
      return NextResponse.json({ error: 'Failed to fetch websites' }, { status: 500 });
    }

    const strategiesByWebsite = [];
    for (const website of websites || []) {
      const strategy = await getWebsiteKeywordStrategy(userToken, website.website_token, false) as any;
      if (strategy && typeof strategy === 'object' && !strategy.error) {
        strategiesByWebsite.push({
          website_token: website.website_token,
          domain: website.cleaned_domain || website.domain,
          ...strategy
        });
      }
    }

    return NextResponse.json({
      success: true,
      strategies: strategiesByWebsite
    });

  } catch (error) {
    console.error('[KEYWORD STRATEGY] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userToken, websiteToken, domain, keywords, topicClusters } = body;

    if (!userToken) {
      return NextResponse.json({ error: 'User token is required' }, { status: 401 });
    }

    console.log('[KEYWORD STRATEGY] Updating keyword strategy for user:', userToken);

    // Find website token if domain provided instead
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

    // Verify user owns this website
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('website_token')
      .eq('website_token', targetWebsiteToken)
      .eq('user_token', userToken)
      .single();

    if (websiteError || !website) {
      return NextResponse.json({ error: 'Website not found or access denied' }, { status: 404 });
    }

    // Resolve existing clusters for consolidation
    let existingClusterNames: string[] = [];
    try {
      const { data: existingKw } = await supabase
        .from('website_keywords')
        .select('topic_cluster')
        .eq('website_token', targetWebsiteToken)
        .not('topic_cluster', 'is', null);
      const { data: existingContent } = await supabase
        .from('topic_cluster_content')
        .select('topic_cluster')
        .eq('website_token', targetWebsiteToken);
      const combined: string[] = [];
      (existingKw || []).forEach((k: any) => { if (k?.topic_cluster) combined.push(k.topic_cluster); });
      (existingContent || []).forEach((c: any) => { if (c?.topic_cluster) combined.push(c.topic_cluster); });
      const seen: Record<string, boolean> = {};
      const unique: string[] = [];
      for (let i = 0; i < combined.length; i++) {
        const name = combined[i];
        if (!seen[name]) { seen[name] = true; unique.push(name); }
      }
      existingClusterNames = unique;
    } catch {}

    const norm = (s?: string) => (s || '').trim().toLowerCase();
    const canonicalMap = new Map<string, string>();
    for (const name of existingClusterNames) {
      canonicalMap.set(norm(name), name);
    }

    // Count incoming clusters in this batch
    const incomingCounts: Record<string, number> = {};
    (keywords || []).forEach((k: any) => {
      const n = norm(k.topic_cluster);
      if (!n) return;
      incomingCounts[n] = (incomingCounts[n] || 0) + 1;
    });

    // Process keywords if provided
    if (keywords && Array.isArray(keywords)) {
      for (const keywordData of keywords) {
        const { keyword, keyword_type } = keywordData;
        let topic_cluster = keywordData.topic_cluster;
        
        if (!keyword || !keyword_type) {
          continue; // Skip invalid entries
        }

        // Consolidate cluster names to avoid fragmentation
        if (topic_cluster) {
          const n = norm(topic_cluster);
          if (canonicalMap.has(n)) {
            // Use canonical existing cluster name
            topic_cluster = canonicalMap.get(n) as string;
          } else {
            // If this is a singleton suggestion, don't create a new noisy cluster
            if ((incomingCounts[n] || 0) <= 1) {
              topic_cluster = null as any; // stored as NULL -> 'uncategorized'
            } else {
              // Allow creating a new cluster for multiple keywords; remember canonical
              canonicalMap.set(n, topic_cluster);
            }
          }
        }

        // Upsert keyword
        const { error: keywordError } = await supabase
          .from('website_keywords')
          .upsert({
            website_token: targetWebsiteToken,
            keyword: keyword.toLowerCase().trim(),
            keyword_type,
            topic_cluster: topic_cluster || null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'website_token,keyword'
          });

        if (keywordError) {
          console.error('[KEYWORD STRATEGY] Error upserting keyword:', keywordError);
        }
      }
    }

    // Process topic clusters if provided  
    if (topicClusters && Array.isArray(topicClusters)) {
      for (const clusterData of topicClusters) {
        const { topic_cluster, article_title, article_url, primary_keyword } = clusterData;
        
        if (!topic_cluster) {
          continue;
        }

        // Add to topic cluster content if article info provided
        if (article_title) {
          const { error: clusterError } = await supabase
            .from('topic_cluster_content')
            .upsert({
              website_token: targetWebsiteToken,
              topic_cluster,
              article_title,
              article_url: article_url || null,
              primary_keyword: primary_keyword || null,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'website_token,topic_cluster,article_title'
            });

          if (clusterError) {
            console.error('[KEYWORD STRATEGY] Error upserting cluster content:', clusterError);
          }
        }
      }
    }

    // Return updated strategy
    const updatedStrategy = await getWebsiteKeywordStrategy(userToken, targetWebsiteToken);
    
    return NextResponse.json({
      success: true,
      message: 'Keyword strategy updated successfully',
      strategy: updatedStrategy
    });

  } catch (error) {
    console.error('[KEYWORD STRATEGY] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const websiteToken = searchParams.get('websiteToken');
    const keyword = searchParams.get('keyword');
    const topicCluster = searchParams.get('topicCluster');

    if (!userToken || !websiteToken) {
      return NextResponse.json({ error: 'User token and website token are required' }, { status: 400 });
    }

    // Verify user owns this website
    console.log('[KEYWORD STRATEGY DELETE] Validating access:', { userToken, websiteToken });

    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('website_token, domain, cleaned_domain')
      .eq('website_token', websiteToken)
      .eq('user_token', userToken)
      .single();

    console.log('[KEYWORD STRATEGY DELETE] Website validation result:', {
      found: !!website,
      website_token: website?.website_token,
      domain: website?.domain,
      error: websiteError?.message
    });

    if (websiteError || !website) {
      return NextResponse.json({ error: 'Website not found or access denied' }, { status: 404 });
    }

    if (keyword) {
      // Delete specific keyword
      const normalizedKeyword = keyword.toLowerCase().trim();
      console.log('[KEYWORD STRATEGY DELETE] Deleting keyword:', {
        keyword,
        normalizedKeyword,
        websiteToken,
        userToken
      });

      // First, check what keywords actually exist for debugging
      const { data: existingKeywords } = await supabase
        .from('website_keywords')
        .select('keyword')
        .eq('website_token', websiteToken)
        .limit(20);

      console.log('[KEYWORD STRATEGY DELETE] Existing keywords in DB:', existingKeywords?.map(k => k.keyword));

      const { data: deletedData, error: deleteError } = await supabase
        .from('website_keywords')
        .delete()
        .eq('website_token', websiteToken)
        .eq('keyword', normalizedKeyword)
        .select();

      console.log('[KEYWORD STRATEGY DELETE] Delete result:', {
        deletedData,
        deleteError,
        deletedCount: deletedData?.length || 0
      });

      if (deleteError) {
        console.error('[KEYWORD STRATEGY] Error deleting keyword:', deleteError);
        return NextResponse.json({ error: 'Failed to delete keyword', details: deleteError.message }, { status: 500 });
      }

      if (!deletedData || deletedData.length === 0) {
        console.warn('[KEYWORD STRATEGY DELETE] No keyword found to delete:', normalizedKeyword);
        return NextResponse.json({ error: 'Keyword not found', keyword: normalizedKeyword }, { status: 404 });
      }

      console.log('[KEYWORD STRATEGY DELETE] Successfully deleted keyword:', normalizedKeyword);
      return NextResponse.json({ success: true, message: 'Keyword deleted successfully', deletedCount: deletedData.length });
    }

    if (topicCluster) {
      console.log('[KEYWORD STRATEGY DELETE] Deleting topic cluster:', topicCluster);

      // PRIORITY 1: Check if Master Discovery tables have this cluster
      const { data: masterCluster } = await supabase
        .from('topic_clusters')
        .select('id')
        .eq('website_token', websiteToken)
        .ilike('cluster_name', topicCluster)
        .maybeSingle();

      console.log('[KEYWORD STRATEGY DELETE] Master Discovery cluster found:', !!masterCluster);

      if (masterCluster) {
        // Delete from Master Discovery tables
        console.log('[KEYWORD STRATEGY DELETE] Deleting from Master Discovery tables, cluster ID:', masterCluster.id);

        let deleteClustersError: any = null;
        let deleteArticlesError: any = null;

        // Delete articles associated with this cluster (using topic_cluster_id, not cluster column)
        try {
          const delArticles = await supabase
            .from('article_roles')
            .delete()
            .eq('website_token', websiteToken)
            .eq('topic_cluster_id', masterCluster.id);
          deleteArticlesError = (delArticles as any)?.error || null;
          console.log('[KEYWORD STRATEGY DELETE] Deleted articles from cluster:', delArticles);
        } catch (e) {
          deleteArticlesError = e;
          console.error('[KEYWORD STRATEGY DELETE] Error deleting articles:', e);
        }

        // Delete the cluster itself
        try {
          const delCluster = await supabase
            .from('topic_clusters')
            .delete()
            .eq('website_token', websiteToken)
            .ilike('cluster_name', topicCluster);
          deleteClustersError = (delCluster as any)?.error || null;
          console.log('[KEYWORD STRATEGY DELETE] Deleted cluster:', delCluster);
        } catch (e) {
          deleteClustersError = e;
          console.error('[KEYWORD STRATEGY DELETE] Error deleting cluster:', e);
        }

        // Don't fail if article deletion has errors - cluster might not have articles yet
        if (deleteClustersError) {
          console.error('[KEYWORD STRATEGY DELETE] Error deleting cluster:', deleteClustersError);
          return NextResponse.json({ error: 'Failed to delete topic cluster' }, { status: 500 });
        }

        if (deleteArticlesError) {
          console.warn('[KEYWORD STRATEGY DELETE] Warning: Error deleting articles, but cluster deleted:', deleteArticlesError);
        }

        console.log('[KEYWORD STRATEGY DELETE] Successfully deleted cluster from Master Discovery tables');
        return NextResponse.json({ success: true, message: 'Topic cluster deleted successfully' });
      }

      // FALLBACK: Delete from old legacy tables
      console.log('[KEYWORD STRATEGY DELETE] No Master Discovery data - deleting from legacy tables');

      let deleteKeywordsError: any = null;
      let deleteContentError: any = null;
      try {
        const delKw = await supabase
          .from('website_keywords')
          .delete()
          .eq('website_token', websiteToken)
          .ilike('topic_cluster', topicCluster);
        deleteKeywordsError = (delKw as any)?.error || null;
      } catch (e) { deleteKeywordsError = e; }

      try {
        const delCt = await supabase
          .from('topic_cluster_content')
          .delete()
          .eq('website_token', websiteToken)
          .ilike('topic_cluster', topicCluster);
        deleteContentError = (delCt as any)?.error || null;
      } catch (e) { deleteContentError = e; }

      if (deleteKeywordsError || deleteContentError) {
        console.error('[KEYWORD STRATEGY] Error deleting topic cluster from legacy tables:', { deleteKeywordsError, deleteContentError });
        return NextResponse.json({ error: 'Failed to delete topic cluster' }, { status: 500 });
      }

      console.log('[KEYWORD STRATEGY DELETE] Successfully deleted cluster from legacy tables');
      return NextResponse.json({ success: true, message: 'Topic cluster deleted successfully' });
    }

    return NextResponse.json({ error: 'Either keyword or topicCluster parameter is required' }, { status: 400 });

  } catch (error) {
    console.error('[KEYWORD STRATEGY] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to get keyword strategy for a specific website
async function getWebsiteKeywordStrategy(userToken: string, websiteToken: string, returnResponse = true): Promise<NextResponse | any> {
  try {
    console.log('[KEYWORD STRATEGY] Getting strategy for website_token:', websiteToken);

    // PRIORITY 1: Check for NEW Master Discovery tables first
    const { data: masterClusters } = await supabase
      .from('topic_clusters')
      .select('*')
      .eq('website_token', websiteToken)
      .order('created_at', { ascending: true });

    const { data: masterArticles } = await supabase
      .from('article_roles')
      .select('*')
      .eq('website_token', websiteToken)
      .order('created_at', { ascending: true });

    console.log('[KEYWORD STRATEGY] Master Discovery data:', {
      clusters: masterClusters?.length || 0,
      articles: masterArticles?.length || 0
    });

    // If Master Discovery data exists, use that exclusively
    if (masterClusters && masterClusters.length > 0) {
      console.log('[KEYWORD STRATEGY] Using Master Discovery data');

      const topicClusters = masterClusters.map((cluster: any) => {
        // Extract all keywords from cluster
        const allKeywords = [
          { keyword: cluster.primary_keyword, keyword_type: 'primary' },
          ...(cluster.secondary_keywords || []).map((kw: string) => ({
            keyword: kw,
            keyword_type: 'secondary'
          }))
        ];

        // Find articles for this cluster
        const clusterArticles = (masterArticles || []).filter(
          (article: any) => article.cluster === cluster.cluster_name
        );

        return {
          name: cluster.cluster_name,
          keywords: allKeywords,
          content: clusterArticles.map((article: any) => ({
            article_title: article.title,
            primary_keyword: article.primary_keyword,
            role: article.role
          })),
          internal_links: [],
          description: cluster.notes || ''
        };
      });

      const allKeywords = masterClusters.flatMap((cluster: any) => [
        { keyword: cluster.primary_keyword, keyword_type: 'primary' },
        ...(cluster.secondary_keywords || []).map((kw: string) => ({
          keyword: kw,
          keyword_type: 'secondary'
        }))
      ]);

      const strategy = {
        hasStrategy: true,
        keywords: allKeywords,
        topicClusters,
        totalKeywords: allKeywords.length,
        primaryKeywords: masterClusters.length,
        secondaryKeywords: masterClusters.reduce((sum: number, c: any) =>
          sum + (c.secondary_keywords?.length || 0), 0
        ),
        longTailKeywords: 0,
        totalClusters: masterClusters.length,
        totalContent: masterArticles?.length || 0,
        totalInternalLinks: 0
      };

      if (returnResponse) {
        return NextResponse.json({
          success: true,
          ...strategy
        });
      }

      return strategy;
    }

    // FALLBACK: Use OLD tables if no Master Discovery data
    console.log('[KEYWORD STRATEGY] Falling back to legacy tables');

    // Get all keywords for this website
    const { data: keywords, error: keywordsError } = await supabase
      .from('website_keywords')
      .select('*')
      .eq('website_token', websiteToken)
      .order('created_at', { ascending: true });

    console.log('[KEYWORD STRATEGY] Found keywords count:', keywords?.length || 0);

    if (keywordsError) {
      console.error('[KEYWORD STRATEGY] Error fetching keywords:', keywordsError);
      if (returnResponse) {
        return NextResponse.json({ error: 'Failed to fetch keywords' }, { status: 500 });
      }
      return null;
    }

    // Get all topic cluster content
    const { data: clusterContent, error: clusterError } = await supabase
      .from('topic_cluster_content')
      .select('*')
      .eq('website_token', websiteToken)
      .order('created_at', { ascending: true });

    if (clusterError) {
      console.error('[KEYWORD STRATEGY] Error fetching cluster content:', clusterError);
      if (returnResponse) {
        return NextResponse.json({ error: 'Failed to fetch cluster content' }, { status: 500 });
      }
      return null;
    }

    // Get internal links for this website
    const { data: internalLinks, error: linksError } = await supabase
      .from('internal_links')
      .select('*')
      .eq('website_token', websiteToken)
      .order('created_at', { ascending: false });

    if (linksError) {
      console.error('[KEYWORD STRATEGY] Error fetching internal links:', linksError);
      // Don't fail on this, just log and continue
    }

    // Organize data by topic clusters
    const topicClusters: { [key: string]: any } = {};

    // Group keywords by topic cluster
    (keywords || []).forEach((keyword: any) => {
      const cluster = keyword.topic_cluster || 'uncategorized';
      if (!topicClusters[cluster]) {
        topicClusters[cluster] = {
          name: cluster,
          keywords: [],
          content: [],
          internal_links: []
        };
      }
      topicClusters[cluster].keywords.push(keyword);
    });

    // Add content to clusters
    (clusterContent || []).forEach((content: any) => {
      const cluster = content.topic_cluster;
      if (!topicClusters[cluster]) {
        topicClusters[cluster] = {
          name: cluster,
          keywords: [],
          content: [],
          internal_links: []
        };
      }
      topicClusters[cluster].content.push(content);
    });

    // Add internal links to clusters
    (internalLinks || []).forEach((link: any) => {
      if (link.topic_cluster) {
        const cluster = link.topic_cluster;
        if (topicClusters[cluster]) {
          topicClusters[cluster].internal_links.push(link);
        }
      }
    });

    const strategy = {
      hasStrategy: (keywords && keywords.length > 0) || (clusterContent && clusterContent.length > 0),
      keywords: keywords || [],
      topicClusters: Object.values(topicClusters),
      totalKeywords: keywords ? keywords.length : 0,
      primaryKeywords: keywords ? keywords.filter(k => k.keyword_type === 'primary').length : 0,
      secondaryKeywords: keywords ? keywords.filter(k => k.keyword_type === 'secondary').length : 0,
      longTailKeywords: keywords ? keywords.filter(k => k.keyword_type === 'long_tail').length : 0,
      totalClusters: Object.keys(topicClusters).length,
      totalContent: clusterContent ? clusterContent.length : 0,
      totalInternalLinks: internalLinks ? internalLinks.length : 0
    };

    if (returnResponse) {
      return NextResponse.json({
        success: true,
        ...strategy
      });
    }

    return strategy;

  } catch (error) {
    console.error('[KEYWORD STRATEGY] Error in getWebsiteKeywordStrategy:', error);
    if (returnResponse) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
    return null;
  }
}
