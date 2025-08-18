import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get admin token from query params for manual testing
    const adminToken = request.nextUrl.searchParams.get('adminToken');
    
    if (!adminToken || adminToken !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[ADMIN] Testing sitemap cron job...');

    // Call the cron endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/cron/regenerate-sitemaps`, {
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