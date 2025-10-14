import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const idNum = Number(params.id);

    console.log(`[ARTICLE GET] 🔍 Fetching article ${idNum} for user ${userToken}`);

    if (!userToken || !idNum) {
      console.warn(`[ARTICLE GET] ⚠️ Missing parameters - userToken: ${!!userToken}, id: ${!!idNum}`);
      return NextResponse.json({ error: 'userToken and id required' }, { status: 400 });
    }

    const { data: article, error } = await supabase
      .from('article_queue')
      .select(`
        *,
        websites:website_id (
          id,
          domain,
          website_token
        ),
        cms_connections:cms_connection_id (
          id,
          cms_type,
          connection_name
        )
      `)
      .eq('id', idNum)
      .eq('user_token', userToken)
      .maybeSingle();

    if (error) {
      console.error(`[ARTICLE GET] ❌ Database error for article ${idNum}:`, error);
      return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 });
    }
    if (!article) {
      console.warn(`[ARTICLE GET] ⚠️ Article ${idNum} not found for user ${userToken}`);
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    console.log(`[ARTICLE GET] ✅ Found article ${idNum}:`, {
      title: article.title,
      status: article.status,
      hasContent: !!article.article_content,
      contentLength: article.article_content?.length || 0,
      created_at: article.created_at,
      scheduled_publish_at: article.scheduled_publish_at
    });

    return NextResponse.json({ success: true, article });
  } catch (e) {
    console.error(`[ARTICLE GET] ❌ Exception for article ${params.id}:`, e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

