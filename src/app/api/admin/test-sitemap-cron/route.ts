import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get admin token from query params for manual testing
    const adminToken = request.nextUrl.searchParams.get('adminToken');
    
    console.log('[ADMIN] Received token:', adminToken?.substring(0, 10) + '...');
    console.log('[ADMIN] Expected token:', process.env.ADMIN_SECRET?.substring(0, 10) + '...');
    console.log('[ADMIN] Tokens match:', adminToken === process.env.ADMIN_SECRET);
    
    if (!adminToken || adminToken !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        debug: {
          receivedLength: adminToken?.length || 0,
          expectedLength: process.env.ADMIN_SECRET?.length || 0,
          hasToken: !!adminToken,
          hasEnvVar: !!process.env.ADMIN_SECRET
        }
      }, { status: 401 });
    }

    console.log('[ADMIN] Testing sitemap cron job...');

    // Call the cron endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.seoagent.com';
    const cronUrl = `${baseUrl}/api/cron/regenerate-sitemaps`;
    
    console.log('[ADMIN] Calling cron endpoint:', cronUrl);
    console.log('[ADMIN] Using CRON_SECRET exists:', !!process.env.CRON_SECRET);
    console.log('[ADMIN] Base URL:', baseUrl);
    
    const response = await fetch(cronUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Sitemap cron test completed',
      status: response.status,
      result
    });

  } catch (error) {
    console.error('[ADMIN] Error testing sitemap cron:', error);
    return NextResponse.json({ error: 'Test failed' }, { status: 500 });
  }
}