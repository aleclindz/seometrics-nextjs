'use server';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCrawl = startCrawl;
exports.getCrawlStatus = getCrawlStatus;
exports.getCrawlResult = getCrawlResult;
exports.scrapeUrl = scrapeUrl;
const FIRECRAWL_BASE = process.env.FIRECRAWL_API_URL || 'https://api.firecrawl.dev';
function getApiKey() {
    const key = process.env.FIRECRAWL_API_KEY;
    if (!key) {
        throw new Error('FIRECRAWL_API_KEY is not set');
    }
    return key;
}
async function firecrawlFetch(path, init) {
    const res = await fetch(`${FIRECRAWL_BASE}${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getApiKey()}`,
            ...(init?.headers || {})
        },
        // Keep serverless timeouts in mind
        cache: 'no-store'
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Firecrawl error ${res.status}: ${text}`);
    }
    return res.json();
}
async function startCrawl(opts) {
    const body = {
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
async function getCrawlStatus(jobId) {
    const data = await firecrawlFetch(`/v0/crawl/status?jobId=${encodeURIComponent(jobId)}`);
    return { status: data.status, done: data.status === 'completed', progress: data };
}
async function getCrawlResult(jobId) {
    const data = await firecrawlFetch(`/v0/crawl/result?jobId=${encodeURIComponent(jobId)}`);
    const pages = Array.isArray(data.data) ? data.data : (data.pages || []);
    return pages.map((p) => ({
        url: p.url,
        html: p.html || p.content?.html,
        markdown: p.markdown || p.content?.markdown,
        metadata: p.metadata || p.meta || {}
    }));
}
async function scrapeUrl(url) {
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
