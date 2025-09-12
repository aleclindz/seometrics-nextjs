"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.POST = POST;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const UrlNormalizationService_1 = require("@/lib/UrlNormalizationService");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function POST(request) {
    try {
        console.log('[METRICS SUMMARY] Starting metrics data fetch');
        const { siteUrl, userToken } = await request.json();
        if (!siteUrl || !userToken) {
            return server_1.NextResponse.json({ error: 'Missing required parameters: siteUrl, userToken' }, { status: 400 });
        }
        console.log('[METRICS SUMMARY] Fetching data for:', { siteUrl, userToken: `${userToken.substring(0, 10)}...` });
        // Calculate date ranges for trends
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 28);
        const prevEndDate = new Date(startDate);
        const prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - 28);
        const formatDate = (date) => date.toISOString().split('T')[0];
        // Fetch GSC performance data (clicks with trend) - Direct database approach
        let clicksData = { value: 0, change: 0, trend: 'neutral' };
        try {
            console.log('[METRICS SUMMARY] Looking for GSC property for:', siteUrl);
            // First, find the GSC property ID for this site URL using comprehensive URL matching
            const urlVariations = UrlNormalizationService_1.UrlNormalizationService.generateUrlVariations(siteUrl);
            const urlVariants = [
                siteUrl, // Original request
                urlVariations.domainProperty, // sc-domain:translateyoutubevideos.com
                urlVariations.httpsUrl, // https://translateyoutubevideos.com  
                urlVariations.gscFormat, // https://translateyoutubevideos.com
                siteUrl.replace('https://', '').replace('http://', '') // translateyoutubevideos.com
            ];
            console.log('[METRICS SUMMARY] Trying URL variants:', urlVariants);
            let property = null;
            for (const variant of urlVariants) {
                const { data, error } = await supabase
                    .from('gsc_properties')
                    .select('*')
                    .eq('user_token', userToken)
                    .eq('site_url', variant)
                    .eq('is_active', true)
                    .single();
                if (data && !error) {
                    property = data;
                    console.log('[METRICS SUMMARY] Found GSC property with URL variant:', variant, 'Property ID:', property.id);
                    break;
                }
            }
            if (!property) {
                console.log('[METRICS SUMMARY] No GSC property found for any URL variant');
                // Debug: show available properties
                const { data: allProps } = await supabase
                    .from('gsc_properties')
                    .select('site_url, id')
                    .eq('user_token', userToken)
                    .eq('is_active', true);
                console.log('[METRICS SUMMARY] Available GSC properties:', allProps?.map(p => ({ url: p.site_url, id: p.id })));
            }
            else {
                // Get performance data directly from database using property ID
                console.log('[METRICS SUMMARY] Fetching performance data for property:', property.id);
                // Current period data - look for overlapping date ranges
                const { data: currentPerfData } = await supabase
                    .from('gsc_performance_data')
                    .select('*')
                    .eq('property_id', property.id)
                    .eq('user_token', userToken)
                    .lte('date_start', formatDate(endDate))
                    .gte('date_end', formatDate(startDate))
                    .order('date_start', { ascending: false })
                    .limit(1);
                // Previous period data - look for overlapping date ranges  
                const { data: prevPerfData } = await supabase
                    .from('gsc_performance_data')
                    .select('*')
                    .eq('property_id', property.id)
                    .eq('user_token', userToken)
                    .lte('date_start', formatDate(prevEndDate))
                    .gte('date_end', formatDate(prevStartDate))
                    .order('date_start', { ascending: false })
                    .limit(1);
                if (currentPerfData && currentPerfData.length > 0) {
                    const currentRecord = currentPerfData[0];
                    const currentClicks = currentRecord.total_clicks || 0;
                    clicksData.value = currentClicks;
                    console.log('[METRICS SUMMARY] Found current period data:', {
                        clicks: currentClicks,
                        impressions: currentRecord.total_impressions,
                        dateRange: `${currentRecord.date_start} to ${currentRecord.date_end}`
                    });
                    if (prevPerfData && prevPerfData.length > 0) {
                        const prevRecord = prevPerfData[0];
                        const prevClicks = prevRecord.total_clicks || 0;
                        if (prevClicks > 0) {
                            clicksData.change = Math.round(((currentClicks - prevClicks) / prevClicks) * 100);
                            clicksData.trend = clicksData.change > 0 ? 'up' : clicksData.change < 0 ? 'down' : 'neutral';
                        }
                        console.log('[METRICS SUMMARY] Calculated trend:', {
                            prevClicks,
                            currentClicks,
                            change: clicksData.change,
                            trend: clicksData.trend,
                            prevDateRange: `${prevRecord.date_start} to ${prevRecord.date_end}`
                        });
                    }
                }
                else {
                    console.log('[METRICS SUMMARY] No performance data found for the specified date range');
                    // Debug: Check what data exists for this property
                    const { data: allPerfData } = await supabase
                        .from('gsc_performance_data')
                        .select('date_start, date_end, total_clicks, total_impressions')
                        .eq('property_id', property.id)
                        .eq('user_token', userToken)
                        .order('date_start', { ascending: false })
                        .limit(10);
                    console.log('[METRICS SUMMARY] Available performance data for property:', allPerfData);
                    console.log('[METRICS SUMMARY] Requested date range:', `${formatDate(startDate)} to ${formatDate(endDate)}`);
                }
            }
        }
        catch (error) {
            console.log('[METRICS SUMMARY] Error fetching GSC data:', error);
        }
        // Fetch technical SEO data (indexing status and tech score)
        let indexingData = { indexed: 0, total: 0, percentage: 0 };
        let techScoreData = { score: 0, maxScore: 100, percentage: 0, trend: 'neutral' };
        try {
            const techResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/technical-seo/summary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ siteUrl, userToken })
            });
            if (techResponse.ok) {
                const techData = await techResponse.json();
                if (techData.success && techData.data) {
                    const { overview } = techData.data;
                    // Indexing data
                    indexingData = {
                        indexed: overview.indexablePages || 0,
                        total: overview.totalPages || 0,
                        percentage: overview.totalPages > 0 ? Math.round((overview.indexablePages / overview.totalPages) * 100) : 0
                    };
                    // Tech Score calculation from priority checks
                    const techScore = calculateTechScore(techData.data);
                    techScoreData = {
                        score: techScore.score,
                        maxScore: techScore.maxScore,
                        percentage: techScore.percentage,
                        trend: techScore.trend
                    };
                }
            }
        }
        catch (error) {
            console.log('[METRICS SUMMARY] Error fetching technical SEO data:', error);
        }
        const summary = {
            clicks: clicksData,
            indexing: indexingData,
            techScore: techScoreData,
            backlinks: { comingSoon: true },
            geoVisibility: { comingSoon: true }
        };
        console.log('[METRICS SUMMARY] Successfully compiled metrics for:', siteUrl);
        return server_1.NextResponse.json({
            success: true,
            data: summary,
            lastUpdated: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('[METRICS SUMMARY] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch metrics summary' }, { status: 500 });
    }
}
// Calculate Tech Score from technical SEO data
function calculateTechScore(techData) {
    const { overview, issues } = techData;
    // Define priority checks with weights
    const PRIORITY_CHECKS = [
        { name: 'indexability', weight: 30 }, // 30% - Can pages be indexed
        { name: 'mobile_usability', weight: 25 }, // 25% - Mobile friendly
        { name: 'schema_markup', weight: 20 }, // 20% - Structured data
        { name: 'critical_issues', weight: 15 }, // 15% - No critical issues
        { name: 'sitemap_robots', weight: 10 } // 10% - Sitemap & robots.txt
    ];
    let totalScore = 0;
    const maxScore = 100;
    // Calculate each check
    if (overview.totalPages > 0) {
        // Indexability score (30%)
        const indexabilityScore = (overview.indexablePages / overview.totalPages) * PRIORITY_CHECKS[0].weight;
        totalScore += indexabilityScore;
        // Mobile usability score (25%)
        const mobileScore = (overview.mobileFriendly / overview.totalPages) * PRIORITY_CHECKS[1].weight;
        totalScore += mobileScore;
        // Schema markup score (20%)
        const schemaScore = (overview.withSchema / overview.totalPages) * PRIORITY_CHECKS[2].weight;
        totalScore += schemaScore;
    }
    else {
        // If no pages data, give benefit of the doubt for basic functionality
        totalScore += PRIORITY_CHECKS[0].weight * 0.8; // 80% for indexability
        totalScore += PRIORITY_CHECKS[1].weight * 0.8; // 80% for mobile
    }
    // Critical issues penalty (15%)
    const criticalIssues = issues?.filter((issue) => issue.severity === 'critical').length || 0;
    const criticalIssuesScore = criticalIssues === 0 ? PRIORITY_CHECKS[3].weight : Math.max(0, PRIORITY_CHECKS[3].weight - (criticalIssues * 5));
    totalScore += criticalIssuesScore;
    // Sitemap & robots.txt score (10%)
    let infrastructureScore = 0;
    if (techData.sitemap?.status === 'submitted')
        infrastructureScore += 5;
    if (techData.robots?.exists && techData.robots?.accessible)
        infrastructureScore += 5;
    totalScore += infrastructureScore;
    // Ensure score is within bounds
    totalScore = Math.min(Math.max(totalScore, 0), maxScore);
    const percentage = Math.round(totalScore);
    return {
        score: percentage,
        maxScore,
        percentage,
        trend: 'neutral' // Could be calculated from historical data in future
    };
}
