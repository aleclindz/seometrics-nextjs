import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { UrlNormalizationService } from '@/lib/UrlNormalizationService';

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
    const siteUrl = searchParams.get('siteUrl');

    if (!userToken || !siteUrl) {
      return NextResponse.json({ error: 'Missing userToken or siteUrl' }, { status: 400 });
    }

    console.log('[GSC SITEMAP STATUS] Fetching sitemap status from GSC');

    // Get active GSC connection
    const { data: connection, error: connectionError } = await supabase
      .from('gsc_connections')
      .select('*')
      .eq('user_token', userToken)
      .eq('is_active', true)
      .single();

    if (connectionError || !connection) {
      return NextResponse.json({ error: 'No active GSC connection' }, { status: 404 });
    }

    // Setup OAuth credentials
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'OAuth credentials not configured' }, { status: 500 });
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({
      access_token: connection.access_token,
      refresh_token: connection.refresh_token
    });

    // Get sitemap status from GSC
    const webmasters = google.webmasters({ version: 'v3', auth: oauth2Client });
    
    try {
      console.log(`[GSC SITEMAP STATUS] Querying GSC for site: ${siteUrl}`);
      
      const response = await webmasters.sitemaps.list({
        siteUrl: siteUrl
      });

      const sitemaps = response.data.sitemap || [];
      console.log(`[GSC SITEMAP STATUS] Raw GSC response:`, JSON.stringify(sitemaps, null, 2));
      console.log(`[GSC SITEMAP STATUS] Found ${sitemaps.length} sitemaps`);

      // Get all sitemap submissions for this user to match against
      const { data: allUserSitemaps } = await supabase
        .from('sitemap_submissions')
        .select('*')
        .eq('user_token', userToken);
        
      console.log(`[GSC SITEMAP STATUS] All user sitemaps:`, allUserSitemaps);

      // Update local database with Google's sitemap status
      for (const gscSitemap of sitemaps) {
        console.log(`[GSC SITEMAP STATUS] Processing GSC sitemap:`, {
          path: gscSitemap.path,
          lastDownloaded: gscSitemap.lastDownloaded,
          isPending: gscSitemap.isPending,
          warnings: gscSitemap.warnings,
          errors: gscSitemap.errors,
          contents: gscSitemap.contents
        });
        
        // Use the new URL normalization service to find matching sitemap
        const localSitemap = UrlNormalizationService.findMatchingSitemap(
          gscSitemap.path || '',
          allUserSitemaps || []
        );
        
        console.log(`[GSC SITEMAP STATUS] URL normalization result:`, {
          gscSitemapPath: gscSitemap.path,
          foundMatch: !!localSitemap,
          matchedRecord: localSitemap ? {
            id: localSitemap.id,
            site_url: localSitemap.site_url,
            sitemap_url: localSitemap.sitemap_url
          } : null
        });

        if (localSitemap) {
          console.log(`[GSC SITEMAP STATUS] Updating local sitemap ${localSitemap.id} with GSC data`);
          
          const updateData = {
            last_downloaded: gscSitemap.lastDownloaded,
            is_pending: gscSitemap.isPending,
            warnings: parseInt(gscSitemap.warnings || '0'),
            errors: parseInt(gscSitemap.errors || '0'),
            status: gscSitemap.lastDownloaded ? 'processed' : 'submitted',
            updated_at: new Date().toISOString()
          };
          
          console.log(`[GSC SITEMAP STATUS] Update data:`, updateData);
          
          const { data: updateResult, error: updateError } = await supabase
            .from('sitemap_submissions')
            .update(updateData)
            .eq('id', localSitemap.id)
            .select('*')
            .single();
            
          if (updateError) {
            console.error(`[GSC SITEMAP STATUS] Error updating sitemap:`, updateError);
          } else {
            console.log(`[GSC SITEMAP STATUS] Successfully updated sitemap ${localSitemap.id}`);
            console.log(`[GSC SITEMAP STATUS] Updated record:`, {
              id: updateResult.id,
              site_url: updateResult.site_url,
              sitemap_url: updateResult.sitemap_url,
              last_downloaded: updateResult.last_downloaded,
              status: updateResult.status,
              is_pending: updateResult.is_pending,
              warnings: updateResult.warnings
            });
          }
        } else {
          console.log(`[GSC SITEMAP STATUS] No local sitemap found for GSC sitemap: ${gscSitemap.path}`);
        }
      }

      // Get updated local sitemap data
      const { data: updatedSitemaps } = await supabase
        .from('sitemap_submissions')
        .select('*')
        .eq('user_token', userToken)
        .eq('site_url', siteUrl)
        .order('created_at', { ascending: false });

      return NextResponse.json({
        success: true,
        gscSitemaps: sitemaps,
        localSitemaps: updatedSitemaps || [],
        summary: {
          totalSitemaps: sitemaps.length,
          downloadedSitemaps: sitemaps.filter(s => s.lastDownloaded).length,
          pendingSitemaps: sitemaps.filter(s => s.isPending).length,
          totalWarnings: sitemaps.reduce((sum, s) => sum + (Number(s.warnings) || 0), 0)
        }
      });

    } catch (gscError: any) {
      console.error('[GSC SITEMAP STATUS] GSC API Error:', gscError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch sitemap status from GSC',
        details: gscError.message
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[GSC SITEMAP STATUS] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check sitemap status'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userToken, siteUrl, sitemapUrl } = await request.json();

    if (!userToken || !siteUrl || !sitemapUrl) {
      return NextResponse.json({ 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }

    console.log(`[GSC SITEMAP STATUS] Submitting sitemap: ${sitemapUrl}`);

    // Get active GSC connection
    const { data: connection, error: connectionError } = await supabase
      .from('gsc_connections')
      .select('*')
      .eq('user_token', userToken)
      .eq('is_active', true)
      .single();

    if (connectionError || !connection) {
      return NextResponse.json({ error: 'No active GSC connection' }, { status: 404 });
    }

    // Setup OAuth credentials
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'OAuth credentials not configured' }, { status: 500 });
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({
      access_token: connection.access_token,
      refresh_token: connection.refresh_token
    });

    // Submit sitemap to GSC
    const webmasters = google.webmasters({ version: 'v3', auth: oauth2Client });
    
    try {
      await webmasters.sitemaps.submit({
        siteUrl: siteUrl,
        feedpath: sitemapUrl
      });

      // Record the submission
      const { data: submission } = await supabase
        .from('sitemap_submissions')
        .upsert({
          user_token: userToken,
          site_url: siteUrl,
          sitemap_url: sitemapUrl,
          status: 'submitted',
          submission_method: 'api',
          google_download_status: 'pending',
          google_processing_status: 'submitted',
          next_verification_check: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }, {
          onConflict: 'user_token,site_url,sitemap_url'
        })
        .select()
        .single();

      return NextResponse.json({
        success: true,
        submission,
        message: 'Sitemap submitted successfully to Google Search Console'
      });

    } catch (gscError: any) {
      console.error('[GSC SITEMAP STATUS] GSC submission error:', gscError);
      return NextResponse.json({
        success: false,
        error: 'Failed to submit sitemap to GSC',
        details: gscError.message
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[GSC SITEMAP STATUS] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to submit sitemap'
    }, { status: 500 });
  }
}