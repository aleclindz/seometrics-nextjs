/**
 * GSC Search Analytics Sync Service
 * Based on GPT-5 recommendations for proper GSC Search Console API integration
 * Creates a nightly incremental pull with dimensional fact table storage
 */

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type GSCDimension = 'date' | 'query' | 'page' | 'country' | 'device' | 'searchAppearance';
type SearchType = 'WEB' | 'IMAGE' | 'VIDEO' | 'NEWS';
type DataState = 'FINAL' | 'ALL';

interface GSCSyncOptions {
  userToken: string;
  siteUrl: string;
  startDate: string;
  endDate: string;
  searchType?: SearchType;
  dataState?: DataState;
  rowLimit?: number;
}

interface GSCAnalyticsRow {
  user_token: string;
  site_url: string;
  start_date: string;
  end_date: string;
  date?: string;
  search_type: SearchType;
  data_state: DataState;
  query?: string;
  page?: string;
  country?: string;
  device?: string;
  appearance?: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

/**
 * Fetches all GSC Search Analytics data for given dimensions with pagination
 */
async function fetchAllGSCData(
  searchConsole: any,
  siteUrl: string,
  dimensions: GSCDimension[],
  options: GSCSyncOptions
): Promise<any[]> {
  const { startDate, endDate, searchType = 'WEB', dataState = 'FINAL', rowLimit = 25000 } = options;
  
  console.log(`[GSC SYNC] Fetching ${dimensions.join('+')} data for ${siteUrl} (${startDate} to ${endDate})`);
  
  const allRows: any[] = [];
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

  } catch (error: any) {
    console.error(`[GSC SYNC] Error fetching GSC data:`, error?.response?.data || error.message);
    throw new Error(`Failed to fetch GSC data: ${error.message}`);
  }
}

/**
 * Transforms GSC API response rows into database records
 */
function transformToAnalyticsRecords(
  dimensions: GSCDimension[],
  apiRows: any[],
  options: GSCSyncOptions
): GSCAnalyticsRow[] {
  const { userToken, siteUrl, startDate, endDate, searchType = 'WEB', dataState = 'FINAL' } = options;

  return apiRows.map(row => {
    const keys = row.keys || [];
    const lookup: Record<string, string | undefined> = {};
    
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
async function upsertAnalyticsBatch(records: GSCAnalyticsRow[]): Promise<void> {
  if (!records.length) return;

  const BATCH_SIZE = 1000; // Smaller batches for better reliability
  
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    
    console.log(`[GSC SYNC] Upserting batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(records.length/BATCH_SIZE)} (${batch.length} records)`);
    
    try {
      const { error } = await supabase
        .from('gsc_search_analytics')
        .upsert(batch, {
          onConflict: 'user_token,site_url,search_type,data_state,date,query,page,country,device,appearance'
        });

      if (error) {
        console.error('[GSC SYNC] Batch upsert error:', error);
        throw error;
      }

      // Small delay between batches
      if (i + BATCH_SIZE < records.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    } catch (error) {
      console.error(`[GSC SYNC] Failed to upsert batch ${Math.floor(i/BATCH_SIZE) + 1}:`, error);
      throw error;
    }
  }

  console.log(`[GSC SYNC] Successfully upserted ${records.length} analytics records`);
}

/**
 * Main GSC Search Analytics sync function
 * Syncs multiple dimension combinations as recommended by GPT-5
 */
export async function syncGSCSearchAnalytics(options: GSCSyncOptions): Promise<{
  success: boolean;
  recordsProcessed: number;
  dimensionsSynced: string[];
  error?: string;
}> {
  try {
    console.log(`[GSC SYNC] Starting search analytics sync for ${options.siteUrl}`);

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
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    
    // Set user credentials
    oauth2Client.setCredentials({
      access_token: connection.access_token,
      refresh_token: connection.refresh_token,
    });

    const searchConsole = google.searchconsole({ version: 'v1', auth: oauth2Client });

    // Define dimension sets to sync (matching GSC UI views)
    const dimensionSets: GSCDimension[][] = [
      ['date'],                    // Daily totals (for time series charts)
      ['query'],                   // Top queries
      ['page'],                    // Top pages  
      ['country'],                 // Geographic data
      ['device'],                  // Device breakdown
      ['searchAppearance'],        // Rich results data
      ['date', 'query'],           // Query trends over time
      ['date', 'page'],            // Page performance over time
      ['query', 'page'],           // Query-page relationships
    ];

    let totalRecordsProcessed = 0;
    const processedDimensions: string[] = [];

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

      } catch (error: any) {
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

  } catch (error: any) {
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
export async function syncYesterdayGSCData(userToken: string, siteUrl: string): Promise<{
  success: boolean;
  recordsProcessed: number;
  dimensionsSynced: string[];
  error?: string;
}> {
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
export async function syncRecentGSCData(
  userToken: string, 
  siteUrl: string, 
  daysBack: number = 7
): Promise<{
  success: boolean;
  recordsProcessed: number;
  dimensionsSynced: string[];
  error?: string;
}> {
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