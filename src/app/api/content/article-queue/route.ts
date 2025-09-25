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
  if (s === 'generating' || s === 'in_progress') return 'generating';
  if (s === 'pending' || s === 'queued') return 'pending';
  return 'draft';
}

function inferFormatFromTitle(title: string): { type: string; template: string; wordCountRange: [number, number] } {
  const t = String(title || '').toLowerCase();
  const isHowTo = t.startsWith('how to') || t.includes('how to');
  const isFaq = t.includes('faq') || t.includes('questions');
  const isComparison = t.includes(' vs ') || t.includes('versus') || t.includes('comparison');
  const isListicle = /(^|\s)(top|best|\d{1,2})\b/.test(t);
  const type = isHowTo ? 'how_to' : isFaq ? 'faq' : isComparison ? 'comparison' : isListicle ? 'listicle' : 'blog';
  const range: [number, number] = type === 'listicle' ? [900, 1400] : type === 'faq' ? [700, 1000] : [900, 1300];
  return { type, template: 'default', wordCountRange: range };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const websiteToken = searchParams.get('websiteToken');
    const limit = Math.max(1, Math.min(parseInt(searchParams.get('limit') || '20', 10), 100));

    if (!userToken || !websiteToken) {
      return NextResponse.json({ success: false, error: 'userToken and websiteToken are required' }, { status: 400 });
    }

    // Resolve website id + token from website token
    const { data: site, error: siteErr } = await supabase
      .from('websites')
      .select('id, website_token')
      .eq('website_token', websiteToken)
      .eq('user_token', userToken)
      .maybeSingle();

    if (siteErr || !site?.id) {
      return NextResponse.json({ success: true, queue: [] });
    }

    const { data: rows, error } = await supabase
      .from('article_queue')
      .select('*')
      .eq('user_token', userToken)
      .eq('website_id', site.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[ARTICLE QUEUE] Fetch error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch queue' }, { status: 500 });
    }

    // Build cluster mapping for this website to derive topicCluster from target_keywords
    let clusterMap: Record<string, Set<string>> = {};
    try {
      if (site?.website_token) {
        const { data: kw } = await supabase
          .from('website_keywords')
          .select('keyword, topic_cluster')
          .eq('website_token', site.website_token);
        (kw || []).forEach((row: any) => {
          const c = row.topic_cluster || 'uncategorized';
          clusterMap[c] = clusterMap[c] || new Set<string>();
          if (row.keyword) clusterMap[c].add(String(row.keyword).toLowerCase());
        });
      }
    } catch {}

    const queue = (rows || []).map((r: any, idx: number) => {
      const fmt = inferFormatFromTitle(r.title);
      // Determine topicCluster: prefer stored column if exists, else overlap with target_keywords
      let topicCluster: string | null = null;
      if (typeof r.topic_cluster === 'string' && r.topic_cluster.length > 0) {
        topicCluster = r.topic_cluster;
      } else if (Array.isArray(r.target_keywords) && r.target_keywords.length > 0 && Object.keys(clusterMap).length > 0) {
        const kwSet = new Set((r.target_keywords as string[]).map(s => String(s).toLowerCase()));
        let best = { name: '', score: 0 };
        for (const [name, set] of Object.entries(clusterMap)) {
          let score = 0;
          kwSet.forEach(k => { if (set.has(k)) score++; });
          if (score > best.score) best = { name, score };
        }
        if (best.score > 0) topicCluster = best.name;
      }
      return {
        id: r.id,
        title: r.title,
        scheduledFor: r.scheduled_for || r.created_at,
        status: mapStatus(r.status),
        wordCount: r.word_count || 0,
        contentStyle: 'standard',
        priority: idx + 1,
        targetKeywords: Array.isArray(r.target_keywords) ? r.target_keywords : [],
        articleFormat: fmt,
        authorityLevel: 'foundation',
        estimatedTrafficPotential: 0,
        targetQueries: [],
        topicCluster
      };
    });

    return NextResponse.json({ success: true, queue });
  } catch (e) {
    console.error('[ARTICLE QUEUE] Unexpected error:', e);
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
    if (typeof updates?.wordCount === 'number') patch.word_count = updates.wordCount;

    if (Object.keys(patch).length === 0) return NextResponse.json({ success: true });

    const { error } = await supabase
      .from('article_queue')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_token', userToken);

    if (error) {
      console.error('[ARTICLE QUEUE] Update error:', error);
      return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[ARTICLE QUEUE] PUT error:', e);
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
      .from('article_queue')
      .delete()
      .eq('id', Number(id))
      .eq('user_token', userToken);

    if (error) {
      console.error('[ARTICLE QUEUE] Delete error:', error);
      return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[ARTICLE QUEUE] DELETE error:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userToken, websiteToken, reorderedItems } = await request.json();
    if (!userToken || !websiteToken) return NextResponse.json({ success: true, items: [] });

    const { data: site } = await supabase
      .from('websites')
      .select('id')
      .eq('website_token', websiteToken)
      .eq('user_token', userToken)
      .maybeSingle();
    if (!site?.id) return NextResponse.json({ success: true, items: [] });

    // If reorderedItems provided, attempt to persist using sort_index column when available
    if (Array.isArray(reorderedItems) && reorderedItems.length > 0) {
      for (let i = 0; i < reorderedItems.length; i++) {
        const item = reorderedItems[i];
        try {
          await supabase
            .from('article_queue')
            .update({ sort_index: i + 1, updated_at: new Date().toISOString() })
            .eq('id', item.id)
            .eq('user_token', userToken);
        } catch (e) {
          // If column doesn't exist, ignore silently
        }
      }
    }

    const { data: rows } = await supabase
      .from('article_queue')
      .select('*')
      .eq('user_token', userToken)
      .eq('website_id', site.id)
      .order('created_at', { ascending: false });

    let items = (rows || []).map((r: any, idx: number) => ({
      id: r.id,
      title: r.title,
      scheduledFor: r.scheduled_for || r.created_at,
      status: mapStatus(r.status),
      wordCount: r.word_count || 0,
      contentStyle: 'standard',
      priority: typeof r.sort_index === 'number' ? r.sort_index : (idx + 1),
      targetKeywords: Array.isArray(r.target_keywords) ? r.target_keywords : [],
      articleFormat: inferFormatFromTitle(r.title),
      authorityLevel: 'foundation',
      estimatedTrafficPotential: 0,
      targetQueries: [],
      topicCluster: null
    }));

    // If sort_index present, sort by it
    if (items.some((it: any) => typeof it.priority === 'number')) {
      items = items.sort((a: any, b: any) => a.priority - b.priority);
    }

    return NextResponse.json({ success: true, items });
  } catch (e) {
    console.error('[ARTICLE QUEUE] POST (reorder) error:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
