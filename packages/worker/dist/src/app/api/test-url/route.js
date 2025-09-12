"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const url = searchParams.get('url');
        if (!url) {
            return server_1.NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
        }
        // Validate URL format
        try {
            new URL(url);
        }
        catch (error) {
            return server_1.NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
        }
        console.log(`[TEST-URL] Testing URL: ${url}`);
        // Fetch the URL with timeout and proper headers
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'SEOAgent-URL-Tester/1.0 (+https://seoagent.com)',
                'Accept': '*/*',
            },
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
            return server_1.NextResponse.json({
                success: false,
                error: `HTTP ${response.status} ${response.statusText}`,
                status: response.status,
            });
        }
        const content = await response.text();
        const contentType = response.headers.get('content-type') || '';
        console.log(`[TEST-URL] Successfully fetched ${url} (${content.length} bytes, ${contentType})`);
        return server_1.NextResponse.json({
            success: true,
            status: response.status,
            contentType,
            content: content.substring(0, 10000), // Limit content size for security
            size: content.length,
        });
    }
    catch (error) {
        console.error('[TEST-URL] Error testing URL:', error);
        if (error instanceof Error && error.name === 'AbortError') {
            return server_1.NextResponse.json({
                success: false,
                error: 'Request timeout (10 seconds)',
            });
        }
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Network error',
        });
    }
}
