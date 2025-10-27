import { NextRequest, NextResponse } from 'next/server';
import { UrlNormalizationService } from '@/lib/UrlNormalizationService';
import { DomainUtils } from '@/lib/utils/DomainUtils';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { startCrawl, getCrawlStatus, getCrawlResult } from '@/services/crawl/firecrawl-client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Built-in website crawler for discovering paginated content
async function crawlWebsiteBuiltIn(baseUrl: string): Promise<string[]> {
  const discoveredUrls = new Set<string>();
  const visitedPages = new Set<string>();
  const maxPages = 20; // Reasonable limit for pagination crawling
  
  // Helper function to fetch and parse HTML
  async function fetchAndParse(url: string): Promise<string[]> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SEOAgent-Crawler/1.0 (+https://seoagent.com)'
        },
        timeout: 10000 // 10 second timeout
      } as any);
      
      if (!response.ok) return [];
      
      const html = await response.text();
      const links: string[] = [];
      
      // Simple regex-based link extraction (better than external dependency)
      const linkPattern = /href=["']([^"']*?)["']/gi;
      let match;
      
      while ((match = linkPattern.exec(html)) !== null) {
        const href = match[1];
        
        // Convert relative URLs to absolute
        let fullUrl: string;
        try {
          if (href.startsWith('http')) {
            fullUrl = href;
          } else if (href.startsWith('/')) {
            fullUrl = baseUrl.replace(/\/$/, '') + href;
          } else {
            fullUrl = url.replace(/\/[^\/]*$/, '/') + href;
          }
          
          // Only include links from the same domain
          if (fullUrl.startsWith(baseUrl.replace(/\/$/, ''))) {
            links.push(fullUrl);
          }
        } catch (e) {
          // Skip invalid URLs
        }
      }
      
      return links;
    } catch (error) {
      console.log(`[CRAWLER] Failed to fetch ${url}:`, error);
      return [];
    }
  }
  
  // Start with common blog paths
  const blogPaths = ['/blog', '/articles', '/posts', '/news'];
  const startUrls = blogPaths.map(path => baseUrl.replace(/\/$/, '') + path);
  
  // Add the main blog URL
  for (const startUrl of startUrls) {
    if (visitedPages.has(startUrl)) continue;
    visitedPages.add(startUrl);
    
    console.log(`[CRAWLER] Crawling blog page: ${startUrl}`);
    const links = await fetchAndParse(startUrl);
    
    for (const link of links) {
      // Add blog post links (look for common blog URL patterns)
      if (link.match(/\/(blog|articles|posts|news)\/[^\/]+\/?$/)) {
        discoveredUrls.add(link);
      }
      
      // Add pagination links for further crawling
      if ((link.includes('/page/') || link.includes('?page=') || 
           link.includes('/blog/') && link.match(/\/\d+\/?$/)) &&
          !visitedPages.has(link) && visitedPages.size < maxPages) {
        
        visitedPages.add(link);
        console.log(`[CRAWLER] Following pagination: ${link}`);
        
        // Crawl pagination page
        const paginationLinks = await fetchAndParse(link);
        for (const paginationLink of paginationLinks) {
          if (paginationLink.match(/\/(blog|articles|posts|news)\/[^\/]+\/?$/)) {
            discoveredUrls.add(paginationLink);
          }
        }
      }
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return Array.from(discoveredUrls);
}

export async function POST(request: NextRequest) {
  try {
    console.log('[SITEMAP GENERATION] Starting sitemap generation');
    
    const { userToken, siteUrl, submitToGSC = true } = await request.json();
    
    if (!userToken || !siteUrl) {
      return NextResponse.json({ error: 'Missing required parameters: userToken, siteUrl' }, { status: 400 });
    }

    // Clean the site URL using DomainUtils to handle sc-domain: prefixes
    const domain = DomainUtils.cleanDomain(siteUrl);
    const cleanSiteUrl = DomainUtils.buildUrl(domain);
    
    console.log(`[SITEMAP GENERATION] Processing: siteUrl=${siteUrl}, cleanSiteUrl=${cleanSiteUrl}, domain=${domain}`);

    // Step 1: Discover URLs for the sitemap using comprehensive crawling
    console.log('[SITEMAP GENERATION] Discovering URLs for sitemap');
    
    // Build a comprehensive URL list
    const discoveredUrls = new Set<string>();
    
    // Step 1a: Get URLs from GSC URL inspections (pages we know about)
    const { data: inspections, error: inspectionsError } = await supabase
      .from('url_inspections')
      .select('inspected_url, can_be_indexed, index_status, last_crawl_time')
      .eq('user_token', userToken)
      .or(`site_url.eq.${siteUrl},site_url.eq.sc-domain:${domain}`)
      .order('inspected_at', { ascending: false });

    if (inspectionsError) {
      console.error('[SITEMAP GENERATION] Error fetching URL inspections:', inspectionsError);
    }

    // Add URLs from GSC inspections
    if (inspections?.length) {
      inspections.forEach(inspection => {
        if (inspection.can_be_indexed && inspection.inspected_url) {
          discoveredUrls.add(inspection.inspected_url);
        }
      });
      console.log(`[SITEMAP GENERATION] Added ${inspections.length} URLs from GSC inspections`);
    }

    // Step 1b: Crawl website to discover all URLs (including paginated content)
    try {
      console.log('[SITEMAP GENERATION] Starting comprehensive website crawl');
      
      // Start Firecrawl job with focused limits for faster discovery
      const crawlJob = await startCrawl({
        url: cleanSiteUrl,
        maxPages: 50, // Reduced to prevent concurrent request limit issues
        includePaths: ['/blog'], // Focus specifically on blog section
        excludePaths: ['/admin', '/wp-admin', '/login', '/private', '/auth'], // Skip admin areas
        parseJS: true // Handle JavaScript-rendered content
      });

      console.log(`[SITEMAP GENERATION] Crawl started with job ID: ${crawlJob.jobId}`);

      // Poll for completion with timeout
      let attempts = 0;
      const maxAttempts = 24; // 2 minutes max wait time (5 second intervals)
      let crawlComplete = false;

      while (attempts < maxAttempts && !crawlComplete) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        attempts++;

        try {
          const status = await getCrawlStatus(crawlJob.jobId);
          console.log(`[SITEMAP GENERATION] Crawl status check ${attempts}/${maxAttempts}: ${status.status}`);
          
          if (status.done) {
            crawlComplete = true;
            break;
          }
        } catch (statusError) {
          console.log(`[SITEMAP GENERATION] Status check failed (attempt ${attempts}), continuing...`);
        }
      }

      if (crawlComplete) {
        // Get crawl results
        const crawlResults = await getCrawlResult(crawlJob.jobId);
        console.log(`[SITEMAP GENERATION] Crawl completed successfully. Discovered ${crawlResults.length} pages`);

        // Add all discovered URLs
        crawlResults.forEach(page => {
          if (page.url && page.url.startsWith('http')) {
            discoveredUrls.add(page.url);
          }
        });
      } else {
        console.log(`[SITEMAP GENERATION] Crawl timeout after ${maxAttempts} attempts, proceeding with existing URLs`);
      }

    } catch (crawlError) {
      console.error('[SITEMAP GENERATION] Firecrawl error, trying built-in crawler:', crawlError);
      
      // Step 1c: Fallback to built-in crawler for paginated content
      try {
        console.log('[SITEMAP GENERATION] Starting built-in crawler fallback');
        const crawledUrls = await crawlWebsiteBuiltIn(cleanSiteUrl);
        console.log(`[SITEMAP GENERATION] Built-in crawler discovered ${crawledUrls.length} additional URLs`);
        
        crawledUrls.forEach(url => discoveredUrls.add(url));
      } catch (builtInError) {
        console.error('[SITEMAP GENERATION] Built-in crawler also failed:', builtInError);
      }
    }

    // Step 1c: Add common pages that should always be in sitemap
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

    console.log(`[SITEMAP GENERATION] Final URL discovery complete: ${urlList.length} URLs found for sitemap`);

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

    // Step 3: Store sitemap in database (with error handling for missing table)
    let sitemapRecord = null;
    try {
      const result = await supabase
        .from('sitemap_submissions')
        .upsert({
          user_token: userToken,
          site_url: siteUrl, // Use original siteUrl for consistency with queries
          sitemap_url: `${cleanSiteUrl}/sitemap.xml`,
          status: 'generated',
          submission_method: 'api',
          warnings: 0,
          errors: 0,
          is_pending: false,
          is_sitemaps_index: false
        }, {
          onConflict: 'user_token,site_url,sitemap_url'
        })
        .select()
        .single();

      sitemapRecord = result.data;
      
      if (result.error) {
        // Assume table doesn't exist if we get any database error (since this is a missing feature)
        console.log('[SITEMAP GENERATION] Database error, assuming sitemap_submissions table not found, continuing without database storage');
        console.log('[SITEMAP GENERATION] Error details:', {
          code: result.error.code,
          message: result.error.message,
          details: result.error.details,
          hint: result.error.hint
        });
        // Create a mock record for the response
        sitemapRecord = {
          id: 'temp-' + Date.now(),
          status: 'generated',
          sitemap_url: `${cleanSiteUrl}/sitemap.xml`
        };
      }
    } catch (error: any) {
      if (error?.code === '42P01') {
        console.log('[SITEMAP GENERATION] sitemap_submissions table not found, continuing without database storage');
        sitemapRecord = {
          id: 'temp-' + Date.now(),
          status: 'generated',
          sitemap_url: `${cleanSiteUrl}/sitemap.xml`
        };
      } else {
        console.error('[SITEMAP GENERATION] Unexpected error storing sitemap:', {
          code: error?.code,
          message: error?.message,
          name: error?.name,
          stack: error?.stack
        });
        return NextResponse.json({ error: 'Failed to store sitemap' }, { status: 500 });
      }
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

          // Create Webmasters API client (correct API for sitemap submission)
          const webmasters = google.webmasters({ version: 'v3', auth: oauth2Client });

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
            // Submit sitemap to GSC using the correct format
            // For sc-domain properties, we still need to provide the full HTTPS URL for the sitemap
            const sitemapUrl = `${cleanSiteUrl}/sitemap.xml`;
            
            console.log(`[SITEMAP GENERATION] Submitting to GSC: property=${gscProperty.site_url}, sitemap=${sitemapUrl}`);
            
            const submitResponse = await webmasters.sitemaps.submit({
              siteUrl: gscProperty.site_url,
              feedpath: sitemapUrl  // Always use full HTTPS URL for sitemap, even for sc-domain properties
            });

            gscSubmissionResult = {
              success: true,
              sitemapUrl,
              gscProperty: gscProperty.site_url,
              response: submitResponse.status
            };

            // Update database record (if table exists and record has real ID)
            if (sitemapRecord.id && !sitemapRecord.id.toString().startsWith('temp-')) {
              try {
                await supabase
                  .from('sitemap_submissions')
                  .update({
                    status: 'submitted',
                    sitemap_url: sitemapUrl
                  })
                  .eq('id', sitemapRecord.id);
              } catch (updateError) {
                console.log('[SITEMAP GENERATION] Could not update sitemap record, table may not exist');
              }
            }

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
        sitemapUrl: `${cleanSiteUrl}/sitemap.xml`,
        gscSubmission: gscSubmissionResult,
        generatedAt: new Date().toISOString(),
        status: sitemapRecord.status
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