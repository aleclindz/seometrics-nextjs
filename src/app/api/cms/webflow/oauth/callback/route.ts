import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL || process.env.APP_URL || 'http://localhost:3000';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.warn('[WEBFLOW CALLBACK] Provider returned error:', error);
      return NextResponse.redirect(`${getBaseUrl()}/dashboard?webflow_oauth=error&reason=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      console.error('[WEBFLOW CALLBACK] Missing code or state');
      return NextResponse.redirect(`${getBaseUrl()}/dashboard?webflow_oauth=error&reason=missing_code_or_state`);
    }

    // Decode state
    let decoded: any = {};
    try {
      decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    } catch (e) {
      console.error('[WEBFLOW CALLBACK] Failed to decode state', e);
      return NextResponse.redirect(`${getBaseUrl()}/dashboard?webflow_oauth=error&reason=invalid_state`);
    }

    const userToken = decoded.userToken as string | undefined;
    const domain = decoded.domain as string | undefined;
    const websiteId = decoded.websiteId as string | number | undefined;

    console.log('[WEBFLOW CALLBACK] Received params', {
      hasCode: Boolean(code),
      userToken: userToken ? userToken.slice(0, 8) + '...' : undefined,
      domain,
      websiteId,
    });

    if (!userToken || !websiteId) {
      console.error('[WEBFLOW CALLBACK] Missing userToken or websiteId in state');
      return NextResponse.redirect(`${getBaseUrl()}/dashboard?webflow_oauth=error&reason=invalid_state`);
    }

    const clientId = process.env.WEBFLOW_CLIENT_ID;
    const clientSecret = process.env.WEBFLOW_CLIENT_SECRET;
    const redirectUri = `${getBaseUrl()}/api/cms/webflow/oauth/callback`;

    if (!clientId || !clientSecret) {
      console.error('[WEBFLOW CALLBACK] Missing Webflow credentials');
      return NextResponse.redirect(`${getBaseUrl()}/dashboard?webflow_oauth=error&reason=not_configured`);
    }

    // Exchange code for token
    console.log('[WEBFLOW CALLBACK] Exchanging code for token');
    const tokenResp = await fetch('https://api.webflow.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResp.ok) {
      const errText = await tokenResp.text().catch(() => '');
      console.error('[WEBFLOW CALLBACK] Token exchange failed:', {
        status: tokenResp.status,
        statusText: tokenResp.statusText,
        error: errText,
        clientIdPrefix: clientId?.slice(0, 8) + '...',
        redirectUri,
      });
      return NextResponse.redirect(`${getBaseUrl()}/dashboard?webflow_oauth=error&reason=token_exchange_failed`);
    }

    const tokenData = await tokenResp.json();
    const accessToken = tokenData.access_token as string | undefined;

    if (!accessToken) {
      console.error('[WEBFLOW CALLBACK] No access_token in response');
      return NextResponse.redirect(`${getBaseUrl()}/dashboard?webflow_oauth=error&reason=no_access_token`);
    }

    console.log('[WEBFLOW CALLBACK] Access token received');

    // Parse websiteId
    const numericWebsiteId = typeof websiteId === 'string' ? parseInt(websiteId, 10) : websiteId;

    // Create cms_connections record with status='pending_config'
    // This signals that OAuth is complete but setup wizard hasn't been completed
    console.log('[WEBFLOW CALLBACK] Creating cms_connection with pending_config status');
    const { data: connection, error: insertError } = await supabase
      .from('cms_connections')
      .insert({
        user_token: userToken,
        website_id: numericWebsiteId,
        connection_name: 'Webflow (Setup Pending)',
        cms_type: 'webflow',
        base_url: domain || '',
        api_token: accessToken,
        status: 'pending_config',
        auth_config: {}, // Will be populated by setup wizard
      })
      .select()
      .single();

    if (insertError || !connection) {
      console.error('[WEBFLOW CALLBACK] Failed to create connection:', insertError);
      return NextResponse.redirect(`${getBaseUrl()}/dashboard?webflow_oauth=error&reason=db_error`);
    }

    console.log('[WEBFLOW CALLBACK] Connection created with ID:', connection.id);

    // Redirect back to website page (no query params - we'll detect pending connection from database)
    const cleanDomain = encodeURIComponent(domain || '');
    const redirectUrl = domain
      ? `${getBaseUrl()}/website/${cleanDomain}`
      : `${getBaseUrl()}/dashboard`;

    console.log('[WEBFLOW CALLBACK] Redirecting to website page');
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('[WEBFLOW CALLBACK] Exception:', error);
    return NextResponse.redirect(`${getBaseUrl()}/dashboard?webflow_oauth=error&reason=server_error`);
  }
}
