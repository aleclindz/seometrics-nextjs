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
      console.warn('[WPCOM CALLBACK] Provider returned error:', error);
      return NextResponse.redirect(`${getBaseUrl()}/dashboard?wpcom_oauth=error&reason=${encodeURIComponent(error)}`);
    }
    if (!code || !state) {
      console.error('[WPCOM CALLBACK] Missing code or state', { hasCode: Boolean(code), hasState: Boolean(state) });
      return NextResponse.redirect(`${getBaseUrl()}/dashboard?wpcom_oauth=error&reason=missing_code_or_state`);
    }

    let decoded: any = {};
    try { decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')); } catch (e) {
      console.error('[WPCOM CALLBACK] Failed to decode state', e);
    }
    const userToken = decoded.userToken as string | undefined;
    const domain = decoded.domain as string | undefined;
    let websiteId = decoded.websiteId as string | number | undefined;

    console.log('[WPCOM CALLBACK] Received params', {
      hasCode: Boolean(code),
      hasState: Boolean(state),
      userToken: userToken ? userToken.slice(0,8) + '...' : undefined,
      domain,
      websiteId
    });

    const clientId = process.env.WPCOM_CLIENT_ID;
    const clientSecret = process.env.WPCOM_CLIENT_SECRET;
    const redirectUri = process.env.WPCOM_REDIRECT_URI || `${getBaseUrl()}/api/cms/wordpress/oauth/callback`;
    if (!clientId || !clientSecret) {
      console.error('[WPCOM CALLBACK] Missing client credentials', { hasClientId: Boolean(clientId), hasClientSecret: Boolean(clientSecret) });
      return NextResponse.redirect(`${getBaseUrl()}/dashboard?wpcom_oauth=error&reason=not_configured`);
    }

    // Exchange code for token
    const body = new URLSearchParams();
    body.set('client_id', String(clientId));
    body.set('client_secret', clientSecret);
    body.set('redirect_uri', redirectUri);
    body.set('code', code);
    body.set('grant_type', 'authorization_code');

    console.log('[WPCOM CALLBACK] Exchanging code for token at token endpoint');
    const tokenResp = await fetch('https://public-api.wordpress.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    if (!tokenResp.ok) {
      const errText = await tokenResp.text().catch(() => '');
      console.error('[WPCOM CALLBACK] Token exchange failed', { status: tokenResp.status, errText });
      return NextResponse.redirect(`${getBaseUrl()}/dashboard?wpcom_oauth=error&reason=token_exchange_failed`);
    }
    const tokenData = await tokenResp.json();
    const accessToken = tokenData.access_token as string | undefined;
    if (!accessToken) {
      console.error('[WPCOM CALLBACK] No access_token in token response');
      return NextResponse.redirect(`${getBaseUrl()}/dashboard?wpcom_oauth=error&reason=no_access_token`);
    }
    console.log('[WPCOM CALLBACK] Token received', { tokenLen: accessToken.length });

    // Fetch sites for the user and try to match the provided domain
    let siteId: number | null = null;
    let siteUrl: string | null = null;
    try {
      console.log('[WPCOM CALLBACK] Fetching user sites to match domain');
      const sitesResp = await fetch('https://public-api.wordpress.com/rest/v1.1/me/sites', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (sitesResp.ok) {
        const sitesData = await sitesResp.json();
        const sites: any[] = sitesData?.sites || [];
        console.log('[WPCOM CALLBACK] Sites fetched', { count: sites.length });
        const normalize = (d: string) => d.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
        const desired = domain ? normalize(domain) : '';
        const found = sites.find((s: any) => normalize(s.URL) === desired || normalize(s.domain) === desired) || sites[0];
        if (found) { siteId = Number(found.ID); siteUrl = found.URL; }
        console.log('[WPCOM CALLBACK] Site match', { matched: Boolean(found), siteId, siteUrl });
      } else {
        const text = await sitesResp.text().catch(() => '');
        console.error('[WPCOM CALLBACK] Failed to fetch sites', { status: sitesResp.status, text });
      }
    } catch (e) { console.error('[WPCOM CALLBACK] Exception fetching sites', e); }

    // If we can't find the site, still complete auth but signal no site match
    if (!userToken) {
      console.warn('[WPCOM CALLBACK] Missing userToken in state, redirecting without persisting connection');
      return NextResponse.redirect(`${getBaseUrl()}/dashboard?wpcom_oauth=success&site=none`);
    }

    // Resolve websiteId if missing or invalid by looking up domain for this user
    if (siteUrl && userToken) {
      const parseId = (val: any) => (typeof val === 'string' ? parseInt(val, 10) : val);
      let numericWebsiteId = parseId(websiteId);
      if (!numericWebsiteId || Number.isNaN(numericWebsiteId)) {
        if (domain) {
          try {
            const clean = String(domain).replace(/^sc-domain:/i, '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
            const variants = [clean, `https://${clean}`, `sc-domain:${clean}`];
            console.log('[WPCOM CALLBACK] Resolving website by domain variants', { variants });
            const { data: w } = await supabase
              .from('websites')
              .select('id')
              .eq('user_token', userToken)
              .or(variants.map(v => `domain.eq.${v}`).join(','))
              .maybeSingle();
            if (w?.id) numericWebsiteId = w.id;
            console.log('[WPCOM CALLBACK] Resolved website id', { websiteId: numericWebsiteId });
          } catch (e) {
            console.log('[WPCOM CALLBACK] Failed to resolve website by domain');
          }
        }
      }

      if (numericWebsiteId) {
        // Insert connection with error handling
        console.log('[WPCOM CALLBACK] Inserting cms_connections row');
        const { error: insertError } = await supabase
          .from('cms_connections')
          .insert({
            user_token: userToken,
            website_id: numericWebsiteId,
            connection_name: 'WordPress.com',
            cms_type: 'wordpress_com',
            base_url: siteUrl.replace(/\/$/, ''),
            api_token: accessToken, // TODO: encrypt in production
            content_type: 'posts',
            status: 'active'
          });
        if (insertError) {
          console.error('[WPCOM CALLBACK] Failed to insert cms_connections:', insertError);
          await supabase
            .from('websites')
            .update({ cms_status: 'error', last_status_check: new Date().toISOString() })
            .eq('id', numericWebsiteId)
            .eq('user_token', userToken);
          console.log('[WPCOM CALLBACK] Updated website cms_status=error', { websiteId: numericWebsiteId });
        } else {
          // Update website cms_status connected
          const { error: updateErr } = await supabase
            .from('websites')
            .update({ cms_status: 'connected', last_status_check: new Date().toISOString() })
            .eq('id', numericWebsiteId)
            .eq('user_token', userToken);
          if (updateErr) {
            console.error('[WPCOM CALLBACK] Failed to update website cms_status:', updateErr);
          } else {
            console.log('[WPCOM CALLBACK] Updated website cms_status=connected', { websiteId: numericWebsiteId });
          }
        }
      } else {
        console.warn('[WPCOM CALLBACK] Could not resolve website ID to persist connection');
      }
    }

    // Redirect back to website page if we have domain
    if (domain) {
      const cleanDomain = encodeURIComponent(domain);
      console.log('[WPCOM CALLBACK] Redirecting back to website page', { domain });
      return NextResponse.redirect(`${getBaseUrl()}/website/${cleanDomain}?cms=connected`);
    }

    console.log('[WPCOM CALLBACK] Redirecting back to dashboard (no domain)');
    return NextResponse.redirect(`${getBaseUrl()}/dashboard?wpcom_oauth=success`);
  } catch (e) {
    console.error('[WPCOM CALLBACK] Unhandled exception', e);
    return NextResponse.redirect(`${getBaseUrl()}/dashboard?wpcom_oauth=error&reason=exception`);
  }
}
