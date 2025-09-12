"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        const domain = searchParams.get('domain');
        if (!userToken || !domain) {
            return server_1.NextResponse.json({ error: 'User token and domain required' }, { status: 400 });
        }
        console.log('[TECHNICAL SEO DASHBOARD] Fetching data for:', { domain });
        // Get website info first
        const cleanDomain = domain.replace(/^sc-domain:/, '').replace(/^https?:\/\//, '').replace(/\/$/, '');
        const { data: website, error: websiteError } = await supabase
            .from('websites')
            .select('id, website_token, domain, cleaned_domain, gsc_status, seoagentjs_status, cms_status, hosting_status')
            .eq('user_token', userToken)
            .or(`domain.eq.${domain},domain.eq.sc-domain:${cleanDomain},cleaned_domain.eq.${cleanDomain}`)
            .single();
        if (websiteError || !website) {
            console.log('[TECHNICAL SEO DASHBOARD] Website not found:', websiteError);
            return server_1.NextResponse.json({ error: 'Website not found' }, { status: 404 });
        }
        // Initialize response data
        const technicalData = {
            overallScore: 0,
            schemaMarkup: { count: 0, status: 'unknown' },
            altTags: { count: 0, status: 'unknown' },
            metaTags: { count: 0, status: 'unknown' },
            sitemapStatus: 'unknown',
            robotsStatus: 'unknown',
            llmsTxtStatus: 'unknown',
            setupStatuses: {
                gsc: website.gsc_status || 'none',
                seoagentjs: website.seoagentjs_status || 'inactive',
                cms: website.cms_status || 'none',
                hosting: website.hosting_status || 'none'
            },
            hasData: false,
            lastUpdated: new Date()
        };
        // Fetch meta tags count
        const { count: metaTagsCount, error: metaError } = await supabase
            .from('meta_tags')
            .select('*', { count: 'exact', head: true })
            .eq('website_token', website.website_token);
        if (!metaError && metaTagsCount !== null) {
            technicalData.metaTags = {
                count: metaTagsCount,
                status: metaTagsCount > 0 ? 'good' : 'needs_attention'
            };
            technicalData.hasData = true;
        }
        // Fetch alt tags count
        const { count: altTagsCount, error: altError } = await supabase
            .from('alt_tags')
            .select('*', { count: 'exact', head: true })
            .eq('website_token', website.website_token);
        if (!altError && altTagsCount !== null) {
            technicalData.altTags = {
                count: altTagsCount,
                status: altTagsCount > 0 ? 'good' : 'needs_attention'
            };
            technicalData.hasData = true;
        }
        // Fetch URL inspection data for schema markup and overall health
        const { data: inspectionData, count: inspectionCount, error: inspectionError } = await supabase
            .from('url_inspections')
            .select('*', { count: 'exact' })
            .eq('user_token', userToken)
            .ilike('site_url', `%${cleanDomain}%`)
            .limit(100);
        if (!inspectionError && inspectionData && inspectionData.length > 0) {
            // Calculate overall score from URL inspections
            const passedInspections = inspectionData.filter(inspection => inspection.index_status === 'PASS' && inspection.can_be_indexed === true).length;
            const overallScore = inspectionData.length > 0 ?
                Math.round((passedInspections / inspectionData.length) * 100) : 0;
            // Schema markup analysis
            const schemaItems = inspectionData.reduce((total, inspection) => total + (inspection.rich_results_items || 0), 0);
            technicalData.overallScore = overallScore;
            technicalData.schemaMarkup = {
                count: schemaItems,
                status: schemaItems > 0 ? 'good' : 'needs_attention'
            };
            technicalData.hasData = true;
            console.log('[TECHNICAL SEO DASHBOARD] URL inspections:', {
                total: inspectionData.length,
                passed: passedInspections,
                overallScore,
                schemaItems
            });
        }
        // Determine sitemap and robots status based on setup status
        technicalData.sitemapStatus = website.hosting_status === 'connected' ? 'good' :
            (website.gsc_status === 'connected' ? 'needs_check' : 'unknown');
        technicalData.robotsStatus = website.seoagentjs_status === 'active' ? 'good' :
            (website.hosting_status === 'connected' ? 'needs_check' : 'unknown');
        // llms.txt is typically a manual setup, so check based on domain accessibility
        technicalData.llmsTxtStatus = 'needs_implementation'; // Default for now
        // If no technical data was found, set reasonable defaults
        if (!technicalData.hasData) {
            technicalData.overallScore = website.seoagentjs_status === 'active' ? 75 : 25;
            technicalData.hasData = false; // Keep as false to indicate limited data
        }
        // Calculate overall score if not set from inspections
        if (technicalData.overallScore === 0) {
            const scores = [];
            // SEOAgent.js active = +40 points
            if (website.seoagentjs_status === 'active')
                scores.push(40);
            // GSC connected = +20 points
            if (website.gsc_status === 'connected')
                scores.push(20);
            // Meta tags present = +15 points
            if (technicalData.metaTags.count > 0)
                scores.push(15);
            // Alt tags present = +15 points  
            if (technicalData.altTags.count > 0)
                scores.push(15);
            // Hosting connected = +10 points
            if (website.hosting_status === 'connected')
                scores.push(10);
            technicalData.overallScore = scores.reduce((sum, score) => sum + score, 0);
        }
        console.log('[TECHNICAL SEO DASHBOARD] Returning technical data:', {
            overallScore: technicalData.overallScore,
            metaTags: technicalData.metaTags.count,
            altTags: technicalData.altTags.count,
            schemaItems: technicalData.schemaMarkup.count,
            hasData: technicalData.hasData
        });
        return server_1.NextResponse.json({
            success: true,
            data: technicalData
        });
    }
    catch (error) {
        console.error('[TECHNICAL SEO DASHBOARD] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
