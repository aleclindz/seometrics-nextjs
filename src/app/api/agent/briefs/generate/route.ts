import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { BriefsGenerationRequest, BriefsGenerationResponse, ContentBrief, SearchIntent } from '@/types/briefs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BriefsGenerationRequest;
    const { userToken, websiteToken, domain, count = 10, clusters = [], includePillar = false } = body;

    if (!userToken || (!websiteToken && !domain)) {
      return NextResponse.json({ success: false, error: 'userToken and websiteToken or domain are required' }, { status: 400 });
    }

    // Resolve website token if domain provided
    let effectiveWebsiteToken = websiteToken || '';
    let cleanedDomain = (domain || '').replace(/^sc-domain:/, '').replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!effectiveWebsiteToken) {
      const { data: site, error } = await supabase
        .from('websites')
        .select('website_token, domain, cleaned_domain')
        .eq('user_token', userToken)
        .or([`domain.eq.${cleanedDomain}`, `cleaned_domain.eq.${cleanedDomain}`, `domain.eq.https://${cleanedDomain}`].join(','))
        .maybeSingle();
      if (error || !site) {
        return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
      }
      effectiveWebsiteToken = site.website_token;
      cleanedDomain = site.cleaned_domain || site.domain || cleanedDomain;
    }

    // Fetch existing keyword strategy parts
    const [kwRes, clusterContentRes] = await Promise.all([
      supabase
        .from('website_keywords')
        .select('keyword, keyword_type, topic_cluster')
        .eq('website_token', effectiveWebsiteToken),
      supabase
        .from('topic_cluster_content')
        .select('topic_cluster, article_title, article_url, primary_keyword')
        .eq('website_token', effectiveWebsiteToken)
    ]);

    const keywords = (kwRes.data || []).map(k => ({
      keyword: String(k.keyword || '').trim().toLowerCase(),
      type: k.keyword_type as string,
      cluster: (k.topic_cluster || null) as string | null
    }));
    const clusterContent = (clusterContentRes.data || []).map(c => ({
      cluster: c.topic_cluster as string,
      title: c.article_title as string,
      url: c.article_url as string | null,
      primary: (c.primary_keyword || null) as string | null
    }));

    // Build indices for cannibalization checks
    const existingPrimary = new Set<string>();
    const existingByCluster: Record<string, { title: string; url: string | null; primary: string | null }[]> = {};
    for (const c of clusterContent) {
      const pk = (c.primary || '').toLowerCase();
      if (pk) existingPrimary.add(pk);
      const key = (c.cluster || 'uncategorized').toLowerCase();
      (existingByCluster[key] = existingByCluster[key] || []).push({ title: c.title, url: c.url, primary: c.primary });
    }

    const existingKeywords = new Set<string>(keywords.map(k => k.keyword));
    const clustersLower = new Set(clusters.map(c => c.toLowerCase()));

    // Source candidate topics via internal autonomous-topic-selection (same-origin)
    const origin = (() => { try { return new URL(request.url).origin; } catch { return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'; } })();
    const topicsResp = await fetch(`${origin}/api/agent/autonomous-topic-selection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userToken, websiteToken: effectiveWebsiteToken, domain: cleanedDomain, analysisType: 'comprehensive', generateCount: count })
    });

    if (!topicsResp.ok) {
      return NextResponse.json({ success: false, error: 'Failed to generate topics' }, { status: 500 });
    }

    const topicsData = await topicsResp.json();
    let ideas: any[] = Array.isArray(topicsData?.selectedTopics) ? topicsData.selectedTopics : [];
    try { console.log('[BRIEFS] topics selected:', Array.isArray(ideas) ? ideas.length : 0); } catch {}
    if (clustersLower.size > 0) {
      ideas = ideas.filter((i: any) => clustersLower.has(String(i.mainTopic || '').toLowerCase()));
    }
    try { console.log('[BRIEFS] ideas after cluster filter:', ideas.length); } catch {}

    // Transform to briefs with rules
    const briefs: ContentBrief[] = [];
    const usedPrimaries = new Set<string>();

    const batch = ideas.slice(0, Math.max(1, count));
    for (const idea of batch) {
      const parentCluster = (String(idea.mainTopic || '').trim() || null) as string | null;
      const pageType: 'pillar' | 'cluster' | 'supporting' = includePillar ? 'cluster' : classifyPageType(idea);
      const primaryKeyword = pickPrimary(idea, existingKeywords, usedPrimaries);
      const intent = inferIntent(idea, primaryKeyword);
      const secKeywords = pickSecondaries(idea, primaryKeyword);
      const title = idea.title || toTitle(primaryKeyword || (parentCluster || ''));
      const h1 = title;
      const urlPath = `/${slugify(parentCluster || primaryKeyword || title)}/${slugify(primaryKeyword || title)}`.replace(/\/+/g, '/');

      // Cannibalization check: same head term + same intent
      const conflicts = [] as { url: string; title?: string | null; primary_keyword?: string | null; intent?: SearchIntent | null }[];
      let cannibalRisk: 'none' | 'possible' | 'high' = 'none';
      let canonicalTo: string | null = null;

      const pkLower = (primaryKeyword || '').toLowerCase();
      if (existingPrimary.has(pkLower)) {
        cannibalRisk = 'high';
        // Find conflicting content in same cluster if possible
        const clusterKey = (parentCluster || 'uncategorized').toLowerCase();
        const existing = (existingByCluster[clusterKey] || []).find(e => (e.primary || '').toLowerCase() === pkLower);
        if (existing) {
          conflicts.push({ url: existing.url || `/` + slugify(existing.title), title: existing.title, primary_keyword: existing.primary, intent });
          canonicalTo = existing.url || null;
        }
      } else if (pkLower && existingKeywords.has(pkLower)) {
        // Primary overlaps an already-tracked keyword (but not a declared primary) => possible risk
        cannibalRisk = 'possible';
      }

      // Build internal links
      const linksSameCluster = buildSameClusterLinks(parentCluster, existingByCluster);
      const linkUp = suggestPillarLink(parentCluster, existingByCluster);
      const linksCross = [] as any[]; // Cross-cluster suggestions kept empty for now or could be extended

      // Derive recommendation from cannibalization risk
      let recommendation: 'differentiate' | 'consolidate' | 'canonicalize' | null = null;
      switch (cannibalRisk) {
        case 'high':
          recommendation = 'canonicalize';
          break;
        case 'possible':
          recommendation = 'differentiate';
          break;
        default:
          recommendation = null;
      }

      // Improve title quality and URLs
      const improvedTitle = refineTitle(title, parentCluster, primaryKeyword || '', cleanedDomain);
      const improvedUrlCluster = slugify(parentCluster || extractClusterFromDomain(cleanedDomain) || 'topic');
      const improvedUrlPath = `/${improvedUrlCluster}/${slugify(primaryKeyword || improvedTitle)}`;

      const brief: ContentBrief = {
        title: improvedTitle,
        h1: improvedTitle,
        url_path: improvedUrlPath,
        page_type: pageType,
        parent_cluster: parentCluster,
        primary_keyword: primaryKeyword || (parentCluster || title),
        intent,
        secondary_keywords: secKeywords,
        target_queries: (idea.targetQueries || []).slice(0, 5),
        summary: buildSummary(parentCluster, primaryKeyword, intent),
        internal_links: {
          up_to_pillar: linkUp,
          same_cluster: linksSameCluster,
          cross_cluster: linksCross
        },
        cannibalization: {
          risk: cannibalRisk,
          conflicts,
          recommendation,
          canonical_to: canonicalTo
        },
        metadata: {
          word_count_range: idea.articleFormat?.wordCountRange || [1500, 2500],
          tone: 'professional',
          notes: buildNotes(intent)
        }
      };

      briefs.push(brief);
    }

    // Optionally generate a pillar brief per cluster (top-level overview page)
    if (includePillar) {
      const uniqueClusters = Array.from(new Set(briefs.map(b => (b.parent_cluster || '').toLowerCase()).filter(Boolean)));
      for (const c of uniqueClusters) {
        const display = toTitle(c);
        const pillarPath = `/${slugify(c)}`;
        const pillarBrief: ContentBrief = {
          title: `${display}: Overview, Suppliers, Logistics, Pricing`,
          h1: `${display} Overview`,
          url_path: pillarPath,
          page_type: 'pillar',
          parent_cluster: display,
          primary_keyword: display,
          intent: 'mixed',
          secondary_keywords: [],
          target_queries: [],
          summary: `Pillar page covering ${display}: definitions, key sub-topics, pricing, compliance/logistics, with links to all cluster pages.`,
          internal_links: {
            up_to_pillar: null,
            same_cluster: buildSameClusterLinks(display, existingByCluster),
            cross_cluster: []
          },
          cannibalization: { risk: 'possible', conflicts: [], recommendation: 'differentiate', canonical_to: null },
          metadata: { word_count_range: [2500, 3500], tone: 'professional', notes: ['Acts as the canonical hub for the cluster.'] }
        };
        briefs.unshift(pillarBrief);
      }
    }

    try { console.log('[BRIEFS] briefs generated:', briefs.length); } catch {}

    // Optional: persist briefs when requested via addToQueue flag
    // Always persist briefs to the article_briefs table
    const shouldQueue = true;
    let savedCount = 0;
    if (shouldQueue && briefs.length > 0) {
      try {
        const now = new Date();
        // Prefer saving to article_briefs if the table exists; fall back to content_generation_queue
        const briefsRows = briefs.map((b, index) => {
          const hoursOffset = (index * (7 * 24 / Math.max(1, briefs.length)));
          const scheduledTime = new Date(now.getTime() + hoursOffset * 60 * 60 * 1000);
          return {
            user_token: userToken,
            website_token: effectiveWebsiteToken,
            title: b.title,
            h1: b.h1,
            url_path: b.url_path,
            page_type: b.page_type,
            parent_cluster: b.parent_cluster,
            primary_keyword: b.primary_keyword,
            intent: b.intent,
            secondary_keywords: b.secondary_keywords,
            target_queries: b.target_queries,
            summary: b.summary,
            internal_links: b.internal_links,
            cannibal_risk: b.cannibalization?.risk,
            cannibal_conflicts: b.cannibalization?.conflicts || [],
            recommendation: b.cannibalization?.recommendation || null,
            canonical_to: b.cannibalization?.canonical_to || null,
            word_count_min: b.metadata?.word_count_range?.[0] || 1200,
            word_count_max: b.metadata?.word_count_range?.[1] || 2000,
            tone: b.metadata?.tone || 'professional',
            notes: b.metadata?.notes || [],
            status: 'draft',
            scheduled_for: scheduledTime.toISOString()
          };
        });

        const { data: insBriefs, error: errBriefs } = await supabase
          .from('article_briefs')
          .insert(briefsRows)
          .select('id');
        if (!errBriefs) {
          savedCount = insBriefs?.length || 0;
        } else {
          throw errBriefs;
        }
      } catch (e) {
        console.log('[BRIEFS] article_briefs persistence failed:', e);
      }
    }

    const summary = summarizeBriefs(briefs);
    const payload: BriefsGenerationResponse & { queued?: number } = { success: true, briefs, summary };
    if (savedCount > 0) (payload as any).queued = savedCount;
    return NextResponse.json(payload);
  } catch (error) {
    console.error('[BRIEFS] Generation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate briefs' }, { status: 500 });
  }
}

// Helpers
function classifyPageType(idea: any): 'pillar' | 'cluster' | 'supporting' {
  const t = String(idea?.articleFormat?.type || '').toLowerCase();
  if (t === 'guide' || t === 'beginner-guide') return 'cluster';
  if (t === 'comparison' || t === 'faq' || t === 'how-to' || t === 'listicle') return 'supporting';
  return 'cluster';
}

function inferIntent(idea: any, primary: string | undefined): SearchIntent {
  const title = String(idea?.title || primary || '').toLowerCase();
  const fmt = String(idea?.articleFormat?.type || '').toLowerCase();
  if (/\b(vs|versus|compare|comparison)\b/.test(title) || fmt === 'comparison') return 'comparison';
  if (/\b(pricing|price|cost|rates|quote|quotes)\b/.test(title)) return 'pricing';
  if (/\b(miami|broward|florida|port|everglades)\b/.test(title)) return 'location';
  if (fmt === 'how-to' || fmt === 'faq' || fmt === 'guide' || fmt === 'beginner-guide') return 'informational';
  if (/\b(supplier|buy|wholesale|order|request)\b/.test(title)) return 'transactional';
  return 'informational';
}

function pickPrimary(idea: any, existing: Set<string>, used: Set<string>): string | undefined {
  const normalize = (s: string) => dedupeTokens(String(s || '').toLowerCase().trim());
  const candidates = ([] as string[])
    .concat(Array.isArray(idea.targetKeywords) ? idea.targetKeywords : [])
    .concat(Array.isArray(idea.targetQueries) ? idea.targetQueries : [])
    .map(normalize)
    .filter(Boolean);
  for (const c of candidates) {
    if (!used.has(c)) { used.add(c); return c; }
  }
  // Fallback to title noun phrase
  const base = String(idea.title || idea.mainTopic || '');
  const norm = normalize(base).replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (norm && !used.has(norm)) { used.add(norm); return norm; }
  return candidates[0] || norm || undefined;
}

function pickSecondaries(idea: any, primary?: string): string[] {
  const set = new Set<string>();
  const norm = (s?: string) => dedupeTokens(String(s || '').toLowerCase().trim());
  const push = (s?: string) => { const v = norm(s); if (v && v !== (primary || '')) set.add(v); };
  (Array.isArray(idea.targetQueries) ? idea.targetQueries : []).forEach((q: string) => push(q));
  (Array.isArray(idea.targetKeywords) ? idea.targetKeywords : []).forEach((k: string) => push(k));
  return Array.from(set).slice(0, 4).slice(0, Math.max(2, Math.min(4, set.size)));
}

function slugify(s: string): string { return s.toLowerCase().trim().replace(/&/g, ' and ').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-'); }
function toTitle(s: string): string { return s.split(/[-_\s]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '); }

// Remove immediate duplicate tokens (e.g., "importer importer" -> "importer") and collapse spaces
function dedupeTokens(input: string): string {
  const tokens = input
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (i === 0 || tokens[i] !== tokens[i - 1]) out.push(tokens[i]);
  }
  return out.join(' ');
}

function buildSummary(cluster: string | null, primary: string | undefined, intent: SearchIntent): string {
  const parts = [
    `Primary keyword: "${primary || cluster || ''}"`,
    `Intent: ${intent}`,
    cluster ? `Cluster: ${cluster}` : undefined,
    'One primary keyword per page. Include 2–4 secondary variants naturally.'
  ].filter(Boolean);
  return parts.join(' — ');
}

function buildNotes(intent: SearchIntent): string[] {
  const notes = [
    'Do not repeat the same head term + same intent across pages.',
    'If SERP shows mixed intents, scope the page clearly to one intent.',
    'Use descriptive anchors for internal links; avoid generic "click here".'
  ];
  if (intent === 'comparison') notes.push('Use a clear, scannable comparison table and pros/cons.');
  if (intent === 'pricing') notes.push('Include ranges, what drives cost up/down, and transparency disclaimers.');
  if (intent === 'location') notes.push('Localize examples and logistics; reference service coverage and ports.');
  return notes;
}

function buildSameClusterLinks(cluster: string | null, index: Record<string, { title: string; url: string | null; primary: string | null }[]>): Array<{ anchor: string; target: string; topic_cluster?: string | null; rationale?: string }> {
  if (!cluster) return [];
  const key = cluster.toLowerCase();
  return (index[key] || []).slice(0, 3).map(item => ({
    anchor: item.primary || item.title,
    target: item.url || `/${slugify(cluster)}/${slugify(item.primary || item.title)}`,
    topic_cluster: cluster,
    rationale: 'Same-cluster reinforcement and navigation'
  }));
}

function suggestPillarLink(cluster: string | null, index: Record<string, { title: string; url: string | null; primary: string | null }[]>): { anchor: string; target: string; topic_cluster?: string | null; rationale?: string } | null {
  if (!cluster) return null;
  const key = cluster.toLowerCase();
  const items = index[key] || [];
  // Heuristic: pick a guide/overview-like title as pillar
  const candidate = items.find(i => /guide|overview|ultimate|complete/i.test(i.title)) || items[0];
  if (!candidate) return null;
  return {
    anchor: candidate.title,
    target: candidate.url || `/${slugify(cluster)}`,
    topic_cluster: cluster,
    rationale: 'Link upward to the cluster pillar/hub'
  };
}

function summarizeBriefs(briefs: ContentBrief[]) {
  const by_intent: Record<string, number> = {};
  let none = 0, possible = 0, high = 0;
  for (const b of briefs) {
    by_intent[b.intent] = (by_intent[b.intent] || 0) + 1;
    if (b.cannibalization.risk === 'none') none++; else if (b.cannibalization.risk === 'possible') possible++; else high++;
  }
  return {
    total: briefs.length,
    by_intent,
    cannibalization: { none, possible, high }
  };
}
function refineTitle(current: string, cluster: string | null, primary: string, domain: string): string {
  const c = (current || '').toLowerCase();
  const primaryTitle = toTitle(primary || '');
  // Avoid generic titles like "General Tools" or "Best ... Tools for 2025"
  const genericPatterns = [/general\b/, /best .*tools/i];
  if (!primaryTitle && !genericPatterns.some(p => p.test(c))) return current;
  // Build a domain-aware title
  const niche = domain.includes('southflorida') ? 'South Florida' : '';
  const clusterTitle = cluster ? toTitle(cluster) : '';
  if (primaryTitle) {
    return `${toTitle(primary)}${niche ? ' — ' + niche : ''}`;
  }
  if (clusterTitle) {
    return `${clusterTitle}${niche ? ' — ' + niche : ''}`;
  }
  return current;
}

function extractClusterFromDomain(domain: string): string | null {
  if (domain.includes('southflorida')) return 'south-florida-imports';
  return null;
}
