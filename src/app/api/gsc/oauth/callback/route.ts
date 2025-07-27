import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to get the correct base URL
function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
}

export async function GET(request: NextRequest) {
  try {
    console.log('[GSC OAUTH CALLBACK] Processing OAuth callback');
    
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.log('[GSC OAUTH CALLBACK] OAuth error:', error);
      return NextResponse.redirect(`${getBaseUrl()}/autopilot?error=oauth_denied`);
    }

    if (!code || !state) {
      console.log('[GSC OAUTH CALLBACK] Missing code or state parameter');
      return NextResponse.redirect(`${getBaseUrl()}/autopilot?error=invalid_request`);
    }

    // Verify state parameter
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch (e) {
      console.log('[GSC OAUTH CALLBACK] Invalid state parameter');
      return NextResponse.redirect(`${getBaseUrl()}/autopilot?error=invalid_state`);
    }

    const { userToken } = stateData;

    // Get OAuth credentials
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const baseUrl = getBaseUrl();
    const redirectUri = `${baseUrl}/api/gsc/oauth/callback`;
    
    if (!clientId || !clientSecret) {
      console.log('[GSC OAUTH CALLBACK] Missing OAuth credentials');
      return NextResponse.redirect(`${baseUrl}/autopilot?error=server_error`);
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token || !tokens.refresh_token) {
      console.log('[GSC OAUTH CALLBACK] Missing required tokens');
      return NextResponse.redirect(`${baseUrl}/autopilot?error=token_error`);
    }

    // Set credentials to get user info
    oauth2Client.setCredentials(tokens);
    
    // Get user email from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email;

    if (!email) {
      console.log('[GSC OAUTH CALLBACK] Unable to get user email');
      return NextResponse.redirect(`${baseUrl}/autopilot?error=email_error`);
    }

    // Verify user exists in database
    const { data: loginUser, error: authError } = await supabase
      .from('login_users')
      .select('*')
      .eq('token', userToken)
      .single();
    
    if (authError || !loginUser) {
      console.log('[GSC OAUTH CALLBACK] Authentication failed or user not found');
      return NextResponse.redirect(`${getBaseUrl()}/login?error=auth_required`);
    }

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + (tokens.expiry_date || Date.now() + 3600 * 1000));

    // Store connection in database
    const { data: connection, error: dbError } = await supabase
      .from('gsc_connections')
      .upsert({
        user_token: userToken,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt.toISOString(),
        email: email,
        scope: 'https://www.googleapis.com/auth/webmasters.readonly',
        is_active: true,
        last_sync_at: null,
        sync_errors: []
      }, {
        onConflict: 'user_token'
      })
      .select()
      .single();

    if (dbError) {
      console.error('[GSC OAUTH CALLBACK] Database error:', dbError);
      return NextResponse.redirect(`${getBaseUrl()}/autopilot?error=db_error`);
    }

    console.log('[GSC OAUTH CALLBACK] Successfully stored GSC connection for user:', loginUser.email);
    
    // Redirect to autopilot page with success
    return NextResponse.redirect(`${getBaseUrl()}/autopilot?gsc_connected=true`);

  } catch (error) {
    console.error('[GSC OAUTH CALLBACK] Unexpected error:', error);
    return NextResponse.redirect(`${getBaseUrl()}/autopilot?error=unexpected`);
  }
}