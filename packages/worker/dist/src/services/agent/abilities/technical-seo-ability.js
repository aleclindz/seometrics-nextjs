"use strict";
/**
 * Technical SEO Ability
 *
 * Handles all technical SEO related functions including:
 * - Site auditing
 * - Technical SEO analysis
 * - Crawling and indexing issues
 * - Site structure optimization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TechnicalSEOAbility = void 0;
const base_ability_1 = require("./base-ability");
class TechnicalSEOAbility extends base_ability_1.BaseAbility {
    getFunctionNames() {
        return [
            'audit_site',
            'SEO_analyze_technical',
            'check_technical_seo',
            'plan_crawl',
            'analyze_crawl',
            'SEO_crawl_website',
            'SEO_get_crawl_results',
            'check_indexing',
            'analyze_site_structure',
            'check_page_speed',
            'validate_schema'
        ];
    }
    async executeFunction(name, args) {
        switch (name) {
            case 'audit_site':
                return await this.auditSite(args);
            case 'check_technical_seo':
            case 'SEO_analyze_technical':
                return await this.checkTechnicalSEO(args);
            case 'plan_crawl':
                return await this.planCrawl(args);
            case 'analyze_crawl':
                return await this.analyzeCrawl(args);
            case 'SEO_crawl_website':
                return await this.crawlWebsite(args);
            case 'SEO_get_crawl_results':
                return await this.getCrawlResults(args);
            case 'check_indexing':
                return await this.checkIndexing(args);
            case 'analyze_site_structure':
                return await this.analyzeSiteStructure(args);
            case 'check_page_speed':
                return await this.checkPageSpeed(args);
            case 'validate_schema':
                return await this.validateSchema(args);
            default:
                return this.error(`Unknown technical SEO function: ${name}`);
        }
    }
    /**
     * Perform comprehensive site audit
     */
    async auditSite(args) {
        try {
            const response = await this.fetchAPI('/api/technical-seo/audit', {
                method: 'POST',
                body: JSON.stringify({
                    ...args,
                    userToken: this.userToken
                })
            });
            return response.success ?
                this.success(response) :
                this.error(response.error || 'Site audit failed');
        }
        catch (error) {
            return this.error('Failed to audit site', error);
        }
    }
    /**
     * Check technical SEO issues
     */
    async checkTechnicalSEO(args) {
        try {
            const response = await this.fetchAPI('/api/technical-seo/check', {
                method: 'POST',
                body: JSON.stringify({
                    ...args,
                    userToken: this.userToken
                })
            });
            return response.success ?
                this.success(response) :
                this.error(response.error || 'Technical SEO check failed');
        }
        catch (error) {
            return this.error('Failed to check technical SEO', error);
        }
    }
    /**
     * Plan a crawling strategy for the site
     */
    async planCrawl(args) {
        try {
            const response = await this.fetchAPI('/api/crawl/plan', {
                method: 'POST',
                body: JSON.stringify({
                    ...args,
                    userToken: this.userToken
                })
            });
            return response.success ?
                this.success(response) :
                this.error(response.error || 'Crawl planning failed');
        }
        catch (error) {
            return this.error('Failed to plan crawl', error);
        }
    }
    /**
     * Analyze crawl results
     */
    async analyzeCrawl(args) {
        try {
            const params = new URLSearchParams({
                crawl_id: args.crawl_id
            });
            if (args.analysis_type) {
                params.append('analysis_type', args.analysis_type);
            }
            if (this.userToken) {
                params.append('userToken', this.userToken);
            }
            const response = await this.fetchAPI(`/api/crawl/analyze?${params}`, {
                method: 'GET'
            });
            return response.success ?
                this.success(response) :
                this.error(response.error || 'Crawl analysis failed');
        }
        catch (error) {
            return this.error('Failed to analyze crawl', error);
        }
    }
    /**
     * Start a Firecrawl-backed crawl
     */
    async crawlWebsite(args) {
        try {
            const url = args.site_url.startsWith('http') ? args.site_url : `https://${args.site_url}`;
            const res = await this.fetchAPI('/api/crawl/firecrawl', {
                method: 'POST',
                body: JSON.stringify({ action: 'start', url, maxPages: Math.min(args.max_pages || 50, 200) })
            });
            if (!res.success)
                return this.error(res.error || 'Failed to start crawl');
            return this.success({ job_id: res.job?.jobId || res.job?.id, status: res.job?.status || 'started' });
        }
        catch (error) {
            return this.error('Failed to start crawl', error);
        }
    }
    /**
     * Fetch crawl results and summarize basic technical issues
     */
    async getCrawlResults(args) {
        try {
            const res = await this.fetchAPI(`/api/crawl/firecrawl?jobId=${encodeURIComponent(args.job_id)}&mode=result`);
            if (!res.success)
                return this.error(res.error || 'Failed to fetch crawl results');
            const pages = res.pages || [];
            const limit = 80;
            const analyzed = pages.slice(0, limit);
            let missingTitle = 0, missingDesc = 0, noH1 = 0, noCanonical = 0, noindex = 0;
            const sampleIssues = [];
            for (const p of analyzed) {
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
                if (issues.length > 0 && sampleIssues.length < 10)
                    sampleIssues.push({ url: p.url, issues });
            }
            return this.success({
                total_pages: pages.length,
                analyzed_pages: analyzed.length,
                issues: {
                    missing_title: missingTitle,
                    missing_meta_description: missingDesc,
                    missing_h1: noH1,
                    missing_canonical: noCanonical,
                    noindex: noindex
                },
                samples: sampleIssues
            });
        }
        catch (error) {
            return this.error('Failed to analyze crawl results', error);
        }
    }
    /**
     * Check page indexing status
     */
    async checkIndexing(args) {
        try {
            const response = await this.fetchAPI('/api/technical-seo/indexing', {
                method: 'POST',
                body: JSON.stringify({
                    ...args,
                    userToken: this.userToken
                })
            });
            return response.success ?
                this.success(response) :
                this.error(response.error || 'Indexing check failed');
        }
        catch (error) {
            return this.error('Failed to check indexing', error);
        }
    }
    /**
     * Analyze site structure and architecture
     */
    async analyzeSiteStructure(args) {
        try {
            const response = await this.fetchAPI('/api/technical-seo/structure', {
                method: 'POST',
                body: JSON.stringify({
                    ...args,
                    userToken: this.userToken
                })
            });
            return response.success ?
                this.success(response) :
                this.error(response.error || 'Site structure analysis failed');
        }
        catch (error) {
            return this.error('Failed to analyze site structure', error);
        }
    }
    /**
     * Check page speed and performance
     */
    async checkPageSpeed(args) {
        try {
            const params = new URLSearchParams({
                page_url: args.page_url,
                device: args.device || 'desktop'
            });
            if (this.userToken) {
                params.append('userToken', this.userToken);
            }
            const response = await this.fetchAPI(`/api/technical-seo/pagespeed?${params}`, {
                method: 'GET'
            });
            return response.success ?
                this.success(response) :
                this.error(response.error || 'Page speed check failed');
        }
        catch (error) {
            return this.error('Failed to check page speed', error);
        }
    }
    /**
     * Validate structured data schema
     */
    async validateSchema(args) {
        try {
            const response = await this.fetchAPI('/api/technical-seo/schema', {
                method: 'POST',
                body: JSON.stringify({
                    ...args,
                    userToken: this.userToken
                })
            });
            return response.success ?
                this.success(response) :
                this.error(response.error || 'Schema validation failed');
        }
        catch (error) {
            return this.error('Failed to validate schema', error);
        }
    }
}
exports.TechnicalSEOAbility = TechnicalSEOAbility;
