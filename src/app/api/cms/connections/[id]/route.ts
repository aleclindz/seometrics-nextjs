import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const connectionId = parseInt(params.id);
    const body = await request.json();
    const {
      userToken,
      connection_name,
      base_url,
      api_token,
      content_type
    } = body;

    if (!userToken || !connection_name || !base_url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('[CMS CONNECTIONS] Updating connection:', connectionId);

    // Verify the connection belongs to the user
    const { data: existingConnection, error: verifyError } = await supabase
      .from('cms_connections')
      .select('id')
      .eq('id', connectionId)
      .eq('user_token', userToken)
      .single();

    if (verifyError || !existingConnection) {
      return NextResponse.json(
        { error: 'Connection not found or access denied' },
        { status: 404 }
      );
    }

    // Update the connection
    const updateData: any = {
      connection_name,
      base_url: base_url.replace(/\/$/, ''), // Remove trailing slash
      content_type: content_type || 'api::article::article',
      updated_at: new Date().toISOString()
    };

    // Only update API token if provided (since it's a password field)
    if (api_token && api_token.trim() !== '') {
      updateData.api_token = api_token;
    }

    const { data: connection, error } = await supabase
      .from('cms_connections')
      .update(updateData)
      .eq('id', connectionId)
      .select()
      .single();

    if (error) {
      console.error('[CMS CONNECTIONS] Update error:', error);
      return NextResponse.json(
        { error: 'Failed to update connection' },
        { status: 500 }
      );
    }

    console.log('[CMS CONNECTIONS] Updated connection:', connection.id);

    return NextResponse.json({
      success: true,
      connection,
      message: 'CMS connection updated successfully'
    });

  } catch (error) {
    console.error('[CMS CONNECTIONS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const connectionId = parseInt(params.id);
    const body = await request.json();
    const { userToken } = body;

    if (!userToken) {
      return NextResponse.json(
        { error: 'Missing userToken' },
        { status: 400 }
      );
    }

    console.log('[CMS CONNECTIONS] Deleting connection:', connectionId);

    // Verify the connection belongs to the user
    const { data: existingConnection, error: verifyError } = await supabase
      .from('cms_connections')
      .select('id, connection_name')
      .eq('id', connectionId)
      .eq('user_token', userToken)
      .single();

    if (verifyError || !existingConnection) {
      return NextResponse.json(
        { error: 'Connection not found or access denied' },
        { status: 404 }
      );
    }

    // Check if there are any articles in the queue for this connection
    const { data: queueItems, error: queueError } = await supabase
      .from('article_queue')
      .select('id')
      .eq('cms_connection_id', connectionId)
      .in('status', ['pending', 'generating', 'publishing']);

    if (queueError) {
      console.error('[CMS CONNECTIONS] Queue check error:', queueError);
      return NextResponse.json(
        { error: 'Failed to check article queue' },
        { status: 500 }
      );
    }

    if (queueItems && queueItems.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete connection with pending articles in queue' },
        { status: 409 }
      );
    }

    // Delete the connection
    const { error } = await supabase
      .from('cms_connections')
      .delete()
      .eq('id', connectionId);

    if (error) {
      console.error('[CMS CONNECTIONS] Delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete connection' },
        { status: 500 }
      );
    }

    console.log('[CMS CONNECTIONS] Deleted connection:', existingConnection.connection_name);

    return NextResponse.json({
      success: true,
      message: 'CMS connection deleted successfully'
    });

  } catch (error) {
    console.error('[CMS CONNECTIONS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}