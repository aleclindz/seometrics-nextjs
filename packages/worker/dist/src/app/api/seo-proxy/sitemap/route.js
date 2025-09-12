"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const domain = searchParams.get('domain');
        const userToken = searchParams.get('token');
        if (!domain || !userToken) {
            return server_1.NextResponse.json({ error: 'Missing required parameters: domain and token' }, { status: 400 });
        }
        console.log(`[SEO PROXY] Serving sitemap for domain: ${domain}`);
        // Get stored sitemap content from database
        const { data: seoContent, error } = await supabase
            .from('hosting_seo_content')
            .select('sitemap_content, robots_content, updated_at')
            .eq('user_token', userToken)
            .eq('domain', domain)
            .eq('status', 'active')
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();
        if (error || !seoContent?.sitemap_content) {
            console.error('[SEO PROXY] Sitemap not found:', error);
            // Return a basic sitemap if none exists
            const basicSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${domain}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
            return new Response(basicSitemap, {
                headers: {
                    'Content-Type': 'application/xml',
                    'Cache-Control': 'public, max-age=3600',
                    'X-SEOAgent-Generated': new Date().toISOString(),
                    'X-SEOAgent-Domain': domain,
                    'X-SEOAgent-Source': 'proxy-fallback'
                }
            });
        }
        // Return the stored sitemap content
        return new Response(seoContent.sitemap_content, {
            headers: {
                'Content-Type': 'application/xml',
                'Cache-Control': 'public, max-age=3600',
                'X-SEOAgent-Generated': seoContent.updated_at,
                'X-SEOAgent-Domain': domain,
                'X-SEOAgent-Source': 'proxy-database'
            }
        });
    }
    catch (error) {
        console.error('[SEO PROXY] Sitemap proxy error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error serving sitemap' }, { status: 500 });
    }
}
// Store sitemap content (used by redirect deployment method)
async function POST(request) {
    try {
        const { domain, userToken, sitemapContent, provider } = await request.json();
        if (!domain || !userToken || !sitemapContent) {
            return server_1.NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }
        console.log(`[SEO PROXY] Storing sitemap content for domain: ${domain}`);
        // Upsert sitemap content
        const { data, error } = await supabase
            .from('hosting_seo_content')
            .upsert({
            user_token: userToken,
            domain,
            sitemap_content: sitemapContent,
            provider: provider || 'unknown',
            status: 'active',
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'user_token,domain'
        })
            .select()
            .single();
        if (error) {
            console.error('[SEO PROXY] Error storing sitemap content:', error);
            return server_1.NextResponse.json({ error: 'Failed to store sitemap content' }, { status: 500 });
        }
        return server_1.NextResponse.json({
            success: true,
            message: 'Sitemap content stored successfully',
            proxyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/seo-proxy/sitemap?domain=${domain}&token=${userToken}`,
            storedAt: data.updated_at
        });
    }
    catch (error) {
        console.error('[SEO PROXY] Store sitemap error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error storing sitemap' }, { status: 500 });
    }
}
