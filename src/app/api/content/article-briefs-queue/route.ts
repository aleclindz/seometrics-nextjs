import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function mapStatus(status: string | null | undefined): 'draft' | 'pending' | 'generating' | 'completed' {
  const s = (status || '').toLowerCase();
  if (s === 'generated' || s === 'completed' || s === 'published') return 'completed';
  if (s === 'queued' || s === 'pending') return 'pending';
  if (s === 'generating') return 'generating';
  return 'draft';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    let websiteToken = searchParams.get('websiteToken');
    const domain = searchParams.get('domain');
    const limit = Math.max(1, Math.min(parseInt(searchParams.get('limit') || '20', 10), 100));

    if (!userToken) {
      return NextResponse.json({ success: false, error: 'userToken is required' }, { status: 400 });
    }

    // Resolve websiteToken by domain if not provided
    if (!websiteToken && domain) {
      const clean = String(domain).replace(/^https?:\/\//, '').replace(/\/$/, '');
      const { data: site } = await supabase
        .from('websites')
        .select('website_token, domain, cleaned_domain')
        .eq('user_token', userToken)
        .or([`domain.eq.${clean}`, `cleaned_domain.eq.${clean}`, `domain.eq.https://${clean}`].join(','))
        .maybeSingle();
      websiteToken = site?.website_token || websiteToken;
    }

    if (!websiteToken) {
      return NextResponse.json({ success: true, queue: [] });
    }

    let { data: rows, error } = await supabase
      .from('article_briefs')
      .select(`
        *,
        topic_clusters!article_briefs_topic_cluster_id_fkey (
          id,
          cluster_name
        )
      `)
      .eq('user_token', userToken)
      .eq('website_token', websiteToken)
      .in('status', ['draft', 'queued', 'generating'])
      .order('topic_clusters.cluster_name', { ascending: true, nullsFirst: false })
      .order('article_role', { ascending: true }) // PILLAR before SUPPORTING alphabetically
      .limit(limit);

    if (error) {
      console.error('[ARTICLE BRIEFS QUEUE] Fetch error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch article briefs' }, { status: 500 });
    }

    // Fallback: if empty and domain supplied, re-resolve by domain and try again
    if ((rows || []).length === 0 && domain) {
      try {
        const clean = String(domain).replace(/^https?:\/\//, '').replace(/\/$/, '');
        const { data: site } = await supabase
          .from('websites')
          .select('website_token')
          .eq('user_token', userToken)
          .or([`domain.eq.${clean}`, `cleaned_domain.eq.${clean}`, `domain.eq.https://${clean}`].join(','))
          .maybeSingle();
        const fallbackToken = site?.website_token;
        if (fallbackToken && fallbackToken !== websiteToken) {
          const res = await supabase
            .from('article_briefs')
            .select(`
              *,
              topic_clusters!article_briefs_topic_cluster_id_fkey (
                id,
                cluster_name
              )
            `)
            .eq('user_token', userToken)
            .eq('website_token', fallbackToken)
            .in('status', ['draft', 'queued', 'generating'])
            .order('topic_clusters.cluster_name', { ascending: true, nullsFirst: false })
            .order('article_role', { ascending: true })
            .limit(limit);
          if (!res.error) rows = res.data || [];
        }
      } catch {}
    }

    const sorted = (rows || []).slice().sort((a: any, b: any) => {
      const ai = typeof a.sort_index === 'number' ? a.sort_index : Number.MAX_SAFE_INTEGER;
      const bi = typeof b.sort_index === 'number' ? b.sort_index : Number.MAX_SAFE_INTEGER;
      if (ai !== bi) return ai - bi;
      const ad = a.scheduled_for ? new Date(a.scheduled_for).getTime() : 0;
      const bd = b.scheduled_for ? new Date(b.scheduled_for).getTime() : 0;
      return ad - bd;
    });

    const queue = sorted.map((r: any, idx: number) => {
      const kws = [
        r.primary_keyword,
        ...((Array.isArray(r.secondary_keywords) ? r.secondary_keywords : []) as string[])
      ].filter(Boolean) as string[];
      const targetKeywords = Array.from(new Set<string>(kws));
      return {
        id: r.id,
        title: r.title,
        scheduledFor: r.scheduled_for || r.created_at,
        generatedAt: r.generated_at || r.created_at,
        status: mapStatus(r.status),
        wordCount: r.word_count_max || r.word_count_min || 0,
        contentStyle: r.tone || 'professional',
        priority: typeof r.sort_index === 'number' ? r.sort_index : (idx + 1),
        targetKeywords,
        articleFormat: { type: r.page_type, template: 'brief', wordCountRange: [r.word_count_min || 1000, r.word_count_max || 2000] as [number, number] },
        authorityLevel: 'foundation',
        estimatedTrafficPotential: 0,
        targetQueries: (r.target_queries || []) as string[],
        articleRole: r.article_role || null, // PILLAR or SUPPORTING
        topicClusterId: r.topic_cluster_id || null,
        topicCluster: r.topic_clusters?.cluster_name || r.parent_cluster || null
      };
    });
    return NextResponse.json({ success: true, queue });
  } catch (e) {
    console.error('[ARTICLE BRIEFS QUEUE] Unexpected error:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, updates, userToken } = await request.json();
    if (!id || !userToken) return NextResponse.json({ success: false, error: 'id and userToken are required' }, { status: 400 });

    const patch: any = {};
    if (updates?.title) patch.title = updates.title;
    if (updates?.scheduledFor) patch.scheduled_for = updates.scheduledFor;
    if (updates?.status) patch.status = updates.status;
    if (typeof updates?.wordCount === 'number') {
      patch.word_count_max = updates.wordCount;
    }

    if (Object.keys(patch).length === 0) return NextResponse.json({ success: true });

    const { error } = await supabase
      .from('article_briefs')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_token', userToken);

    if (error) {
      console.error('[ARTICLE BRIEFS QUEUE] Update error:', error);
      return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[ARTICLE BRIEFS QUEUE] PUT error:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userToken = searchParams.get('userToken');
    if (!id || !userToken) return NextResponse.json({ success: false, error: 'id and userToken are required' }, { status: 400 });

    const { error } = await supabase
      .from('article_briefs')
      .delete()
      .eq('id', Number(id))
      .eq('user_token', userToken);

    if (error) {
      console.error('[ARTICLE BRIEFS QUEUE] Delete error:', error);
      return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[ARTICLE BRIEFS QUEUE] DELETE error:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (Array.isArray(body?.reorderedItems) && body?.userToken && body?.websiteToken) {
      const { reorderedItems, userToken, websiteToken } = body;
      // Persist sort_index updates
      for (let i = 0; i < reorderedItems.length; i++) {
        const it = reorderedItems[i];
        try {
          await supabase
            .from('article_briefs')
            .update({ sort_index: i + 1, updated_at: new Date().toISOString() })
            .eq('id', it.id)
            .eq('user_token', userToken)
            .eq('website_token', websiteToken);
        } catch {}
      }

      // Return refreshed list
      const { data: rows } = await supabase
        .from('article_briefs')
        .select(`
          *,
          topic_clusters!article_briefs_topic_cluster_id_fkey (
            id,
            cluster_name
          )
        `)
        .eq('user_token', userToken)
        .eq('website_token', websiteToken)
        .in('status', ['draft', 'queued', 'generating'])
        .order('topic_clusters.cluster_name', { ascending: true, nullsFirst: false })
        .order('article_role', { ascending: true });
      const sorted = (rows || []).slice().sort((a: any, b: any) => {
        const ai = typeof a.sort_index === 'number' ? a.sort_index : Number.MAX_SAFE_INTEGER;
        const bi = typeof b.sort_index === 'number' ? b.sort_index : Number.MAX_SAFE_INTEGER;
        if (ai !== bi) return ai - bi;
        const ad = a.scheduled_for ? new Date(a.scheduled_for).getTime() : 0;
        const bd = b.scheduled_for ? new Date(b.scheduled_for).getTime() : 0;
        return ad - bd;
      });
      const items = sorted.map((r: any, idx: number) => {
        const kws = [r.primary_keyword, ...((Array.isArray(r.secondary_keywords) ? r.secondary_keywords : []) as string[])]
          .filter(Boolean) as string[];
        const targetKeywords = Array.from(new Set<string>(kws));
        return {
          id: r.id,
        title: r.title,
        scheduledFor: r.scheduled_for || r.created_at,
        generatedAt: r.generated_at || r.created_at,
        status: mapStatus(r.status),
        wordCount: r.word_count_max || r.word_count_min || 0,
        contentStyle: r.tone || 'professional',
        priority: typeof r.sort_index === 'number' ? r.sort_index : (idx + 1),
        targetKeywords,
        articleFormat: { type: r.page_type, template: 'brief', wordCountRange: [r.word_count_min || 1000, r.word_count_max || 2000] as [number, number] },
        authorityLevel: 'foundation',
        estimatedTrafficPotential: 0,
        targetQueries: (r.target_queries || []) as string[],
        articleRole: r.article_role || null, // PILLAR or SUPPORTING
        topicClusterId: r.topic_cluster_id || null,
        topicCluster: r.topic_clusters?.cluster_name || r.parent_cluster || null
        };
      });
      return NextResponse.json({ success: true, items });
    }

    const {
      userToken,
      websiteToken,
      title,
      h1,
      urlPath,
      pageType = 'cluster',
      parentCluster,
      primaryKeyword,
      intent = 'informational',
      secondaryKeywords = [],
      targetQueries = [],
      summary = '',
      wordCountMin = 1200,
      wordCountMax = 2000,
      tone = 'professional',
      scheduledFor
    } = body || {};

    if (!userToken || !websiteToken || !title || !primaryKeyword || !intent) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const row = {
      user_token: userToken,
      website_token: websiteToken,
      title,
      h1: h1 || title,
      url_path: urlPath || null,
      page_type: pageType,
      parent_cluster: parentCluster || null,
      primary_keyword: String(primaryKeyword).toLowerCase(),
      intent,
      secondary_keywords: Array.isArray(secondaryKeywords) ? secondaryKeywords : [],
      target_queries: Array.isArray(targetQueries) ? targetQueries : [],
      summary,
      internal_links: {},
      cannibal_risk: 'none',
      cannibal_conflicts: [],
      recommendation: null,
      canonical_to: null,
      word_count_min: Number(wordCountMin) || 1200,
      word_count_max: Number(wordCountMax) || 2000,
      tone,
      notes: [],
      status: 'draft',
      scheduled_for: scheduledFor || new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('article_briefs')
      .insert(row)
      .select('*')
      .single();

    if (error) {
      console.error('[ARTICLE BRIEFS QUEUE] Create error:', error);
      return NextResponse.json({ success: false, error: 'Create failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, brief: data });
  } catch (e) {
    console.error('[ARTICLE BRIEFS QUEUE] POST error:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
