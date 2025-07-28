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
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    
    if (!userToken) {
      return NextResponse.json({ error: 'User token required' }, { status: 401 });
    }

    // Get user websites
    const { data: websites, error: websitesError } = await supabase
      .from('websites')
      .select('*')
      .eq('user_token', userToken);

    if (websitesError) {
      console.error('[CHAT SITES] Error fetching websites:', websitesError);
      return NextResponse.json({ error: 'Failed to fetch websites' }, { status: 500 });
    }

    console.log('[CHAT SITES] Found', websites?.length || 0, 'websites for user token:', userToken);

    // Get GSC connections for these websites
    const { data: gscConnections, error: gscError } = await supabase
      .from('gsc_connections')
      .select('*')
      .eq('user_token', userToken);

    // Get GSC properties
    const { data: gscProperties, error: propertiesError } = await supabase
      .from('gsc_properties')
      .select('*')
      .eq('user_token', userToken)
      .eq('is_active', true);

    // Get latest GSC performance data
    const { data: performanceData, error: performanceError } = await supabase
      .from('gsc_performance_data')
      .select('*')
      .eq('user_token', userToken)
      .order('date_end', { ascending: false });

    // Transform websites data to include GSC status and metrics
    const enrichedWebsites = websites?.map(website => {
      // Find GSC connection for this website
      const gscConnection = gscConnections?.find(conn => 
        gscProperties?.some(prop => 
          prop.connection_id === conn.id && 
          (prop.site_url === website.domain || prop.site_url === `https://${website.domain}` || prop.site_url === `http://${website.domain}`)
        )
      );

      // Find GSC property for this website
      const gscProperty = gscProperties?.find(prop => 
        prop.site_url === website.domain || 
        prop.site_url === `https://${website.domain}` || 
        prop.site_url === `http://${website.domain}`
      );

      // Get latest performance data for this property
      const latestPerformance = gscProperty 
        ? performanceData?.find(perf => perf.property_id === gscProperty.id)
        : null;

      return {
        id: website.website_token,
        url: website.domain,
        name: website.domain, // You might want to add a name field to websites table
        gscStatus: gscConnection?.is_active ? 'connected' : 'none',
        cmsStatus: 'none', // TODO: Implement CMS status checking
        smartjsStatus: 'active', // Assuming Smart.js is active for all sites
        lastSync: gscConnection?.last_sync_at ? new Date(gscConnection.last_sync_at) : undefined,
        metrics: latestPerformance ? {
          clicks: latestPerformance.total_clicks || 0,
          impressions: latestPerformance.total_impressions || 0,
          ctr: (latestPerformance.avg_ctr || 0) * 100,
          position: latestPerformance.avg_position || 0
        } : undefined,
        gscProperty: gscProperty,
        performanceHistory: performanceData?.filter(perf => perf.property_id === gscProperty?.id) || []
      };
    }) || [];

    return NextResponse.json({
      success: true,
      sites: enrichedWebsites
    });

  } catch (error) {
    console.error('[CHAT SITES] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sites data' }, 
      { status: 500 }
    );
  }
}