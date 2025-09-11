import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = Number(searchParams.get('articleId'));
    if (!articleId) {
      return NextResponse.json({ success: false, error: 'articleId required' }, { status: 400 });
    }

    const { data: article, error } = await supabase
      .from('article_queue')
      .select('id, title, status, updated_at, word_count, meta_title, meta_description')
      .eq('id', articleId)
      .maybeSingle();

    if (error || !article) {
      return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, article });
  } catch (error) {
    console.error('[ARTICLES STATUS] Unexpected error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

