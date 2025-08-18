import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, host } = request.nextUrl;
  
  // Handle sitemap.xml requests for any domain
  if (pathname === '/sitemap.xml') {
    // Skip for seoagent.com (it has its own sitemap.ts)
    if (host?.includes('seoagent.com')) {
      return NextResponse.next();
    }
    
    // For other domains, redirect to our sitemap API
    const domain = host?.replace(/^www\./, '');
    const apiUrl = new URL('/api/sitemaps/serve', request.url);
    apiUrl.searchParams.set('domain', domain || '');
    
    console.log(`[MIDDLEWARE] Redirecting sitemap.xml for ${host} to ${apiUrl.toString()}`);
    
    return NextResponse.rewrite(apiUrl);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/sitemap.xml'
  ]
}