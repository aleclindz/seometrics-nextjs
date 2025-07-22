import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');

    if (!userToken) {
      return NextResponse.json(
        { error: 'Missing userToken parameter' },
        { status: 400 }
      );
    }

    console.log('[CMS CONNECTIONS] Fetching connections for user:', userToken);

    // Check if cms_connections table exists first
    let connections = [];
    let error = null;
    
    try {
      // Get CMS connections with website domain
      const result = await supabase
        .from('cms_connections')
        .select(`
          *,
          websites!inner(domain)
        `)
        .eq('user_token', userToken)
        .order('created_at', { ascending: false });
      
      connections = result.data;
      error = result.error;
    } catch (tableError) {
      console.error('[CMS CONNECTIONS] Table access error (migrations may not be run):', tableError);
      // Return empty array if table doesn't exist yet
      return NextResponse.json({
        success: true,
        connections: [],
        message: 'CMS connections table not initialized yet'
      });
    }

    if (error) {
      console.error('[CMS CONNECTIONS] Database error:', error);
      
      // Handle specific error cases
      if (error.code === '42P01') { // Table doesn't exist
        return NextResponse.json({
          success: true,
          connections: [],
          message: 'CMS connections feature not yet set up'
        });
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch connections' },
        { status: 500 }
      );
    }

    // Format the response to include website domain
    const formattedConnections = connections.map(conn => ({
      ...conn,
      website_domain: conn.websites?.domain,
      websites: undefined // Remove the nested object
    }));

    console.log('[CMS CONNECTIONS] Found connections:', formattedConnections.length);

    return NextResponse.json({
      success: true,
      connections: formattedConnections
    });

  } catch (error) {
    console.error('[CMS CONNECTIONS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userToken,
      connection_name,
      website_id,
      cms_type,
      base_url,
      api_token,
      content_type
    } = body;

    if (!userToken || !connection_name || !website_id || !base_url || !api_token) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('[CMS CONNECTIONS] Creating connection:', connection_name);

    // Verify the website belongs to the user
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('id')
      .eq('id', website_id)
      .eq('user_token', userToken)
      .single();

    if (websiteError || !website) {
      return NextResponse.json(
        { error: 'Website not found or access denied' },
        { status: 404 }
      );
    }

    // Check for duplicate connection names
    const { data: existing } = await supabase
      .from('cms_connections')
      .select('id')
      .eq('user_token', userToken)
      .eq('website_id', website_id)
      .eq('connection_name', connection_name)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'A connection with this name already exists for this website' },
        { status: 409 }
      );
    }

    // Create the connection (API token should be encrypted in production)
    const { data: connection, error } = await supabase
      .from('cms_connections')
      .insert({
        user_token: userToken,
        website_id: parseInt(website_id),
        connection_name,
        cms_type,
        base_url: base_url.replace(/\/$/, ''), // Remove trailing slash
        api_token, // In production, encrypt this
        content_type: content_type || 'api::article::article',
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('[CMS CONNECTIONS] Insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create connection' },
        { status: 500 }
      );
    }

    console.log('[CMS CONNECTIONS] Created connection:', connection.id);

    return NextResponse.json({
      success: true,
      connection,
      message: 'CMS connection created successfully'
    });

  } catch (error) {
    console.error('[CMS CONNECTIONS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}