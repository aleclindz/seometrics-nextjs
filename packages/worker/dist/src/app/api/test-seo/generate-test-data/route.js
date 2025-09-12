"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function POST(request) {
    try {
        const { userToken, siteUrl, testScenario } = await request.json();
        if (!userToken || !siteUrl) {
            return server_1.NextResponse.json({ error: 'Missing userToken or siteUrl' }, { status: 400 });
        }
        console.log(`[SEO TEST DATA] Generating test data for scenario: ${testScenario}`);
        let testResults = [];
        switch (testScenario) {
            case 'gsc_indexing_issues':
                testResults = await generateGSCIndexingIssues(userToken, siteUrl);
                break;
            case 'missing_sitemaps':
                testResults = await generateMissingSitemaps(userToken, siteUrl);
                break;
            case 'robots_issues':
                testResults = await generateRobotsIssues(userToken, siteUrl);
                break;
            case 'schema_missing':
                testResults = await generateSchemaMissing(userToken, siteUrl);
                break;
            case 'mobile_issues':
                testResults = await generateMobileIssues(userToken, siteUrl);
                break;
            case 'all_issues':
                const gscIssues = await generateGSCIndexingIssues(userToken, siteUrl);
                const sitemapIssues = await generateMissingSitemaps(userToken, siteUrl);
                const robotsIssues = await generateRobotsIssues(userToken, siteUrl);
                const schemaIssues = await generateSchemaMissing(userToken, siteUrl);
                const mobileIssues = await generateMobileIssues(userToken, siteUrl);
                testResults = [...gscIssues, ...sitemapIssues, ...robotsIssues, ...schemaIssues, ...mobileIssues];
                break;
            default:
                return server_1.NextResponse.json({ error: 'Invalid test scenario' }, { status: 400 });
        }
        return server_1.NextResponse.json({
            success: true,
            scenario: testScenario,
            siteUrl,
            issuesGenerated: testResults.length,
            details: testResults,
            message: `Generated ${testResults.length} test issues for ${testScenario}`
        });
    }
    catch (error) {
        console.error('[SEO TEST DATA] Error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: 'Failed to generate test data'
        }, { status: 500 });
    }
}
// Generate GSC URL Inspection issues
async function generateGSCIndexingIssues(userToken, siteUrl) {
    const testUrls = [
        '/blog/seo-guide',
        '/products/analytics',
        '/about-us',
        '/contact',
        '/pricing',
        '/features/automation'
    ];
    const issues = [];
    for (let i = 0; i < testUrls.length; i++) {
        const url = `${siteUrl}${testUrls[i]}`;
        const issueTypes = ['BLOCKED_BY_ROBOTS_TXT', 'NOT_FOUND', 'SERVER_ERROR', 'REDIRECT_ERROR'];
        const indexStatuses = ['FAIL', 'PARTIAL'];
        const issueType = issueTypes[i % issueTypes.length];
        const indexStatus = indexStatuses[i % indexStatuses.length];
        const { data, error } = await supabase
            .from('url_inspections')
            .upsert({
            user_token: userToken,
            site_url: siteUrl,
            inspected_url: url,
            index_status: indexStatus,
            can_be_indexed: false,
            index_status_description: getIndexStatusDescription(issueType),
            mobile_friendly: i % 2 === 0,
            has_canonical_tag: i % 3 === 0,
            canonical_url: i % 3 === 0 ? url : null,
            last_crawl_time: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
            inspected_at: new Date().toISOString()
        }, {
            onConflict: 'user_token,site_url,inspected_url'
        })
            .select()
            .single();
        if (!error) {
            issues.push({
                type: 'GSC_INDEXING_ISSUE',
                url,
                issue: issueType,
                severity: indexStatus === 'FAIL' ? 'high' : 'medium',
                details: getIndexStatusDescription(issueType),
                table: 'url_inspections',
                recordId: data.id
            });
        }
    }
    return issues;
}
// Generate missing sitemap issues
async function generateMissingSitemaps(userToken, siteUrl) {
    // Clear any existing sitemap submissions to simulate missing sitemaps
    await supabase
        .from('sitemap_submissions')
        .delete()
        .eq('user_token', userToken)
        .eq('site_url', siteUrl);
    return [{
            type: 'MISSING_SITEMAP',
            url: siteUrl,
            issue: 'No sitemap found in Google Search Console',
            severity: 'high',
            details: 'Website is missing XML sitemap submission to Google Search Console. This affects discoverability.',
            table: 'sitemap_submissions',
            recordId: null,
            action: 'generate_and_submit_sitemap'
        }];
}
// Generate robots.txt issues
async function generateRobotsIssues(userToken, siteUrl) {
    const { data, error } = await supabase
        .from('robots_analyses')
        .upsert({
        user_token: userToken,
        site_url: siteUrl,
        exists: false,
        accessible: false,
        size: 0,
        issues_count: 3,
        suggestions_count: 2,
        analyzed_at: new Date().toISOString(),
        content: null,
        crawl_delay: null,
        sitemap_urls: 0
    }, {
        onConflict: 'user_token,site_url'
    })
        .select()
        .single();
    if (!error) {
        return [{
                type: 'ROBOTS_TXT_MISSING',
                url: `${siteUrl}/robots.txt`,
                issue: 'robots.txt file is missing or inaccessible',
                severity: 'medium',
                details: 'Missing robots.txt file can lead to crawling inefficiencies and missed SEO opportunities.',
                table: 'robots_analyses',
                recordId: data.id,
                action: 'generate_robots_txt'
            }];
    }
    return [];
}
// Generate missing schema markup issues
async function generateSchemaMissing(userToken, siteUrl) {
    const websiteToken = `${siteUrl.replace(/https?:\/\//, '').replace(/\//g, '')}_${Date.now()}`;
    const testPages = [
        '/blog/seo-tips',
        '/about-us',
        '/products/main'
    ];
    const issues = [];
    for (const page of testPages) {
        const fullUrl = `${siteUrl}${page}`;
        const { data, error } = await supabase
            .from('schema_generations')
            .upsert({
            website_token: websiteToken,
            page_url: fullUrl,
            schemas_generated: 0,
            schema_types: [],
            generated_at: new Date().toISOString()
        }, {
            onConflict: 'website_token,page_url'
        })
            .select()
            .single();
        if (!error) {
            issues.push({
                type: 'MISSING_SCHEMA',
                url: fullUrl,
                issue: 'Page missing structured data schema markup',
                severity: 'medium',
                details: 'This page lacks structured data which helps search engines understand content better.',
                table: 'schema_generations',
                recordId: data.id,
                action: 'generate_schema_markup'
            });
        }
    }
    return issues;
}
// Generate mobile usability issues
async function generateMobileIssues(userToken, siteUrl) {
    const mobileProblems = [
        '/checkout',
        '/contact-form',
        '/product-gallery'
    ];
    const issues = [];
    for (let i = 0; i < mobileProblems.length; i++) {
        const url = `${siteUrl}${mobileProblems[i]}`;
        const { data, error } = await supabase
            .from('url_inspections')
            .upsert({
            user_token: userToken,
            site_url: siteUrl,
            inspected_url: url,
            index_status: 'PASS',
            can_be_indexed: true,
            mobile_friendly: false,
            mobile_issues: ['CONTENT_WIDER_THAN_SCREEN', 'CLICKABLE_ELEMENTS_TOO_CLOSE'],
            last_crawl_time: new Date(Date.now() - i * 12 * 60 * 60 * 1000).toISOString(),
            inspected_at: new Date().toISOString()
        }, {
            onConflict: 'user_token,site_url,inspected_url'
        })
            .select()
            .single();
        if (!error) {
            issues.push({
                type: 'MOBILE_USABILITY_ISSUE',
                url,
                issue: 'Mobile usability problems detected',
                severity: 'medium',
                details: 'Page has mobile-unfriendly elements that may hurt mobile search performance.',
                table: 'url_inspections',
                recordId: data.id,
                action: 'review_mobile_design'
            });
        }
    }
    return issues;
}
function getIndexStatusDescription(issueType) {
    const descriptions = {
        'BLOCKED_BY_ROBOTS_TXT': 'Page is blocked by robots.txt and cannot be indexed',
        'NOT_FOUND': 'Page returns 404 error and cannot be indexed',
        'SERVER_ERROR': 'Server error prevents page from being indexed',
        'REDIRECT_ERROR': 'Redirect chain issues prevent proper indexing'
    };
    return descriptions[issueType] || 'Unknown indexing issue';
}
async function GET(request) {
    return server_1.NextResponse.json({
        availableScenarios: [
            'gsc_indexing_issues',
            'missing_sitemaps',
            'robots_issues',
            'schema_missing',
            'mobile_issues',
            'all_issues'
        ],
        description: 'POST to /api/test-seo/generate-test-data with userToken, siteUrl, and testScenario'
    });
}
