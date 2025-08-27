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
    console.log('[GSC PERFORMANCE] Starting performance data fetch');
    
    const { siteUrl, startDate, endDate, userToken } = await request.json();
    console.log('[GSC PERFORMANCE] Request params:', { siteUrl, startDate, endDate, userToken: userToken ? `${userToken.substring(0, 10)}...` : 'undefined' });
    
    if (!siteUrl || !startDate || !endDate || !userToken) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Get active GSC connection
    console.log('[GSC PERFORMANCE] Fetching GSC connection for user...');
    const { data: connection, error: connectionError } = await supabase
      .from('gsc_connections')
      .select('*')
      .eq('user_token', userToken)
      .eq('is_active', true)
      .single();

    if (connectionError || !connection) {
      console.log('[GSC PERFORMANCE] No active GSC connection found. Error:', connectionError);
      return NextResponse.json({ error: 'No GSC connection found' }, { status: 404 });
    }
    
    console.log('[GSC PERFORMANCE] Found GSC connection:', { id: connection.id, created_at: connection.created_at });

    // Check if user has access to this property
    // Try multiple URL formats to handle sc-domain: prefix and protocol variations
    const urlVariants = [
      siteUrl,                                                    // https://translateyoutubevideos.com
      `sc-domain:${siteUrl}`,                                    // sc-domain:https://translateyoutubevideos.com
      `sc-domain:${siteUrl.replace('https://', '')}`,            // sc-domain:translateyoutubevideos.com
      `sc-domain:${siteUrl.replace('http://', '')}`,             // sc-domain:translateyoutubevideos.com
      siteUrl.replace('https://', '').replace('http://', '')      // translateyoutubevideos.com
    ];

    console.log('[GSC PERFORMANCE] Trying URL variants:', urlVariants);
    
    let property = null;
    let propertyError = null;
    
    for (const variant of urlVariants) {
      const { data, error } = await supabase
        .from('gsc_properties')
        .select('*')
        .eq('connection_id', connection.id)
        .eq('site_url', variant)
        .eq('is_active', true)
        .single();
        
      if (data && !error) {
        property = data;
        console.log('[GSC PERFORMANCE] Found property with URL variant:', variant);
        break;
      } else if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found", other errors are actual issues
        propertyError = error;
      }
    }

    if (propertyError) {
      console.error('[GSC PERFORMANCE] Database error:', propertyError);
      return NextResponse.json({ error: 'Database error checking property access' }, { status: 500 });
    }

    if (!property) {
      console.log('[GSC PERFORMANCE] Property not found for any URL variant. Available properties for this connection:');
      
      // Debug: show available properties for this connection
      const { data: allProps } = await supabase
        .from('gsc_properties')
        .select('site_url')
        .eq('connection_id', connection.id)
        .eq('is_active', true);
      
      console.log('[GSC PERFORMANCE] Available properties:', allProps?.map(p => p.site_url));
      
      return NextResponse.json({ 
        error: 'Property not found or no access',
        availableProperties: allProps?.map(p => p.site_url),
        requestedUrl: siteUrl
      }, { status: 403 });
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

    // Make separate API calls for each dimension to get more comprehensive data
    console.log('[GSC PERFORMANCE] Making separate API calls for each dimension');
    
    // Queries dimension
    const queriesRequest = {
      siteUrl: siteUrl,
      requestBody: {
        startDate: startDate,
        endDate: endDate,
        dimensions: ['query'],
        rowLimit: 25000,
        startRow: 0
      }
    };
    
    // Pages dimension
    const pagesRequest = {
      siteUrl: siteUrl,
      requestBody: {
        startDate: startDate,
        endDate: endDate,
        dimensions: ['page'],
        rowLimit: 25000,
        startRow: 0
      }
    };
    
    // Countries dimension
    const countriesRequest = {
      siteUrl: siteUrl,
      requestBody: {
        startDate: startDate,
        endDate: endDate,
        dimensions: ['country'],
        rowLimit: 1000,
        startRow: 0
      }
    };
    
    // Devices dimension
    const devicesRequest = {
      siteUrl: siteUrl,
      requestBody: {
        startDate: startDate,
        endDate: endDate,
        dimensions: ['device'],
        rowLimit: 10,
        startRow: 0
      }
    };

    // Execute all requests in parallel with better error handling
    console.log('[GSC PERFORMANCE] Making Google API calls...');
    let queriesResponse, pagesResponse, countriesResponse, devicesResponse;
    
    try {
      [queriesResponse, pagesResponse, countriesResponse, devicesResponse] = await Promise.all([
        webmasters.searchanalytics.query(queriesRequest),
        webmasters.searchanalytics.query(pagesRequest),
        webmasters.searchanalytics.query(countriesRequest),
        webmasters.searchanalytics.query(devicesRequest)
      ]);
      console.log('[GSC PERFORMANCE] Google API calls completed successfully');
    } catch (apiError: any) {
      console.error('[GSC PERFORMANCE] Google API call failed:', {
        message: apiError.message,
        code: apiError.code,
        status: apiError.status,
        details: apiError.response?.data
      });
      
      // Handle specific API errors
      if (apiError.code === 403) {
        return NextResponse.json({ error: 'Access denied to GSC property. Please reconnect your Google Search Console.' }, { status: 403 });
      } else if (apiError.code === 401) {
        return NextResponse.json({ error: 'Authentication expired. Please reconnect your Google Search Console.' }, { status: 401 });
      } else {
        return NextResponse.json({ error: `Google API error: ${apiError.message || 'Unknown error'}` }, { status: 500 });
      }
    }

    const queriesRows = queriesResponse.data.rows || [];
    const pagesRows = pagesResponse.data.rows || [];
    const countriesRows = countriesResponse.data.rows || [];
    const devicesRows = devicesResponse.data.rows || [];

    // Initialize aggregated data structure
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

    // Process queries data
    queriesRows.forEach(row => {
      if (!row.keys || row.keys.length === 0) return;
      
      const query = row.keys[0];
      const clicks = row.clicks || 0;
      const impressions = row.impressions || 0;
      const ctr = row.ctr || 0;
      const position = row.position || 0;

      aggregated.queries[query] = {
        clicks,
        impressions,
        ctr,
        position
      };

      // Update totals from queries (most comprehensive)
      aggregated.total.clicks += clicks;
      aggregated.total.impressions += impressions;
    });

    // Process pages data
    pagesRows.forEach(row => {
      if (!row.keys || row.keys.length === 0) return;
      
      const page = row.keys[0];
      const clicks = row.clicks || 0;
      const impressions = row.impressions || 0;
      const ctr = row.ctr || 0;
      const position = row.position || 0;

      aggregated.pages[page] = {
        clicks,
        impressions,
        ctr,
        position
      };
    });

    // Process countries data
    countriesRows.forEach(row => {
      if (!row.keys || row.keys.length === 0) return;
      
      const country = row.keys[0];
      const clicks = row.clicks || 0;
      const impressions = row.impressions || 0;
      const ctr = row.ctr || 0;
      const position = row.position || 0;

      aggregated.countries[country] = {
        clicks,
        impressions,
        ctr,
        position
      };
    });

    // Process devices data
    devicesRows.forEach(row => {
      if (!row.keys || row.keys.length === 0) return;
      
      const device = row.keys[0];
      const clicks = row.clicks || 0;
      const impressions = row.impressions || 0;
      const ctr = row.ctr || 0;
      const position = row.position || 0;

      aggregated.devices[device] = {
        clicks,
        impressions,
        ctr,
        position
      };
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
    console.log('[GSC PERFORMANCE] Storing performance data in database...');
    const { error: insertError } = await supabase
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
      
    if (insertError) {
      console.error('[GSC PERFORMANCE] Database insert error:', insertError);
      // Don't fail the request if database insert fails, just log it
    } else {
      console.log('[GSC PERFORMANCE] Performance data stored successfully');
    }

    const totalRowCount = queriesRows.length + pagesRows.length + countriesRows.length + devicesRows.length;
    
    console.log('[GSC PERFORMANCE] Successfully fetched performance data for:', siteUrl);
    console.log(`[GSC PERFORMANCE] Retrieved ${queriesRows.length} queries, ${pagesRows.length} pages, ${countriesRows.length} countries, ${devicesRows.length} devices`);

    return NextResponse.json({
      success: true,
      data: {
        dateRange: { startDate, endDate },
        total: aggregated.total,
        topQueries,
        topPages,
        topCountries,
        deviceData,
        rawRowCount: totalRowCount,
        breakdown: {
          queries: queriesRows.length,
          pages: pagesRows.length,
          countries: countriesRows.length,
          devices: devicesRows.length
        }
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