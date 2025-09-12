"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function POST(request) {
    try {
        const { userToken, siteUrl, scanType = 'full' } = await request.json();
        if (!userToken || !siteUrl) {
            return server_1.NextResponse.json({ error: 'Missing userToken or siteUrl' }, { status: 400 });
        }
        console.log(`[SEO-SCAN] Starting ${scanType} scan for: ${siteUrl}`);
        const scanResults = {
            siteUrl,
            scanType,
            timestamp: new Date().toISOString(),
            issues: [],
            summary: {
                critical: 0,
                warnings: 0,
                passed: 0,
                total: 0
            }
        };
        // 1. Check indexability
        const indexabilityResults = await checkIndexability(siteUrl, userToken);
        scanResults.issues.push(...indexabilityResults.issues);
        // 2. Check canonical tags
        const canonicalResults = await checkCanonicalTags(siteUrl);
        scanResults.issues.push(...canonicalResults.issues);
        // 3. Check meta tags
        const metaResults = await checkMetaTags(siteUrl);
        scanResults.issues.push(...metaResults.issues);
        // 4. Check schema markup
        const schemaResults = await checkSchemaMarkup(siteUrl);
        scanResults.issues.push(...schemaResults.issues);
        // 5. Check robots.txt (if full scan)
        if (scanType === 'full') {
            const robotsResults = await checkRobotsTxt(siteUrl);
            scanResults.issues.push(...robotsResults.issues);
        }
        // Calculate summary
        scanResults.issues.forEach(issue => {
            scanResults.summary.total++;
            if (issue.severity === 'critical')
                scanResults.summary.critical++;
            else if (issue.severity === 'warning')
                scanResults.summary.warnings++;
            else
                scanResults.summary.passed++;
        });
        // Store scan results
        await storeScanResults(userToken, scanResults);
        return server_1.NextResponse.json({
            success: true,
            data: scanResults,
            message: `SEO scan completed. Found ${scanResults.summary.critical} critical issues and ${scanResults.summary.warnings} warnings.`
        });
    }
    catch (error) {
        console.error('[SEO-SCAN] Error:', error);
        return server_1.NextResponse.json({ error: 'SEO scan failed' }, { status: 500 });
    }
}
async function checkIndexability(siteUrl, userToken) {
    const issues = [];
    try {
        // Call existing robots-status API
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/gsc/robots-status?userToken=${userToken}&siteUrl=${encodeURIComponent(siteUrl)}`);
        if (response.ok) {
            const robotsData = await response.json();
            // Check for robots.txt issues
            if (robotsData.robots_txt_issues && robotsData.robots_txt_issues.length > 0) {
                issues.push({
                    type: 'robots_txt_error',
                    severity: 'warning',
                    category: 'indexability',
                    title: 'Robots.txt Issues Detected',
                    description: robotsData.robots_txt_issues.join(', '),
                    fix: 'Review and fix robots.txt file',
                    selector: null,
                    metadata: { robotsData }
                });
            }
            // Check fetch status
            if (robotsData.google_fetch_status === 'error') {
                issues.push({
                    type: 'fetch_error',
                    severity: 'critical',
                    category: 'indexability',
                    title: 'Site Cannot Be Fetched by Google',
                    description: 'Google is unable to fetch this website',
                    fix: 'Check server configuration and accessibility',
                    selector: null,
                    metadata: { fetchStatus: robotsData.google_fetch_status }
                });
            }
        }
    }
    catch (error) {
        console.warn('[SEO-SCAN] Could not check robots status:', error);
    }
    return { issues };
}
async function checkCanonicalTags(siteUrl) {
    const issues = [];
    try {
        // Basic canonical checks
        const response = await fetch(siteUrl, { method: 'HEAD' });
        if (!response.ok) {
            issues.push({
                type: 'site_unreachable',
                severity: 'critical',
                category: 'technical',
                title: 'Website Unreachable',
                description: `Site returned ${response.status} status code`,
                fix: 'Check server configuration and site availability',
                selector: null,
                metadata: { statusCode: response.status }
            });
        }
    }
    catch (error) {
        issues.push({
            type: 'connection_error',
            severity: 'critical',
            category: 'technical',
            title: 'Connection Error',
            description: 'Unable to connect to website',
            fix: 'Verify website URL and server availability',
            selector: null,
            metadata: { error: error instanceof Error ? error.message : String(error) }
        });
    }
    return { issues };
}
async function checkMetaTags(siteUrl) {
    const issues = [];
    // This would normally fetch and parse the HTML
    // For now, we'll add a placeholder that could be enhanced
    issues.push({
        type: 'meta_scan_placeholder',
        severity: 'info',
        category: 'content',
        title: 'Meta Tags Analysis',
        description: 'Meta tags will be analyzed by SEOAgent.js when the page loads',
        fix: 'Install SEOAgent.js to automatically optimize meta tags',
        selector: 'meta',
        metadata: { automated: true }
    });
    return { issues };
}
async function checkSchemaMarkup(siteUrl) {
    const issues = [];
    // Placeholder for schema analysis
    issues.push({
        type: 'schema_scan_placeholder',
        severity: 'info',
        category: 'technical',
        title: 'Schema Markup Analysis',
        description: 'Schema markup will be analyzed and generated by SEOAgent.js',
        fix: 'SEOAgent.js automatically adds missing schema markup',
        selector: 'script[type="application/ld+json"]',
        metadata: { automated: true }
    });
    return { issues };
}
async function checkRobotsTxt(siteUrl) {
    const issues = [];
    try {
        const robotsUrl = `${siteUrl.replace(/\/$/, '')}/robots.txt`;
        const response = await fetch(robotsUrl, { method: 'HEAD' });
        if (response.status === 404) {
            issues.push({
                type: 'robots_missing',
                severity: 'warning',
                category: 'indexability',
                title: 'Robots.txt Not Found',
                description: 'No robots.txt file found at the root of the website',
                fix: 'Create a robots.txt file to guide search engine crawlers',
                selector: null,
                metadata: { robotsUrl }
            });
        }
        else if (!response.ok) {
            issues.push({
                type: 'robots_error',
                severity: 'warning',
                category: 'indexability',
                title: 'Robots.txt Error',
                description: `Robots.txt returned ${response.status} status code`,
                fix: 'Fix robots.txt file accessibility',
                selector: null,
                metadata: { statusCode: response.status, robotsUrl }
            });
        }
    }
    catch (error) {
        issues.push({
            type: 'robots_check_failed',
            severity: 'warning',
            category: 'indexability',
            title: 'Unable to Check Robots.txt',
            description: 'Could not verify robots.txt file',
            fix: 'Manually verify robots.txt exists and is accessible',
            selector: null,
            metadata: { error: error instanceof Error ? error.message : String(error) }
        });
    }
    return { issues };
}
async function storeScanResults(userToken, scanResults) {
    try {
        // Store in seo_monitoring_events table
        const events = scanResults.issues.map((issue) => ({
            user_token: userToken,
            site_url: scanResults.siteUrl,
            page_url: scanResults.siteUrl,
            event_type: issue.type,
            severity: issue.severity,
            category: issue.category,
            title: issue.title,
            description: issue.description,
            old_value: null,
            new_value: null,
            auto_fixed: false,
            fix_applied: null,
            source: 'tool-scan',
            metadata: issue.metadata || {}
        }));
        if (events.length > 0) {
            await supabase
                .from('seo_monitoring_events')
                .insert(events);
        }
    }
    catch (error) {
        console.error('[SEO-SCAN] Error storing results:', error);
    }
}
// Also support GET requests for quick scans
async function GET(request) {
    const userToken = request.nextUrl.searchParams.get('userToken');
    const siteUrl = request.nextUrl.searchParams.get('siteUrl');
    const scanType = request.nextUrl.searchParams.get('scanType') || 'quick';
    if (!userToken || !siteUrl) {
        return server_1.NextResponse.json({ error: 'Missing userToken or siteUrl' }, { status: 400 });
    }
    return POST(request);
}
