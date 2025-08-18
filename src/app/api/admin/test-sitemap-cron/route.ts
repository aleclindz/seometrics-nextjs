import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get admin token from query params for manual testing
    const adminToken = request.nextUrl.searchParams.get('adminToken');
    
    console.log('[ADMIN] Received token:', adminToken?.substring(0, 10) + '...');
    console.log('[ADMIN] Expected token:', process.env.ADMIN_SECRET?.substring(0, 10) + '...');
    console.log('[ADMIN] Tokens match:', adminToken === process.env.ADMIN_SECRET);
    
    // Character by character comparison for debugging
    if (adminToken && process.env.ADMIN_SECRET && adminToken !== process.env.ADMIN_SECRET) {
      console.log('[ADMIN] Full received token:', JSON.stringify(adminToken));
      console.log('[ADMIN] Full expected token:', JSON.stringify(process.env.ADMIN_SECRET));
      console.log('[ADMIN] Char codes at pos 0:', adminToken.charCodeAt(0), 'vs', process.env.ADMIN_SECRET.charCodeAt(0));
      console.log('[ADMIN] Char codes at end:', adminToken.charCodeAt(adminToken.length-1), 'vs', process.env.ADMIN_SECRET.charCodeAt(process.env.ADMIN_SECRET.length-1));
    }
    
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
    console.log('[ADMIN] CRON_SECRET length:', process.env.CRON_SECRET?.length);
    console.log('[ADMIN] Base URL:', baseUrl);
    
    const authHeader = `Bearer ${process.env.CRON_SECRET}`;
    console.log('[ADMIN] Auth header being sent:', authHeader.substring(0, 30) + '...');
    
    const response = await fetch(cronUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'User-Agent': 'SEOAgent-Admin-Test/1.0'
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