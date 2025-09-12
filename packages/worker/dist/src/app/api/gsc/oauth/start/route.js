"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const googleapis_1 = require("googleapis");
const supabase_js_1 = require("@supabase/supabase-js");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function GET(request) {
    try {
        console.log('[GSC OAUTH START] Starting OAuth flow');
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        if (!userToken) {
            console.log('[GSC OAUTH START] No user token provided');
            return server_1.NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        // Verify user exists in database
        const { data: loginUser, error: authError } = await supabase
            .from('login_users')
            .select('*')
            .eq('token', userToken)
            .single();
        if (authError || !loginUser) {
            console.log('[GSC OAUTH START] Authentication failed:', authError);
            return server_1.NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        // Get OAuth credentials from environment
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        // Force seoagent.com in production, ignore VERCEL_URL to avoid seometrics.ai redirects
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'production' ? 'https://seoagent.com' : 'http://localhost:3000');
        const redirectUri = `${baseUrl}/api/gsc/oauth/callback`;
        // Debug logging for environment variables
        console.log('[GSC OAUTH START] Environment check:', {
            hasClientId: !!clientId,
            hasClientSecret: !!clientSecret,
            clientIdPrefix: clientId ? clientId.substring(0, 10) + '...' : 'undefined',
            NODE_ENV: process.env.NODE_ENV,
            VERCEL_URL: process.env.VERCEL_URL,
            NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
            baseUrl,
            redirectUri
        });
        if (!clientId || !clientSecret) {
            console.log('[GSC OAUTH START] Missing OAuth credentials - clientId:', !!clientId, 'clientSecret:', !!clientSecret);
            return server_1.NextResponse.json({
                error: 'OAuth credentials not configured',
                debug: {
                    hasClientId: !!clientId,
                    hasClientSecret: !!clientSecret,
                    env: process.env.NODE_ENV
                }
            }, { status: 500 });
        }
        // Create OAuth2 client with explicit redirect URI to ensure no caching
        console.log('[GSC OAUTH START] Creating OAuth2 client with redirect URI:', redirectUri);
        const oauth2Client = new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUri);
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
        console.log('[GSC OAUTH START] Full auth URL:', authUrl);
        console.log('[GSC OAUTH START] Redirect URI being used:', redirectUri);
        // Return JSON with auth URL for frontend to handle redirect
        return server_1.NextResponse.json({
            success: true,
            authUrl: authUrl
        });
    }
    catch (error) {
        console.error('[GSC OAUTH START] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Failed to start OAuth flow' }, { status: 500 });
    }
}
