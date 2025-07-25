import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CMSManager } from '@/lib/cms/cms-manager';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const cmsManager = new CMSManager();

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

    // Try to get CMS connections with robust error handling
    let connections = [];
    
    try {
      // First, try a simple query to check if table exists
      const tableCheck = await supabase
        .from('cms_connections')
        .select('count')
        .limit(1);
      
      if (tableCheck.error) {
        console.error('[CMS CONNECTIONS] Table check error:', tableCheck.error);
        
        // Handle specific database errors
        if (tableCheck.error.code === '42P01' || 
            tableCheck.error.message?.includes('relation') || 
            tableCheck.error.message?.includes('does not exist')) {
          console.log('[CMS CONNECTIONS] Table does not exist, returning empty state');
          return NextResponse.json({
            success: true,
            connections: [],
            message: 'CMS connections feature not yet available - database migration required'
          });
        }
        
        // Other database errors
        return NextResponse.json(
          { error: `Database error: ${tableCheck.error.message}` },
          { status: 500 }
        );
      }
      
      // Table exists, now get the actual connections
      const result = await supabase
        .from('cms_connections')
        .select(`
          *,
          websites!inner(domain)
        `)
        .eq('user_token', userToken)
        .order('created_at', { ascending: false });
      
      if (result.error) {
        console.error('[CMS CONNECTIONS] Query error:', result.error);
        return NextResponse.json(
          { error: `Failed to fetch connections: ${result.error.message}` },
          { status: 500 }
        );
      }
      
      connections = result.data || [];
      
    } catch (tableError: any) {
      console.error('[CMS CONNECTIONS] Unexpected error:', tableError);
      
      // Check if it's a table/relation error
      if (tableError.message?.includes('relation') || 
          tableError.message?.includes('does not exist') ||
          tableError.code === '42P01') {
        return NextResponse.json({
          success: true,
          connections: [],
          message: 'CMS connections not yet set up - migrations pending'
        });
      }
      
      return NextResponse.json(
        { error: `Unexpected error: ${tableError.message || 'Unknown error'}` },
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