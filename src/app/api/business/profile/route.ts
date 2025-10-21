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
    // Remove scripts, styles, and common non-content elements
    let cleaned = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '') // Remove navigation
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '') // Remove header
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '') // Remove footer
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '') // Remove sidebars
      .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
      .replace(/<[^>]+>/g, ' ') // Remove remaining tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Remove common navigation patterns
    cleaned = cleaned
      .replace(/Skip to (main )?content/gi, '')
      .replace(/Menu/gi, '')
      .replace(/\[.*?\]\(.*?\)/g, '') // Remove markdown links from scraped content
      .trim();

    return cleaned;
  } catch {
    return html || '';
  }
}

function stripMarkdown(text: string): string {
  try {
    return String(text || '')
      // Remove images ![alt](url)
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      // Replace links [text](url) -> text
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
      // Remove remaining markdown tokens
      .replace(/[*_`>#~]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return text || '';
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
        // For markdown, clean it first, then take first 8000 chars (enough for business info)
        const cleaned = page.markdown ? stripMarkdown(page.markdown) : stripHtml(String(content));
        return cleaned.slice(0, 8000);
      }
    } catch {}
    // Fallback to direct fetch
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!resp.ok) return '';
      const html = await resp.text();
      // Focus on main content, take first 8000 chars
      return stripHtml(html).slice(0, 8000);
    } catch {
      return '';
    }
  }

  // If Firecrawl is available, scrape only the homepage to keep within runtime budget
  if (useFirecrawl) {
    combined += await tryScrape(homepage);
    return combined.slice(0, 10_000); // Reduced from 120k to 10k for focused content
  }

  // Otherwise, fetch homepage + one likely about page concurrently with tight timeouts
  const quickCandidates = [homepage, aboutCandidates[0]];
  const results = await Promise.allSettled(quickCandidates.map(u => tryScrape(u)));
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      if (combined) combined += `\n\n---\n\n${r.value}`; else combined += r.value;
    }
  }
  return combined.slice(0, 12_000); // Reduced from 120k to 12k for focused content
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

  const system = `You are a precise business profiler. Infer a website's business from its homepage content.

IMPORTANT: Focus on the MAIN CONTENT describing what the business does. Ignore navigation menus, headers, footers, and calls-to-action.

Return strict JSON with keys:
- type: one of (product, saas, service, content, marketplace, tool, app, nonprofit, community, unknown)
- description: 1-2 clear sentences explaining what the business does and who it serves
- audience: array of concise target segments
- valueProps: array of key value propositions
- productsServices: array of main offerings
- niche: short phrase describing the market niche
- confidence: number between 0-1
- signals: array of short strings indicating what led to your analysis

Write the description as if explaining the business to someone unfamiliar with it. Do not include any extra keys.`;

  const user = `Domain: ${domain}
Homepage content:\n\n\`\`\`
${htmlSnippet}
\`\`\``;

  console.log('[BUSINESS PROFILE][LLM] model=gpt-4o-mini');
  console.log('[BUSINESS PROFILE][LLM] System prompt (first 500):\n', system.slice(0, 500));
  console.log('[BUSINESS PROFILE][LLM] User prompt (first 1000):\n', user.slice(0, 1000));

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
      max_tokens: 800 // Increased from 500 to allow for more detailed descriptions
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
  console.log('[BUSINESS PROFILE][LLM] Raw model content (first 600):\n', String(content).slice(0, 600));
  try {
    const parsed = JSON.parse(content);
    return {
      type: parsed.type || 'unknown',
      description: stripMarkdown(parsed.description || ''),
      audience: Array.isArray(parsed.audience) ? parsed.audience.map((t: any) => stripMarkdown(String(t))) : [],
      valueProps: Array.isArray(parsed.valueProps) ? parsed.valueProps.map((t: any) => stripMarkdown(String(t))) : [],
      productsServices: Array.isArray(parsed.productsServices) ? parsed.productsServices.map((t: any) => stripMarkdown(String(t))) : [],
      niche: stripMarkdown(parsed.niche || ''),
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
        // Extract first substantial paragraph (skip short fragments)
        const sentences = text.split(/[.!?]\s+/);
        let description = '';
        for (const sentence of sentences) {
          const cleaned = sentence.trim();
          // Skip very short fragments and common navigation text
          if (cleaned.length > 50 &&
              !cleaned.toLowerCase().includes('skip to') &&
              !cleaned.toLowerCase().includes('menu') &&
              !cleaned.toLowerCase().includes('navigation')) {
            description = cleaned;
            break;
          }
        }

        // If no good sentence found, take a larger chunk and clean it
        if (!description && text.length > 200) {
          description = text.slice(200, 400).replace(/\s+/g, ' ').trim();
        }

        // Ultimate fallback
        if (!description) {
          description = text.slice(0, 200).replace(/\s+/g, ' ').trim();
        }

        // Very basic type heuristic
        const lower = text.toLowerCase();
        let inferred: any = 'unknown';
        if (/(agency|consult|services|service)/.test(lower)) inferred = 'service';
        else if (/(blog|news|guide|article)/.test(lower)) inferred = 'content';
        else if (/(shop|store|buy|product)/.test(lower)) inferred = 'product';
        else if (/(saas|software|platform)/.test(lower)) inferred = 'saas';

        profile = {
          ...profile,
          type: profile.type !== 'unknown' ? profile.type : inferred,
          description: description || profile.description || ''
        };
      }
    }

    const businessInfoObj = {
      description: stripMarkdown(profile.description),
      audience: (profile.audience || []).map((t: any) => stripMarkdown(String(t))),
      valueProps: (profile.valueProps || []).map((t: any) => stripMarkdown(String(t))),
      productsServices: (profile.productsServices || []).map((t: any) => stripMarkdown(String(t))),
      niche: stripMarkdown(profile.niche)
    };

    const updates: any = {
      business_type: profile.type || 'unknown',
      business_info: JSON.stringify(businessInfoObj),
      business_detection_confidence: profile.confidence || 0, // Decimal value 0-1 (column is now DECIMAL(3,2))
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
