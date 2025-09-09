import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Vercel OAuth Integration
 * 
 * This endpoint handles the OAuth flow for Vercel integration.
 * 
 * Step 1: GET - Initiate OAuth by redirecting to Vercel
 * Step 2: GET with code parameter - Handle OAuth callback
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const userToken = searchParams.get('userToken');

    // Step 2: Handle OAuth callback
    if (code && state) {
      return handleOAuthCallback(code, state);
    }

    // Step 1: Initiate OAuth flow
    // If no userToken, this is likely from Vercel marketplace - initiate anonymous flow
    return initiateOAuthFlow(userToken);

  } catch (error) {
    console.error('[VERCEL OAUTH] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error during OAuth flow' },
      { status: 500 }
    );
  }
}

/**
 * Initiate Vercel OAuth flow
 */
async function initiateOAuthFlow(userToken?: string): Promise<NextResponse> {
  try {
    // Generate state for OAuth flow
    const state = userToken 
      ? `${userToken}_${Date.now()}_${Math.random().toString(36).substring(7)}`
      : `anonymous_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Store OAuth state in database for security
    const { error } = await supabase
      .from('oauth_states')
      .insert({
        state,
        user_token: userToken || 'anonymous', // Use 'anonymous' instead of null to satisfy NOT NULL constraint
        provider: 'vercel',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('[VERCEL OAUTH] Error storing OAuth state:', error);
      return NextResponse.json(
        { error: 'Failed to initiate OAuth flow' },
        { status: 500 }
      );
    }

    // Construct Vercel OAuth URL
    const vercelClientId = process.env.VERCEL_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/hosting/vercel/oauth`;
    
    if (!vercelClientId) {
      return NextResponse.json(
        { error: 'Vercel OAuth not configured. Missing VERCEL_CLIENT_ID.' },
        { status: 500 }
      );
    }

    const oauthUrl = `https://vercel.com/oauth/authorize?` +
      `client_id=${vercelClientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=read:project,write:project&` +
      `state=${state}`;

    console.log('[VERCEL OAUTH] Redirecting to Vercel OAuth:', oauthUrl);

    // Always return JSON for programmatic handling
    // The frontend will handle the redirect
    return NextResponse.json({
      success: true,
      message: 'OAuth flow initiated',
      oauthUrl,
      state,
      isMarketplaceFlow: !userToken
    });

  } catch (error) {
    console.error('[VERCEL OAUTH] Error initiating OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}

/**
 * Handle OAuth callback from Vercel
 */
async function handleOAuthCallback(code: string, state: string): Promise<NextResponse> {
  try {
    console.log('[VERCEL OAUTH] Handling callback with code and state');

    // Verify state parameter
    const { data: oauthState, error: stateError } = await supabase
      .from('oauth_states')
      .select('*')
      .eq('state', state)
      .eq('provider', 'vercel')
      .gte('expires_at', new Date().toISOString())
      .single();

    if (stateError || !oauthState) {
      console.error('[VERCEL OAUTH] Invalid or expired state:', stateError);
      return NextResponse.json(
        { error: 'Invalid or expired OAuth state' },
        { status: 400 }
      );
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.vercel.com/v2/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: process.env.VERCEL_CLIENT_ID!,
        client_secret: process.env.VERCEL_CLIENT_SECRET!,
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/hosting/vercel/oauth`
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[VERCEL OAUTH] Token exchange failed:', errorText);
      return NextResponse.json(
        { error: 'Failed to exchange authorization code for access token' },
        { status: 400 }
      );
    }

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      console.error('[VERCEL OAUTH] No access token in response:', tokenData);
      return NextResponse.json(
        { error: 'No access token received from Vercel' },
        { status: 400 }
      );
    }

    // Get user and team information from Vercel
    const userResponse = await fetch('https://api.vercel.com/v2/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (!userResponse.ok) {
      console.error('[VERCEL OAUTH] Failed to get user info');
      return NextResponse.json(
        { error: 'Failed to get user information from Vercel' },
        { status: 400 }
      );
    }

    const userData = await userResponse.json();

    // Get user's projects (respect team scope when provided)
    const projectsUrl = tokenData.team_id 
      ? `https://api.vercel.com/v9/projects?teamId=${encodeURIComponent(tokenData.team_id)}`
      : 'https://api.vercel.com/v9/projects';
    const projectsResponse = await fetch(projectsUrl, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    let projects = [];
    if (projectsResponse.ok) {
      const projectsData = await projectsResponse.json();
      projects = projectsData.projects || [];
    }

    // Prepare integration data
    const integrationData = {
      provider: 'vercel',
      accessToken: tokenData.access_token,
      tokenType: tokenData.token_type,
      scope: tokenData.scope,
      teamId: tokenData.team_id || null,
      userId: userData.user?.id,
      username: userData.user?.username,
      email: userData.user?.email,
      projects: projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        framework: p.framework,
        accountId: p.accountId,
        createdAt: p.createdAt
      }))
    };

    console.log('[VERCEL OAUTH] OAuth flow completed successfully');

    // Check if this was an anonymous OAuth flow (from marketplace)
    const isAnonymousFlow = !oauthState.user_token || oauthState.user_token === 'anonymous';

    if (isAnonymousFlow) {
      // Store integration data temporarily for after user signs up/logs in
      const tempIntegrationId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      const { error: tempError } = await supabase
        .from('temp_integrations')
        .insert({
          temp_id: tempIntegrationId,
          integration_data: integrationData,
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
        });

      if (tempError) {
        console.error('[VERCEL OAUTH] Error storing temp integration:', tempError);
      }

      // Clean up OAuth state
      await supabase
        .from('oauth_states')
        .delete()
        .eq('state', state);

      // Redirect to signup/login with integration data
      const signupUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login?mode=signup&vercel_integration=${tempIntegrationId}&source=marketplace`;
      return NextResponse.redirect(signupUrl);
    }

    // Clean up OAuth state
    await supabase
      .from('oauth_states')
      .delete()
      .eq('state', state);

    // Existing user flow - redirect to dashboard
    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tab=integrations&vercel_oauth=success&data=${encodeURIComponent(JSON.stringify(integrationData))}`;

    return NextResponse.redirect(successUrl);

  } catch (error) {
    console.error('[VERCEL OAUTH] Error handling callback:', error);
    
    // Redirect to error page
    const errorUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tab=integrations&vercel_oauth=error&message=${encodeURIComponent('OAuth callback failed')}`;
    return NextResponse.redirect(errorUrl);
  }
}

/**
 * Create Vercel integration from OAuth data
 */
export async function POST(request: NextRequest) {
  try {
    const { 
      userToken,
      accessToken,
      teamId,
      projectId,
      projectName,
      deploymentMethod = 'redirects',
      autoDeployment = false
    } = await request.json();

    if (!userToken || !accessToken || !projectId) {
      return NextResponse.json(
        { error: 'Missing required parameters: userToken, accessToken, projectId' },
        { status: 400 }
      );
    }

    console.log('[VERCEL OAUTH] Creating integration for project:', projectId);

    // Create integration record in database
    const integrationData = {
      user_token: userToken,
      site_url: `${projectName || projectId}.vercel.app`, // Default, can be updated
      provider_name: 'vercel',
      integration_type: 'oauth',
      status: 'active',
      api_credentials: {
        access_token: accessToken,
        team_id: teamId,
        project_id: projectId
      },
      configuration: {
        deployment_method: deploymentMethod,
        sitemap_proxy_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/seo-proxy/sitemap`,
        robots_proxy_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/seo-proxy/robots`,
        auto_deployment: autoDeployment,
        target_environments: ['production']
      },
      capabilities_enabled: ['sitemap_deployment', 'robots_deployment'],
      deployment_count: 0,
      error_count: 0
    };

    const { data: integration, error } = await supabase
      .from('hosting_integrations')
      .insert(integrationData)
      .select()
      .single();

    if (error) {
      console.error('[VERCEL OAUTH] Error creating integration:', error);
      return NextResponse.json(
        { error: 'Failed to create Vercel integration' },
        { status: 500 }
      );
    }

    console.log('[VERCEL OAUTH] Integration created successfully:', integration.id);

    return NextResponse.json({
      success: true,
      message: 'Vercel integration created successfully',
      integration: {
        id: integration.id,
        provider: integration.provider_name,
        status: integration.status,
        projectId,
        projectName,
        deploymentMethod,
        createdAt: integration.created_at
      }
    });

  } catch (error) {
    console.error('[VERCEL OAUTH] Error creating integration:', error);
    return NextResponse.json(
      { error: 'Internal server error creating integration' },
      { status: 500 }
    );
  }
}
