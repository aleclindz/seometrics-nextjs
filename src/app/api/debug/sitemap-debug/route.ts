import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

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
    const siteUrl = searchParams.get('siteUrl') || 'https://seoagent.com';

    if (!userToken) {
      return NextResponse.json({ error: 'Missing userToken' }, { status: 400 });
    }

    console.log(`[SITEMAP DEBUG] Starting debug for ${siteUrl} (user: ${userToken})`);

    const debugInfo: any = {
      siteUrl,
      userToken,
      timestamp: new Date().toISOString(),
      databaseData: {},
      gscData: {},
      actionItems: {}
    };

    // 1. Check database sitemap_submissions
    const { data: sitemapSubmissions, error: sitemapError } = await supabase
      .from('sitemap_submissions')
      .select('*')
      .eq('user_token', userToken);

    debugInfo.databaseData.sitemapSubmissions = {
      count: sitemapSubmissions?.length || 0,
      data: sitemapSubmissions,
      error: sitemapError
    };

    // 2. Check action items table
    const { data: actionItems, error: actionItemsError } = await supabase
      .from('seo_action_items')
      .select('*')
      .eq('user_token', userToken)
      .eq('issue_category', 'sitemap');

    debugInfo.actionItems = {
      count: actionItems?.length || 0,
      data: actionItems,
      error: actionItemsError
    };

    // 3. Try GSC API call
    try {
      const { data: connection } = await supabase
        .from('gsc_connections')
        .select('*')
        .eq('user_token', userToken)
        .eq('is_active', true)
        .single();

      if (connection) {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET
        );
        
        oauth2Client.setCredentials({
          access_token: connection.access_token,
          refresh_token: connection.refresh_token
        });

        const webmasters = google.webmasters({ version: 'v3', auth: oauth2Client });
        
        const response = await webmasters.sitemaps.list({
          siteUrl: siteUrl
        });

        debugInfo.gscData = {
          success: true,
          sitemaps: response.data.sitemap || [],
          sitemapCount: (response.data.sitemap || []).length
        };
      } else {
        debugInfo.gscData = { success: false, error: 'No GSC connection found' };
      }
    } catch (gscError: any) {
      debugInfo.gscData = { 
        success: false, 
        error: gscError.message,
        details: gscError
      };
    }

    // 4. Check GSC properties
    const { data: gscProperties } = await supabase
      .from('gsc_properties')
      .select('*')
      .eq('user_token', userToken);

    debugInfo.gscProperties = gscProperties;

    // 5. Test sitemap URL accessibility
    const testUrls = [
      'https://seoagent.com/sitemap.xml',
      'https://www.seoagent.com/sitemap.xml'
    ];

    debugInfo.sitemapUrlTests = {};
    for (const testUrl of testUrls) {
      try {
        const response = await fetch(testUrl, { method: 'HEAD' });
        debugInfo.sitemapUrlTests[testUrl] = {
          accessible: response.ok,
          status: response.status,
          contentType: response.headers.get('content-type')
        };
      } catch (error: any) {
        debugInfo.sitemapUrlTests[testUrl] = {
          accessible: false,
          error: error.message
        };
      }
    }

    console.log(`[SITEMAP DEBUG] Complete debug info:`, JSON.stringify(debugInfo, null, 2));

    return NextResponse.json({
      success: true,
      debugInfo
    });

  } catch (error) {
    console.error('[SITEMAP DEBUG] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}