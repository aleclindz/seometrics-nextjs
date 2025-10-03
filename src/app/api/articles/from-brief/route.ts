import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userToken, websiteToken, briefId, start = true } = await request.json();
    if (!userToken || !briefId) {
      return NextResponse.json({ success: false, error: 'userToken and briefId are required' }, { status: 400 });
    }

    // Resolve website id
    const { data: site, error: siteErr } = await supabase
      .from('websites')
      .select('id, domain')
      .eq('website_token', websiteToken)
      .eq('user_token', userToken)
      .maybeSingle();
    if (siteErr || !site?.id) {
      return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
    }

    // Load brief (trust brief's own website association)
    const { data: brief, error: briefErr } = await supabase
      .from('article_briefs')
      .select('*')
      .eq('id', briefId)
      .eq('user_token', userToken)
      .maybeSingle();
    if (briefErr || !brief) {
      return NextResponse.json({ success: false, error: 'Brief not found' }, { status: 404 });
    }

    const effectiveWebsiteToken = brief.website_token as string;

    // Prepare draft insert
    const targetKeywords = Array.from(new Set<string>([
      String(brief.primary_keyword || ''),
      ...((Array.isArray(brief.secondary_keywords) ? brief.secondary_keywords : []) as string[])
    ].filter(Boolean)));

    const insertPayload: any = {
      user_token: userToken,
      website_id: site.id,
      title: brief.title || brief.h1 || 'New Article',
      slug: (brief.url_path || (brief.title || '')).toLowerCase().replace(/[^a-z0-9\-\/]/g, '-').replace(/-+/g, '-').replace(/\/+/, '/').replace(/^-+|-+$/g, ''),
      target_keywords: targetKeywords,
      article_format: JSON.stringify({ type: brief.page_type || 'blog', template: 'from-brief' }),
      content_outline: { parent_cluster: brief.parent_cluster, intent: brief.intent },
      content_brief: brief.summary || null,
      status: 'pending',
      generated_from_brief_id: brief.id,
      created_at: new Date().toISOString()
    };

    // Resolve website id from brief's website_token (safer than trusting the client param)
    const { data: site, error: siteErr } = await supabase
      .from('websites')
      .select('id, domain')
      .eq('website_token', effectiveWebsiteToken)
      .eq('user_token', userToken)
      .maybeSingle();
    if (siteErr || !site?.id) {
      return NextResponse.json({ success: false, error: 'Website not found for brief' }, { status: 404 });
    }

    const { data: draft, error: insErr } = await supabase
      .from('article_queue')
      .insert(insertPayload)
      .select('*')
      .single();
    if (insErr || !draft) {
      return NextResponse.json({ success: false, error: 'Failed to create draft' }, { status: 500 });
    }

    // Link brief -> draft and mark brief generated
    await supabase
      .from('article_briefs')
      .update({ generated_article_id: draft.id, status: 'generated', updated_at: new Date().toISOString() })
      .eq('id', brief.id)
      .eq('user_token', userToken);

    // Optionally trigger generation pipeline
    if (start) {
      try {
        const base = (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.startsWith('http'))
          ? process.env.NEXT_PUBLIC_APP_URL
          : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
        fetch(`${base}/api/articles/generate/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userToken, websiteId: site.id, title: draft.title, targetKeywords })
        }).catch(() => {});
      } catch {}
    }

    return NextResponse.json({ success: true, draft });
  } catch (e) {
    console.error('[FROM BRIEF] Error:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// Optional: simple GET for health/route presence validation
export async function GET() {
  return NextResponse.json({ ok: true });
}
