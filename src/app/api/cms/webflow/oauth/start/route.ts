import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL || process.env.APP_URL || 'http://localhost:3000';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const domain = searchParams.get('domain');
    const websiteId = searchParams.get('websiteId');

    if (!userToken || !websiteId) {
      return NextResponse.json({ error: 'Missing userToken or websiteId' }, { status: 400 });
    }

    const clientId = process.env.WEBFLOW_CLIENT_ID;
    const redirectUri = `${getBaseUrl()}/api/cms/webflow/oauth/callback`;

    if (!clientId) {
      return NextResponse.json({ error: 'Webflow OAuth is not configured (missing WEBFLOW_CLIENT_ID)' }, { status: 500 });
    }

    console.log('[WEBFLOW START] Starting OAuth', {
      hasClientId: Boolean(clientId),
      redirectUri,
      userToken: userToken?.slice(0, 8) + '...',
      websiteId,
    });

    // Encode state with context
    const statePayload = { userToken, domain, websiteId };
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

    // Build Webflow OAuth URL
    const authorizeUrl = new URL('https://webflow.com/oauth/authorize');
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('scope', 'sites:read cms:read cms:write assets:read assets:write');
    authorizeUrl.searchParams.set('state', state);

    const redirectTo = authorizeUrl.toString();
    console.log('[WEBFLOW START] Redirecting to Webflow authorize URL');
    return NextResponse.redirect(redirectTo);
  } catch (error) {
    console.error('[WEBFLOW START] Exception starting OAuth:', error);
    return NextResponse.json({ error: 'Failed to start OAuth' }, { status: 500 });
  }
}
