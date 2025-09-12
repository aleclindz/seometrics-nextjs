"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const UrlNormalizationService_1 = require("@/lib/UrlNormalizationService");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
// Helper function to find website by domain with URL variations
async function findWebsiteByDomain(userToken, domainInput) {
    // Generate URL variations to match different formats in database
    const variations = UrlNormalizationService_1.UrlNormalizationService.generateUrlVariations(domainInput);
    const searchTerms = [
        domainInput,
        variations.domainProperty, // sc-domain:example.com
        variations.httpsUrl, // https://example.com
        variations.httpUrl, // http://example.com
        variations.wwwHttpsUrl, // https://www.example.com
        variations.wwwHttpUrl // http://www.example.com
    ];
    for (const searchTerm of searchTerms) {
        const { data: website, error } = await supabaseAdmin
            .from('websites')
            .select('id')
            .eq('user_token', userToken)
            .eq('domain', searchTerm)
            .single();
        if (!error && website) {
            return website;
        }
    }
    return null;
}
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        const websiteId = searchParams.get('websiteId');
        if (!userToken) {
            return server_1.NextResponse.json({ success: false, error: 'User token required' }, { status: 400 });
        }
        console.log('[HOST CONNECTIONS] Fetching connections for user:', userToken);
        if (websiteId) {
            console.log('[HOST CONNECTIONS] Filtering by websiteId:', websiteId);
        }
        // Try to check if table exists first
        try {
            const tableCheck = await supabaseAdmin
                .from('host_connections')
                .select('count')
                .limit(1);
            if (tableCheck.error) {
                console.error('[HOST CONNECTIONS] Table check error:', tableCheck.error);
                if (tableCheck.error.code === '42P01' ||
                    tableCheck.error.message?.includes('relation') ||
                    tableCheck.error.message?.includes('does not exist')) {
                    console.log('[HOST CONNECTIONS] Table does not exist, returning empty state');
                    return server_1.NextResponse.json({
                        success: true,
                        connections: [],
                        message: 'Host connections feature not yet available - database migration required'
                    });
                }
            }
        }
        catch (tableError) {
            console.error('[HOST CONNECTIONS] Table check failed:', tableError);
            if (tableError.message?.includes('relation') ||
                tableError.message?.includes('does not exist') ||
                tableError.code === '42P01') {
                return server_1.NextResponse.json({
                    success: true,
                    connections: [],
                    message: 'Host connections not yet set up - migrations pending'
                });
            }
        }
        // Build query
        let query = supabaseAdmin
            .from('host_connections')
            .select('*')
            .eq('user_token', userToken)
            .order('created_at', { ascending: false });
        // Filter by website if specified
        if (websiteId) {
            // Check if websiteId is a domain string or an integer ID
            if (isNaN(parseInt(websiteId))) {
                // It's a domain string - find the website ID using URL variations
                const website = await findWebsiteByDomain(userToken, websiteId);
                if (!website) {
                    return server_1.NextResponse.json({
                        success: false,
                        error: `Website not found for domain: ${websiteId}`
                    }, { status: 404 });
                }
                query = query.eq('website_id', website.id);
            }
            else {
                // It's an integer ID
                query = query.eq('website_id', parseInt(websiteId));
            }
        }
        const { data: connections, error } = await query;
        if (error) {
            console.error('Error fetching host connections:', error);
            return server_1.NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }
        return server_1.NextResponse.json({
            success: true,
            connections: connections || []
        });
    }
    catch (error) {
        console.error('Host connections API error:', error);
        return server_1.NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
async function POST(request) {
    try {
        const body = await request.json();
        const { userToken, websiteId, hostType, connectionName, apiToken, teamId, projectId, projectName, domain, autoDeploy = false, buildCommand, outputDirectory = 'dist', nodeVersion = '18.x', environmentVariables = {} } = body;
        if (!userToken || !websiteId || !hostType || !connectionName) {
            return server_1.NextResponse.json({
                success: false,
                error: 'userToken, websiteId, hostType, and connectionName are required'
            }, { status: 400 });
        }
        // Resolve websiteId to actual website ID if it's a domain string
        let actualWebsiteId;
        if (isNaN(parseInt(websiteId))) {
            // It's a domain string - find the website ID using URL variations
            const website = await findWebsiteByDomain(userToken, websiteId);
            if (!website) {
                return server_1.NextResponse.json({
                    success: false,
                    error: `Website not found for domain: ${websiteId}`
                }, { status: 404 });
            }
            actualWebsiteId = website.id;
        }
        else {
            // It's an integer ID
            actualWebsiteId = parseInt(websiteId);
        }
        // Encrypt API token if provided (basic implementation)
        const encryptedApiToken = apiToken ? Buffer.from(apiToken).toString('base64') : null;
        const { data: connection, error } = await supabaseAdmin
            .from('host_connections')
            .insert({
            user_token: userToken,
            website_id: actualWebsiteId,
            host_type: hostType,
            connection_name: connectionName,
            api_token: encryptedApiToken,
            team_id: teamId,
            project_id: projectId,
            project_name: projectName,
            domain: domain,
            auto_deploy_enabled: autoDeploy,
            build_command: buildCommand,
            output_directory: outputDirectory,
            node_version: nodeVersion,
            environment_variables: environmentVariables,
            deployment_status: 'inactive',
            last_sync_at: new Date().toISOString()
        })
            .select()
            .single();
        if (error) {
            console.error('Error creating host connection:', error);
            return server_1.NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }
        return server_1.NextResponse.json({
            success: true,
            connection
        });
    }
    catch (error) {
        console.error('Host connection creation error:', error);
        return server_1.NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
async function PUT(request) {
    try {
        const body = await request.json();
        const { userToken, connectionId, deploymentStatus, lastDeploymentAt, errorMessage, configData = {} } = body;
        if (!userToken || !connectionId) {
            return server_1.NextResponse.json({
                success: false,
                error: 'userToken and connectionId are required'
            }, { status: 400 });
        }
        const updateData = {
            updated_at: new Date().toISOString()
        };
        if (deploymentStatus !== undefined)
            updateData.deployment_status = deploymentStatus;
        if (lastDeploymentAt)
            updateData.last_deployment_at = lastDeploymentAt;
        if (errorMessage !== undefined)
            updateData.error_message = errorMessage;
        if (configData)
            updateData.config_data = configData;
        const { data: connection, error } = await supabaseAdmin
            .from('host_connections')
            .update(updateData)
            .eq('id', connectionId)
            .eq('user_token', userToken)
            .select()
            .single();
        if (error) {
            console.error('Error updating host connection:', error);
            return server_1.NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }
        return server_1.NextResponse.json({
            success: true,
            connection
        });
    }
    catch (error) {
        console.error('Host connection update error:', error);
        return server_1.NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        const connectionId = searchParams.get('connectionId');
        if (!userToken || !connectionId) {
            return server_1.NextResponse.json({
                success: false,
                error: 'userToken and connectionId are required'
            }, { status: 400 });
        }
        const { error } = await supabaseAdmin
            .from('host_connections')
            .delete()
            .eq('id', connectionId)
            .eq('user_token', userToken);
        if (error) {
            console.error('Error deleting host connection:', error);
            return server_1.NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }
        return server_1.NextResponse.json({ success: true });
    }
    catch (error) {
        console.error('Host connection deletion error:', error);
        return server_1.NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
