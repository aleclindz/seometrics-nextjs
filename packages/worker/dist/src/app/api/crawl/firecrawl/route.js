"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const firecrawl_client_1 = require("@/services/crawl/firecrawl-client");
exports.dynamic = 'force-dynamic';
async function POST(request) {
    try {
        const body = await request.json();
        const { action, url, maxPages, includePaths, excludePaths } = body || {};
        if (action === 'start') {
            if (!url)
                return server_1.NextResponse.json({ success: false, error: 'url required' }, { status: 400 });
            const job = await (0, firecrawl_client_1.startCrawl)({ url, maxPages, includePaths, excludePaths, parseJS: true });
            return server_1.NextResponse.json({ success: true, job });
        }
        if (action === 'scrape') {
            if (!url)
                return server_1.NextResponse.json({ success: false, error: 'url required' }, { status: 400 });
            const page = await (0, firecrawl_client_1.scrapeUrl)(url);
            return server_1.NextResponse.json({ success: true, page });
        }
        return server_1.NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
    catch (error) {
        console.error('[FIRECRAWL] POST error:', error);
        return server_1.NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
    }
}
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get('jobId');
        const mode = searchParams.get('mode') || 'status';
        if (!jobId)
            return server_1.NextResponse.json({ success: false, error: 'jobId required' }, { status: 400 });
        if (mode === 'result') {
            const pages = await (0, firecrawl_client_1.getCrawlResult)(jobId);
            return server_1.NextResponse.json({ success: true, pages });
        }
        const status = await (0, firecrawl_client_1.getCrawlStatus)(jobId);
        return server_1.NextResponse.json({ success: true, status });
    }
    catch (error) {
        console.error('[FIRECRAWL] GET error:', error);
        return server_1.NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
    }
}
