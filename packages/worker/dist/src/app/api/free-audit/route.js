"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const svs_integration_1 = require("./svs-integration");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function POST(request) {
    try {
        const body = await request.json();
        const { websiteUrl, email } = body;
        if (!websiteUrl) {
            return server_1.NextResponse.json({ error: 'Website URL is required' }, { status: 400 });
        }
        // Validate URL format
        let cleanUrl;
        try {
            const url = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`);
            cleanUrl = url.origin;
        }
        catch {
            return server_1.NextResponse.json({ error: 'Invalid website URL format' }, { status: 400 });
        }
        // Get client IP for rate limiting
        const forwarded = request.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || '127.0.0.1';
        // Check rate limiting (3 audits per IP per day)
        const today = new Date().toISOString().split('T')[0];
        const { data: recentAudits, error: rateLimitError } = await supabase
            .from('free_audits')
            .select('id')
            .eq('ip_address', ip)
            .gte('created_at', `${today}T00:00:00Z`)
            .lte('created_at', `${today}T23:59:59Z`);
        if (rateLimitError) {
            console.error('Rate limit check error:', rateLimitError);
        }
        if (recentAudits && recentAudits.length >= 3) {
            return server_1.NextResponse.json({
                error: 'Rate limit exceeded. You can run up to 3 free audits per day.'
            }, { status: 429 });
        }
        console.log(`[FREE AUDIT] Starting comprehensive audit for: ${cleanUrl}`);
        // Run all audits in parallel for speed, including SVS analysis
        const auditResults = await Promise.allSettled([
            auditBasicHTML(cleanUrl),
            auditRobotsTxt(cleanUrl),
            auditSitemap(cleanUrl),
            (0, svs_integration_1.runSVSAnalysis)(cleanUrl) // Add Semantic Visibility Score analysis
        ]);
        // Collect all issues from successful audits and SVS results
        const allIssues = [];
        let svsResult = null;
        auditResults.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                if (index === 3) {
                    // This is the SVS analysis result
                    svsResult = result.value;
                }
                else {
                    // This is a traditional audit result
                    const auditResult = result.value;
                    if (Array.isArray(auditResult)) {
                        allIssues.push(...auditResult);
                    }
                }
            }
            else {
                console.error(`Audit ${index} failed:`, result.reason);
            }
        });
        // Calculate scoring
        const criticalIssues = allIssues.filter(issue => issue.severity === 'critical').length;
        const warningIssues = allIssues.filter(issue => issue.severity === 'warning').length;
        const infoIssues = allIssues.filter(issue => issue.severity === 'info').length;
        const fixableByAgent = allIssues.filter(issue => issue.fixableByAgent).length;
        // Calculate overall score (100 - weighted penalty system)
        const overallScore = Math.max(0, Math.min(100, 100 - (criticalIssues * 20) - (warningIssues * 10) - (infoIssues * 5)));
        const auditResult = {
            websiteUrl: cleanUrl,
            overallScore: Math.round(overallScore),
            totalIssues: allIssues.length,
            criticalIssues,
            warningIssues,
            fixableByAgent,
            issues: allIssues,
            completedAt: new Date().toISOString(),
            // Include SVS results if available
            svsScore: svsResult?.overall_svs_score,
            svsGrade: svsResult?.grade,
            svsComponentScores: svsResult?.component_scores,
            svsRecommendations: svsResult?.analysis_data?.recommendations?.slice(0, 5) // Top 5 recommendations
        };
        // Store audit results in database (with fallback for table not existing yet)
        try {
            const { error: insertError } = await supabase
                .from('free_audits')
                .insert({
                website_url: cleanUrl,
                email: email || null,
                audit_results: auditResult,
                overall_score: auditResult.overallScore,
                total_issues: auditResult.totalIssues,
                critical_issues: criticalIssues,
                warning_issues: warningIssues,
                fixable_by_agent: fixableByAgent,
                ip_address: ip,
                user_agent: request.headers.get('user-agent') || 'Unknown'
            });
            if (insertError) {
                console.error('[FREE AUDIT] Database insert error:', insertError);
                // Don't fail the request if database insert fails - this allows testing even if table doesn't exist yet
            }
            else {
                console.log('[FREE AUDIT] Audit results stored in database');
            }
        }
        catch (dbError) {
            console.error('[FREE AUDIT] Database operation failed:', dbError);
            // Continue without storing - the audit still works
        }
        console.log(`[FREE AUDIT] Completed audit for ${cleanUrl} - Score: ${overallScore}, Issues: ${allIssues.length}`);
        return server_1.NextResponse.json({
            success: true,
            data: auditResult
        });
    }
    catch (error) {
        console.error('[FREE AUDIT] Unexpected error:', error);
        return server_1.NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 });
    }
}
// Basic HTML analysis function
async function auditBasicHTML(websiteUrl) {
    const issues = [];
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const response = await fetch(websiteUrl, {
            headers: {
                'User-Agent': 'SEOAgent-Free-Audit/1.0 (+https://seoagent.com/free-audit)'
            },
            signal: controller.signal
        });
        clearTimeout(timeout);
        if (!response.ok) {
            issues.push({
                type: 'site_accessibility',
                severity: 'critical',
                title: 'Website Not Accessible',
                description: `Website returned HTTP ${response.status} status`,
                recommendation: 'Ensure your website is online and accessible',
                fixableByAgent: false,
                category: 'technical'
            });
            return issues;
        }
        const html = await response.text();
        // Check for title tag
        const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        if (!titleMatch || !titleMatch[1].trim()) {
            issues.push({
                type: 'meta_title_missing',
                severity: 'critical',
                title: 'Missing Page Title',
                description: 'This page is missing a title tag',
                recommendation: 'Add a descriptive title tag (50-60 characters) to help search engines understand the page content',
                fixableByAgent: true,
                category: 'technical'
            });
        }
        else if (titleMatch[1].length > 60) {
            issues.push({
                type: 'meta_title_long',
                severity: 'warning',
                title: 'Page Title Too Long',
                description: `Page title is ${titleMatch[1].length} characters (recommended: 50-60)`,
                recommendation: 'Shorten the title tag to 50-60 characters for better search engine display',
                fixableByAgent: true,
                category: 'technical'
            });
        }
        // Check for meta description
        const metaDescMatch = html.match(/<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']*)["\'][^>]*>/i);
        if (!metaDescMatch || !metaDescMatch[1].trim()) {
            issues.push({
                type: 'meta_description_missing',
                severity: 'critical',
                title: 'Missing Meta Description',
                description: 'This page is missing a meta description',
                recommendation: 'Add a compelling meta description (150-160 characters) to improve click-through rates',
                fixableByAgent: true,
                category: 'technical'
            });
        }
        else if (metaDescMatch[1].length > 160) {
            issues.push({
                type: 'meta_description_long',
                severity: 'warning',
                title: 'Meta Description Too Long',
                description: `Meta description is ${metaDescMatch[1].length} characters (recommended: 150-160)`,
                recommendation: 'Shorten the meta description to 150-160 characters for better search engine display',
                fixableByAgent: true,
                category: 'technical'
            });
        }
        // Check for H1 tag
        const h1Match = html.match(/<h1[^>]*>([^<]*)<\/h1>/i);
        if (!h1Match || !h1Match[1].trim()) {
            issues.push({
                type: 'h1_missing',
                severity: 'warning',
                title: 'Missing H1 Tag',
                description: 'This page is missing an H1 heading tag',
                recommendation: 'Add a clear H1 heading that describes the main topic of the page',
                fixableByAgent: true,
                category: 'content'
            });
        }
        // Check for images without alt text
        const imgTags = html.match(/<img[^>]*>/gi) || [];
        let imagesWithoutAlt = 0;
        imgTags.forEach(img => {
            if (!img.includes('alt=') || img.includes('alt=""') || img.includes("alt=''")) {
                imagesWithoutAlt++;
            }
        });
        if (imagesWithoutAlt > 0) {
            issues.push({
                type: 'images_missing_alt',
                severity: 'warning',
                title: 'Images Missing Alt Text',
                description: `${imagesWithoutAlt} images are missing alt text`,
                recommendation: 'Add descriptive alt text to all images for better accessibility and SEO',
                fixableByAgent: true,
                category: 'technical'
            });
        }
    }
    catch (error) {
        console.error('HTML audit error:', error);
        issues.push({
            type: 'audit_error',
            severity: 'warning',
            title: 'Website Analysis Limited',
            description: 'Unable to fully analyze website content',
            recommendation: 'Ensure your website is accessible and loading properly',
            fixableByAgent: false,
            category: 'technical'
        });
    }
    return issues;
}
// Robots.txt analysis function
async function auditRobotsTxt(websiteUrl) {
    const issues = [];
    const robotsUrl = `${websiteUrl}/robots.txt`;
    try {
        const response = await fetch(robotsUrl, {
            headers: {
                'User-Agent': 'SEOAgent-Free-Audit/1.0 (+https://seoagent.com/free-audit)'
            }
        });
        if (!response.ok) {
            issues.push({
                type: 'robots_not_found',
                severity: 'warning',
                title: 'robots.txt Not Found',
                description: 'Your website doesn&apos;t have a robots.txt file',
                recommendation: 'Create a robots.txt file to guide search engine crawlers',
                fixableByAgent: true,
                category: 'technical'
            });
            return issues;
        }
        const content = await response.text();
        if (!content.trim()) {
            issues.push({
                type: 'robots_empty',
                severity: 'warning',
                title: 'Empty robots.txt File',
                description: 'Your robots.txt file is empty',
                recommendation: 'Add proper directives to your robots.txt file',
                fixableByAgent: true,
                category: 'technical'
            });
            return issues;
        }
        // Check for sitemap declaration
        if (!content.toLowerCase().includes('sitemap:')) {
            issues.push({
                type: 'robots_no_sitemap',
                severity: 'warning',
                title: 'Sitemap Not Declared in robots.txt',
                description: 'Your robots.txt doesn&apos;t reference a sitemap',
                recommendation: 'Add a Sitemap directive to help search engines find your sitemap',
                fixableByAgent: true,
                category: 'technical'
            });
        }
        // Check if blocking everything
        if (content.includes('Disallow: /') && content.includes('User-agent: *')) {
            issues.push({
                type: 'robots_blocks_all',
                severity: 'critical',
                title: 'robots.txt Blocking All Crawlers',
                description: 'Your robots.txt is preventing all search engines from crawling your site',
                recommendation: 'Remove or modify the "Disallow: /" directive to allow search engine crawling',
                fixableByAgent: true,
                category: 'technical'
            });
        }
    }
    catch (error) {
        console.error('Robots.txt audit error:', error);
    }
    return issues;
}
// Sitemap analysis function
async function auditSitemap(websiteUrl) {
    const issues = [];
    const commonSitemapUrls = [
        `${websiteUrl}/sitemap.xml`,
        `${websiteUrl}/sitemap_index.xml`,
        `${websiteUrl}/sitemaps.xml`
    ];
    let sitemapFound = false;
    for (const sitemapUrl of commonSitemapUrls) {
        try {
            const response = await fetch(sitemapUrl, {
                headers: {
                    'User-Agent': 'SEOAgent-Free-Audit/1.0 (+https://seoagent.com/free-audit)'
                }
            });
            if (response.ok) {
                sitemapFound = true;
                const content = await response.text();
                if (!content.includes('<?xml') || (!content.includes('<urlset') && !content.includes('<sitemapindex'))) {
                    issues.push({
                        type: 'sitemap_invalid_format',
                        severity: 'warning',
                        title: 'Invalid Sitemap Format',
                        description: 'Your sitemap doesn&apos;t appear to be in valid XML format',
                        recommendation: 'Ensure your sitemap follows proper XML sitemap format',
                        fixableByAgent: true,
                        category: 'technical'
                    });
                }
                break;
            }
        }
        catch (error) {
            console.error(`Sitemap check error for ${sitemapUrl}:`, error);
        }
    }
    if (!sitemapFound) {
        issues.push({
            type: 'sitemap_not_found',
            severity: 'warning',
            title: 'XML Sitemap Not Found',
            description: 'No XML sitemap found at common locations',
            recommendation: 'Create and submit an XML sitemap to help search engines discover your pages',
            fixableByAgent: true,
            category: 'technical'
        });
    }
    return issues;
}
