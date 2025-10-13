import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');

    if (!userToken) {
      return NextResponse.json(
        { error: 'User token is required' },
        { status: 400 }
      );
    }

    console.log('[ARTICLES API] Fetching articles for user:', userToken);

    // Get articles from article_queue table (the new article system)
    // Note: websites(id) is the foreign key, not websites(website_id)
    const { data: articles, error } = await supabase
      .from('article_queue')
      .select(`
        id,
        title,
        slug,
        status,
        article_content,
        created_at,
        updated_at,
        published_at,
        scheduled_for,
        scheduled_publish_at,
        word_count,
        quality_score,
        seo_score,
        readability_score,
        target_keywords,
        topic_cluster,
        public_url,
        cms_admin_url,
        website_id,
        websites!website_id (
          domain
        ),
        cms_connections!cms_connection_id (
          connection_name,
          cms_type
        )
      `)
      .eq('user_token', userToken)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ARTICLES API] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch articles' },
        { status: 500 }
      );
    }

    console.log('[ARTICLES API] Found articles:', articles?.length || 0);

    return NextResponse.json({
      success: true,
      articles: articles || []
    });

  } catch (error) {
    console.error('[ARTICLES API] Unexpected error:', error);
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
      websiteId,
      cmsConnectionId,
      title,
      targetKeywords,
      contentOutline
    } = body;

    if (!userToken || !websiteId || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: userToken, websiteId, title' },
        { status: 400 }
      );
    }

    console.log('[ARTICLES API] Creating new article:', { title, websiteId });

    // Auto-lookup CMS connection if not provided
    let effectiveCmsConnectionId = cmsConnectionId;
    if (!effectiveCmsConnectionId) {
      console.log('[ARTICLES API] No cmsConnectionId provided, looking up for website', websiteId);

      const { data: cmsConnection } = await supabase
        .from('cms_connections')
        .select('id')
        .eq('user_token', userToken)
        .eq('website_id', websiteId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cmsConnection) {
        console.log('[ARTICLES API] Found CMS connection:', cmsConnection.id);
        effectiveCmsConnectionId = cmsConnection.id;
      } else {
        console.warn('[ARTICLES API] No active CMS connection found for website', websiteId);
      }
    }

    // Create slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Insert into article_queue
    const { data: article, error } = await supabase
      .from('article_queue')
      .insert({
        user_token: userToken,
        website_id: websiteId,
        cms_connection_id: effectiveCmsConnectionId,
        title,
        slug,
        target_keywords: targetKeywords || [],
        content_outline: contentOutline || {},
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('[ARTICLES API] Insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create article' },
        { status: 500 }
      );
    }

    console.log('[ARTICLES API] Article created successfully:', article.id);

    return NextResponse.json({
      success: true,
      article
    });

  } catch (error) {
    console.error('[ARTICLES API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}