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
      return NextResponse.redirect(`${getBaseUrl()}/dashboard?wpcom_oauth=error&reason=${encodeURIComponent(error)}`);
    }
    if (!code || !state) {
      return NextResponse.redirect(`${getBaseUrl()}/dashboard?wpcom_oauth=error&reason=missing_code_or_state`);
    }

    let decoded: any = {};
    try { decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')); } catch {}
    const userToken = decoded.userToken as string | undefined;
    const domain = decoded.domain as string | undefined;
    const websiteId = decoded.websiteId as string | number | undefined;

    const clientId = process.env.WPCOM_CLIENT_ID;
    const clientSecret = process.env.WPCOM_CLIENT_SECRET;
    const redirectUri = process.env.WPCOM_REDIRECT_URI || `${getBaseUrl()}/api/cms/wordpress/oauth/callback`;
    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${getBaseUrl()}/dashboard?wpcom_oauth=error&reason=not_configured`);
    }

    // Exchange code for token
    const body = new URLSearchParams();
    body.set('client_id', String(clientId));
    body.set('client_secret', clientSecret);
    body.set('redirect_uri', redirectUri);
    body.set('code', code);
    body.set('grant_type', 'authorization_code');

    const tokenResp = await fetch('https://public-api.wordpress.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    if (!tokenResp.ok) {
      return NextResponse.redirect(`${getBaseUrl()}/dashboard?wpcom_oauth=error&reason=token_exchange_failed`);
    }
    const tokenData = await tokenResp.json();
    const accessToken = tokenData.access_token as string | undefined;
    if (!accessToken) {
      return NextResponse.redirect(`${getBaseUrl()}/dashboard?wpcom_oauth=error&reason=no_access_token`);
    }

    // Fetch sites for the user and try to match the provided domain
    let siteId: number | null = null;
    let siteUrl: string | null = null;
    try {
      const sitesResp = await fetch('https://public-api.wordpress.com/rest/v1.1/me/sites', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (sitesResp.ok) {
        const sitesData = await sitesResp.json();
        const sites: any[] = sitesData?.sites || [];
        const normalize = (d: string) => d.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
        const desired = domain ? normalize(domain) : '';
        const found = sites.find((s: any) => normalize(s.URL) === desired || normalize(s.domain) === desired) || sites[0];
        if (found) { siteId = Number(found.ID); siteUrl = found.URL; }
      }
    } catch {}

    // If we can't find the site, still complete auth but signal no site match
    if (!userToken) {
      return NextResponse.redirect(`${getBaseUrl()}/dashboard?wpcom_oauth=success&site=none`);
    }

    // Persist connection if we have a websiteId and siteUrl
    if (siteUrl && websiteId) {
      await supabase
        .from('cms_connections')
        .insert({
          user_token: userToken,
          website_id: typeof websiteId === 'string' ? parseInt(websiteId) : websiteId,
          connection_name: 'WordPress.com',
          cms_type: 'wordpress_com',
          base_url: siteUrl.replace(/\/$/, ''),
          api_token: accessToken, // TODO: encrypt in production
          content_type: 'posts',
          status: 'active'
        });
      // Update website cms_status
      try {
        await supabase
          .from('websites')
          .update({ cms_status: 'connected', last_status_check: new Date().toISOString() })
          .eq('id', typeof websiteId === 'string' ? parseInt(websiteId) : websiteId)
          .eq('user_token', userToken);
      } catch {}
    }

    // Redirect back to website page if we have domain
    if (domain) {
      const cleanDomain = encodeURIComponent(domain);
      return NextResponse.redirect(`${getBaseUrl()}/website/${cleanDomain}?cms=connected`);
    }

    return NextResponse.redirect(`${getBaseUrl()}/dashboard?wpcom_oauth=success`);
  } catch (e) {
    return NextResponse.redirect(`${getBaseUrl()}/dashboard?wpcom_oauth=error&reason=exception`);
  }
}

