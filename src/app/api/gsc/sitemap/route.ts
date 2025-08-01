import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: List submitted sitemaps for a property
export async function GET(request: NextRequest) {
  try {
    console.log('[GSC SITEMAP] Fetching submitted sitemaps');
    
    const { searchParams } = new URL(request.url);
    const siteUrl = searchParams.get('siteUrl');
    const userToken = searchParams.get('userToken');
    
    if (!siteUrl || !userToken) {
      return NextResponse.json({ error: 'Missing required parameters: siteUrl, userToken' }, { status: 400 });
    }

    // Get active GSC connection
    const { data: connection, error: connectionError } = await supabase
      .from('gsc_connections')
      .select('*')
      .eq('user_token', userToken)
      .eq('is_active', true)
      .single();

    if (connectionError || !connection) {
      console.log('[GSC SITEMAP] No active GSC connection found');
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
      console.log('[GSC SITEMAP] Property not found or no access');
      return NextResponse.json({ error: 'Property not found or no access' }, { status: 403 });
    }

    // Check if token is expired and refresh if needed
    const now = new Date();
    const expiresAt = new Date(connection.expires_at);
    
    if (now >= expiresAt) {
      console.log('[GSC SITEMAP] Token expired, attempting refresh');
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
      console.log('[GSC SITEMAP] Missing OAuth credentials');
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

    // List submitted sitemaps
    const sitemapsResponse = await webmasters.sitemaps.list({
      siteUrl: siteUrl
    });

    const sitemaps = sitemapsResponse.data.sitemap || [];
    
    console.log(`[GSC SITEMAP] Found ${sitemaps.length} submitted sitemaps for ${siteUrl}`);

    return NextResponse.json({
      success: true,
      siteUrl,
      sitemaps: sitemaps.map(sitemap => ({
        path: sitemap.path,
        lastSubmitted: sitemap.lastSubmitted,
        lastDownloaded: sitemap.lastDownloaded,
        type: sitemap.type,
        isPending: sitemap.isPending,
        isSitemapsIndex: sitemap.isSitemapsIndex,
        warnings: sitemap.warnings || 0,
        errors: sitemap.errors || 0
      }))
    });

  } catch (error) {
    console.error('[GSC SITEMAP] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sitemaps' }, 
      { status: 500 }
    );
  }
}

// POST: Submit a sitemap to Google Search Console
export async function POST(request: NextRequest) {
  try {
    console.log('[GSC SITEMAP] Submitting sitemap');
    
    const { siteUrl, sitemapUrl, userToken } = await request.json();
    
    if (!siteUrl || !sitemapUrl || !userToken) {
      return NextResponse.json({ error: 'Missing required parameters: siteUrl, sitemapUrl, userToken' }, { status: 400 });
    }

    // Validate sitemap URL format
    try {
      new URL(sitemapUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid sitemap URL format' }, { status: 400 });
    }

    // Get active GSC connection
    const { data: connection, error: connectionError } = await supabase
      .from('gsc_connections')
      .select('*')
      .eq('user_token', userToken)
      .eq('is_active', true)
      .single();

    if (connectionError || !connection) {
      console.log('[GSC SITEMAP] No active GSC connection found');
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
      console.log('[GSC SITEMAP] Property not found or no access');
      return NextResponse.json({ error: 'Property not found or no access' }, { status: 403 });
    }

    // Check if token is expired and refresh if needed
    const now = new Date();
    const expiresAt = new Date(connection.expires_at);
    
    if (now >= expiresAt) {
      console.log('[GSC SITEMAP] Token expired, attempting refresh');
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
      console.log('[GSC SITEMAP] Missing OAuth credentials');
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

    // First, test if sitemap is accessible
    try {
      const sitemapCheckResponse = await fetch(sitemapUrl, { 
        method: 'HEAD',
        timeout: 5000 
      });
      
      if (!sitemapCheckResponse.ok) {
        return NextResponse.json({ 
          error: `Sitemap not accessible: HTTP ${sitemapCheckResponse.status}`,
          details: 'Make sure the sitemap URL is publicly accessible'
        }, { status: 400 });
      }
    } catch (fetchError) {
      return NextResponse.json({ 
        error: 'Unable to access sitemap URL',
        details: 'Make sure the sitemap URL is publicly accessible and responds to requests'
      }, { status: 400 });
    }

    // Submit sitemap to Google Search Console
    console.log(`[GSC SITEMAP] Submitting sitemap: ${sitemapUrl} for site: ${siteUrl}`);
    
    await webmasters.sitemaps.submit({
      siteUrl: siteUrl,
      feedpath: sitemapUrl
    });

    // Store sitemap submission record
    await supabase
      .from('sitemap_submissions')
      .upsert({
        user_token: userToken,
        site_url: siteUrl,
        sitemap_url: sitemapUrl,
        submitted_at: new Date().toISOString(),
        status: 'submitted',
        submission_method: 'api'
      }, {
        onConflict: 'user_token,site_url,sitemap_url'
      });

    console.log(`[GSC SITEMAP] Successfully submitted sitemap: ${sitemapUrl}`);

    return NextResponse.json({
      success: true,
      message: 'Sitemap submitted successfully',
      siteUrl,
      sitemapUrl,
      submittedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[GSC SITEMAP] Unexpected error:', error);
    
    // Handle specific Google API errors
    if (error instanceof Error && error.message.includes('quota')) {
      return NextResponse.json(
        { error: 'Google API quota exceeded. Please try again later.' }, 
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to submit sitemap' }, 
      { status: 500 }
    );
  }
}

// DELETE: Remove a sitemap from Google Search Console
export async function DELETE(request: NextRequest) {
  try {
    console.log('[GSC SITEMAP] Deleting sitemap');
    
    const { siteUrl, sitemapUrl, userToken } = await request.json();
    
    if (!siteUrl || !sitemapUrl || !userToken) {
      return NextResponse.json({ error: 'Missing required parameters: siteUrl, sitemapUrl, userToken' }, { status: 400 });
    }

    // Get active GSC connection
    const { data: connection, error: connectionError } = await supabase
      .from('gsc_connections')
      .select('*')
      .eq('user_token', userToken)
      .eq('is_active', true)
      .single();

    if (connectionError || !connection) {
      console.log('[GSC SITEMAP] No active GSC connection found');
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
      console.log('[GSC SITEMAP] Property not found or no access');
      return NextResponse.json({ error: 'Property not found or no access' }, { status: 403 });
    }

    // Get OAuth credentials
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.log('[GSC SITEMAP] Missing OAuth credentials');
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

    // Delete sitemap from Google Search Console
    console.log(`[GSC SITEMAP] Deleting sitemap: ${sitemapUrl} for site: ${siteUrl}`);
    
    await webmasters.sitemaps.delete({
      siteUrl: siteUrl,
      feedpath: sitemapUrl
    });

    // Update our record
    await supabase
      .from('sitemap_submissions')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString()
      })
      .eq('user_token', userToken)
      .eq('site_url', siteUrl)
      .eq('sitemap_url', sitemapUrl);

    console.log(`[GSC SITEMAP] Successfully deleted sitemap: ${sitemapUrl}`);

    return NextResponse.json({
      success: true,
      message: 'Sitemap deleted successfully',
      siteUrl,
      sitemapUrl,
      deletedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[GSC SITEMAP] Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete sitemap' }, 
      { status: 500 }
    );
  }
}