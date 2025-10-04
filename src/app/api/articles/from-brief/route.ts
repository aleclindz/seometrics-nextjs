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

    // Load brief (trust brief's own website association)
    const { data: brief, error: briefErr } = await supabase
      .from('article_briefs')
      .select('*')
      .eq('id', briefId)
      .eq('user_token', userToken)
      .maybeSingle();
    if (briefErr) {
      console.error('[FROM BRIEF] Error fetching brief:', briefErr);
      return NextResponse.json({ success: false, error: `Brief fetch error: ${briefErr.message}` }, { status: 500 });
    }
    if (!brief) {
      console.error('[FROM BRIEF] Brief not found:', { briefId, userToken });
      return NextResponse.json({ success: false, error: 'Brief not found' }, { status: 404 });
    }

    const effectiveWebsiteToken = brief.website_token as string;

    // Resolve website id from brief's website_token (safer than trusting the client param)
    const { data: site, error: siteErr } = await supabase
      .from('websites')
      .select('id, domain')
      .eq('website_token', effectiveWebsiteToken)
      .eq('user_token', userToken)
      .maybeSingle();
    if (siteErr) {
      console.error('[FROM BRIEF] Error fetching website:', siteErr);
      return NextResponse.json({ success: false, error: `Website fetch error: ${siteErr.message}` }, { status: 500 });
    }
    if (!site?.id) {
      console.error('[FROM BRIEF] Website not found:', { effectiveWebsiteToken, userToken });
      return NextResponse.json({ success: false, error: 'Website not found for brief' }, { status: 404 });
    }

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
      secondary_keywords: Array.isArray(brief.secondary_keywords) ? brief.secondary_keywords : [],
      content_outline: {
        parent_cluster: brief.parent_cluster,
        intent: brief.intent,
        page_type: brief.page_type || 'blog',
        template: 'from-brief'
      },
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const { data: draft, error: insErr } = await supabase
      .from('article_queue')
      .insert(insertPayload)
      .select('*')
      .single();
    if (insErr) {
      console.error('[FROM BRIEF] Error inserting draft:', insErr);
      console.error('[FROM BRIEF] Insert payload:', JSON.stringify(insertPayload, null, 2));
      return NextResponse.json({ success: false, error: `Failed to create draft: ${insErr.message}` }, { status: 500 });
    }
    if (!draft) {
      console.error('[FROM BRIEF] Draft insert succeeded but no data returned');
      return NextResponse.json({ success: false, error: 'Failed to create draft: no data returned' }, { status: 500 });
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
