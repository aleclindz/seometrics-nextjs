import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userToken, websiteId, site_url, title, targetKeywords = [] } = body || {};

    if (!userToken || (!websiteId && !site_url) || !title) {
      return NextResponse.json({ success: false, error: 'userToken, title and websiteId or site_url are required' }, { status: 400 });
    }

    // Resolve websiteId from site_url if needed
    let finalWebsiteId = websiteId;
    if (!finalWebsiteId && site_url) {
      const domain = site_url.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const { data: website } = await supabase
        .from('websites')
        .select('id, domain')
        .eq('user_token', userToken)
        .or(`domain.eq.${domain},domain.eq.https://${domain}`)
        .maybeSingle();
      finalWebsiteId = website?.id || null;
    }

    if (!finalWebsiteId) {
      return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
    }

    // Create article_queue row with queued status
    const slug = String(title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const { data: article, error } = await supabase
      .from('article_queue')
      .insert({
        user_token: userToken,
        website_id: finalWebsiteId,
        title,
        slug,
        target_keywords: targetKeywords || [],
        status: 'queued'
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to enqueue article' }, { status: 500 });
    }

    return NextResponse.json({ success: true, articleId: article.id });
  } catch (error) {
    console.error('[ARTICLES START] Unexpected error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

