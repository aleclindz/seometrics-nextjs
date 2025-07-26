import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[GSC OAUTH REFRESH] Refreshing access token');
    
    // Get authenticated user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('[GSC OAUTH REFRESH] Authentication failed:', authError);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get existing connection
    const { data: connection, error: connectionError } = await supabase
      .from('gsc_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (connectionError || !connection) {
      console.log('[GSC OAUTH REFRESH] No active GSC connection found');
      return NextResponse.json({ error: 'No active GSC connection found' }, { status: 404 });
    }

    // Get OAuth credentials
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.log('[GSC OAUTH REFRESH] Missing OAuth credentials');
      return NextResponse.json({ error: 'OAuth credentials not configured' }, { status: 500 });
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret
    );

    // Set refresh token
    oauth2Client.setCredentials({
      refresh_token: connection.refresh_token
    });

    // Refresh the access token
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    if (!credentials.access_token) {
      console.log('[GSC OAUTH REFRESH] Failed to refresh access token');
      return NextResponse.json({ error: 'Failed to refresh token' }, { status: 500 });
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
      return NextResponse.json({ error: 'Failed to update token' }, { status: 500 });
    }

    console.log('[GSC OAUTH REFRESH] Successfully refreshed token for user:', user.id);
    
    return NextResponse.json({ 
      message: 'Token refreshed successfully',
      expires_at: expiresAt.toISOString()
    });

  } catch (error) {
    console.error('[GSC OAUTH REFRESH] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh token' }, 
      { status: 500 }
    );
  }
}