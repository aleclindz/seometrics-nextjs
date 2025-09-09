import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[GSC CRON] Starting daily GSC sync for all users');
    
    // Get all active GSC connections
    const { data: connections, error: connectionsError } = await supabase
      .from('gsc_connections')
      .select('*')
      .eq('is_active', true);

    if (connectionsError || !connections?.length) {
      console.log('[GSC CRON] No active connections found:', connectionsError);
      return NextResponse.json({ 
        message: 'No active connections found',
        processedCount: 0 
      });
    }

    console.log(`[GSC CRON] Found ${connections.length} active connections to sync`);

    const results = [] as any[];
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    // Process each connection
    for (const connection of connections) {
      try {
        console.log(`[GSC CRON] Syncing connection for user: ${connection.email}`);
        
        // First, ensure properties table is fresh for this user
        // (We re-use the properties route by calling webmasters.sites.list in the sync route if needed.)
        let propertiesCount = 0;
        {
          const propsCheck = await supabase
            .from('gsc_properties')
            .select('id')
            .eq('connection_id', connection.id)
            .eq('is_active', true);
          propertiesCount = propsCheck.data?.length || 0;
        }

        if (propertiesCount === 0) {
          // Trigger the legacy sync once to populate properties if empty
          await fetch(`${baseUrl}/api/gsc/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userToken: connection.user_token })
          }).catch(() => null);
        }

        if (true) {
          console.log(`[GSC CRON] Proceeding to analytics sync for ${connection.email}`);

          // Incremental analytics sync (yesterday) for each active property
          let propertiesCount = 0;
          let analyticsSuccess = 0;
          try {
            const { data: props } = await supabase
              .from('gsc_properties')
              .select('site_url')
              .eq('connection_id', connection.id)
              .eq('is_active', true);
            propertiesCount = props?.length || 0;

            for (const p of props || []) {
              try {
                const aResp = await fetch(`${baseUrl}/api/gsc/sync-analytics`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userToken: connection.user_token,
                    siteUrl: p.site_url,
                    syncType: 'yesterday'
                  })
                });
                if (aResp.ok) analyticsSuccess += 1;
              } catch (e) {
                console.warn('[GSC CRON] Analytics sync failed for', p.site_url, e);
              }

              // Light throttle between properties
              await new Promise(r => setTimeout(r, 200));
            }
          } catch (propErr) {
            console.warn('[GSC CRON] Could not fetch properties for analytics sync', propErr);
          }

          results.push({
            userEmail: connection.email,
            userToken: connection.user_token,
            success: true,
            propertiesCount: syncData.propertiesCount,
            successCount: syncData.successCount,
            errorCount: syncData.errorCount,
            analyticsProperties: propertiesCount,
            analyticsSynced: analyticsSuccess
          });

          // Create individual activity feed entry for this user
          try {
            await supabase
              .from('agent_events')
              .insert({
                user_token: connection.user_token,
                event_type: 'seo_automation',
                entity_type: 'gsc_data_sync',
                entity_id: connection.id,
                event_data: JSON.stringify({
                  title: '📊 GSC data synced',
                  description: `Google Search Console data updated for ${syncData.propertiesCount || 0} website${(syncData.propertiesCount || 0) > 1 ? 's' : ''}`,
                  activity_type: 'gsc_data_synced',
                  results: {
                    propertiesCount: syncData.propertiesCount || 0,
                    successCount: syncData.successCount || 0,
                    errorCount: syncData.errorCount || 0,
                    analytics: {
                      properties: propertiesCount,
                      synced: analyticsSuccess
                    },
                    automated: true
                  }
                }),
                previous_state: null,
                new_state: 'completed',
                triggered_by: 'cron_job',
                metadata: JSON.stringify({
                  user_email: connection.email,
                  properties_synced: syncData.propertiesCount || 0,
                  success_count: syncData.successCount || 0,
                  error_count: syncData.errorCount || 0,
                  cron_run: 'daily_gsc_sync',
                  source: 'vercel_cron',
                  timestamp: Date.now()
                })
              });
          } catch (activityLogError) {
            console.error(`[GSC CRON] Failed to log activity for ${connection.email}:`, activityLogError);
          }
        } else {
          console.error(`[GSC CRON] Failed to sync ${connection.email}:`, syncData);
          results.push({
            userEmail: connection.email,
            userToken: connection.user_token,
            success: false,
            error: syncData.error
          });
        }

      } catch (connectionError) {
        console.error(`[GSC CRON] Error processing connection ${connection.email}:`, connectionError);
        results.push({
          userEmail: connection.email,
          userToken: connection.user_token,
          success: false,
          error: connectionError instanceof Error ? connectionError.message : 'Unknown error'
        });
      }

      // Add a small delay between users to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    console.log(`[GSC CRON] Daily sync completed. Success: ${successCount}, Errors: ${errorCount}`);

    return NextResponse.json({
      message: 'Daily GSC sync completed',
      processedCount: connections.length,
      successCount,
      errorCount,
      results: results
    });

  } catch (error) {
    console.error('[GSC CRON] Unexpected error during daily sync:', error);
    return NextResponse.json(
      { error: 'Failed to complete daily sync' }, 
      { status: 500 }
    );
  }
}

// Also support POST for manual testing
export async function POST(request: NextRequest) {
  return GET(request);
}
