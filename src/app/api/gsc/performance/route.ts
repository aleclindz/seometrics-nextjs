import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('[GSC PERFORMANCE] Fetching performance data');
    
    const { siteUrl, startDate, endDate, userToken } = await request.json();
    
    if (!siteUrl || !startDate || !endDate || !userToken) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Get active GSC connection
    const { data: connection, error: connectionError } = await supabase
      .from('gsc_connections')
      .select('*')
      .eq('user_token', userToken)
      .eq('is_active', true)
      .single();

    if (connectionError || !connection) {
      console.log('[GSC PERFORMANCE] No active GSC connection found');
      return NextResponse.json({ error: 'No GSC connection found' }, { status: 404 });
    }

    // Check if user has access to this property
    const { data: property, error: propertyError } = await supabase
      .from('gsc_properties')
      .select('*')
      .eq('connection_id', connection.id)
      .eq('site_url', siteUrl)
      .eq('is_active', true)
      .single();

    if (propertyError || !property) {
      console.log('[GSC PERFORMANCE] Property not found or no access');
      return NextResponse.json({ error: 'Property not found or no access' }, { status: 403 });
    }

    // Check if token is expired and refresh if needed
    const now = new Date();
    const expiresAt = new Date(connection.expires_at);
    
    if (now >= expiresAt) {
      console.log('[GSC PERFORMANCE] Token expired, attempting refresh');
      const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/gsc/oauth/refresh?userToken=${userToken}`, {
        method: 'POST'
      });
      
      if (!refreshResponse.ok) {
        return NextResponse.json({ error: 'Token expired and refresh failed' }, { status: 401 });
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
      console.log('[GSC PERFORMANCE] Missing OAuth credentials');
      return NextResponse.json({ error: 'OAuth credentials not configured' }, { status: 500 });
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({
      access_token: connection.access_token,
      refresh_token: connection.refresh_token
    });

    // Create Search Console API client
    const webmasters = google.webmasters({ version: 'v3', auth: oauth2Client });

    // Query performance data
    const performanceRequest = {
      siteUrl: siteUrl,
      requestBody: {
        startDate: startDate,
        endDate: endDate,
        dimensions: ['query', 'page', 'country', 'device'],
        rowLimit: 25000, // Maximum allowed
        startRow: 0
      }
    };

    const performanceResponse = await webmasters.searchanalytics.query(performanceRequest);
    const rows = performanceResponse.data.rows || [];

    // Aggregate data by dimension
    const aggregated = {
      total: {
        clicks: 0,
        impressions: 0,
        ctr: 0,
        position: 0
      },
      queries: {} as Record<string, any>,
      pages: {} as Record<string, any>,
      countries: {} as Record<string, any>,
      devices: {} as Record<string, any>
    };

    // Process rows
    rows.forEach(row => {
      if (!row.keys || !row.clicks || !row.impressions) return;
      
      const [query, page, country, device] = row.keys;
      const clicks = row.clicks || 0;
      const impressions = row.impressions || 0;
      const ctr = row.ctr || 0;
      const position = row.position || 0;

      // Update totals
      aggregated.total.clicks += clicks;
      aggregated.total.impressions += impressions;

      // Aggregate by query
      if (query) {
        if (!aggregated.queries[query]) {
          aggregated.queries[query] = { clicks: 0, impressions: 0, ctr: 0, position: 0 };
        }
        aggregated.queries[query].clicks += clicks;
        aggregated.queries[query].impressions += impressions;
        aggregated.queries[query].ctr = aggregated.queries[query].clicks / aggregated.queries[query].impressions;
        aggregated.queries[query].position = position; // Take last position (simplified)
      }

      // Aggregate by page
      if (page) {
        if (!aggregated.pages[page]) {
          aggregated.pages[page] = { clicks: 0, impressions: 0, ctr: 0, position: 0 };
        }
        aggregated.pages[page].clicks += clicks;
        aggregated.pages[page].impressions += impressions;
        aggregated.pages[page].ctr = aggregated.pages[page].clicks / aggregated.pages[page].impressions;
        aggregated.pages[page].position = position;
      }

      // Aggregate by country
      if (country) {
        if (!aggregated.countries[country]) {
          aggregated.countries[country] = { clicks: 0, impressions: 0, ctr: 0, position: 0 };
        }
        aggregated.countries[country].clicks += clicks;
        aggregated.countries[country].impressions += impressions;
        aggregated.countries[country].ctr = aggregated.countries[country].clicks / aggregated.countries[country].impressions;
        aggregated.countries[country].position = position;
      }

      // Aggregate by device
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
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 100);

    const topPages = Object.entries(aggregated.pages)
      .map(([page, data]) => ({ page, ...data }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 100);

    const topCountries = Object.entries(aggregated.countries)
      .map(([country, data]) => ({ country, ...data }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 50);

    const deviceData = Object.entries(aggregated.devices)
      .map(([device, data]) => ({ device, ...data }))
      .sort((a, b) => b.clicks - a.clicks);

    // Store performance data in database
    await supabase
      .from('gsc_performance_data')
      .upsert({
        property_id: property.id,
        user_token: userToken,
        date_start: startDate,
        date_end: endDate,
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

    console.log('[GSC PERFORMANCE] Successfully fetched performance data for:', siteUrl);

    return NextResponse.json({
      success: true,
      data: {
        dateRange: { startDate, endDate },
        total: aggregated.total,
        topQueries,
        topPages,
        topCountries,
        deviceData,
        rawRowCount: rows.length
      }
    });

  } catch (error) {
    console.error('[GSC PERFORMANCE] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance data' }, 
      { status: 500 }
    );
  }
}