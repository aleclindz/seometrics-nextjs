"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.POST = POST;
const server_1 = require("next/server");
const DomainUtils_1 = require("@/lib/utils/DomainUtils");
const supabase_js_1 = require("@supabase/supabase-js");
const googleapis_1 = require("googleapis");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function POST(request) {
    try {
        console.log('[SITEMAP GENERATION] Starting sitemap generation');
        const { userToken, siteUrl, submitToGSC = true } = await request.json();
        if (!userToken || !siteUrl) {
            return server_1.NextResponse.json({ error: 'Missing required parameters: userToken, siteUrl' }, { status: 400 });
        }
        // Clean the site URL using DomainUtils to handle sc-domain: prefixes
        const domain = DomainUtils_1.DomainUtils.cleanDomain(siteUrl);
        const cleanSiteUrl = DomainUtils_1.DomainUtils.buildUrl(domain);
        console.log(`[SITEMAP GENERATION] Processing: siteUrl=${siteUrl}, cleanSiteUrl=${cleanSiteUrl}, domain=${domain}`);
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
        const discoveredUrls = new Set();
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
        }
        catch (error) {
            if (error?.code === '42P01') {
                console.log('[SITEMAP GENERATION] sitemap_submissions table not found, continuing without database storage');
                sitemapRecord = {
                    id: 'temp-' + Date.now(),
                    status: 'generated',
                    sitemap_url: `${cleanSiteUrl}/sitemap.xml`
                };
            }
            else {
                console.error('[SITEMAP GENERATION] Unexpected error storing sitemap:', {
                    code: error?.code,
                    message: error?.message,
                    name: error?.name,
                    stack: error?.stack
                });
                return server_1.NextResponse.json({ error: 'Failed to store sitemap' }, { status: 500 });
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
                    const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
                    oauth2Client.setCredentials({
                        access_token: connection.access_token,
                        refresh_token: connection.refresh_token
                    });
                    // Create Webmasters API client (correct API for sitemap submission)
                    const webmasters = googleapis_1.google.webmasters({ version: 'v3', auth: oauth2Client });
                    // Find the appropriate GSC property
                    const { data: properties } = await supabase
                        .from('gsc_properties')
                        .select('*')
                        .eq('connection_id', connection.id)
                        .eq('is_active', true);
                    const gscProperty = properties?.find(p => p.site_url === siteUrl ||
                        p.site_url === `sc-domain:${domain}` ||
                        p.site_url.includes(domain));
                    if (gscProperty) {
                        // Submit sitemap to GSC using the correct format
                        // For sc-domain properties, we still need to provide the full HTTPS URL for the sitemap
                        const sitemapUrl = `${cleanSiteUrl}/sitemap.xml`;
                        console.log(`[SITEMAP GENERATION] Submitting to GSC: property=${gscProperty.site_url}, sitemap=${sitemapUrl}`);
                        const submitResponse = await webmasters.sitemaps.submit({
                            siteUrl: gscProperty.site_url,
                            feedpath: sitemapUrl // Always use full HTTPS URL for sitemap, even for sc-domain properties
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
                            }
                            catch (updateError) {
                                console.log('[SITEMAP GENERATION] Could not update sitemap record, table may not exist');
                            }
                        }
                        console.log('[SITEMAP GENERATION] Successfully submitted sitemap to GSC');
                    }
                    else {
                        gscSubmissionResult = { success: false, error: 'No matching GSC property found' };
                    }
                }
                else {
                    gscSubmissionResult = { success: false, error: 'No active GSC connection' };
                }
            }
            catch (gscError) {
                console.error('[SITEMAP GENERATION] GSC submission error:', gscError);
                gscSubmissionResult = {
                    success: false,
                    error: gscError instanceof Error ? gscError.message : 'GSC submission failed'
                };
            }
        }
        console.log('[SITEMAP GENERATION] Sitemap generation completed');
        return server_1.NextResponse.json({
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
    }
    catch (error) {
        console.error('[SITEMAP GENERATION] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Failed to generate sitemap' }, { status: 500 });
    }
}
