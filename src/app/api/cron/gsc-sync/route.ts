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

    const results = [];
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    // Process each connection
    for (const connection of connections) {
      try {
        console.log(`[GSC CRON] Syncing connection for user: ${connection.email}`);
        
        // Call the sync API for this user
        const syncResponse = await fetch(`${baseUrl}/api/gsc/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userToken: connection.user_token
          }),
        });

        const syncData = await syncResponse.json();

        if (syncResponse.ok) {
          console.log(`[GSC CRON] Successfully synced ${connection.email}:`, syncData);
          results.push({
            userEmail: connection.email,
            userToken: connection.user_token,
            success: true,
            propertiesCount: syncData.propertiesCount,
            successCount: syncData.successCount,
            errorCount: syncData.errorCount
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