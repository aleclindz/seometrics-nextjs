"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.POST = POST;
const server_1 = require("next/server");
const googleapis_1 = require("googleapis");
const supabase_js_1 = require("@supabase/supabase-js");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function POST(request) {
    try {
        console.log('[GSC SYNC] Starting manual sync process');
        const { userToken } = await request.json();
        if (!userToken) {
            return server_1.NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        // Get active GSC connection
        const { data: connection, error: connectionError } = await supabase
            .from('gsc_connections')
            .select('*')
            .eq('user_token', userToken)
            .eq('is_active', true)
            .single();
        if (connectionError || !connection) {
            console.log('[GSC SYNC] No active GSC connection found');
            return server_1.NextResponse.json({ error: 'No GSC connection found' }, { status: 404 });
        }
        // Check if token is expired and refresh if needed
        const now = new Date();
        const expiresAt = new Date(connection.expires_at);
        if (now >= expiresAt) {
            console.log('[GSC SYNC] Token expired, attempting refresh');
            const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')}/api/gsc/oauth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userToken })
            });
            if (!refreshResponse.ok) {
                return server_1.NextResponse.json({ error: 'Token expired and refresh failed' }, { status: 401 });
            }
            // Refetch updated connection
            const { data: updatedConnection } = await supabase
                .from('gsc_connections')
                .select('*')
                .eq('user_token', userToken)
                .eq('is_active', true)
                .single();
            if (updatedConnection) {
                connection.access_token = updatedConnection.access_token;
            }
        }
        // Get OAuth credentials
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            console.log('[GSC SYNC] Missing OAuth credentials');
            return server_1.NextResponse.json({ error: 'OAuth credentials not configured' }, { status: 500 });
        }
        // Create OAuth2 client
        const oauth2Client = new googleapis_1.google.auth.OAuth2(clientId, clientSecret);
        oauth2Client.setCredentials({
            access_token: connection.access_token,
            refresh_token: connection.refresh_token
        });
        // Create Search Console API client
        const webmasters = googleapis_1.google.webmasters({ version: 'v3', auth: oauth2Client });
        // Get all properties for this connection
        let { data: properties, error: propertiesError } = await supabase
            .from('gsc_properties')
            .select('*')
            .eq('connection_id', connection.id)
            .eq('is_active', true);
        if (propertiesError || !properties?.length) {
            console.log('[GSC SYNC] No properties found, fetching from GSC API first');
            // Fetch properties from GSC API
            const sitesResponse = await webmasters.sites.list();
            const sites = sitesResponse.data.siteEntry || [];
            // Store properties in database
            for (const site of sites) {
                await supabase
                    .from('gsc_properties')
                    .upsert({
                    connection_id: connection.id,
                    user_token: userToken,
                    site_url: site.siteUrl,
                    permission_level: site.permissionLevel,
                    is_verified: true,
                    is_active: true
                }, {
                    onConflict: 'connection_id,site_url'
                });
            }
            // Refetch properties
            const { data: newProperties } = await supabase
                .from('gsc_properties')
                .select('*')
                .eq('connection_id', connection.id)
                .eq('is_active', true);
            properties = newProperties || [];
        }
        // Ensure properties is not null
        const propertiesToSync = properties || [];
        console.log('[GSC SYNC] Found', propertiesToSync.length, 'properties to sync');
        // Sync performance data for each property (last 7 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 7);
        const syncResults = [];
        for (const property of propertiesToSync) {
            try {
                console.log('[GSC SYNC] Syncing property:', property.site_url);
                // Query performance data
                const performanceRequest = {
                    siteUrl: property.site_url,
                    requestBody: {
                        startDate: startDate.toISOString().split('T')[0],
                        endDate: endDate.toISOString().split('T')[0],
                        dimensions: ['query', 'page', 'country', 'device'],
                        rowLimit: 1000,
                        startRow: 0
                    }
                };
                const performanceResponse = await webmasters.searchanalytics.query(performanceRequest);
                const rows = performanceResponse.data.rows || [];
                // Aggregate data by dimension
                const aggregated = {
                    total: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
                    queries: {},
                    pages: {},
                    countries: {},
                    devices: {}
                };
                // Process rows
                rows.forEach(row => {
                    if (!row.keys || !row.clicks || !row.impressions)
                        return;
                    const [query, page, country, device] = row.keys;
                    const clicks = row.clicks || 0;
                    const impressions = row.impressions || 0;
                    const ctr = row.ctr || 0;
                    const position = row.position || 0;
                    // Update totals
                    aggregated.total.clicks += clicks;
                    aggregated.total.impressions += impressions;
                    // Aggregate by query (top 50)
                    if (query && Object.keys(aggregated.queries).length < 50) {
                        if (!aggregated.queries[query]) {
                            aggregated.queries[query] = { clicks: 0, impressions: 0, ctr: 0, position: 0 };
                        }
                        aggregated.queries[query].clicks += clicks;
                        aggregated.queries[query].impressions += impressions;
                        aggregated.queries[query].ctr = aggregated.queries[query].clicks / aggregated.queries[query].impressions;
                        aggregated.queries[query].position = position;
                    }
                    // Similar aggregation for pages, countries, devices...
                    if (page && Object.keys(aggregated.pages).length < 50) {
                        if (!aggregated.pages[page]) {
                            aggregated.pages[page] = { clicks: 0, impressions: 0, ctr: 0, position: 0 };
                        }
                        aggregated.pages[page].clicks += clicks;
                        aggregated.pages[page].impressions += impressions;
                        aggregated.pages[page].ctr = aggregated.pages[page].clicks / aggregated.pages[page].impressions;
                        aggregated.pages[page].position = position;
                    }
                    if (country && Object.keys(aggregated.countries).length < 20) {
                        if (!aggregated.countries[country]) {
                            aggregated.countries[country] = { clicks: 0, impressions: 0, ctr: 0, position: 0 };
                        }
                        aggregated.countries[country].clicks += clicks;
                        aggregated.countries[country].impressions += impressions;
                        aggregated.countries[country].ctr = aggregated.countries[country].clicks / aggregated.countries[country].impressions;
                        aggregated.countries[country].position = position;
                    }
                    if (device) {
                        if (!aggregated.devices[device]) {
                            aggregated.devices[device] = { clicks: 0, impressions: 0, ctr: 0, position: 0 };
                        }
                        aggregated.devices[device].clicks += clicks;
                        aggregated.devices[device].impressions += impressions;
                        aggregated.devices[device].ctr = aggregated.devices[device].clicks / aggregated.devices[device].impressions;
                        aggregated.devices[device].position = position;
                    }
                });
                // Calculate overall averages
                if (aggregated.total.impressions > 0) {
                    aggregated.total.ctr = aggregated.total.clicks / aggregated.total.impressions;
                }
                // Convert objects to arrays and sort
                const topQueries = Object.entries(aggregated.queries)
                    .map(([query, data]) => ({ query, ...data }))
                    .sort((a, b) => b.clicks - a.clicks);
                const topPages = Object.entries(aggregated.pages)
                    .map(([page, data]) => ({ page, ...data }))
                    .sort((a, b) => b.clicks - a.clicks);
                const topCountries = Object.entries(aggregated.countries)
                    .map(([country, data]) => ({ country, ...data }))
                    .sort((a, b) => b.clicks - a.clicks);
                const deviceData = Object.entries(aggregated.devices)
                    .map(([device, data]) => ({ device, ...data }))
                    .sort((a, b) => b.clicks - a.clicks);
                // Store performance data in database
                const { error: perfError } = await supabase
                    .from('gsc_performance_data')
                    .upsert({
                    property_id: property.id,
                    user_token: userToken,
                    date_start: startDate.toISOString().split('T')[0],
                    date_end: endDate.toISOString().split('T')[0],
                    total_clicks: aggregated.total.clicks,
                    total_impressions: aggregated.total.impressions,
                    avg_ctr: aggregated.total.ctr,
                    avg_position: aggregated.total.position,
                    queries: topQueries,
                    pages: topPages,
                    countries: topCountries,
                    devices: deviceData
                }, {
                    onConflict: 'property_id,date_start,date_end'
                });
                if (perfError) {
                    console.error('[GSC SYNC] Error storing performance data:', perfError);
                    syncResults.push({
                        property: property.site_url,
                        success: false,
                        error: perfError.message
                    });
                }
                else {
                    console.log('[GSC SYNC] Successfully synced property:', property.site_url);
                    syncResults.push({
                        property: property.site_url,
                        success: true,
                        rowCount: rows.length,
                        totalClicks: aggregated.total.clicks,
                        totalImpressions: aggregated.total.impressions
                    });
                }
            }
            catch (propertyError) {
                console.error('[GSC SYNC] Error syncing property:', property.site_url, propertyError);
                syncResults.push({
                    property: property.site_url,
                    success: false,
                    error: propertyError instanceof Error ? propertyError.message : 'Unknown error'
                });
            }
        }
        // Update connection last_sync_at
        await supabase
            .from('gsc_connections')
            .update({
            last_sync_at: new Date().toISOString(),
            sync_errors: syncResults.filter(r => !r.success)
        })
            .eq('id', connection.id);
        console.log('[GSC SYNC] Sync completed for user:', connection.email);
        return server_1.NextResponse.json({
            success: true,
            message: 'Sync completed successfully',
            results: syncResults,
            propertiesCount: propertiesToSync.length,
            successCount: syncResults.filter(r => r.success).length,
            errorCount: syncResults.filter(r => !r.success).length
        });
    }
    catch (error) {
        console.error('[GSC SYNC] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Failed to sync GSC data' }, { status: 500 });
    }
}
