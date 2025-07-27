import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log('[GSC CONNECTION] Checking connection status');
    
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    
    if (!userToken) {
      console.log('[GSC CONNECTION] No user token provided');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get GSC connection
    const { data: connection, error: connectionError } = await supabase
      .from('gsc_connections')
      .select('*')
      .eq('user_token', userToken)
      .eq('is_active', true)
      .single();

    if (connectionError || !connection) {
      console.log('[GSC CONNECTION] No active connection found');
      return NextResponse.json({
        connected: false,
        message: 'No Google Search Console connection found'
      });
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(connection.expires_at);
    const isExpired = now >= expiresAt;

    // Get properties count
    const { count: propertiesCount } = await supabase
      .from('gsc_properties')
      .select('*', { count: 'exact', head: true })
      .eq('connection_id', connection.id)
      .eq('is_active', true);

    console.log('[GSC CONNECTION] Connection found for user token:', userToken);

    return NextResponse.json({
      connected: true,
      connection: {
        id: connection.id,
        email: connection.email,
        connected_at: connection.created_at,
        last_sync_at: connection.last_sync_at,
        expires_at: connection.expires_at,
        is_expired: isExpired,
        properties_count: propertiesCount || 0,
        sync_errors: connection.sync_errors || []
      }
    });

  } catch (error) {
    console.error('[GSC CONNECTION] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to check connection status' }, 
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('[GSC CONNECTION] Disconnecting GSC');
    
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    
    if (!userToken) {
      console.log('[GSC CONNECTION] No user token provided');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Deactivate connection instead of deleting (to preserve data)
    const { error } = await supabase
      .from('gsc_connections')
      .update({ is_active: false })
      .eq('user_token', userToken);

    if (error) {
      console.error('[GSC CONNECTION] Error disconnecting:', error);
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
    }

    // Also deactivate all properties
    await supabase
      .from('gsc_properties')
      .update({ is_active: false })
      .eq('user_token', userToken);

    console.log('[GSC CONNECTION] Successfully disconnected for user token:', userToken);

    return NextResponse.json({
      success: true,
      message: 'Google Search Console disconnected successfully'
    });

  } catch (error) {
    console.error('[GSC CONNECTION] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect' }, 
      { status: 500 }
    );
  }
}