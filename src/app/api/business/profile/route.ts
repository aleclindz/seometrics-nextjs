import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

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

async function fetchHomepageHTML(domain: string): Promise<{ url: string; html: string }> {
  const candidates = [
    `https://${domain}`,
    `http://${domain}`,
  ];
  for (const url of candidates) {
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) continue;
      const html = await resp.text();
      return { url, html: html.slice(0, 120_000) };
    } catch {
      // try next
    }
  }
  return { url: `https://${domain}`, html: '' };
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
    signal: AbortSignal.timeout(15000)
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

    // Fetch homepage and profile via LLM
    const { html } = await fetchHomepageHTML(clean);
    const profile = await profileBusinessLLM(clean, html);

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

