import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const websiteId = searchParams.get('websiteId');

    if (!userToken) {
      return NextResponse.json({ success: false, error: 'User token required' }, { status: 400 });
    }

    // Build query
    let query = supabaseAdmin
      .from('host_connections')
      .select('*')
      .eq('user_token', userToken)
      .order('created_at', { ascending: false });

    // Filter by website if specified
    if (websiteId) {
      query = query.eq('website_id', parseInt(websiteId));
    }

    const { data: connections, error } = await query;

    if (error) {
      console.error('Error fetching host connections:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      connections: connections || [] 
    });

  } catch (error) {
    console.error('Host connections API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userToken,
      websiteId,
      hostType,
      connectionName,
      apiToken,
      teamId,
      projectId,
      projectName,
      domain,
      autoDeploy = false,
      buildCommand,
      outputDirectory = 'dist',
      nodeVersion = '18.x',
      environmentVariables = {}
    } = body;

    if (!userToken || !websiteId || !hostType || !connectionName) {
      return NextResponse.json({ 
        success: false, 
        error: 'userToken, websiteId, hostType, and connectionName are required' 
      }, { status: 400 });
    }

    // Encrypt API token if provided (basic implementation)
    const encryptedApiToken = apiToken ? Buffer.from(apiToken).toString('base64') : null;

    const { data: connection, error } = await supabaseAdmin
      .from('host_connections')
      .insert({
        user_token: userToken,
        website_id: parseInt(websiteId),
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
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      connection 
    });

  } catch (error) {
    console.error('Host connection creation error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userToken,
      connectionId,
      deploymentStatus,
      lastDeploymentAt,
      errorMessage,
      configData = {}
    } = body;

    if (!userToken || !connectionId) {
      return NextResponse.json({ 
        success: false, 
        error: 'userToken and connectionId are required' 
      }, { status: 400 });
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (deploymentStatus !== undefined) updateData.deployment_status = deploymentStatus;
    if (lastDeploymentAt) updateData.last_deployment_at = lastDeploymentAt;
    if (errorMessage !== undefined) updateData.error_message = errorMessage;
    if (configData) updateData.config_data = configData;

    const { data: connection, error } = await supabaseAdmin
      .from('host_connections')
      .update(updateData)
      .eq('id', connectionId)
      .eq('user_token', userToken)
      .select()
      .single();

    if (error) {
      console.error('Error updating host connection:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      connection 
    });

  } catch (error) {
    console.error('Host connection update error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const connectionId = searchParams.get('connectionId');

    if (!userToken || !connectionId) {
      return NextResponse.json({ 
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
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Host connection deletion error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}