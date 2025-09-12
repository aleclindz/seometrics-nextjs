"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
exports.POST = POST;
exports.HEAD = HEAD;
const server_1 = require("next/server");
const function_caller_1 = require("@/services/chat/function-caller");
const function_schemas_1 = require("@/services/chat/function-schemas");
exports.dynamic = 'force-dynamic';
async function GET(request) {
    const { searchParams } = new URL(request.url);
    const capability = searchParams.get('capability');
    const userToken = searchParams.get('userToken') || 'test-token';
    const siteUrl = searchParams.get('siteUrl') || 'https://example.com';
    if (capability) {
        // Test single capability
        const result = await testSingleCapability(capability, userToken, siteUrl);
        return server_1.NextResponse.json(result);
    }
    // Test all capabilities
    const results = await testAllCapabilities(userToken, siteUrl);
    return server_1.NextResponse.json({
        success: true,
        totalCapabilities: results.length,
        successfulTests: results.filter(r => r.success).length,
        failedTests: results.filter(r => !r.success).length,
        results
    });
}
async function POST(request) {
    try {
        const { capability, args, userToken } = await request.json();
        if (!capability || !args || !userToken) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Missing required fields: capability, args, userToken'
            }, { status: 400 });
        }
        const result = await executeCapabilityTest(capability, args, userToken);
        return server_1.NextResponse.json(result);
    }
    catch (error) {
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
async function testAllCapabilities(userToken, siteUrl) {
    const capabilities = [
        'GSC_sync_data',
        'CONTENT_optimize_existing',
        'SEO_apply_fixes',
        'SEO_analyze_technical',
        'SEO_crawl_website',
        'SITEMAP_generate_submit',
        'CMS_strapi_publish',
        'VERIFY_check_changes',
        'CMS_wordpress_publish',
        'CONTENT_generate_article'
    ];
    const results = [];
    for (const capability of capabilities) {
        const result = await testSingleCapability(capability, userToken, siteUrl);
        results.push(result);
    }
    return results;
}
async function testSingleCapability(capability, userToken, siteUrl) {
    const startTime = Date.now();
    try {
        const testArgs = getTestArgs(capability, siteUrl);
        const result = await executeCapabilityTest(capability, testArgs, userToken);
        return {
            capability,
            success: result.success,
            result: result.data,
            executionTime: Date.now() - startTime
        };
    }
    catch (error) {
        return {
            capability,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            executionTime: Date.now() - startTime
        };
    }
}
async function executeCapabilityTest(capability, args, userToken) {
    // Validate arguments first
    const validation = (0, function_schemas_1.validateFunctionArgs)(capability, args);
    if (!validation.success) {
        return {
            success: false,
            error: `Validation failed: ${validation.error}`
        };
    }
    // Execute the function
    const functionCaller = new function_caller_1.FunctionCaller(userToken);
    const result = await functionCaller.executeFunction(capability, validation.data);
    return {
        success: result.success,
        data: result.data,
        error: result.error
    };
}
function getTestArgs(capability, siteUrl) {
    const testArgs = {
        'GSC_sync_data': {
            site_url: siteUrl,
            date_range: '30d'
        },
        'CONTENT_optimize_existing': {
            page_url: `${siteUrl}/blog/test-post`,
            target_keywords: ['seo optimization', 'technical seo']
        },
        'SEO_apply_fixes': {
            site_url: siteUrl,
            fix_types: ['meta_tags', 'alt_text', 'canonical_urls']
        },
        'SEO_analyze_technical': {
            site_url: siteUrl,
            check_mobile: true
        },
        'SEO_crawl_website': {
            site_url: siteUrl,
            max_pages: 10,
            crawl_depth: 2
        },
        'SITEMAP_generate_submit': {
            site_url: siteUrl,
            submit_to_gsc: true
        },
        'CMS_strapi_publish': {
            content: {
                title: 'Test Article',
                body: 'This is a test article for capability testing.',
                slug: 'test-article'
            },
            publish: false
        },
        'VERIFY_check_changes': {
            target_url: `${siteUrl}/test-page`,
            expected_changes: ['meta description updated', 'title tag optimized']
        },
        'CMS_wordpress_publish': {
            content: {
                title: 'Test WordPress Article',
                content: 'This is a test article for WordPress publishing.',
                status: 'draft'
            },
            publish: false
        },
        'CONTENT_generate_article': {
            topic: 'SEO Best Practices',
            keywords: ['seo', 'optimization', 'search rankings'],
            word_count: 800
        }
    };
    return testArgs[capability] || {};
}
// Health check endpoint
async function HEAD() {
    return new server_1.NextResponse('OK', { status: 200 });
}
