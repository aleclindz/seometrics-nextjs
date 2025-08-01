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
    console.log('[GSC URL INSPECTION] Starting URL inspection');
    
    const { siteUrl, urls, userToken } = await request.json();
    
    if (!siteUrl || !urls || !Array.isArray(urls) || !userToken) {
      return NextResponse.json({ error: 'Missing required parameters: siteUrl, urls array, userToken' }, { status: 400 });
    }

    // Limit to 50 URLs per request to avoid timeout
    if (urls.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 URLs allowed per request' }, { status: 400 });
    }

    // Get active GSC connection
    const { data: connection, error: connectionError } = await supabase
      .from('gsc_connections')
      .select('*')
      .eq('user_token', userToken)
      .eq('is_active', true)
      .single();

    if (connectionError || !connection) {
      console.log('[GSC URL INSPECTION] No active GSC connection found');
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
      console.log('[GSC URL INSPECTION] Property not found or no access');
      return NextResponse.json({ error: 'Property not found or no access' }, { status: 403 });
    }

    // Check if token is expired and refresh if needed
    const now = new Date();
    const expiresAt = new Date(connection.expires_at);
    
    if (now >= expiresAt) {
      console.log('[GSC URL INSPECTION] Token expired, attempting refresh');
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
      console.log('[GSC URL INSPECTION] Missing OAuth credentials');
      return NextResponse.json({ error: 'OAuth credentials not configured' }, { status: 500 });
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({
      access_token: connection.access_token,
      refresh_token: connection.refresh_token
    });

    // Create Search Console API client
    const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });

    // Inspect each URL with timeout
    const inspectionResults = [];
    
    // Helper function to add timeout to URL inspection
    const inspectUrlWithTimeout = async (url: string, siteUrl: string, timeoutMs: number = 10000) => {
      return Promise.race([
        searchconsole.urlInspection.index.inspect({
          requestBody: {
            inspectionUrl: url,
            siteUrl: siteUrl,
            languageCode: 'en-US'
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`URL inspection timeout after ${timeoutMs}ms`)), timeoutMs)
        )
      ]);
    };
    
    for (const url of urls) {
      try {
        console.log(`[GSC URL INSPECTION] Inspecting URL: ${url}`);
        
        // Call URL Inspection API with timeout
        const inspectionResponse = await inspectUrlWithTimeout(url, siteUrl, 8000) as any;

        const result = inspectionResponse.data.inspectionResult;
        
        // Extract key technical SEO information
        const technicalInfo = {
          url: url,
          indexStatus: result?.indexStatusResult?.verdict || 'UNKNOWN',
          canBeIndexed: result?.indexStatusResult?.verdict === 'PASS',
          googleCanonical: result?.indexStatusResult?.googleCanonical || null,
          userCanonical: result?.indexStatusResult?.userCanonical || null,
          sitemap: result?.indexStatusResult?.sitemap || null,
          
          // Page fetch info
          fetchStatus: result?.indexStatusResult?.pageFetchState || 'UNKNOWN',
          lastCrawlTime: result?.indexStatusResult?.lastCrawlTime || null,
          robotsTxtState: result?.indexStatusResult?.robotsTxtState || 'UNKNOWN',
          
          // Mobile usability
          mobileUsable: result?.mobileUsabilityResult?.verdict === 'PASS',
          mobileUsabilityIssues: result?.mobileUsabilityResult?.issues?.length || 0,
          
          // Rich results
          richResultsItems: result?.richResultsResult?.detectedItems?.length || 0,
          richResultsValid: result?.richResultsResult?.verdict === 'PASS',
          
          // AMP info (if applicable)
          ampUrl: result?.ampResult?.ampUrl || null,
          ampStatus: result?.ampResult?.verdict || null,
          
          // Raw data for detailed analysis
          rawData: result
        };

        // Store URL inspection data
        await supabase
          .from('url_inspections')
          .upsert({
            user_token: userToken,
            site_url: siteUrl,
            inspected_url: url,
            index_status: technicalInfo.indexStatus,
            can_be_indexed: technicalInfo.canBeIndexed,
            google_canonical: technicalInfo.googleCanonical,
            user_canonical: technicalInfo.userCanonical,
            sitemap: technicalInfo.sitemap,
            fetch_status: technicalInfo.fetchStatus,
            last_crawl_time: technicalInfo.lastCrawlTime,
            robots_txt_state: technicalInfo.robotsTxtState,
            mobile_usable: technicalInfo.mobileUsable,
            mobile_usability_issues: technicalInfo.mobileUsabilityIssues,
            rich_results_items: technicalInfo.richResultsItems,
            rich_results_valid: technicalInfo.richResultsValid,
            amp_url: technicalInfo.ampUrl,
            amp_status: technicalInfo.ampStatus,
            inspection_data: technicalInfo.rawData,
            inspected_at: new Date().toISOString()
          }, {
            onConflict: 'user_token,site_url,inspected_url'
          });

        inspectionResults.push(technicalInfo);
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (urlError) {
        console.error(`[GSC URL INSPECTION] Error inspecting ${url}:`, urlError);
        const errorMessage = urlError instanceof Error ? urlError.message : 'Unknown error';
        console.error(`[GSC URL INSPECTION] Full error details for ${url}:`, {
          message: errorMessage,
          stack: urlError instanceof Error ? urlError.stack : undefined,
          response: (urlError as any)?.response?.data || (urlError as any)?.response || 'No response data'
        });
        inspectionResults.push({
          url: url,
          error: errorMessage,
          indexStatus: 'ERROR'
        });
      }
    }

    // Analyze results for immediate automated fixes
    const automatedFixes: Array<{
      url: string;
      type: string;
      priority: string;
      description: string;
      canAutoFix: boolean;
      fixMethod: string;
    }> = [];
    const criticalIssues: Array<{
      url: string;
      type: string;
      severity: string;
      description: string;
      suggestedFix: string;
    }> = [];
    
    inspectionResults.forEach(result => {
      if ('error' in result) return;
      
      // Check for canonical issues
      if (result.userCanonical && result.googleCanonical && result.userCanonical !== result.googleCanonical) {
        criticalIssues.push({
          url: result.url,
          type: 'canonical_mismatch',
          severity: 'warning',
          description: 'User canonical differs from Google canonical',
          suggestedFix: `Update canonical tag to: ${result.googleCanonical}`
        });
      }
      
      // Check for indexing issues
      if (!result.canBeIndexed) {
        criticalIssues.push({
          url: result.url,
          type: 'indexing_blocked',
          severity: 'critical',
          description: `URL cannot be indexed: ${result.indexStatus}`,
          suggestedFix: 'Review robots.txt and meta robots tags'
        });
      }
      
      // Check for mobile usability
      if (!result.mobileUsable) {
        criticalIssues.push({
          url: result.url,
          type: 'mobile_unfriendly',
          severity: 'warning',
          description: `Mobile usability issues detected (${result.mobileUsabilityIssues} issues)`,
          suggestedFix: 'Review mobile responsiveness and viewport settings'
        });
      }
      
      // Check for missing structured data
      if (result.richResultsItems === 0) {
        automatedFixes.push({
          url: result.url,
          type: 'add_schema_markup',
          priority: 'medium',
          description: 'No structured data detected',
          canAutoFix: true,
          fixMethod: 'smart_js_schema_injection'
        });
      }
    });

    console.log(`[GSC URL INSPECTION] Completed inspection of ${urls.length} URLs`);
    console.log(`[GSC URL INSPECTION] Found ${criticalIssues.length} critical issues`);
    console.log(`[GSC URL INSPECTION] Identified ${automatedFixes.length} automated fixes`);
    
    const errors = inspectionResults.filter(r => 'error' in r);
    if (errors.length > 0) {
      console.error(`[GSC URL INSPECTION] ${errors.length} URLs failed inspection:`, errors);
    }

    return NextResponse.json({
      success: true,
      data: {
        siteUrl,
        inspectedUrls: urls.length,
        results: inspectionResults,
        summary: {
          indexable: inspectionResults.filter(r => !('error' in r) && r.canBeIndexed).length,
          blocked: inspectionResults.filter(r => !('error' in r) && !r.canBeIndexed).length,
          mobileUsable: inspectionResults.filter(r => !('error' in r) && r.mobileUsable).length,
          withRichResults: inspectionResults.filter(r => !('error' in r) && r.richResultsItems > 0).length,
          errors: inspectionResults.filter(r => 'error' in r).length
        },
        issues: criticalIssues,
        automatedFixes: automatedFixes,
        errors: inspectionResults.filter(r => 'error' in r),
        inspectedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[GSC URL INSPECTION] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to perform URL inspection' }, 
      { status: 500 }
    );
  }
}