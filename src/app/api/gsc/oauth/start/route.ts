import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log('[GSC OAUTH START] Starting OAuth flow');
    
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    
    if (!userToken) {
      console.log('[GSC OAUTH START] No user token provided');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify user exists in database
    const { data: loginUser, error: authError } = await supabase
      .from('login_users')
      .select('*')
      .eq('token', userToken)
      .single();
    
    if (authError || !loginUser) {
      console.log('[GSC OAUTH START] Authentication failed:', authError);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get OAuth credentials from environment
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.NODE_ENV === 'production' ? 'https://seoagent.com' : 'http://localhost:3000');
    const redirectUri = `${baseUrl}/api/gsc/oauth/callback`;
    
    // Debug logging for environment variables
    console.log('[GSC OAUTH START] Environment check:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      clientIdPrefix: clientId ? clientId.substring(0, 10) + '...' : 'undefined',
      baseUrl,
      redirectUri
    });
    
    if (!clientId || !clientSecret) {
      console.log('[GSC OAUTH START] Missing OAuth credentials - clientId:', !!clientId, 'clientSecret:', !!clientSecret);
      return NextResponse.json({ 
        error: 'OAuth credentials not configured',
        debug: {
          hasClientId: !!clientId,
          hasClientSecret: !!clientSecret,
          env: process.env.NODE_ENV
        }
      }, { status: 500 });
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Define scopes for Search Console full access (needed for sitemap submission)
    const scopes = [
      'https://www.googleapis.com/auth/webmasters',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    // Generate auth URL with state parameter for security
    const state = Buffer.from(JSON.stringify({ 
      userToken: userToken,
      timestamp: Date.now() 
    })).toString('base64');

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: state,
      prompt: 'consent' // Force consent to get refresh token
    });

    console.log('[GSC OAUTH START] Generated auth URL for user:', loginUser.email);
    
    return NextResponse.json({ 
      authUrl,
      message: 'Redirect to Google OAuth'
    });

  } catch (error) {
    console.error('[GSC OAUTH START] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to start OAuth flow' }, 
      { status: 500 }
    );
  }
}