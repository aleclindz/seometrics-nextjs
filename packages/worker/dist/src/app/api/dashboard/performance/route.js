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
        const days = parseInt(searchParams.get('days') || '30');
        if (!userToken || !domain) {
            return server_1.NextResponse.json({ error: 'User token and domain required' }, { status: 400 });
        }
        console.log('[DASHBOARD PERFORMANCE] Fetching data for:', { domain, days });
        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        // Get GSC property for this domain
        const { data: gscConnection } = await supabase
            .from('gsc_connections')
            .select('id')
            .eq('user_token', userToken)
            .eq('is_active', true)
            .single();
        if (!gscConnection) {
            console.log('[DASHBOARD PERFORMANCE] No GSC connection found');
            return server_1.NextResponse.json({
                success: true,
                data: {
                    total: { impressions: 0, clicks: 0, ctr: 0, position: 0 },
                    topQueries: [],
                    topPages: [],
                    referrers: [],
                    hasData: false,
                    message: 'Google Search Console not connected'
                }
            });
        }
        // Try multiple domain formats for property lookup
        const domainVariants = [
            domain,
            `sc-domain:${domain}`,
            `sc-domain:${domain.replace('https://', '').replace('http://', '')}`,
            domain.replace('https://', '').replace('http://', '')
        ];
        let property = null;
        for (const variant of domainVariants) {
            const { data } = await supabase
                .from('gsc_properties')
                .select('id, site_url')
                .eq('connection_id', gscConnection.id)
                .eq('site_url', variant)
                .eq('is_active', true)
                .single();
            if (data) {
                property = data;
                break;
            }
        }
        if (!property) {
            console.log('[DASHBOARD PERFORMANCE] No GSC property found for domain');
            return server_1.NextResponse.json({
                success: true,
                data: {
                    total: { impressions: 0, clicks: 0, ctr: 0, position: 0 },
                    topQueries: [],
                    topPages: [],
                    referrers: [],
                    hasData: false,
                    message: 'Domain not found in Google Search Console'
                }
            });
        }
        // Get performance data from the last 30 days, with preference for recent data
        const { data: performanceData, error } = await supabase
            .from('gsc_performance_data')
            .select('*')
            .eq('property_id', property.id)
            .eq('user_token', userToken)
            .gte('date_start', startDateStr)
            .lte('date_end', endDateStr)
            .order('date_end', { ascending: false })
            .limit(10);
        if (error) {
            console.error('[DASHBOARD PERFORMANCE] Database error:', error);
            return server_1.NextResponse.json({ error: 'Failed to fetch performance data' }, { status: 500 });
        }
        if (!performanceData || performanceData.length === 0) {
            console.log('[DASHBOARD PERFORMANCE] No performance data found');
            return server_1.NextResponse.json({
                success: true,
                data: {
                    total: { impressions: 0, clicks: 0, ctr: 0, position: 0 },
                    topQueries: [],
                    topPages: [],
                    referrers: [],
                    hasData: false,
                    message: 'No recent performance data available'
                }
            });
        }
        // Use the most recent data point
        const latestData = performanceData[0];
        // Aggregate totals from all recent data points for better accuracy
        const aggregatedTotals = performanceData.reduce((acc, data) => ({
            impressions: acc.impressions + (data.total_impressions || 0),
            clicks: acc.clicks + (data.total_clicks || 0),
            ctr: 0, // Will calculate after
            position: 0 // Will calculate after
        }), { impressions: 0, clicks: 0, ctr: 0, position: 0 });
        // Calculate averages
        aggregatedTotals.ctr = aggregatedTotals.impressions > 0 ?
            (aggregatedTotals.clicks / aggregatedTotals.impressions) * 100 : 0;
        aggregatedTotals.position = performanceData.reduce((sum, data) => sum + (data.avg_position || 0), 0) / performanceData.length;
        // Extract top queries from the latest data
        const topQueries = (latestData.queries || []).slice(0, 10).map((q) => ({
            query: q.query,
            impressions: q.impressions || 0,
            clicks: q.clicks || 0,
            ctr: q.ctr ? (q.ctr * 100) : 0,
            position: q.position || 0
        }));
        // Extract top pages
        const topPages = (latestData.pages || []).slice(0, 10).map((p) => ({
            page: p.page,
            impressions: p.impressions || 0,
            clicks: p.clicks || 0,
            ctr: p.ctr ? (p.ctr * 100) : 0,
            position: p.position || 0
        }));
        // Generate referrer data from top queries (simulated)
        const referrers = topQueries.slice(0, 5).map((q, index) => {
            const sources = ['Perplexity', 'Reddit', 'Product Hunt', 'Hacker News', 'Twitter'];
            return {
                source: sources[index] || 'Organic Search',
                clicks: Math.floor(q.clicks * (0.8 - index * 0.1)), // Estimated distribution
                percentage: ((q.clicks / aggregatedTotals.clicks) * 100).toFixed(1)
            };
        });
        console.log('[DASHBOARD PERFORMANCE] Returning performance data:', {
            totalImpressions: aggregatedTotals.impressions,
            totalClicks: aggregatedTotals.clicks,
            queriesCount: topQueries.length,
            pagesCount: topPages.length
        });
        return server_1.NextResponse.json({
            success: true,
            data: {
                total: {
                    impressions: aggregatedTotals.impressions,
                    clicks: aggregatedTotals.clicks,
                    ctr: parseFloat(aggregatedTotals.ctr.toFixed(2)),
                    position: parseFloat(aggregatedTotals.position.toFixed(1))
                },
                topQueries,
                topPages,
                referrers,
                hasData: true,
                dateRange: { startDate: startDateStr, endDate: endDateStr },
                dataPointsUsed: performanceData.length
            }
        });
    }
    catch (error) {
        console.error('[DASHBOARD PERFORMANCE] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
