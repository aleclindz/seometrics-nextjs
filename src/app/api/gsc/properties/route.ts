import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log('[GSC PROPERTIES] Fetching GSC properties');
    
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    
    if (!userToken) {
      console.log('[GSC PROPERTIES] No user token provided');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get active GSC connection
    const { data: connection, error: connectionError } = await supabase
      .from('gsc_connections')
      .select('*')
      .eq('user_token', userToken)
      .eq('is_active', true)
      .single();

    if (connectionError || !connection) {
      console.log('[GSC PROPERTIES] No active GSC connection found');
      return NextResponse.json({ error: 'No GSC connection found' }, { status: 404 });
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(connection.expires_at);
    
    if (now >= expiresAt) {
      console.log('[GSC PROPERTIES] Token expired, attempting refresh');
      // Try to refresh token
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
      console.log('[GSC PROPERTIES] Missing OAuth credentials');
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

    // Fetch sites from GSC
    const sitesResponse = await webmasters.sites.list();
    const sites = sitesResponse.data.siteEntry || [];

    console.log('[GSC PROPERTIES] Found', sites.length, 'sites for user token:', userToken);

    // Update properties in database
    for (const site of sites) {
      if (site.siteUrl) {
        await supabase
          .from('gsc_properties')
          .upsert({
            connection_id: connection.id,
            user_token: userToken,
            site_url: site.siteUrl,
            permission_level: site.permissionLevel || 'unknown',
            is_verified: true,
            is_active: true,
            last_sync_at: new Date().toISOString()
          }, {
            onConflict: 'connection_id,site_url'
          });
      }
    }

    // Return properties with additional info
    const formattedProperties = sites.map(site => ({
      siteUrl: site.siteUrl,
      permissionLevel: site.permissionLevel,
      verified: true
    }));

    return NextResponse.json({
      success: true,
      properties: formattedProperties,
      connection: {
        email: connection.email,
        connected_at: connection.created_at
      }
    });

  } catch (error) {
    console.error('[GSC PROPERTIES] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch properties' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[GSC PROPERTIES] Refreshing properties from GSC');
    
    // This endpoint triggers a fresh sync of properties
    const getResponse = await GET(request);
    return getResponse;

  } catch (error) {
    console.error('[GSC PROPERTIES] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh properties' }, 
      { status: 500 }
    );
  }
}