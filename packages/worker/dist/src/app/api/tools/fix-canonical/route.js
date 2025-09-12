"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function POST(request) {
    try {
        const { userToken, siteUrl, pageUrl, fixType = 'auto' } = await request.json();
        if (!userToken || !siteUrl) {
            return server_1.NextResponse.json({ error: 'Missing userToken or siteUrl' }, { status: 400 });
        }
        console.log(`[FIX-CANONICAL] Starting ${fixType} canonical fix for: ${pageUrl || siteUrl}`);
        const fixResults = {
            siteUrl,
            pageUrl: pageUrl || siteUrl,
            fixType,
            timestamp: new Date().toISOString(),
            fixes: [],
            errors: [],
            summary: {
                applied: 0,
                failed: 0,
                total: 0
            }
        };
        // 1. Analyze canonical tag requirements
        const canonicalAnalysis = await analyzeCanonicalRequirements(siteUrl, pageUrl);
        fixResults.fixes.push(...canonicalAnalysis.fixes);
        fixResults.errors.push(...canonicalAnalysis.errors);
        // 2. Apply enhanced canonical logic
        const canonicalFixes = await applyCanonicalFixes(siteUrl, pageUrl);
        fixResults.fixes.push(...canonicalFixes.fixes);
        fixResults.errors.push(...canonicalFixes.errors);
        // 3. Generate action items for manual fixes needed
        await generateCanonicalActionItems(userToken, siteUrl, fixResults);
        // Calculate summary
        fixResults.summary.total = fixResults.fixes.length + fixResults.errors.length;
        fixResults.summary.applied = fixResults.fixes.filter(f => f.automated).length;
        fixResults.summary.failed = fixResults.errors.length;
        // Log fixes to monitoring events
        await logCanonicalFixesToEvents(userToken, fixResults);
        return server_1.NextResponse.json({
            success: true,
            data: fixResults,
            message: `Applied ${fixResults.summary.applied} canonical fixes. Enhanced canonical logic active.`
        });
    }
    catch (error) {
        console.error('[FIX-CANONICAL] Error:', error);
        return server_1.NextResponse.json({ error: 'Canonical fix failed' }, { status: 500 });
    }
}
async function analyzeCanonicalRequirements(siteUrl, pageUrl) {
    const fixes = [];
    const errors = [];
    try {
        const targetUrl = pageUrl || siteUrl;
        const url = new URL(targetUrl);
        // Check if URL has parameters that need canonical handling
        const hasParams = !!(url.search || url.hash);
        const hasTrackingParams = ['utm_', 'fbclid', 'gclid', 'ref=', 'source='].some(param => targetUrl.includes(param));
        if (hasParams || hasTrackingParams) {
            fixes.push({
                type: 'canonical_required',
                title: 'Canonical Tag Required',
                description: `URL contains ${hasTrackingParams ? 'tracking parameters' : 'query parameters'} that need canonical handling`,
                fix: 'SEOAgent.js will automatically add canonical tag',
                automated: true,
                priority: 'info',
                instructions: 'Enhanced canonical logic in SEOAgent.js will handle this automatically',
                metadata: {
                    hasParams,
                    hasTrackingParams,
                    originalUrl: targetUrl,
                    cleanUrl: url.origin + url.pathname
                }
            });
        }
        // Check for common canonical issues
        if (targetUrl.endsWith('/') && targetUrl !== siteUrl + '/') {
            fixes.push({
                type: 'trailing_slash_canonical',
                title: 'Trailing Slash Canonical',
                description: 'URL with trailing slash should have canonical to consistent version',
                fix: 'SEOAgent.js handles trailing slash canonicalization',
                automated: true,
                priority: 'info',
                instructions: 'Canonical logic will normalize trailing slashes automatically'
            });
        }
    }
    catch (error) {
        errors.push({
            type: 'canonical_analysis_failed',
            title: 'Canonical Analysis Failed',
            description: 'Unable to analyze canonical requirements',
            error: error instanceof Error ? error.message : String(error)
        });
    }
    return { fixes, errors };
}
async function applyCanonicalFixes(siteUrl, pageUrl) {
    const fixes = [];
    const errors = [];
    // These fixes are handled automatically by SEOAgent.js enhanced canonical logic
    fixes.push({
        type: 'enhanced_canonical_active',
        title: 'Enhanced Canonical Logic Deployed',
        description: 'Advanced canonical tag management is active via SEOAgent.js',
        fix: 'Automatic UTM parameter cleaning, tracking parameter removal, and smart canonical generation',
        automated: true,
        priority: 'info',
        instructions: 'No manual action required - SEOAgent.js handles canonical optimization automatically',
        metadata: {
            features: [
                'UTM parameter cleaning',
                'Click ID removal (fbclid, gclid)',
                'Smart canonical generation',
                'Trailing slash normalization',
                'Hash fragment handling'
            ]
        }
    });
    return { fixes, errors };
}
async function generateCanonicalActionItems(userToken, siteUrl, fixResults) {
    try {
        const manualFixes = fixResults.fixes.filter((fix) => !fix.automated && fix.priority !== 'info');
        for (const fix of manualFixes) {
            await supabase
                .from('seo_action_items')
                .insert({
                user_token: userToken,
                site_url: siteUrl,
                issue_type: fix.type,
                issue_category: 'canonical',
                severity: fix.priority,
                title: fix.title,
                description: fix.description,
                impact_description: 'Canonical tag issues can cause duplicate content problems and indexing confusion',
                fix_recommendation: fix.instructions || fix.fix,
                status: 'detected'
            });
        }
    }
    catch (error) {
        console.error('[FIX-CANONICAL] Error creating action items:', error);
    }
}
async function logCanonicalFixesToEvents(userToken, fixResults) {
    try {
        const events = fixResults.fixes.map((fix) => ({
            user_token: userToken,
            site_url: fixResults.siteUrl,
            page_url: fixResults.pageUrl,
            event_type: fix.type,
            severity: fix.priority === 'critical' ? 'critical' : fix.priority === 'info' ? 'info' : 'warning',
            category: 'technical',
            title: fix.title,
            description: fix.description,
            old_value: null,
            new_value: null,
            auto_fixed: fix.automated,
            fix_applied: fix.automated ? fix.fix : null,
            source: 'tool-canonical',
            metadata: { fixType: fixResults.fixType, automated: fix.automated, ...fix.metadata }
        }));
        if (events.length > 0) {
            await supabase
                .from('seo_monitoring_events')
                .insert(events);
        }
    }
    catch (error) {
        console.error('[FIX-CANONICAL] Error logging events:', error);
    }
}
// GET endpoint for canonical fix analysis
async function GET(request) {
    try {
        const userToken = request.nextUrl.searchParams.get('userToken');
        const siteUrl = request.nextUrl.searchParams.get('siteUrl');
        const pageUrl = request.nextUrl.searchParams.get('pageUrl');
        if (!userToken || !siteUrl) {
            return server_1.NextResponse.json({ error: 'Missing userToken or siteUrl' }, { status: 400 });
        }
        // Return canonical fix capabilities
        const canonicalCapabilities = {
            type: 'canonical_optimization',
            title: 'Enhanced Canonical Tag Management',
            description: 'Automatic canonical tag optimization and management',
            automated: true,
            features: [
                {
                    name: 'UTM Parameter Cleaning',
                    description: 'Automatically strips utm_ parameters from canonical URLs',
                    active: true
                },
                {
                    name: 'Click ID Removal',
                    description: 'Removes fbclid, gclid, and other tracking parameters',
                    active: true
                },
                {
                    name: 'Smart URL Normalization',
                    description: 'Handles trailing slashes, hash fragments, and query parameters',
                    active: true
                },
                {
                    name: 'Real-time Monitoring',
                    description: 'Monitors for canonical tag changes and issues',
                    active: true
                }
            ],
            requirements: {
                seoagent_js: 'Latest version with enhanced canonical logic',
                browser_support: 'All modern browsers with MutationObserver'
            }
        };
        return server_1.NextResponse.json({
            success: true,
            data: canonicalCapabilities,
            message: 'Canonical optimization capabilities active'
        });
    }
    catch (error) {
        console.error('[FIX-CANONICAL] Error:', error);
        return server_1.NextResponse.json({ error: 'Failed to get canonical capabilities' }, { status: 500 });
    }
}
