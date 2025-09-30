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
  return 'draft';
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

    const { data: rows, error } = await supabase
      .from('article_briefs')
      .select('*')
      .eq('user_token', userToken)
      .eq('website_token', websiteToken)
      .in('status', ['draft', 'queued'])
      .order('scheduled_for', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('[ARTICLE BRIEFS QUEUE] Fetch error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch article briefs' }, { status: 500 });
    }

    const queue = (rows || []).map((r: any, idx: number) => ({
      id: r.id,
      title: r.title,
      scheduledFor: r.scheduled_for || r.created_at,
      status: mapStatus(r.status),
      wordCount: r.word_count_max || r.word_count_min || 0,
      contentStyle: r.tone || 'professional',
      priority: idx + 1,
      targetKeywords: Array.from(new Set([r.primary_keyword, ...((r.secondary_keywords || []) as string[])]).filter(Boolean)),
      articleFormat: { type: r.page_type, template: 'brief', wordCountRange: [r.word_count_min || 1000, r.word_count_max || 2000] as [number, number] },
      authorityLevel: 'foundation',
      estimatedTrafficPotential: 0,
      targetQueries: (r.target_queries || []) as string[],
      topicCluster: r.parent_cluster || null
    }));

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

