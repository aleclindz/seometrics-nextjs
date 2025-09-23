import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { scrapeUrl } from '@/services/crawl/firecrawl-client';

export const runtime = 'nodejs';
export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeDomain(raw: string): string {
  return String(raw || '')
    .replace(/^sc-domain:/i, '')
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/$/, '');
}

function stripHtml(html: string): string {
  try {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return html || '';
  }
}

async function fetchWebsiteSnippets(domain: string): Promise<string> {
  const homepage = `https://${domain}`;
  const aboutCandidates = [`https://${domain}/about`, `https://${domain}/about-us`, `https://${domain}/company`, `https://${domain}/contact`];
  let combined = '';
  const useFirecrawl = !!process.env.FIRECRAWL_API_KEY;

  async function tryScrape(url: string): Promise<string> {
    try {
      if (useFirecrawl) {
        const page = await scrapeUrl(url);
        const content = page.markdown || page.html || '';
        return (page.markdown ? page.markdown : stripHtml(String(content))).slice(0, 60_000);
      }
    } catch {}
    // Fallback to direct fetch
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!resp.ok) return '';
      const html = await resp.text();
      return stripHtml(html).slice(0, 60_000);
    } catch {
      return '';
    }
  }

  // If Firecrawl is available, scrape only the homepage to keep within runtime budget
  if (useFirecrawl) {
    combined += await tryScrape(homepage);
    return combined.slice(0, 120_000);
  }

  // Otherwise, fetch homepage + one likely about page concurrently with tight timeouts
  const quickCandidates = [homepage, aboutCandidates[0]];
  const results = await Promise.allSettled(quickCandidates.map(u => tryScrape(u)));
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      if (combined) combined += `\n\n---\n\n${r.value}`; else combined += r.value;
    }
  }
  return combined.slice(0, 120_000);
}

async function profileBusinessLLM(domain: string, htmlSnippet: string) {
  if (!process.env.OPENAI_API_KEY) {
    // Basic heuristic if no key present
    return {
      type: 'unknown',
      description: '',
      audience: [],
      valueProps: [],
      productsServices: [],
      niche: '',
      confidence: 0.0,
      signals: [] as string[],
    };
  }

  const system = `You are a precise business profiler. Infer a website's business from its homepage.
Return strict JSON with keys: type (one of: product, saas, service, content, marketplace, tool, app, nonprofit, community, unknown),
description (1-2 sentences), audience (array of concise segments), valueProps (array), productsServices (array), niche (short phrase),
confidence (0-1 number), signals (array of short strings). Do not include any extra keys.`;

  const user = `Domain: ${domain}
Homepage snippet (truncated):\n\n\`\`\`
${htmlSnippet}
\`\`\``;

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: 0.2,
      max_tokens: 500
    }),
    signal: AbortSignal.timeout(12000)
  });
  if (!resp.ok) {
    return {
      type: 'unknown', description: '', audience: [], valueProps: [], productsServices: [], niche: '', confidence: 0.0, signals: [] as string[]
    };
  }
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(content);
    return {
      type: parsed.type || 'unknown',
      description: parsed.description || '',
      audience: Array.isArray(parsed.audience) ? parsed.audience : [],
      valueProps: Array.isArray(parsed.valueProps) ? parsed.valueProps : [],
      productsServices: Array.isArray(parsed.productsServices) ? parsed.productsServices : [],
      niche: parsed.niche || '',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
      signals: Array.isArray(parsed.signals) ? parsed.signals : []
    };
  } catch {
    return {
      type: 'unknown', description: '', audience: [], valueProps: [], productsServices: [], niche: '', confidence: 0.0, signals: [] as string[]
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userToken, domain, force = false } = body || {};
    if (!userToken || !domain) {
      return NextResponse.json({ success: false, error: 'userToken and domain are required' }, { status: 400 });
    }

    const clean = normalizeDomain(domain);
    const variants = [clean, `https://${clean}`, `sc-domain:${clean}`];

    // Find the website for this user + domain
    const { data: website, error } = await supabase
      .from('websites')
      .select('id, website_token, domain, business_type, business_info')
      .eq('user_token', userToken)
      .or(variants.map(v => `domain.eq.${v}`).join(','))
      .maybeSingle();

    if (error || !website) {
      return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
    }

    const currentType = website.business_type || 'unknown';
    const currentInfo = website.business_info || '{}';
    if (!force && currentType !== 'unknown' && currentInfo !== '{}' && currentInfo !== null) {
      return NextResponse.json({ success: true, message: 'Business info already present', websiteId: website.id });
    }

    // Fetch content (homepage + likely about page) and profile via LLM
    const snippet = await fetchWebsiteSnippets(clean);
    console.log(`[BUSINESS PROFILE] Domain=${clean} snippetLength=${snippet?.length || 0} openaiConfigured=${!!process.env.OPENAI_API_KEY}`);
    let profile = await profileBusinessLLM(clean, snippet);

    // Heuristic fallback: if OpenAI not configured or empty description, synthesize a basic description from snippet
    if ((profile.type === 'unknown' && (!profile.description || profile.description.length < 4)) || !process.env.OPENAI_API_KEY) {
      const text = String(snippet || '').trim();
      if (text) {
        const short = text.slice(0, 180).replace(/\s+/g, ' ').trim();
        // Very basic type heuristic
        const lower = text.toLowerCase();
        let inferred: any = 'online';
        if (/(agency|consult|services|service)/.test(lower)) inferred = 'service';
        else if (/(blog|news|guide|article)/.test(lower)) inferred = 'content';
        profile = {
          ...profile,
          type: profile.type !== 'unknown' ? profile.type : inferred,
          description: short || profile.description || ''
        };
      }
    }

    const businessInfoObj = {
      description: profile.description,
      audience: profile.audience,
      valueProps: profile.valueProps,
      productsServices: profile.productsServices,
      niche: profile.niche
    };

    const updates: any = {
      business_type: profile.type || 'unknown',
      business_info: JSON.stringify(businessInfoObj),
      business_detection_confidence: profile.confidence || 0,
      business_detection_signals: JSON.stringify(profile.signals || []),
      business_confirmed: false,
      business_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('[BUSINESS PROFILE] Persisting business profile to DB:', { type: updates.business_type, hasInfo: !!updates.business_info });
    const { error: updateError } = await supabase
      .from('websites')
      .update(updates)
      .eq('id', website.id);

    if (updateError) {
      return NextResponse.json({ success: false, error: 'Failed to update business info' }, { status: 500 });
    }

    return NextResponse.json({ success: true, websiteId: website.id, profile: { type: updates.business_type, ...businessInfoObj } });
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// Fetch current business profile without running detection
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const domain = searchParams.get('domain');
    if (!userToken || !domain) {
      return NextResponse.json({ success: false, error: 'userToken and domain are required' }, { status: 400 });
    }

    const clean = normalizeDomain(domain);
    const variants = [clean, `https://${clean}`, `sc-domain:${clean}`];

    const { data: website, error } = await supabase
      .from('websites')
      .select('business_type, business_info')
      .eq('user_token', userToken)
      .or(variants.map(v => `domain.eq.${v}`).join(','))
      .maybeSingle();

    if (error || !website) {
      return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
    }
    let info: any = {};
    try { info = website.business_info ? JSON.parse(website.business_info) : {}; } catch {}

    return NextResponse.json({
      success: true,
      profile: {
        type: website.business_type || 'unknown',
        description: info.description || ''
      }
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
