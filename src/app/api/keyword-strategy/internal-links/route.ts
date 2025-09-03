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
    const topicCluster = searchParams.get('topicCluster');
    const action = searchParams.get('action'); // 'opportunities' or 'existing'

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

    // Verify user owns this website
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('website_token, domain, cleaned_domain')
      .eq('website_token', targetWebsiteToken)
      .eq('user_token', userToken)
      .single();

    if (websiteError || !website) {
      return NextResponse.json({ error: 'Website not found or access denied' }, { status: 404 });
    }

    if (action === 'opportunities') {
      return await getInternalLinkOpportunities(targetWebsiteToken, topicCluster);
    } else {
      return await getExistingInternalLinks(targetWebsiteToken, topicCluster);
    }

  } catch (error) {
    console.error('[INTERNAL LINKS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userToken, 
      websiteToken, 
      domain,
      sourceArticleId,
      targetArticleId,
      targetUrl,
      anchorText,
      topicCluster,
      linkContext
    } = body;

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

    // Verify required fields
    if (!sourceArticleId || !anchorText || (!targetArticleId && !targetUrl)) {
      return NextResponse.json({ 
        error: 'Source article ID, anchor text, and either target article ID or target URL are required' 
      }, { status: 400 });
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

    // Create internal link record
    const { data: linkData, error: linkError } = await supabase
      .from('internal_links')
      .insert({
        website_token: targetWebsiteToken,
        source_article_id: sourceArticleId,
        target_article_id: targetArticleId || null,
        target_url: targetUrl || null,
        anchor_text: anchorText,
        topic_cluster: topicCluster || null,
        link_context: linkContext || null
      })
      .select()
      .single();

    if (linkError) {
      console.error('[INTERNAL LINKS] Error creating internal link:', linkError);
      return NextResponse.json({ error: 'Failed to create internal link' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Internal link created successfully',
      link: linkData
    });

  } catch (error) {
    console.error('[INTERNAL LINKS] Unexpected error:', error);
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
    const linkId = searchParams.get('linkId');

    if (!userToken || !linkId) {
      return NextResponse.json({ error: 'User token and link ID are required' }, { status: 400 });
    }

    // Verify user owns this internal link
    const { data: link, error: linkError } = await supabase
      .from('internal_links')
      .select('website_token')
      .eq('id', linkId)
      .single();

    if (linkError || !link) {
      return NextResponse.json({ error: 'Internal link not found' }, { status: 404 });
    }

    // Verify user owns the website this link belongs to
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('website_token')
      .eq('website_token', link.website_token)
      .eq('user_token', userToken)
      .single();

    if (websiteError || !website) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete the internal link
    const { error: deleteError } = await supabase
      .from('internal_links')
      .delete()
      .eq('id', linkId);

    if (deleteError) {
      console.error('[INTERNAL LINKS] Error deleting internal link:', deleteError);
      return NextResponse.json({ error: 'Failed to delete internal link' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Internal link deleted successfully'
    });

  } catch (error) {
    console.error('[INTERNAL LINKS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to get internal link opportunities
async function getInternalLinkOpportunities(websiteToken: string, topicCluster?: string) {
  try {
    let query = supabase
      .from('internal_linking_opportunities')
      .select('*')
      .eq('website_token', websiteToken);

    if (topicCluster) {
      query = query.eq('topic_cluster', topicCluster);
    }

    const { data: opportunities, error } = await query
      .limit(50)
      .order('topic_cluster', { ascending: true });

    if (error) {
      console.error('[INTERNAL LINKS] Error fetching opportunities:', error);
      return NextResponse.json({ error: 'Failed to fetch link opportunities' }, { status: 500 });
    }

    // Group opportunities by topic cluster for better organization
    const opportunitiesByCluster = {};
    (opportunities || []).forEach(opp => {
      const cluster = opp.topic_cluster || 'uncategorized';
      if (!opportunitiesByCluster[cluster]) {
        opportunitiesByCluster[cluster] = [];
      }
      opportunitiesByCluster[cluster].push(opp);
    });

    return NextResponse.json({
      success: true,
      total_opportunities: opportunities?.length || 0,
      opportunities_by_cluster: opportunitiesByCluster,
      opportunities: opportunities || [],
      recommendations: {
        priority_clusters: Object.entries(opportunitiesByCluster)
          .sort(([,a], [,b]) => b.length - a.length)
          .slice(0, 3)
          .map(([cluster, opps]) => ({
            cluster,
            opportunity_count: opps.length,
            potential_impact: opps.length > 5 ? 'high' : opps.length > 2 ? 'medium' : 'low'
          }))
      }
    });

  } catch (error) {
    console.error('[INTERNAL LINKS] Error in getInternalLinkOpportunities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to get existing internal links
async function getExistingInternalLinks(websiteToken: string, topicCluster?: string) {
  try {
    let query = supabase
      .from('internal_links')
      .select(`
        *,
        source_article:articles!source_article_id(id, title),
        target_article:articles!target_article_id(id, title)
      `)
      .eq('website_token', websiteToken);

    if (topicCluster) {
      query = query.eq('topic_cluster', topicCluster);
    }

    const { data: links, error } = await query
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[INTERNAL LINKS] Error fetching existing links:', error);
      return NextResponse.json({ error: 'Failed to fetch existing links' }, { status: 500 });
    }

    // Get statistics
    const linksByCluster = {};
    (links || []).forEach(link => {
      const cluster = link.topic_cluster || 'uncategorized';
      if (!linksByCluster[cluster]) {
        linksByCluster[cluster] = [];
      }
      linksByCluster[cluster].push(link);
    });

    return NextResponse.json({
      success: true,
      total_links: links?.length || 0,
      links_by_cluster: linksByCluster,
      links: links || [],
      statistics: {
        clusters_with_links: Object.keys(linksByCluster).length,
        average_links_per_cluster: Object.keys(linksByCluster).length > 0 
          ? Math.round((links?.length || 0) / Object.keys(linksByCluster).length)
          : 0,
        external_links: (links || []).filter(l => l.target_url && !l.target_article_id).length,
        internal_links: (links || []).filter(l => l.target_article_id).length
      }
    });

  } catch (error) {
    console.error('[INTERNAL LINKS] Error in getExistingInternalLinks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}