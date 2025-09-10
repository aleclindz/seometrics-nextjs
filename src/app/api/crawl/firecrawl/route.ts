import { NextRequest, NextResponse } from 'next/server';
import { startCrawl, getCrawlStatus, getCrawlResult, scrapeUrl } from '@/services/crawl/firecrawl-client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, url, maxPages, includePaths, excludePaths } = body || {};

    if (action === 'start') {
      if (!url) return NextResponse.json({ success: false, error: 'url required' }, { status: 400 });
      const job = await startCrawl({ url, maxPages, includePaths, excludePaths, parseJS: true });
      return NextResponse.json({ success: true, job });
    }

    if (action === 'scrape') {
      if (!url) return NextResponse.json({ success: false, error: 'url required' }, { status: 400 });
      const page = await scrapeUrl(url);
      return NextResponse.json({ success: true, page });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[FIRECRAWL] POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const mode = searchParams.get('mode') || 'status';
    if (!jobId) return NextResponse.json({ success: false, error: 'jobId required' }, { status: 400 });

    if (mode === 'result') {
      const pages = await getCrawlResult(jobId);
      return NextResponse.json({ success: true, pages });
    }

    const status = await getCrawlStatus(jobId);
    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error('[FIRECRAWL] GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}

