import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { DomainQueryService } from '@/lib/database/DomainQueryService';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

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

    // Update properties in database and auto-populate websites table
    for (const site of sites) {
      if (site.siteUrl) {
        // Upsert GSC property
        const { error: upsertError } = await supabase
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

        if (upsertError) {
          console.error('[GSC PROPERTIES] Error upserting property:', upsertError);
        } else {
          console.log('[GSC PROPERTIES] Successfully updated property:', site.siteUrl);
        }

        // Auto-populate websites table from GSC property
        const domain = site.siteUrl.replace(/^sc-domain:/, '').replace(/^https?:\/\//, '').replace(/\/$/, '');
        
        // Use DomainQueryService to check if website already exists (prevents duplicates)
        const websiteResult = await DomainQueryService.findWebsiteByDomain(
          userToken,
          domain,
          'website_token, is_excluded_from_sync, domain, is_managed, meta_tags, image_tags'
        );
        
        let existingWebsite = null;
        if (websiteResult.success && websiteResult.data) {
          existingWebsite = websiteResult.data;
          console.log('[GSC PROPERTIES] Found existing website with domain:', websiteResult.matchedDomain);
        }

        if (!existingWebsite) {
          // Generate a unique token for the website and create it with proper domain format
          const websiteToken = crypto.randomUUID();
          
          const createResult = await DomainQueryService.createWebsiteWithDomain(
            userToken,
            domain,
            {
              website_token: websiteToken,
              is_managed: false, // New websites start as unmanaged
              is_excluded_from_sync: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          );
          
          if (!createResult.success) {
            console.error('[GSC PROPERTIES] Error creating website from GSC property:', createResult.error);
          } else {
            console.log('[GSC PROPERTIES] Successfully created website from GSC:', domain);
          }
        } else if (existingWebsite.is_excluded_from_sync) {
          console.log('[GSC PROPERTIES] Website was excluded from sync, skipping:', domain);
        } else {
          console.log('[GSC PROPERTIES] Website already exists for:', domain);
        }
      }
    }

    // Filter properties to only include managed websites
    const managedProperties = [];
    
    for (const site of sites) {
      if (site.siteUrl) {
        const cleanDomain = site.siteUrl.replace(/^sc-domain:/, '').replace(/^https?:\/\//, '').replace(/\/$/, '');
        
        // Use DomainQueryService to check if this domain exists and is managed
        const websiteResult = await DomainQueryService.findWebsiteByDomain(
          userToken,
          cleanDomain,
          'is_managed'
        );
        
        // Only include if website exists and is managed
        if (websiteResult.success && websiteResult.data && websiteResult.data.is_managed) {
          managedProperties.push({
            siteUrl: cleanDomain,
            permissionLevel: site.permissionLevel,
            verified: true
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      properties: managedProperties,
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