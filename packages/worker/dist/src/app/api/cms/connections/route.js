"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const cms_manager_1 = require("@/lib/cms/cms-manager");
const DomainQueryService_1 = require("@/lib/database/DomainQueryService");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const cmsManager = new cms_manager_1.CMSManager();
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        const domain = searchParams.get('domain'); // Optional domain filter
        if (!userToken) {
            return server_1.NextResponse.json({ error: 'Missing userToken parameter' }, { status: 400 });
        }
        console.log('[CMS CONNECTIONS] Fetching connections for user:', userToken);
        if (domain) {
            console.log('[CMS CONNECTIONS] Filtering by domain:', domain);
        }
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
                    return server_1.NextResponse.json({
                        success: true,
                        connections: [],
                        message: 'CMS connections feature not yet available - database migration required'
                    });
                }
                // Other database errors
                return server_1.NextResponse.json({ error: `Database error: ${tableCheck.error.message}` }, { status: 500 });
            }
            // Table exists, now get the actual connections
            let query = supabase
                .from('cms_connections')
                .select(`
          *,
          websites!inner(domain)
        `)
                .eq('user_token', userToken);
            // If domain is specified, filter by it - first find the website to get correct domain format
            if (domain) {
                const websiteResult = await DomainQueryService_1.DomainQueryService.findWebsiteByDomain(userToken, domain, 'id');
                if (!websiteResult.success) {
                    return server_1.NextResponse.json({
                        success: true,
                        connections: [], // No connections for non-existent website
                        message: `No website found for domain: ${domain}`
                    });
                }
                // Filter by the specific website ID instead of domain
                query = query.eq('website_id', websiteResult.data.id);
            }
            const result = await query.order('created_at', { ascending: false });
            if (result.error) {
                console.error('[CMS CONNECTIONS] Query error:', result.error);
                return server_1.NextResponse.json({ error: `Failed to fetch connections: ${result.error.message}` }, { status: 500 });
            }
            connections = result.data || [];
        }
        catch (tableError) {
            console.error('[CMS CONNECTIONS] Unexpected error:', tableError);
            // Check if it's a table/relation error
            if (tableError.message?.includes('relation') ||
                tableError.message?.includes('does not exist') ||
                tableError.code === '42P01') {
                return server_1.NextResponse.json({
                    success: true,
                    connections: [],
                    message: 'CMS connections not yet set up - migrations pending'
                });
            }
            return server_1.NextResponse.json({ error: `Unexpected error: ${tableError.message || 'Unknown error'}` }, { status: 500 });
        }
        // Format the response to include website domain
        const formattedConnections = connections.map(conn => ({
            ...conn,
            website_domain: conn.websites?.domain,
            websites: undefined // Remove the nested object
        }));
        console.log('[CMS CONNECTIONS] Found connections:', formattedConnections.length);
        return server_1.NextResponse.json({
            success: true,
            connections: formattedConnections
        });
    }
    catch (error) {
        console.error('[CMS CONNECTIONS] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
async function POST(request) {
    try {
        const body = await request.json();
        const { userToken, connection_name, website_id, cms_type, base_url, api_token, content_type } = body;
        if (!userToken || !connection_name || !website_id || !base_url || !api_token) {
            return server_1.NextResponse.json({ error: 'Missing required fields: userToken, connection_name, website_id, base_url, api_token' }, { status: 400 });
        }
        console.log('[CMS CONNECTIONS] Creating connection:', connection_name);
        console.log('[CMS CONNECTIONS] website_id received:', website_id, typeof website_id);
        // Verify the website belongs to the user (website_id should be numeric database ID)
        const { data: website, error: websiteError } = await supabase
            .from('websites')
            .select('id, domain')
            .eq('id', parseInt(website_id))
            .eq('user_token', userToken)
            .single();
        if (websiteError || !website) {
            console.error('[CMS CONNECTIONS] Website lookup failed:', websiteError);
            return server_1.NextResponse.json({ error: 'Website not found or access denied' }, { status: 404 });
        }
        // Check for existing connection for this website (enforce one connection per website)
        const { data: existingConnection } = await supabase
            .from('cms_connections')
            .select('id, connection_name, status')
            .eq('user_token', userToken)
            .eq('website_id', parseInt(website_id))
            .single();
        if (existingConnection) {
            return server_1.NextResponse.json({
                error: `This website already has a CMS connection named "${existingConnection.connection_name}". Only one CMS connection per website is allowed.`,
                existingConnection: {
                    name: existingConnection.connection_name,
                    status: existingConnection.status
                }
            }, { status: 409 });
        }
        // Create the connection (API token should be encrypted in production)
        const { data: connection, error } = await supabase
            .from('cms_connections')
            .insert({
            user_token: userToken,
            website_id: parseInt(website_id), // Use the numeric database ID
            connection_name,
            cms_type,
            base_url: base_url.replace(/\/$/, ''), // Remove trailing slash
            api_token, // In production, encrypt this
            content_type: content_type || 'api::blog-post.blog-post',
            status: 'active'
        })
            .select()
            .single();
        if (error) {
            console.error('[CMS CONNECTIONS] Insert error:', error);
            return server_1.NextResponse.json({ error: 'Failed to create connection' }, { status: 500 });
        }
        console.log('[CMS CONNECTIONS] Created connection:', connection.id);
        return server_1.NextResponse.json({
            success: true,
            connection,
            message: 'CMS connection created successfully'
        });
    }
    catch (error) {
        console.error('[CMS CONNECTIONS] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        const connectionId = searchParams.get('connectionId');
        if (!userToken || !connectionId) {
            return server_1.NextResponse.json({ error: 'Missing userToken or connectionId parameter' }, { status: 400 });
        }
        console.log('[CMS CONNECTIONS] Deleting connection:', connectionId);
        // Verify the connection belongs to the user
        const { data: connection, error: fetchError } = await supabase
            .from('cms_connections')
            .select('id, connection_name')
            .eq('id', connectionId)
            .eq('user_token', userToken)
            .single();
        if (fetchError || !connection) {
            return server_1.NextResponse.json({ error: 'Connection not found or access denied' }, { status: 404 });
        }
        // Delete the connection
        const { error: deleteError } = await supabase
            .from('cms_connections')
            .delete()
            .eq('id', connectionId)
            .eq('user_token', userToken);
        if (deleteError) {
            console.error('[CMS CONNECTIONS] Delete error:', deleteError);
            return server_1.NextResponse.json({ error: 'Failed to delete connection' }, { status: 500 });
        }
        console.log('[CMS CONNECTIONS] Deleted connection:', connection.connection_name);
        return server_1.NextResponse.json({
            success: true,
            message: `CMS connection "${connection.connection_name}" deleted successfully`
        });
    }
    catch (error) {
        console.error('[CMS CONNECTIONS] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
