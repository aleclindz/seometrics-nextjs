import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get('domain') || 'translateyoutubevideos.com';
  
  const currentDate = new Date().toISOString().split('T')[0];
  
  let sitemapXML: string;
  let urls: string[];
  
  // Define URLs based on domain
  switch (domain) {
    case 'translateyoutubevideos.com':
      urls = [
        '/',
        '/translate',
        '/about', 
        '/contact',
        '/privacy',
        '/terms'
      ];
      break;
    default:
      urls = [
        '/',
        '/about',
        '/contact',
        '/privacy',
        '/terms'
      ];
  }
  
  // Generate sitemap XML
  sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  urls.forEach((path, index) => {
    const priority = path === '/' ? '1.0' : 
                    path === '/translate' ? '0.9' :
                    path.includes('privacy') || path.includes('terms') ? '0.3' : '0.8';
    const changefreq = path.includes('privacy') || path.includes('terms') ? 'yearly' : 
                      path === '/' || path === '/translate' ? 'weekly' : 'monthly';
    
    sitemapXML += `
  <url>
    <loc>https://${domain}${path}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  });

  sitemapXML += `
</urlset>`;

  // Return as downloadable file or XML
  const format = request.nextUrl.searchParams.get('format');
  
  if (format === 'download') {
    return new Response(sitemapXML, {
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="${domain}-sitemap.xml"`
      }
    });
  }

  return new Response(sitemapXML, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const { domain = 'translateyoutubevideos.com', urls } = await request.json();
    
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Use provided URLs or default ones
    const sitemapUrls = urls || [
      '/',
      '/translate',
      '/about',
      '/contact', 
      '/privacy',
      '/terms'
    ];
    
    let sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    sitemapUrls.forEach((path: string) => {
      const priority = path === '/' ? '1.0' : 
                      path === '/translate' ? '0.9' :
                      path.includes('privacy') || path.includes('terms') ? '0.3' : '0.8';
      const changefreq = path.includes('privacy') || path.includes('terms') ? 'yearly' : 
                        path === '/' || path === '/translate' ? 'weekly' : 'monthly';
      
      sitemapXML += `
  <url>
    <loc>https://${domain}${path}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    });

    sitemapXML += `
</urlset>`;

    return NextResponse.json({
      success: true,
      domain,
      urlCount: sitemapUrls.length,
      sitemapXML,
      downloadUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/debug/generate-static-sitemap?domain=${domain}&format=download`,
      instructions: [
        '1. Copy the XML content below',
        '2. Create a file named "sitemap.xml" on your server',
        '3. Upload it to the root directory of your website',
        '4. Test: https://' + domain + '/sitemap.xml',
        '5. Submit to Google Search Console'
      ]
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to generate sitemap',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}