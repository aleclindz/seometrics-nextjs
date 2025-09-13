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

    if (!userToken || !idNum) {
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
      return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 });
    }
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, article });
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

