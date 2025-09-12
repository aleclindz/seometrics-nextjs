"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const VercelIntegration_1 = require("@/lib/hosting-providers/VercelIntegration");
const HostDetectionService_1 = require("@/lib/HostDetectionService");
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
/**
 * Comprehensive Vercel Integration Test Endpoint
 *
 * This endpoint tests all components of the Vercel integration system:
 * 1. Host detection for seoagent.com
 * 2. Vercel API connectivity
 * 3. Database operations
 * 4. SEO proxy functionality
 * 5. Complete deployment simulation
 */
async function GET(request) {
    const testResults = {
        timestamp: new Date().toISOString(),
        domain: 'seoagent.com',
        tests: {}
    };
    try {
        console.log('[VERCEL TEST] Starting comprehensive Vercel integration test...');
        // Test 1: Host Detection
        console.log('[VERCEL TEST] Test 1: Host Detection');
        try {
            const detectionResult = await HostDetectionService_1.HostDetectionService.detectProvider('seoagent.com', 'SEOAgent-Test/1.0');
            testResults.tests.hostDetection = {
                success: true,
                providersDetected: detectionResult.providers.length,
                primaryProvider: detectionResult.primaryProvider?.name,
                confidence: detectionResult.confidence,
                integrationAvailable: detectionResult.integrationAvailable,
                recommendations: detectionResult.recommendations
            };
            console.log('[VERCEL TEST] Host detection completed:', detectionResult.primaryProvider?.name);
        }
        catch (error) {
            testResults.tests.hostDetection = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
        // Test 2: Database Connectivity
        console.log('[VERCEL TEST] Test 2: Database Connectivity');
        try {
            // Test fingerprints table
            const { data: fingerprints, error: fpError } = await supabase
                .from('hosting_provider_fingerprints')
                .select('count')
                .limit(1);
            // Test integrations table
            const { data: integrations, error: intError } = await supabase
                .from('hosting_integrations')
                .select('count')
                .limit(1);
            // Test SEO content table
            const { data: seoContent, error: seoError } = await supabase
                .from('hosting_seo_content')
                .select('count')
                .limit(1);
            testResults.tests.database = {
                success: !fpError && !intError && !seoError,
                tables: {
                    fingerprints: !fpError,
                    integrations: !intError,
                    seoContent: !seoError
                },
                errors: [fpError, intError, seoError].filter(Boolean)
            };
            console.log('[VERCEL TEST] Database connectivity verified');
        }
        catch (error) {
            testResults.tests.database = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
        // Test 3: Vercel API (if credentials available)
        console.log('[VERCEL TEST] Test 3: Vercel API Connectivity');
        const testToken = process.env.VERCEL_TEST_TOKEN;
        const testProjectId = process.env.VERCEL_TEST_PROJECT_ID;
        if (testToken && testProjectId) {
            try {
                const vercelIntegration = new VercelIntegration_1.VercelIntegration({
                    accessToken: testToken,
                    projectId: testProjectId,
                    deploymentMethod: 'redirects',
                    sitemapProxyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/seo-proxy/sitemap`,
                    robotsProxyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/seo-proxy/robots`
                });
                const verification = await vercelIntegration.verifyConnection();
                testResults.tests.vercelAPI = {
                    success: verification.valid,
                    project: verification.project ? {
                        id: verification.project.id,
                        name: verification.project.name,
                        framework: verification.project.framework
                    } : null,
                    error: verification.error
                };
                console.log('[VERCEL TEST] Vercel API verification:', verification.valid);
            }
            catch (error) {
                testResults.tests.vercelAPI = {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        }
        else {
            testResults.tests.vercelAPI = {
                success: null,
                message: 'Skipped - No test credentials (VERCEL_TEST_TOKEN, VERCEL_TEST_PROJECT_ID)'
            };
        }
        // Test 4: SEO Proxy Functionality
        console.log('[VERCEL TEST] Test 4: SEO Proxy Functionality');
        try {
            const testDomain = 'test-domain.com';
            const testUserToken = 'test-user-token';
            const testSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${testDomain}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
            const testRobots = `User-agent: *\nAllow: /\n\nSitemap: https://${testDomain}/sitemap.xml`;
            // Store test content
            const storeResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/hosting/store-seo-content`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    domain: testDomain,
                    userToken: testUserToken,
                    sitemapContent: testSitemap,
                    robotsContent: testRobots,
                    provider: 'test'
                })
            });
            const storeResult = await storeResponse.json();
            // Test retrieval
            const retrieveResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/seo-proxy/sitemap?domain=${testDomain}&token=${testUserToken}`);
            const retrieveResult = await retrieveResponse.text();
            // Cleanup test data
            await supabase
                .from('hosting_seo_content')
                .delete()
                .eq('user_token', testUserToken)
                .eq('domain', testDomain);
            testResults.tests.seoProxy = {
                success: storeResponse.ok && retrieveResponse.ok && retrieveResult.includes(testDomain),
                store: { success: storeResponse.ok, status: storeResponse.status },
                retrieve: { success: retrieveResponse.ok, status: retrieveResponse.status },
                contentMatch: retrieveResult.includes(testDomain)
            };
            console.log('[VERCEL TEST] SEO proxy functionality verified');
        }
        catch (error) {
            testResults.tests.seoProxy = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
        // Test 5: API Endpoints
        console.log('[VERCEL TEST] Test 5: API Endpoints Accessibility');
        const endpoints = [
            '/api/hosting/vercel/verify',
            '/api/hosting/vercel/deploy',
            '/api/hosting/vercel/status',
            '/api/hosting/vercel/oauth',
            '/api/seo-proxy/sitemap',
            '/api/seo-proxy/robots',
            '/api/hosting/store-seo-content'
        ];
        const endpointResults = {};
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}${endpoint}`, {
                    method: 'GET'
                });
                endpointResults[endpoint] = {
                    accessible: true,
                    status: response.status,
                    // Most endpoints should return 400 for missing parameters, not 404
                    expectedBehavior: [400, 405].includes(response.status) || (endpoint === '/api/hosting/vercel/oauth' && response.status === 200)
                };
            }
            catch (error) {
                endpointResults[endpoint] = {
                    accessible: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        }
        testResults.tests.apiEndpoints = {
            success: Object.values(endpointResults).every((result) => result.accessible),
            endpoints: endpointResults
        };
        // Test 6: Environment Variables Check
        console.log('[VERCEL TEST] Test 6: Environment Variables');
        const requiredEnvVars = [
            'NEXT_PUBLIC_SUPABASE_URL',
            'SUPABASE_SERVICE_ROLE_KEY',
            'NEXT_PUBLIC_APP_URL'
        ];
        const optionalEnvVars = [
            'VERCEL_CLIENT_ID',
            'VERCEL_CLIENT_SECRET',
            'VERCEL_TEST_TOKEN',
            'VERCEL_TEST_PROJECT_ID'
        ];
        const envCheck = {
            required: {},
            optional: {}
        };
        requiredEnvVars.forEach(envVar => {
            envCheck.required[envVar] = !!process.env[envVar];
        });
        optionalEnvVars.forEach(envVar => {
            envCheck.optional[envVar] = !!process.env[envVar];
        });
        testResults.tests.environment = {
            success: Object.values(envCheck.required).every(Boolean),
            required: envCheck.required,
            optional: envCheck.optional
        };
        // Overall Test Results
        const allTests = Object.values(testResults.tests);
        const successfulTests = allTests.filter((test) => test.success === true).length;
        const failedTests = allTests.filter((test) => test.success === false).length;
        const skippedTests = allTests.filter((test) => test.success === null).length;
        testResults.summary = {
            total: allTests.length,
            successful: successfulTests,
            failed: failedTests,
            skipped: skippedTests,
            overallSuccess: failedTests === 0,
            readyForProduction: failedTests === 0 && testResults.tests.vercelAPI?.success !== false
        };
        console.log('[VERCEL TEST] Test completed:', testResults.summary);
        return server_1.NextResponse.json(testResults, { status: 200 });
    }
    catch (error) {
        console.error('[VERCEL TEST] Test suite error:', error);
        return server_1.NextResponse.json({
            ...testResults,
            error: error instanceof Error ? error.message : 'Unknown error',
            summary: {
                overallSuccess: false,
                testSuiteError: true
            }
        }, { status: 500 });
    }
}
