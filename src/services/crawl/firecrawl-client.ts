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

type RequestInitWithTimeout = RequestInit & { timeoutMs?: number };

async function firecrawlFetch(path: string, init?: RequestInitWithTimeout) {
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
    signal: (init as any)?.signal ?? AbortSignal.timeout((init as any)?.timeoutMs ?? 10000)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');

    // Enhanced error logging for rate limits and concurrency issues
    if (res.status === 429) {
      console.error(`[FIRECRAWL] Rate limit exceeded: ${text}`);
      throw new Error(`Firecrawl rate limit exceeded. Please try again in a few minutes.`);
    }

    if (res.status === 503) {
      console.error(`[FIRECRAWL] Service unavailable (concurrent limit?): ${text}`);
      throw new Error(`Firecrawl service temporarily unavailable. Too many concurrent requests.`);
    }

    console.error(`[FIRECRAWL] Error ${res.status} for ${path}: ${text}`);
    throw new Error(`Firecrawl error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function startCrawl(opts: StartCrawlOptions & { timeoutMs?: number }): Promise<FirecrawlJob> {
  console.log(`[FIRECRAWL] Starting crawl for ${opts.url} (maxPages: ${opts.maxPages || 50})`);

  const body: any = {
    url: opts.url,
    limit: Math.max(1, Math.min(opts.maxPages || 50, 1000)),
    includePaths: opts.includePaths || [],
    excludePaths: opts.excludePaths || [],
    scrapeOptions: {
      formats: ['html', 'markdown']
    }
  };

  try {
    const data = await firecrawlFetch('/v2/crawl', {
      method: 'POST',
      body: JSON.stringify(body),
      timeoutMs: opts.timeoutMs
    });

    console.log(`[FIRECRAWL] Crawl started successfully: ${data.jobId || data.id || data.job?.id}`);
    return { jobId: data.jobId || data.id || data.job?.id, status: data.status };
  } catch (error) {
    console.error(`[FIRECRAWL] Failed to start crawl for ${opts.url}:`, error);
    throw error;
  }
}

export async function getCrawlStatus(jobId: string, timeoutMs?: number): Promise<{ status: string; done: boolean; progress?: any; }>{
  const data = await firecrawlFetch(`/v2/crawl/${encodeURIComponent(jobId)}`, { timeoutMs });
  return { status: data.status, done: data.status === 'completed', progress: data };
}

export async function getCrawlResult(jobId: string, timeoutMs?: number): Promise<CrawlResultPage[]> {
  const data = await firecrawlFetch(`/v2/crawl/${encodeURIComponent(jobId)}`, { timeoutMs });
  const pages = Array.isArray(data.data) ? data.data : (data.pages || []);
  return pages.map((p: any) => ({
    url: p.url,
    html: p.html || p.content?.html,
    markdown: p.markdown || p.content?.markdown,
    metadata: p.metadata || p.meta || {}
  }));
}

export async function scrapeUrl(url: string, opts?: { timeoutMs?: number }): Promise<CrawlResultPage> {
  console.log(`[FIRECRAWL] Scraping URL: ${url}`);

  try {
    const data = await firecrawlFetch('/v2/scrape', {
      method: 'POST',
      body: JSON.stringify({
        url,
        formats: ['html', 'markdown']
      }),
      timeoutMs: opts?.timeoutMs ?? 5000
    });
    const content = data.data || data;

    console.log(`[FIRECRAWL] Successfully scraped: ${url}`);
    return {
      url: content.url || url,
      html: content.html || content.content?.html,
      markdown: content.markdown || content.content?.markdown,
      metadata: content.metadata || content.meta || {}
    };
  } catch (error) {
    console.error(`[FIRECRAWL] Failed to scrape ${url}:`, error);
    throw error;
  }
}

/**
 * Batch scrape multiple URLs
 */
export async function scrapeUrlsWithFirecrawl(urls: string[]): Promise<CrawlResultPage[]> {
  const results: CrawlResultPage[] = [];

  for (const url of urls) {
    try {
      const result = await scrapeUrl(url);
      results.push(result);

      // Small delay between requests to avoid rate limiting
      if (urls.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`[FIRECRAWL] Failed to scrape ${url}:`, error);
      // Continue with other URLs even if one fails
    }
  }

  return results;
}
