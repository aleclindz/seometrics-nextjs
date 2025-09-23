import { NextRequest, NextResponse } from 'next/server';

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL || process.env.APP_URL || 'http://localhost:3000';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const domain = searchParams.get('domain');
    const websiteId = searchParams.get('websiteId');

    if (!userToken) {
      return NextResponse.json({ error: 'Missing userToken' }, { status: 400 });
    }

    const clientId = process.env.WPCOM_CLIENT_ID;
    const redirectUri = process.env.WPCOM_REDIRECT_URI || `${getBaseUrl()}/api/cms/wordpress/oauth/callback`;

    if (!clientId) {
      return NextResponse.json({ error: 'WordPress.com OAuth is not configured (missing WPCOM_CLIENT_ID)' }, { status: 500 });
    }

    const statePayload = { userToken, domain, websiteId };
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

    const authorizeUrl = new URL('https://public-api.wordpress.com/oauth2/authorize');
    authorizeUrl.searchParams.set('client_id', String(clientId));
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('scope', 'global');
    authorizeUrl.searchParams.set('state', state);

    return NextResponse.redirect(authorizeUrl.toString());
  } catch (e) {
    return NextResponse.json({ error: 'Failed to start OAuth' }, { status: 500 });
  }
}

