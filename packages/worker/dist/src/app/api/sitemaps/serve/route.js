"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function POST(request) {
    try {
        const { website_token, website_url } = await request.json();
        if (!website_token) {
            return server_1.NextResponse.json({ error: 'Website token is required' }, { status: 400 });
        }
        console.log('[SITEMAP SERVE] Fetching sitemap for website_token:', website_token);
        // Find the website record
        const { data: website, error: websiteError } = await supabase
            .from('websites')
            .select('*')
            .eq('website_token', website_token)
            .single();
        if (websiteError || !website) {
            console.error('[SITEMAP SERVE] Website not found:', websiteError);
            return server_1.NextResponse.json({ error: 'Website not found' }, { status: 404 });
        }
        // Look for a generated sitemap for this website
        let sitemapQuery = supabase
            .from('sitemap_submissions')
            .select('*')
            .eq('user_token', website.user_token)
            .eq('status', 'submitted')
            .order('created_at', { ascending: false })
            .limit(1);
        // Add domain-based filtering using the correct domain column
        if (website.domain) {
            const cleanDomain = website.domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/^sc-domain:/, '');
            sitemapQuery = sitemapQuery.or(`site_url.eq.https://${cleanDomain},site_url.eq.sc-domain:${cleanDomain}`);
        }
        const { data: sitemapRecord, error: sitemapError } = await sitemapQuery.single();
        if (sitemapError || !sitemapRecord) {
            console.log('[SITEMAP SERVE] No sitemap found, generating basic sitemap');
            // Determine the website URL to use - use domain column
            let baseUrl = website_url;
            if (!baseUrl && website.domain) {
                baseUrl = website.domain.startsWith('sc-domain:')
                    ? website.domain.replace('sc-domain:', 'https://')
                    : (website.domain.startsWith('http') ? website.domain : `https://${website.domain}`);
            }
            if (!baseUrl) {
                baseUrl = 'https://example.com'; // fallback
            }
            if (!baseUrl) {
                console.error('[SITEMAP SERVE] No URL available for sitemap generation');
                return server_1.NextResponse.json({ error: 'No website URL available' }, { status: 400 });
            }
            // Generate a basic sitemap on-the-fly
            const currentDate = new Date().toISOString().split('T')[0];
            const basicSitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/about</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/contact</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`;
            return server_1.NextResponse.json({
                success: true,
                sitemapXML: basicSitemapXML,
                generated: true,
                source: 'auto-generated'
            });
        }
        // Try to fetch the full sitemap XML from the generation endpoint
        try {
            // Determine the site URL for the generation API - use domain column
            let siteUrlForGeneration = website_url;
            if (!siteUrlForGeneration && website.domain) {
                siteUrlForGeneration = website.domain.startsWith('sc-domain:')
                    ? website.domain
                    : `sc-domain:${website.domain}`;
            }
            if (!siteUrlForGeneration) {
                console.error('[SITEMAP SERVE] No site URL available for generation API');
                throw new Error('No site URL available');
            }
            console.log(`[SITEMAP SERVE] Calling generation API with siteUrl: ${siteUrlForGeneration}`);
            // Reconstruct the sitemap XML from stored data or regenerate it
            const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/technical-seo/generate-sitemap`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userToken: website.user_token,
                    siteUrl: siteUrlForGeneration,
                    submitToGSC: false // Don't resubmit, just get XML
                })
            });
            if (response.ok) {
                const sitemapData = await response.json();
                if (sitemapData.success && sitemapData.data.sitemapXML) {
                    console.log('[SITEMAP SERVE] Serving regenerated sitemap XML');
                    return server_1.NextResponse.json({
                        success: true,
                        sitemapXML: sitemapData.data.sitemapXML,
                        generated: false,
                        source: 'database',
                        urlCount: sitemapData.data.urlCount
                    });
                }
            }
        }
        catch (error) {
            console.error('[SITEMAP SERVE] Error regenerating sitemap:', error);
        }
        // Fallback: return stored sitemap URL (though this won't contain XML)
        return server_1.NextResponse.json({
            success: true,
            sitemapURL: sitemapRecord.sitemap_url,
            generated: false,
            source: 'stored-url-only',
            message: 'Only sitemap URL available, no XML content stored'
        });
    }
    catch (error) {
        console.error('[SITEMAP SERVE] Error serving sitemap:', error);
        return server_1.NextResponse.json({ error: 'Failed to serve sitemap' }, { status: 500 });
    }
}
async function GET(request) {
    try {
        // Support GET requests with website_token as query parameter
        const website_token = request.nextUrl.searchParams.get('website_token');
        const website_url = request.nextUrl.searchParams.get('website_url');
        const domain = request.nextUrl.searchParams.get('domain');
        // If domain is provided, look up website by domain
        if (domain && !website_token) {
            console.log(`[SITEMAP SERVE] Looking up website by domain: ${domain}`);
            const { data: website, error: websiteError } = await supabase
                .from('websites')
                .select('*')
                .or(`domain.eq.${domain},domain.eq.sc-domain:${domain},domain.ilike.%${domain}%`)
                .single();
            if (websiteError || !website) {
                console.error('[SITEMAP SERVE] Website not found by domain:', websiteError);
                // Return a basic sitemap for unknown domains
                const currentDate = new Date().toISOString().split('T')[0];
                const basicSitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${domain}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://${domain}/about</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://${domain}/contact</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`;
                return new Response(basicSitemapXML, {
                    headers: {
                        'Content-Type': 'application/xml',
                        'Cache-Control': 'public, max-age=3600'
                    }
                });
            }
            // Use the found website token
            const mockRequest = {
                json: async () => ({ website_token: website.website_token, website_url })
            };
            const result = await POST(mockRequest);
            // If the result is JSON, convert it to XML response for direct sitemap serving
            if (result.headers.get('content-type')?.includes('application/json')) {
                const jsonData = await result.json();
                if (jsonData.success && jsonData.sitemapXML) {
                    return new Response(jsonData.sitemapXML, {
                        headers: {
                            'Content-Type': 'application/xml',
                            'Cache-Control': 'public, max-age=3600'
                        }
                    });
                }
            }
            return result;
        }
        if (!website_token) {
            return server_1.NextResponse.json({ error: 'Website token or domain is required' }, { status: 400 });
        }
        // Convert to POST-like call
        const mockRequest = {
            json: async () => ({ website_token, website_url })
        };
        return POST(mockRequest);
    }
    catch (error) {
        console.error('[SITEMAP SERVE] GET error:', error);
        return server_1.NextResponse.json({ error: 'Failed to serve sitemap' }, { status: 500 });
    }
}
