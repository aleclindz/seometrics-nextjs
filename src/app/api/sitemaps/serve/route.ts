import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { website_token, website_url } = await request.json();
    
    if (!website_token) {
      return NextResponse.json({ error: 'Website token is required' }, { status: 400 });
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
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    // Look for a generated sitemap for this website
    const { data: sitemapRecord, error: sitemapError } = await supabase
      .from('sitemap_submissions')
      .select('*')
      .eq('user_token', website.user_token)
      .or(`site_url.eq.${website.url},site_url.eq.sc-domain:${website.url.replace(/^https?:\/\//, '').replace(/^www\./, '')}`)
      .eq('status', 'submitted')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (sitemapError || !sitemapRecord) {
      console.log('[SITEMAP SERVE] No sitemap found, generating basic sitemap');
      
      // Determine the website URL to use - handle null website.url
      let baseUrl = website_url;
      if (!baseUrl && website.url) {
        baseUrl = website.url.startsWith('sc-domain:') 
          ? website.url.replace('sc-domain:', 'https://') 
          : website.url;
      }
      if (!baseUrl && website.domain) {
        baseUrl = website.domain.startsWith('sc-domain:') 
          ? website.domain.replace('sc-domain:', 'https://') 
          : `https://${website.domain}`;
      }
      if (!baseUrl) {
        console.error('[SITEMAP SERVE] No URL available for sitemap generation');
        return NextResponse.json({ error: 'No website URL available' }, { status: 400 });
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

      return NextResponse.json({
        success: true,
        sitemapXML: basicSitemapXML,
        generated: true,
        source: 'auto-generated'
      });
    }

    // Try to fetch the full sitemap XML from the generation endpoint
    try {
      // Determine the site URL for the generation API - handle null website.url
      let siteUrlForGeneration = website_url;
      if (!siteUrlForGeneration && website.url) {
        siteUrlForGeneration = website.url;
      }
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
          return NextResponse.json({
            success: true,
            sitemapXML: sitemapData.data.sitemapXML,
            generated: false,
            source: 'database',
            urlCount: sitemapData.data.urlCount
          });
        }
      }
    } catch (error) {
      console.error('[SITEMAP SERVE] Error regenerating sitemap:', error);
    }

    // Fallback: return stored sitemap URL (though this won't contain XML)
    return NextResponse.json({
      success: true,
      sitemapURL: sitemapRecord.sitemap_url,
      generated: false,
      source: 'stored-url-only',
      message: 'Only sitemap URL available, no XML content stored'
    });

  } catch (error) {
    console.error('[SITEMAP SERVE] Error serving sitemap:', error);
    return NextResponse.json({ error: 'Failed to serve sitemap' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Support GET requests with website_token as query parameter
  const website_token = request.nextUrl.searchParams.get('website_token');
  const website_url = request.nextUrl.searchParams.get('website_url');
  
  if (!website_token) {
    return NextResponse.json({ error: 'Website token is required' }, { status: 400 });
  }
  
  // Convert to POST-like call
  const mockRequest = {
    json: async () => ({ website_token, website_url })
  };
  
  return POST(mockRequest as any);
}