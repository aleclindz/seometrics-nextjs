import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('[SITEMAP GENERATION] Starting sitemap generation');
    
    const { userToken, siteUrl, submitToGSC = true } = await request.json();
    
    if (!userToken || !siteUrl) {
      return NextResponse.json({ error: 'Missing required parameters: userToken, siteUrl' }, { status: 400 });
    }

    // Clean the site URL
    const cleanSiteUrl = siteUrl.replace(/\/$/, ''); // Remove trailing slash
    const domain = cleanSiteUrl.replace(/^https?:\/\//, '');

    // Step 1: Discover URLs for the sitemap
    console.log('[SITEMAP GENERATION] Discovering URLs for sitemap');
    
    // Get URLs from GSC URL inspections (pages we know about)
    const { data: inspections, error: inspectionsError } = await supabase
      .from('url_inspections')
      .select('inspected_url, can_be_indexed, index_status, last_crawl_time')
      .eq('user_token', userToken)
      .or(`site_url.eq.${siteUrl},site_url.eq.sc-domain:${domain}`)
      .order('inspected_at', { ascending: false });

    if (inspectionsError) {
      console.error('[SITEMAP GENERATION] Error fetching URL inspections:', inspectionsError);
    }

    // Build a comprehensive URL list
    const discoveredUrls = new Set<string>();
    
    // Add URLs from GSC inspections
    if (inspections?.length) {
      inspections.forEach(inspection => {
        if (inspection.can_be_indexed && inspection.inspected_url) {
          discoveredUrls.add(inspection.inspected_url);
        }
      });
    }

    // Add common pages that should always be in sitemap
    const commonPages = [
      cleanSiteUrl,
      `${cleanSiteUrl}/`,
      `${cleanSiteUrl}/about`,
      `${cleanSiteUrl}/contact`,
      `${cleanSiteUrl}/pricing`,
      `${cleanSiteUrl}/blog`,
      `${cleanSiteUrl}/services`,
      `${cleanSiteUrl}/products`
    ];

    commonPages.forEach(url => discoveredUrls.add(url));

    // Convert to array and sort
    const urlList = Array.from(discoveredUrls).sort();

    console.log(`[SITEMAP GENERATION] Found ${urlList.length} URLs for sitemap`);

    // Step 2: Generate XML sitemap
    const currentDate = new Date().toISOString();
    
    const sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlList.map(url => {
  // Find inspection data for this URL if available
  const inspection = inspections?.find(i => i.inspected_url === url);
  const lastmod = inspection?.last_crawl_time || currentDate;
  const priority = url === cleanSiteUrl || url === `${cleanSiteUrl}/` ? '1.0' : '0.8';
  const changefreq = url === cleanSiteUrl || url === `${cleanSiteUrl}/` ? 'daily' : 'weekly';
  
  return `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod.split('T')[0]}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}).join('\n')}
</urlset>`;

    // Step 3: Store sitemap in database
    const { data: sitemapRecord, error: sitemapError } = await supabase
      .from('sitemap_submissions')
      .upsert({
        user_token: userToken,
        site_url: siteUrl,
        sitemap_content: sitemapXML,
        url_count: urlList.length,
        status: 'generated',
        generated_at: new Date().toISOString()
      }, {
        onConflict: 'user_token,site_url'
      })
      .select()
      .single();

    if (sitemapError) {
      console.error('[SITEMAP GENERATION] Error storing sitemap:', sitemapError);
      return NextResponse.json({ error: 'Failed to store sitemap' }, { status: 500 });
    }

    let gscSubmissionResult = null;

    // Step 4: Submit to Google Search Console (if enabled)
    if (submitToGSC) {
      try {
        console.log('[SITEMAP GENERATION] Submitting sitemap to GSC');
        
        // Get GSC connection
        const { data: connection, error: connectionError } = await supabase
          .from('gsc_connections')
          .select('*')
          .eq('user_token', userToken)
          .eq('is_active', true)
          .single();

        if (connection && !connectionError) {
          // Check if token is expired
          const now = new Date();
          const expiresAt = new Date(connection.expires_at);
          
          if (now >= expiresAt) {
            console.log('[SITEMAP GENERATION] Token expired, attempting refresh');
            const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/gsc/oauth/refresh?userToken=${userToken}`, {
              method: 'POST'
            });
            
            if (refreshResponse.ok) {
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
          }

          // Create OAuth2 client
          const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
          );
          
          oauth2Client.setCredentials({
            access_token: connection.access_token,
            refresh_token: connection.refresh_token
          });

          // Create Search Console API client
          const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });

          // Find the appropriate GSC property
          const { data: properties } = await supabase
            .from('gsc_properties')
            .select('*')
            .eq('connection_id', connection.id)
            .eq('is_active', true);

          const gscProperty = properties?.find(p => 
            p.site_url === siteUrl || 
            p.site_url === `sc-domain:${domain}` ||
            p.site_url.includes(domain)
          );

          if (gscProperty) {
            // Submit sitemap to GSC
            const sitemapUrl = `${cleanSiteUrl}/sitemap.xml`;
            
            const submitResponse = await searchconsole.sitemaps.submit({
              siteUrl: gscProperty.site_url,
              feedpath: sitemapUrl
            });

            gscSubmissionResult = {
              success: true,
              sitemapUrl,
              gscProperty: gscProperty.site_url,
              response: submitResponse.status
            };

            // Update database record
            await supabase
              .from('sitemap_submissions')
              .update({
                status: 'submitted_to_gsc',
                sitemap_url: sitemapUrl,
                gsc_property: gscProperty.site_url,
                submitted_at: new Date().toISOString()
              })
              .eq('id', sitemapRecord.id);

            console.log('[SITEMAP GENERATION] Successfully submitted sitemap to GSC');
          } else {
            gscSubmissionResult = { success: false, error: 'No matching GSC property found' };
          }
        } else {
          gscSubmissionResult = { success: false, error: 'No active GSC connection' };
        }
      } catch (gscError) {
        console.error('[SITEMAP GENERATION] GSC submission error:', gscError);
        gscSubmissionResult = { 
          success: false, 
          error: gscError instanceof Error ? gscError.message : 'GSC submission failed' 
        };
      }
    }

    console.log('[SITEMAP GENERATION] Sitemap generation completed');

    return NextResponse.json({
      success: true,
      data: {
        siteUrl: cleanSiteUrl,
        urlCount: urlList.length,
        urls: urlList,
        sitemapXML,
        sitemapId: sitemapRecord.id,
        gscSubmission: gscSubmissionResult,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[SITEMAP GENERATION] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to generate sitemap' }, 
      { status: 500 }
    );
  }
}