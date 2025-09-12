"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const seoagent_js_status_1 = require("@/lib/seoagent-js-status");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        const siteUrl = searchParams.get('site_url');
        if (!userToken || !siteUrl) {
            return server_1.NextResponse.json({ success: false, error: 'User token and site_url are required' }, { status: 400 });
        }
        // Normalize domain and site variants
        const raw = decodeURIComponent(siteUrl);
        const cleanDomain = raw.replace(/^sc-domain:/, '').replace(/^https?:\/\//, '').replace(/\/$/, '');
        const siteVariants = [
            `sc-domain:${cleanDomain}`,
            `https://${cleanDomain}`,
            `http://${cleanDomain}`,
            cleanDomain
        ];
        // Fetch website record (managed)
        const { data: website, error: websiteError } = await supabase
            .from('websites')
            .select('*')
            .eq('user_token', userToken)
            .eq('is_managed', true)
            .eq('is_excluded_from_sync', false)
            .in('domain', [cleanDomain, `www.${cleanDomain}`])
            .maybeSingle();
        if (websiteError) {
            console.warn('[SITE STATUS] Website lookup warning:', websiteError);
        }
        // Check GSC property + connection
        const { data: gscProperties } = await supabase
            .from('gsc_properties')
            .select('*')
            .eq('user_token', userToken)
            .eq('is_active', true);
        const property = (gscProperties || []).find(p => siteVariants.includes(p.site_url));
        const { data: gscConnections } = await supabase
            .from('gsc_connections')
            .select('*')
            .eq('user_token', userToken)
            .order('connected_at', { ascending: false });
        const gscConnected = !!property && !!(gscConnections && gscConnections.length > 0);
        const lastSync = gscConnections?.[0]?.last_sync_at || null;
        // CMS connection (if we found the website row)
        let cmsStatus = 'none';
        if (website) {
            const { data: cmsConnections } = await supabase
                .from('cms_connections')
                .select('*')
                .eq('user_token', userToken)
                .eq('website_id', website.id)
                .eq('status', 'active');
            cmsStatus = (cmsConnections && cmsConnections.length > 0) ? 'connected' : 'none';
        }
        // SmartJS detection
        const smartjsStatus = (0, seoagent_js_status_1.getSmartJSStatus)(cleanDomain) === 'active' ? 'active' : 'inactive';
        // Compute last 28d metrics from dimensional table (daily totals only)
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - 1);
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 27);
        const startDateStr = startDate.toISOString().slice(0, 10);
        const endDateStr = endDate.toISOString().slice(0, 10);
        const { data: dailyRows, error: metricsError } = await supabase
            .from('gsc_search_analytics')
            .select('date, clicks, impressions, ctr, position, site_url')
            .eq('user_token', userToken)
            .in('site_url', siteVariants)
            .not('date', 'is', null)
            .is('query', null)
            .is('page', null)
            .gte('date', startDateStr)
            .lte('date', endDateStr)
            .order('date', { ascending: true });
        if (metricsError) {
            console.warn('[SITE STATUS] Metrics fetch warning:', metricsError);
        }
        const totals = (dailyRows || []).reduce((acc, r) => {
            acc.clicks += r.clicks || 0;
            acc.impressions += r.impressions || 0;
            acc.positionSum += r.position || 0;
            acc.days += 1;
            return acc;
        }, { clicks: 0, impressions: 0, positionSum: 0, days: 0 });
        const avgPosition = totals.days > 0 ? (totals.positionSum / totals.days) : 0;
        const ctrPct = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
        return server_1.NextResponse.json({
            success: true,
            data: {
                site_url: cleanDomain,
                overall_status: gscConnected ? 'connected' : 'needs_setup',
                integrations: {
                    google_search_console: {
                        status: gscConnected ? 'connected' : 'none',
                        last_sync: lastSync,
                        connected: gscConnected
                    },
                    cms_platform: {
                        status: cmsStatus,
                        connected: cmsStatus === 'connected'
                    },
                    smartjs: {
                        status: smartjsStatus,
                        active: smartjsStatus === 'active'
                    }
                },
                current_metrics: {
                    clicks_last_28_days: totals.clicks,
                    impressions_last_28_days: totals.impressions,
                    click_through_rate: ctrPct.toFixed(2) + '%',
                    average_position: Number(avgPosition.toFixed(1))
                }
            }
        });
    }
    catch (error) {
        console.error('[SITE STATUS] Unexpected error:', error);
        return server_1.NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
