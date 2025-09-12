"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const gsc_search_analytics_sync_1 = require("@/services/gsc/gsc-search-analytics-sync");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
/**
 * Nightly GSC Search Analytics Sync Cron Job
 * Runs daily to pull yesterday's GSC Search Analytics data
 * Based on GPT-5 recommendations for proper GSC dashboard data
 */
async function GET(request) {
    try {
        // Verify cron authentication
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            console.log('[GSC ANALYTICS CRON] Unauthorized access attempt');
            return server_1.NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.log('[GSC ANALYTICS CRON] Starting nightly GSC Search Analytics sync');
        // Get all active GSC connections with their properties
        const { data: connections, error: connectionsError } = await supabase
            .from('gsc_connections')
            .select(`
        id,
        user_token,
        is_active,
        gsc_properties!inner (
          id,
          site_url,
          is_active
        )
      `)
            .eq('is_active', true)
            .eq('gsc_properties.is_active', true);
        if (connectionsError) {
            console.error('[GSC ANALYTICS CRON] Error fetching connections:', connectionsError);
            return server_1.NextResponse.json({ error: 'Database error' }, { status: 500 });
        }
        if (!connections || connections.length === 0) {
            console.log('[GSC ANALYTICS CRON] No active GSC connections found');
            return server_1.NextResponse.json({
                message: 'No active GSC connections to sync',
                syncResults: []
            });
        }
        const syncResults = [];
        let totalRecordsProcessed = 0;
        let successCount = 0;
        let errorCount = 0;
        console.log(`[GSC ANALYTICS CRON] Found ${connections.length} active connections to sync`);
        // Process each connection with its properties
        for (const connection of connections) {
            const properties = Array.isArray(connection.gsc_properties)
                ? connection.gsc_properties
                : [connection.gsc_properties];
            for (const property of properties) {
                if (!property.is_active)
                    continue;
                try {
                    console.log(`[GSC ANALYTICS CRON] Syncing ${property.site_url} for user ${connection.user_token}`);
                    const result = await (0, gsc_search_analytics_sync_1.syncYesterdayGSCData)(connection.user_token, property.site_url);
                    if (result.success) {
                        successCount++;
                        totalRecordsProcessed += result.recordsProcessed;
                        console.log(`[GSC ANALYTICS CRON] ✅ Synced ${property.site_url}: ${result.recordsProcessed} records, ${result.dimensionsSynced.length} dimension sets`);
                    }
                    else {
                        errorCount++;
                        console.error(`[GSC ANALYTICS CRON] ❌ Failed to sync ${property.site_url}: ${result.error}`);
                    }
                    syncResults.push({
                        userToken: connection.user_token,
                        siteUrl: property.site_url,
                        success: result.success,
                        recordsProcessed: result.recordsProcessed,
                        dimensionsSynced: result.dimensionsSynced,
                        error: result.error
                    });
                    // Rate limiting between properties
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                catch (error) {
                    errorCount++;
                    console.error(`[GSC ANALYTICS CRON] Unexpected error syncing ${property.site_url}:`, error.message);
                    syncResults.push({
                        userToken: connection.user_token,
                        siteUrl: property.site_url,
                        success: false,
                        recordsProcessed: 0,
                        dimensionsSynced: [],
                        error: error.message
                    });
                }
            }
        }
        // Log summary
        console.log(`[GSC ANALYTICS CRON] Sync completed: ${successCount} success, ${errorCount} errors, ${totalRecordsProcessed} total records`);
        // Log to system_logs table for monitoring
        try {
            await supabase.from('system_logs').insert({
                log_type: 'gsc_analytics_sync',
                message: `Nightly GSC Search Analytics sync completed: ${successCount} success, ${errorCount} errors, ${totalRecordsProcessed} records processed`,
                metadata: {
                    successCount,
                    errorCount,
                    totalRecordsProcessed,
                    propertiesProcessed: syncResults.length,
                    timestamp: new Date().toISOString()
                }
            });
        }
        catch (logError) {
            console.error('[GSC ANALYTICS CRON] Failed to log to system_logs:', logError);
        }
        return server_1.NextResponse.json({
            success: true,
            message: `GSC Search Analytics sync completed: ${successCount} success, ${errorCount} errors`,
            summary: {
                totalProperties: syncResults.length,
                successCount,
                errorCount,
                totalRecordsProcessed
            },
            syncResults
        });
    }
    catch (error) {
        console.error('[GSC ANALYTICS CRON] Unexpected error:', error);
        // Log critical error
        try {
            await supabase.from('system_logs').insert({
                log_type: 'gsc_analytics_sync_error',
                message: `Critical error in GSC Search Analytics cron job: ${error.message}`,
                metadata: {
                    error: error.message,
                    stack: error.stack,
                    timestamp: new Date().toISOString()
                }
            });
        }
        catch (logError) {
            console.error('[GSC ANALYTICS CRON] Failed to log critical error:', logError);
        }
        return server_1.NextResponse.json({
            error: 'Internal server error',
            message: error.message
        }, { status: 500 });
    }
}
