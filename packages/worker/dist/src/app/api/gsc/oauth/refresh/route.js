"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.POST = POST;
const server_1 = require("next/server");
const googleapis_1 = require("googleapis");
const supabase_js_1 = require("@supabase/supabase-js");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function POST(request) {
    try {
        console.log('[GSC OAUTH REFRESH] Refreshing access token');
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        if (!userToken) {
            console.log('[GSC OAUTH REFRESH] No user token provided');
            return server_1.NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        // Get existing connection
        const { data: connection, error: connectionError } = await supabase
            .from('gsc_connections')
            .select('*')
            .eq('user_token', userToken)
            .eq('is_active', true)
            .single();
        if (connectionError || !connection) {
            console.log('[GSC OAUTH REFRESH] No active GSC connection found');
            return server_1.NextResponse.json({ error: 'No active GSC connection found' }, { status: 404 });
        }
        // Get OAuth credentials
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            console.log('[GSC OAUTH REFRESH] Missing OAuth credentials');
            return server_1.NextResponse.json({ error: 'OAuth credentials not configured' }, { status: 500 });
        }
        // Create OAuth2 client
        const oauth2Client = new googleapis_1.google.auth.OAuth2(clientId, clientSecret);
        // Set refresh token
        oauth2Client.setCredentials({
            refresh_token: connection.refresh_token
        });
        // Refresh the access token
        const { credentials } = await oauth2Client.refreshAccessToken();
        if (!credentials.access_token) {
            console.log('[GSC OAUTH REFRESH] Failed to refresh access token');
            return server_1.NextResponse.json({ error: 'Failed to refresh token' }, { status: 500 });
        }
        // Calculate new expiry time
        const expiresAt = new Date(Date.now() + (credentials.expiry_date || Date.now() + 3600 * 1000));
        // Update connection in database
        const { error: updateError } = await supabase
            .from('gsc_connections')
            .update({
            access_token: credentials.access_token,
            expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString()
        })
            .eq('id', connection.id);
        if (updateError) {
            console.error('[GSC OAUTH REFRESH] Database update error:', updateError);
            return server_1.NextResponse.json({ error: 'Failed to update token' }, { status: 500 });
        }
        console.log('[GSC OAUTH REFRESH] Successfully refreshed token for user:', userToken);
        return server_1.NextResponse.json({
            message: 'Token refreshed successfully',
            expires_at: expiresAt.toISOString()
        });
    }
    catch (error) {
        console.error('[GSC OAUTH REFRESH] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Failed to refresh token' }, { status: 500 });
    }
}
