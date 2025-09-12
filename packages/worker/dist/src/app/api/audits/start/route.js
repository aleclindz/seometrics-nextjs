"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function POST(request) {
    try {
        const userToken = request.nextUrl.searchParams.get('userToken');
        if (!userToken) {
            return server_1.NextResponse.json({ error: 'User token is required' }, { status: 400 });
        }
        // Set RLS context
        await supabase.rpc('set_config', {
            config_key: 'app.current_user_token',
            config_value: userToken
        });
        const body = await request.json();
        const { websiteUrl, websiteId, auditType = 'full', maxPages = 50, crawlDepth = 3 } = body;
        if (!websiteUrl) {
            return server_1.NextResponse.json({ error: 'Website URL is required' }, { status: 400 });
        }
        // Validate URL format
        try {
            new URL(websiteUrl);
        }
        catch {
            return server_1.NextResponse.json({ error: 'Invalid website URL format' }, { status: 400 });
        }
        // Check if user exists
        const { data: user, error: userError } = await supabase
            .from('login_users')
            .select('token')
            .eq('token', userToken)
            .single();
        if (userError || !user) {
            return server_1.NextResponse.json({ error: 'Invalid user token' }, { status: 401 });
        }
        // Check if there's already a running audit for this website
        const { data: existingAudit } = await supabase
            .from('seo_audits')
            .select('id, status')
            .eq('user_token', userToken)
            .eq('website_url', websiteUrl)
            .in('status', ['pending', 'running'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        if (existingAudit) {
            return server_1.NextResponse.json({
                error: 'An audit is already running for this website',
                auditId: existingAudit.id,
                status: existingAudit.status
            }, { status: 409 });
        }
        // Create new audit record
        const { data: audit, error: auditError } = await supabase
            .from('seo_audits')
            .insert({
            user_token: userToken,
            website_id: websiteId,
            website_url: websiteUrl,
            audit_type: auditType,
            status: 'pending',
            max_pages: maxPages,
            crawl_depth: crawlDepth,
            current_step: 'Initializing audit...',
            started_at: new Date().toISOString()
        })
            .select()
            .single();
        if (auditError) {
            console.error('Error creating audit:', auditError);
            return server_1.NextResponse.json({ error: 'Failed to create audit' }, { status: 500 });
        }
        // TODO: Queue the audit job for background processing
        // For now, we'll start a simple background process
        startAuditProcess(audit.id, userToken, websiteUrl, auditType, maxPages, crawlDepth);
        return server_1.NextResponse.json({
            success: true,
            auditId: audit.id,
            status: 'pending',
            message: 'Audit started successfully'
        });
    }
    catch (error) {
        console.error('Error starting audit:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
// Background audit process (simplified version)
async function startAuditProcess(auditId, userToken, websiteUrl, auditType, maxPages, crawlDepth) {
    try {
        // Set RLS context for background process
        await supabase.rpc('set_config', {
            config_key: 'app.current_user_token',
            config_value: userToken
        });
        // Update audit status to running
        await supabase
            .from('seo_audits')
            .update({
            status: 'running',
            current_step: 'Starting website crawl...',
            progress_percentage: 10
        })
            .eq('id', auditId);
        // Basic audit implementation
        const auditResults = await performBasicAudit(websiteUrl, maxPages);
        // Update audit with results
        await supabase
            .from('seo_audits')
            .update({
            status: 'completed',
            current_step: 'Audit completed',
            progress_percentage: 100,
            pages_crawled: auditResults.pagesCrawled,
            pages_total: auditResults.pagesCrawled,
            total_issues: auditResults.totalIssues,
            critical_issues: auditResults.criticalIssues,
            warning_issues: auditResults.warningIssues,
            info_issues: auditResults.infoIssues,
            overall_score: auditResults.overallScore,
            completed_at: new Date().toISOString(),
            duration_seconds: Math.floor((Date.now() - new Date(auditResults.startTime).getTime()) / 1000)
        })
            .eq('id', auditId);
        console.log(`Audit ${auditId} completed successfully`);
    }
    catch (error) {
        console.error(`Audit ${auditId} failed:`, error);
        // Update audit status to failed
        await supabase
            .from('seo_audits')
            .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            error_details: { error: String(error) },
            completed_at: new Date().toISOString()
        })
            .eq('id', auditId);
    }
}
// Basic audit implementation
async function performBasicAudit(websiteUrl, maxPages) {
    const startTime = Date.now();
    let pagesCrawled = 0;
    let totalIssues = 0;
    let criticalIssues = 0;
    let warningIssues = 0;
    let infoIssues = 0;
    try {
        // Simple homepage audit for now
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        const response = await fetch(websiteUrl, {
            headers: {
                'User-Agent': 'SEOAgent/1.0 (+https://seoagent.com)'
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const html = await response.text();
        pagesCrawled = 1;
        // Basic HTML analysis
        const issues = analyzeHTML(html, websiteUrl);
        totalIssues = issues.length;
        criticalIssues = issues.filter(issue => issue.severity === 'critical').length;
        warningIssues = issues.filter(issue => issue.severity === 'warning').length;
        infoIssues = issues.filter(issue => issue.severity === 'info').length;
        // Calculate basic score (simplified)
        const overallScore = Math.max(0, 100 - (criticalIssues * 20) - (warningIssues * 10) - (infoIssues * 5));
        return {
            startTime,
            pagesCrawled,
            totalIssues,
            criticalIssues,
            warningIssues,
            infoIssues,
            overallScore: Math.round(overallScore)
        };
    }
    catch (error) {
        throw new Error(`Failed to audit website: ${error}`);
    }
}
// Basic HTML analysis function
function analyzeHTML(html, url) {
    const issues = [];
    // Check for title tag
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (!titleMatch || !titleMatch[1].trim()) {
        issues.push({
            pageUrl: url,
            issueType: 'meta_title_missing',
            severity: 'critical',
            category: 'technical',
            title: 'Missing Page Title',
            description: 'This page is missing a title tag',
            recommendation: 'Add a descriptive title tag (50-60 characters) to help search engines understand the page content'
        });
    }
    else if (titleMatch[1].length > 60) {
        issues.push({
            pageUrl: url,
            issueType: 'meta_title_long',
            severity: 'warning',
            category: 'technical',
            title: 'Page Title Too Long',
            description: `Page title is ${titleMatch[1].length} characters (recommended: 50-60)`,
            recommendation: 'Shorten the title tag to 50-60 characters for better search engine display'
        });
    }
    // Check for meta description
    const metaDescMatch = html.match(/<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']*)["\'][^>]*>/i);
    if (!metaDescMatch || !metaDescMatch[1].trim()) {
        issues.push({
            pageUrl: url,
            issueType: 'meta_description_missing',
            severity: 'critical',
            category: 'technical',
            title: 'Missing Meta Description',
            description: 'This page is missing a meta description',
            recommendation: 'Add a compelling meta description (150-160 characters) to improve click-through rates'
        });
    }
    else if (metaDescMatch[1].length > 160) {
        issues.push({
            pageUrl: url,
            issueType: 'meta_description_long',
            severity: 'warning',
            category: 'technical',
            title: 'Meta Description Too Long',
            description: `Meta description is ${metaDescMatch[1].length} characters (recommended: 150-160)`,
            recommendation: 'Shorten the meta description to 150-160 characters for better search engine display'
        });
    }
    // Check for H1 tag
    const h1Match = html.match(/<h1[^>]*>([^<]*)<\/h1>/i);
    if (!h1Match || !h1Match[1].trim()) {
        issues.push({
            pageUrl: url,
            issueType: 'h1_missing',
            severity: 'warning',
            category: 'content',
            title: 'Missing H1 Tag',
            description: 'This page is missing an H1 heading tag',
            recommendation: 'Add a clear H1 heading that describes the main topic of the page'
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
            pageUrl: url,
            issueType: 'images_missing_alt',
            severity: 'warning',
            category: 'accessibility',
            title: 'Images Missing Alt Text',
            description: `${imagesWithoutAlt} images are missing alt text`,
            recommendation: 'Add descriptive alt text to all images for better accessibility and SEO'
        });
    }
    return issues;
}
