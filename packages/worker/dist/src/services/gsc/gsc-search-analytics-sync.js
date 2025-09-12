"use strict";
/**
 * GSC Search Analytics Sync Service
 * Based on GPT-5 recommendations for proper GSC Search Console API integration
 * Creates a nightly incremental pull with dimensional fact table storage
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncGSCSearchAnalytics = syncGSCSearchAnalytics;
exports.syncYesterdayGSCData = syncYesterdayGSCData;
exports.syncRecentGSCData = syncRecentGSCData;
const supabase_js_1 = require("@supabase/supabase-js");
const googleapis_1 = require("googleapis");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
/**
 * Fetches all GSC Search Analytics data for given dimensions with pagination
 */
async function fetchAllGSCData(searchConsole, siteUrl, dimensions, options) {
    const { startDate, endDate, searchType = 'WEB', dataState = 'FINAL', rowLimit = 25000 } = options;
    console.log(`[GSC SYNC] Fetching ${dimensions.join('+')} data for ${siteUrl} (${startDate} to ${endDate})`);
    const allRows = [];
    let startRow = 0;
    let totalFetched = 0;
    try {
        for (;;) {
            console.log(`[GSC SYNC] Fetching batch starting at row ${startRow}...`);
            const response = await searchConsole.searchanalytics.query({
                siteUrl,
                requestBody: {
                    startDate,
                    endDate,
                    dimensions,
                    searchType,
                    dataState,
                    rowLimit,
                    startRow
                }
            });
            const batch = response.data.rows || [];
            allRows.push(...batch);
            totalFetched += batch.length;
            console.log(`[GSC SYNC] Fetched ${batch.length} rows (total: ${totalFetched})`);
            // Break if we got less than the limit (no more data)
            if (batch.length < rowLimit) {
                break;
            }
            // Move to next batch
            startRow += rowLimit;
            // Rate limiting - small delay between requests
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        console.log(`[GSC SYNC] Completed fetch: ${totalFetched} total rows for ${dimensions.join('+')}`);
        return allRows;
    }
    catch (error) {
        console.error(`[GSC SYNC] Error fetching GSC data:`, error?.response?.data || error.message);
        throw new Error(`Failed to fetch GSC data: ${error.message}`);
    }
}
/**
 * Transforms GSC API response rows into database records
 */
function transformToAnalyticsRecords(dimensions, apiRows, options) {
    const { userToken, siteUrl, startDate, endDate, searchType = 'WEB', dataState = 'FINAL' } = options;
    return apiRows.map(row => {
        const keys = row.keys || [];
        const lookup = {};
        // Map dimension keys to lookup object
        dimensions.forEach((dimension, index) => {
            lookup[dimension] = keys[index];
        });
        return {
            user_token: userToken,
            site_url: siteUrl,
            start_date: startDate,
            end_date: endDate,
            date: lookup.date || undefined,
            search_type: searchType,
            data_state: dataState,
            query: lookup.query || undefined,
            page: lookup.page || undefined,
            country: lookup.country || undefined,
            device: lookup.device || undefined,
            appearance: lookup.searchAppearance || undefined,
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            ctr: row.ctr || 0,
            position: row.position || 0
        };
    });
}
/**
 * Upserts analytics records in batches to avoid payload limits
 */
async function upsertAnalyticsBatch(records) {
    if (!records.length)
        return;
    const BATCH_SIZE = 1000; // Smaller batches for better reliability
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        console.log(`[GSC SYNC] Upserting batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(records.length / BATCH_SIZE)} (${batch.length} records)`);
        try {
            // Use plain insert; we pre-clean the range to avoid duplicates and reduce constraint conflicts
            const { error } = await supabase
                .from('gsc_search_analytics')
                .insert(batch);
            if (error) {
                console.error('[GSC SYNC] Batch insert error:', error);
                throw error;
            }
            // Small delay between batches
            if (i + BATCH_SIZE < records.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        catch (error) {
            console.error(`[GSC SYNC] Failed to upsert batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
            throw error;
        }
    }
    console.log(`[GSC SYNC] Successfully upserted ${records.length} analytics records`);
}
/**
 * Main GSC Search Analytics sync function
 * Syncs multiple dimension combinations as recommended by GPT-5
 */
async function syncGSCSearchAnalytics(options) {
    try {
        console.log(`[GSC SYNC] Starting search analytics sync for ${options.siteUrl}`);
        // Pre-clean existing data for this user/site and date range to avoid duplicates
        try {
            const { startDate, endDate } = options;
            // Delete daily-grain rows in range
            const delDaily = await supabase
                .from('gsc_search_analytics')
                .delete()
                .eq('user_token', options.userToken)
                .eq('site_url', options.siteUrl)
                .not('date', 'is', null)
                .gte('date', startDate)
                .lte('date', endDate);
            if (delDaily.error) {
                console.warn('[GSC SYNC] Pre-clean daily delete warning:', delDaily.error.message || delDaily.error);
            }
            // Delete aggregated rows for the exact period (date is null)
            const delAgg = await supabase
                .from('gsc_search_analytics')
                .delete()
                .eq('user_token', options.userToken)
                .eq('site_url', options.siteUrl)
                .is('date', null)
                .eq('start_date', startDate)
                .eq('end_date', endDate);
            if (delAgg.error) {
                console.warn('[GSC SYNC] Pre-clean aggregated delete warning:', delAgg.error.message || delAgg.error);
            }
            console.log('[GSC SYNC] Pre-clean completed');
        }
        catch (e) {
            console.warn('[GSC SYNC] Pre-clean delete failed (non-fatal):', e?.message || e);
        }
        // Get OAuth credentials from user's GSC connection (same as other GSC APIs)
        const { data: connection, error: connError } = await supabase
            .from('gsc_connections')
            .select('*')
            .eq('user_token', options.userToken)
            .single();
        if (connError || !connection) {
            throw new Error('GSC connection not found for user');
        }
        // Initialize Google OAuth2 (same method as other GSC APIs)
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const oauth2Client = new googleapis_1.google.auth.OAuth2(clientId, clientSecret);
        // Set user credentials
        oauth2Client.setCredentials({
            access_token: connection.access_token,
            refresh_token: connection.refresh_token,
        });
        const searchConsole = googleapis_1.google.webmasters({ version: 'v3', auth: oauth2Client });
        // Define dimension sets to sync
        // Avoid composite date+dimension sets to reduce data volume and prevent unique-key collisions
        const dimensionSets = [
            ['date'], // Daily totals (time series)
            ['query'], // Aggregated by query (over range)
            ['page'], // Aggregated by page (over range)
            ['country'], // Aggregated by country
            ['device'], // Aggregated by device
            ['searchAppearance'], // Aggregated by search appearance
        ];
        let totalRecordsProcessed = 0;
        const processedDimensions = [];
        // Sync each dimension set
        for (const dimensions of dimensionSets) {
            try {
                const apiRows = await fetchAllGSCData(searchConsole, options.siteUrl, dimensions, options);
                const analyticsRecords = transformToAnalyticsRecords(dimensions, apiRows, options);
                if (analyticsRecords.length > 0) {
                    await upsertAnalyticsBatch(analyticsRecords);
                    totalRecordsProcessed += analyticsRecords.length;
                }
                processedDimensions.push(dimensions.join('+'));
                // Delay between dimension sets to respect rate limits
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            catch (error) {
                console.error(`[GSC SYNC] Failed to sync dimensions [${dimensions.join(',')}]:`, error.message);
                // Continue with other dimensions even if one fails
            }
        }
        console.log(`[GSC SYNC] Completed analytics sync: ${totalRecordsProcessed} records across ${processedDimensions.length} dimension sets`);
        return {
            success: true,
            recordsProcessed: totalRecordsProcessed,
            dimensionsSynced: processedDimensions
        };
    }
    catch (error) {
        console.error('[GSC SYNC] Search analytics sync failed:', error);
        return {
            success: false,
            recordsProcessed: 0,
            dimensionsSynced: [],
            error: error.message
        };
    }
}
/**
 * Convenience function to sync yesterday's data (most common use case)
 */
async function syncYesterdayGSCData(userToken, siteUrl) {
    // Calculate yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);
    const dateStr = yesterday.toISOString().slice(0, 10);
    return syncGSCSearchAnalytics({
        userToken,
        siteUrl,
        startDate: dateStr,
        endDate: dateStr,
        searchType: 'WEB',
        dataState: 'FINAL'
    });
}
/**
 * Sync last N days of GSC data (for initial setup or backfill)
 */
async function syncRecentGSCData(userToken, siteUrl, daysBack = 7) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1); // Yesterday
    endDate.setUTCHours(0, 0, 0, 0);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - daysBack + 1);
    const startDateStr = startDate.toISOString().slice(0, 10);
    const endDateStr = endDate.toISOString().slice(0, 10);
    console.log(`[GSC SYNC] Syncing ${daysBack} days of data: ${startDateStr} to ${endDateStr}`);
    return syncGSCSearchAnalytics({
        userToken,
        siteUrl,
        startDate: startDateStr,
        endDate: endDateStr,
        searchType: 'WEB',
        dataState: 'FINAL'
    });
}
