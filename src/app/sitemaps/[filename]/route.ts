import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    console.log('🗺️ [SEOAGENT SITEMAP] Serving sitemap for filename:', params.filename);
    
    // Extract domain from filename (remove .xml extension)
    const domain = params.filename.replace(/\.xml$/, '');
    
    if (!domain) {
      console.error('🗺️ [SEOAGENT SITEMAP] No domain extracted from filename');
      return new NextResponse('Invalid sitemap filename', { status: 400 });
    }

    console.log('🗺️ [SEOAGENT SITEMAP] Looking up domain:', domain);

    // Look up website by domain using various format variations
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('*')
      .or(`domain.eq.${domain},domain.eq.sc-domain:${domain},domain.eq.https://${domain},domain.eq.http://${domain},domain.eq.https://www.${domain},cleaned_domain.eq.${domain}`)
      .limit(1)
      .single();

    if (websiteError || !website) {
      console.log('🗺️ [SEOAGENT SITEMAP] Website not found, generating basic sitemap for:', domain);
      
      // Generate a basic sitemap for unknown domains
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

      return new NextResponse(basicSitemapXML, {
        headers: {
          'Content-Type': 'application/xml',
          'Cache-Control': 'public, max-age=3600',
          'X-Generated-By': 'SEOAgent-Basic'
        }
      });
    }

    console.log('🗺️ [SEOAGENT SITEMAP] Found website:', website.domain, 'for user:', website.user_token);

    // Try to get existing sitemap from database
    let sitemapQuery = supabase
      .from('sitemap_submissions')
      .select('*')
      .eq('user_token', website.user_token)
      .eq('status', 'submitted')
      .order('created_at', { ascending: false })
      .limit(1);

    // Add domain-based filtering
    if (website.domain) {
      const cleanDomain = website.domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/^sc-domain:/, '');
      sitemapQuery = sitemapQuery.or(`site_url.eq.https://${cleanDomain},site_url.eq.sc-domain:${cleanDomain}`);
    }
    
    const { data: sitemapRecord, error: sitemapError } = await sitemapQuery.single();

    if (sitemapError || !sitemapRecord) {
      console.log('🗺️ [SEOAGENT SITEMAP] No stored sitemap, generating fresh one');
      
      // Try to generate sitemap using existing API
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const siteUrlForGeneration = website.domain.startsWith('sc-domain:') 
          ? website.domain 
          : `sc-domain:${website.domain.replace(/^https?:\/\//, '').replace(/^www\./, '')}`;
          
        console.log('🗺️ [SEOAGENT SITEMAP] Calling generation API with siteUrl:', siteUrlForGeneration);
        
        const response = await fetch(`${baseUrl}/api/technical-seo/generate-sitemap`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userToken: website.user_token,
            siteUrl: siteUrlForGeneration,
            submitToGSC: false
          })
        });

        if (response.ok) {
          const sitemapData = await response.json();
          if (sitemapData.success && sitemapData.data.sitemapXML) {
            console.log('🗺️ [SEOAGENT SITEMAP] Serving generated sitemap with', sitemapData.data.urlCount, 'URLs');
            
            return new NextResponse(sitemapData.data.sitemapXML, {
              headers: {
                'Content-Type': 'application/xml',
                'Cache-Control': 'public, max-age=3600',
                'X-Generated-By': 'SEOAgent-Generated',
                'X-URL-Count': sitemapData.data.urlCount?.toString() || '0'
              }
            });
          }
        } else {
          console.error('🗺️ [SEOAGENT SITEMAP] Generation API failed:', response.status);
        }
      } catch (generationError) {
        console.error('🗺️ [SEOAGENT SITEMAP] Error generating sitemap:', generationError);
      }
      
      // Fallback to basic sitemap
      const currentDate = new Date().toISOString().split('T')[0];
      const baseUrl = website.domain.startsWith('http') 
        ? website.domain 
        : `https://${website.domain.replace(/^sc-domain:/, '')}`;
        
      const fallbackSitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

      return new NextResponse(fallbackSitemapXML, {
        headers: {
          'Content-Type': 'application/xml',
          'Cache-Control': 'public, max-age=1800',
          'X-Generated-By': 'SEOAgent-Fallback'
        }
      });
    }

    console.log('🗺️ [SEOAGENT SITEMAP] Found stored sitemap record:', sitemapRecord.sitemap_url);
    
    // If we have stored sitemap XML, serve it directly
    if (sitemapRecord.sitemap_content) {
      return new NextResponse(sitemapRecord.sitemap_content, {
        headers: {
          'Content-Type': 'application/xml',
          'Cache-Control': 'public, max-age=3600',
          'X-Generated-By': 'SEOAgent-Stored'
        }
      });
    }

    // Fallback: try to re-generate from the stored URL or data
    const currentDate = new Date().toISOString().split('T')[0];
    const baseUrl = sitemapRecord.site_url?.startsWith('http') 
      ? sitemapRecord.site_url 
      : `https://${sitemapRecord.site_url?.replace(/^sc-domain:/, '') || domain}`;
      
    const reconstructedSitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

    return new NextResponse(reconstructedSitemapXML, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=1800',
        'X-Generated-By': 'SEOAgent-Reconstructed'
      }
    });

  } catch (error) {
    console.error('🗺️ [SEOAGENT SITEMAP] Error serving sitemap:', error);
    
    // Return a basic error sitemap instead of JSON error
    const domain = params.filename.replace(/\.xml$/, '');
    const errorSitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${domain}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

    return new NextResponse(errorSitemapXML, {
      status: 500,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=300',
        'X-Generated-By': 'SEOAgent-Error'
      }
    });
  }
}