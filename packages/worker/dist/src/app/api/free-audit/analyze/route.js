"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const firecrawl_client_1 = require("@/services/crawl/firecrawl-client");
exports.dynamic = 'force-dynamic';
function analyzePages(pages) {
    const limit = Math.min(pages.length, 80);
    let missingTitle = 0, missingDesc = 0, noH1 = 0, noCanonical = 0, noindex = 0;
    const samples = [];
    for (const p of pages.slice(0, limit)) {
        const html = p.html || '';
        const issues = [];
        if (!/<title[^>]*>[^<]{2,}<\/title>/i.test(html)) {
            missingTitle++;
            issues.push('missing_title');
        }
        if (!/<meta[^>]+name=["']description["'][^>]*content=["'][^"']{5,}["'][^>]*>/i.test(html)) {
            missingDesc++;
            issues.push('missing_meta_description');
        }
        if (!/<h1[^>]*>[^<]{2,}<\/h1>/i.test(html)) {
            noH1++;
            issues.push('missing_h1');
        }
        if (!/<link[^>]+rel=["']canonical["'][^>]*href=["'][^"']+["'][^>]*>/i.test(html)) {
            noCanonical++;
            issues.push('missing_canonical');
        }
        if (/<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex[^"']*["'][^>]*>/i.test(html)) {
            noindex++;
            issues.push('noindex');
        }
        if (issues.length && samples.length < 10)
            samples.push({ url: p.url, issues });
    }
    const totals = {
        total_pages: pages.length,
        analyzed_pages: limit,
        issues: {
            missing_title: missingTitle,
            missing_meta_description: missingDesc,
            missing_h1: noH1,
            missing_canonical: noCanonical,
            noindex
        },
        samples
    };
    const recommendations = [];
    if (missingTitle > 0)
        recommendations.push('Add descriptive <title> tags to pages missing titles');
    if (missingDesc > 0)
        recommendations.push('Write compelling meta descriptions for pages missing descriptions');
    if (noH1 > 0)
        recommendations.push('Ensure a single, descriptive H1 exists on key pages');
    if (noCanonical > 0)
        recommendations.push('Add canonical tags to prevent duplicate content issues');
    if (noindex > 0)
        recommendations.push('Remove unintended noindex directives on important pages');
    return { totals, recommendations };
}
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get('jobId');
        if (!jobId)
            return server_1.NextResponse.json({ success: false, error: 'jobId required' }, { status: 400 });
        const pages = await (0, firecrawl_client_1.getCrawlResult)(jobId);
        const { totals, recommendations } = analyzePages(pages);
        return server_1.NextResponse.json({ success: true, totals, recommendations, pagesAnalyzed: pages.length });
    }
    catch (error) {
        console.error('[FREE AUDIT] analyze error:', error);
        return server_1.NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
    }
}
