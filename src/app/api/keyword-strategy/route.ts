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
      const { data: website, error: websiteError } = await supabase
        .from('websites')
        .select('website_token')
        .eq('user_token', userToken)
        .or(`domain.eq.${domain},cleaned_domain.eq.${domain}`)
        .single();

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
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('website_token')
      .eq('website_token', websiteToken)
      .eq('user_token', userToken)
      .single();

    if (websiteError || !website) {
      return NextResponse.json({ error: 'Website not found or access denied' }, { status: 404 });
    }

    if (keyword) {
      // Delete specific keyword
      const { error: deleteError } = await supabase
        .from('website_keywords')
        .delete()
        .eq('website_token', websiteToken)
        .eq('keyword', keyword.toLowerCase().trim());

      if (deleteError) {
        console.error('[KEYWORD STRATEGY] Error deleting keyword:', deleteError);
        return NextResponse.json({ error: 'Failed to delete keyword' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Keyword deleted successfully' });
    }

    if (topicCluster) {
      // Delete entire topic cluster
      const { error: deleteKeywordsError } = await supabase
        .from('website_keywords')
        .delete()
        .eq('website_token', websiteToken)
        .eq('topic_cluster', topicCluster);

      const { error: deleteContentError } = await supabase
        .from('topic_cluster_content')
        .delete()
        .eq('website_token', websiteToken)
        .eq('topic_cluster', topicCluster);

      if (deleteKeywordsError || deleteContentError) {
        console.error('[KEYWORD STRATEGY] Error deleting topic cluster:', { deleteKeywordsError, deleteContentError });
        return NextResponse.json({ error: 'Failed to delete topic cluster' }, { status: 500 });
      }

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
    // Get all keywords for this website
    const { data: keywords, error: keywordsError } = await supabase
      .from('website_keywords')
      .select('*')
      .eq('website_token', websiteToken)
      .order('created_at', { ascending: true });

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
