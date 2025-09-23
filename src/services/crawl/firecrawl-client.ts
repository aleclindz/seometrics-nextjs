'use server';

/**
 * Firecrawl Client
 * Lightweight wrapper around Firecrawl API for crawling and scraping.
 * Docs: https://docs.firecrawl.dev/introduction
 */

interface StartCrawlOptions {
  url: string; // domain or full URL
  maxPages?: number;
  includePaths?: string[]; // e.g. ['/blog']
  excludePaths?: string[]; // e.g. ['/privacy']
  parseJS?: boolean; // render JavaScript
}

interface FirecrawlJob {
  jobId: string;
  status?: string;
}

interface CrawlResultPage {
  url: string;
  html?: string;
  markdown?: string;
  metadata?: any;
}

const FIRECRAWL_BASE = process.env.FIRECRAWL_API_URL || 'https://api.firecrawl.dev';

function getApiKey(): string {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) {
    throw new Error('FIRECRAWL_API_KEY is not set');
  }
  return key;
}

async function firecrawlFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${FIRECRAWL_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`,
      ...(init?.headers || {})
    },
    // Keep serverless timeouts in mind
    cache: 'no-store',
    // Add a client-side timeout to avoid hanging within the route's maxDuration
    signal: (init as any)?.signal ?? AbortSignal.timeout(10000)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Firecrawl error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function startCrawl(opts: StartCrawlOptions): Promise<FirecrawlJob> {
  const body: any = {
    url: opts.url,
    crawlerOptions: {
      limit: Math.max(1, Math.min(opts.maxPages || 50, 1000)),
      include: opts.includePaths || [],
      exclude: opts.excludePaths || []
    },
    // Return both raw HTML and markdown if available
    formats: ['html', 'markdown'],
    // Render JavaScript pages for modern sites
    pageOptions: {
      fetchPageContent: opts.parseJS !== false
    }
  };
  const data = await firecrawlFetch('/v0/crawl', {
    method: 'POST',
    body: JSON.stringify(body)
  });
  return { jobId: data.jobId || data.id || data.job?.id, status: data.status };
}

export async function getCrawlStatus(jobId: string): Promise<{ status: string; done: boolean; progress?: any; }>{
  const data = await firecrawlFetch(`/v0/crawl/status?jobId=${encodeURIComponent(jobId)}`);
  return { status: data.status, done: data.status === 'completed', progress: data };
}

export async function getCrawlResult(jobId: string): Promise<CrawlResultPage[]> {
  const data = await firecrawlFetch(`/v0/crawl/result?jobId=${encodeURIComponent(jobId)}`);
  const pages = Array.isArray(data.data) ? data.data : (data.pages || []);
  return pages.map((p: any) => ({
    url: p.url,
    html: p.html || p.content?.html,
    markdown: p.markdown || p.content?.markdown,
    metadata: p.metadata || p.meta || {}
  }));
}

export async function scrapeUrl(url: string): Promise<CrawlResultPage> {
  const data = await firecrawlFetch('/v0/scrape', {
    method: 'POST',
    body: JSON.stringify({ url, formats: ['html', 'markdown'], pageOptions: { fetchPageContent: true } })
  });
  const content = data.data || data;
  return {
    url: content.url || url,
    html: content.html || content.content?.html,
    markdown: content.markdown || content.content?.markdown,
    metadata: content.metadata || content.meta || {}
  };
}
