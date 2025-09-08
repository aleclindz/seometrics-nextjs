import { NextRequest, NextResponse } from 'next/server';
import { syncRecentGSCData, syncYesterdayGSCData } from '@/services/gsc/gsc-search-analytics-sync';

/**
 * Manual GSC Search Analytics Sync API
 * Allows users to trigger GSC analytics sync manually
 * Useful for initial setup, backfills, and testing
 */
export async function POST(request: NextRequest) {
  try {
    const { userToken, siteUrl, daysBack, syncType } = await request.json();

    if (!userToken || !siteUrl) {
      return NextResponse.json(
        { error: 'User token and site URL are required' },
        { status: 400 }
      );
    }

    console.log('[GSC ANALYTICS SYNC] Manual sync requested:', { 
      siteUrl, 
      userToken: userToken.substring(0, 8) + '...', 
      syncType,
      daysBack 
    });

    let result;

    switch (syncType) {
      case 'yesterday':
        result = await syncYesterdayGSCData(userToken, siteUrl);
        break;
        
      case 'recent':
        const days = Math.max(1, Math.min(daysBack || 7, 30)); // Limit to 30 days max
        result = await syncRecentGSCData(userToken, siteUrl, days);
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid sync type. Use "yesterday" or "recent"' },
          { status: 400 }
        );
    }

    if (result.success) {
      console.log('[GSC ANALYTICS SYNC] Manual sync completed successfully:', {
        recordsProcessed: result.recordsProcessed,
        dimensionsSynced: result.dimensionsSynced.length
      });

      return NextResponse.json({
        success: true,
        message: `Successfully synced GSC analytics data`,
        data: {
          siteUrl,
          syncType,
          recordsProcessed: result.recordsProcessed,
          dimensionsSynced: result.dimensionsSynced,
          completedAt: new Date().toISOString()
        }
      });
    } else {
      console.error('[GSC ANALYTICS SYNC] Manual sync failed:', result.error);

      return NextResponse.json({
        success: false,
        error: result.error,
        message: 'Failed to sync GSC analytics data'
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[GSC ANALYTICS SYNC] Manual sync error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * Get sync status and recent sync history
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const siteUrl = searchParams.get('siteUrl');

    if (!userToken) {
      return NextResponse.json(
        { error: 'User token is required' },
        { status: 400 }
      );
    }

    // This could be enhanced to check recent sync history from system_logs
    // For now, return basic status information
    return NextResponse.json({
      success: true,
      message: 'GSC Analytics sync API is available',
      availableSyncTypes: ['yesterday', 'recent'],
      maxDaysBack: 30,
      lastChecked: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[GSC ANALYTICS SYNC] Status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}