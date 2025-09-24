import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DomainQueryService } from '@/lib/database/DomainQueryService';

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
    const domain = searchParams.get('domain') || undefined;
    const websiteId = searchParams.get('websiteId') || undefined;


    // Step 2: Handle OAuth callback
    if (code && state) {
      return handleOAuthCallback(code, state);
    }

    // Step 1: Initiate OAuth flow
    // If no userToken, this is likely from Vercel marketplace - initiate anonymous flow
    return initiateOAuthFlow(userToken || undefined, { domain, websiteId });

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
async function initiateOAuthFlow(userToken?: string, opts?: { domain?: string; websiteId?: string }): Promise<NextResponse> {
  try {
    // Generate state for OAuth flow (embed optional context)
    const rawState = {
      userToken: userToken || 'anonymous',
      domain: opts?.domain || null,
      websiteId: opts?.websiteId || null,
      nonce: `${Date.now()}_${Math.random().toString(36).substring(7)}`
    };
    const state = Buffer.from(JSON.stringify(rawState)).toString('base64url');
    
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

    // Construct Vercel integration URL
    const redirectUri = process.env.VERCEL_OAUTH_REDIRECT_URI!;
    
    // Validate redirect URI is configured
    if (!redirectUri) {
      return NextResponse.json(
        { 
          error: 'VERCEL_OAUTH_REDIRECT_URI environment variable is required',
          setupRequired: true
        },
        { status: 500 }
      );
    }

    // Use Vercel integration URL instead of generic OAuth URL
    const oauthUrl = `https://vercel.com/integrations/seoagent/new?state=${encodeURIComponent(state)}`;

    console.log('[VERCEL OAUTH] Integration Configuration:', {
      integrationSlug: 'seoagent',
      redirectUri,
      state,
      oauthUrl
    });
    console.log('[VERCEL OAUTH] Redirecting to Vercel OAuth:', oauthUrl);

    // Handle marketplace vs dashboard flows differently
    const isMarketplaceFlow = !userToken;
    
    if (isMarketplaceFlow) {
      // Marketplace flow - redirect directly to Vercel OAuth
      console.log('[VERCEL OAUTH] Marketplace flow detected - redirecting to OAuth');
      return NextResponse.redirect(oauthUrl);
    } else {
      // Dashboard flow - return JSON for frontend to handle
      console.log('[VERCEL OAUTH] Dashboard flow detected - returning JSON');
      return NextResponse.json({
        success: true,
        message: 'OAuth flow initiated',
        oauthUrl,
        state
      });
    }

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

    // Verify OAuth credentials are properly configured
    if (!process.env.VERCEL_CLIENT_ID || !process.env.VERCEL_CLIENT_SECRET || 
        process.env.VERCEL_CLIENT_ID === 'your_vercel_client_id_here' ||
        process.env.VERCEL_CLIENT_SECRET === 'your_vercel_client_secret_here') {
      return NextResponse.json(
        { error: 'Vercel OAuth credentials not configured. Please set up your Vercel Integration first.' },
        { status: 500 }
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
        redirect_uri: process.env.VERCEL_OAUTH_REDIRECT_URI!
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
      const baseUrlForRedirect = new URL(process.env.VERCEL_OAUTH_REDIRECT_URI!).origin;
      const signupUrl = `${baseUrlForRedirect}/login?mode=signup&vercel_integration=${tempIntegrationId}&source=marketplace`;
      return NextResponse.redirect(signupUrl);
    }

    // Clean up OAuth state
    await supabase
      .from('oauth_states')
      .delete()
      .eq('state', state);

    // Try to decode state to extract optional domain and websiteId
    let decoded: any = null;
    try {
      decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    } catch {}

    const stateDomain = decoded?.domain || undefined;
    const stateWebsiteId = decoded?.websiteId || undefined;

    // Existing user flow - redirect to integration installation page
    const baseUrlForRedirect = new URL(process.env.VERCEL_OAUTH_REDIRECT_URI!).origin;
    const userToken = oauthState.user_token;
    const installUrl = `${baseUrlForRedirect}/vercel-integration?data=${encodeURIComponent(JSON.stringify(integrationData))}&userToken=${encodeURIComponent(userToken)}${stateDomain ? `&domain=${encodeURIComponent(stateDomain)}` : ''}${stateWebsiteId ? `&websiteId=${encodeURIComponent(stateWebsiteId)}` : ''}`;

    return NextResponse.redirect(installUrl);

  } catch (error) {
    console.error('[VERCEL OAUTH] Error handling callback:', error);
    
    // Redirect to error page
    const baseUrlForRedirect = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'production' ? 'https://seoagent.com' : 'http://localhost:3000');
    const errorUrl = `${baseUrlForRedirect}/dashboard/settings?tab=integrations&vercel_oauth=error&message=${encodeURIComponent('OAuth callback failed')}`;
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
      autoDeployment = false,
      // Optional hints to map this integration to a specific website
      domain,
      websiteId
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

    // Update hosting_status in websites table to reflect connected status
    try {
      const timestamp = new Date().toISOString();

      // 1) If websiteId provided, update that specific website row
      if (websiteId) {
        const idNum = Number(websiteId);
        if (!Number.isNaN(idNum) && Number.isFinite(idNum)) {
          console.log('[VERCEL OAUTH] Updating hosting_status by websiteId', { websiteId: idNum });
          const { error: byIdErr } = await supabase
            .from('websites')
            .update({ hosting_status: 'connected', last_status_check: timestamp })
            .eq('id', idNum)
            .eq('user_token', userToken);
          if (byIdErr) {
            console.error('[VERCEL OAUTH] Failed to update by websiteId:', byIdErr);
          } else {
            console.log('[VERCEL OAUTH] hosting_status updated by websiteId');
          }
          // Done
        } else {
          console.warn('[VERCEL OAUTH] Non-numeric websiteId provided; falling back to domain mapping');
          // fall through to domain path
          if (domain) {
            console.log('[VERCEL OAUTH] Resolving website by domain', { domain });
            const result = await DomainQueryService.findWebsiteByDomain(userToken, domain, 'id,domain');
            if (result.success && result.data?.id) {
              const { error: byDomainErr } = await supabase
                .from('websites')
                .update({ hosting_status: 'connected', last_status_check: timestamp })
                .eq('id', result.data.id)
                .eq('user_token', userToken);
              if (byDomainErr) {
                console.error('[VERCEL OAUTH] Failed to update by domain:', byDomainErr);
              } else {
                console.log('[VERCEL OAUTH] hosting_status updated by domain', { matchedDomain: result.matchedDomain });
              }
            } else {
              console.warn('[VERCEL OAUTH] No website matched provided domain');
            }
          }
        }
      }

      // 2) Else if domain provided, resolve and update
      else if (domain) {
        console.log('[VERCEL OAUTH] Resolving website by domain', { domain });
        const result = await DomainQueryService.findWebsiteByDomain(userToken, domain, 'id,domain');
        if (result.success && result.data?.id) {
          const { error: byDomainErr } = await supabase
            .from('websites')
            .update({ hosting_status: 'connected', last_status_check: timestamp })
            .eq('id', result.data.id)
            .eq('user_token', userToken);
          if (byDomainErr) {
            console.error('[VERCEL OAUTH] Failed to update by domain:', byDomainErr);
          } else {
            console.log('[VERCEL OAUTH] hosting_status updated by domain', { matchedDomain: result.matchedDomain });
          }
        } else {
          console.warn('[VERCEL OAUTH] No website matched provided domain');
        }
      }

      // 3) Else try to match via Vercel project domains
      else {
        console.log('[VERCEL OAUTH] Attempting to map integration to website via Vercel project domains');
        const teamParam = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
        const projectDetailsResp = await fetch(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}${teamParam}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!projectDetailsResp.ok) {
          const text = await projectDetailsResp.text().catch(() => '');
          console.warn('[VERCEL OAUTH] Could not fetch project details to map domain', { status: projectDetailsResp.status, text });
        } else {
          const project = await projectDetailsResp.json();
          // Try to get domains from project (different API versions may differ)
          const projectDomains: string[] = Array.from(new Set([
            ...(project?.link?.alias || []),
            ...(project?.domains || []),
            ...(project?.targets?.production?.alias || []),
            project?.name ? `${project.name}.vercel.app` : null
          ].filter(Boolean)));

          console.log('[VERCEL OAUTH] Project domains discovered', { count: projectDomains.length });

          if (projectDomains.length > 0) {
            // Load all websites for this user and try to match
            const { data: websites, error: sitesErr } = await supabase
              .from('websites')
              .select('id, domain')
              .eq('user_token', userToken);
            if (sitesErr) {
              console.error('[VERCEL OAUTH] Failed to load user websites for mapping', sitesErr);
            } else if (websites && websites.length > 0) {
              const normalize = (d: string) => String(d).replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/^sc-domain:/i, '').replace(/\/$/, '');
              const projectSet = new Set(projectDomains.map(normalize));
              const matches = websites.filter(w => projectSet.has(normalize(w.domain)));

              if (matches.length > 0) {
                const ids = matches.map(m => m.id);
                console.log('[VERCEL OAUTH] Matching websites found by domain', { ids, count: ids.length });
                const { error: bulkErr } = await supabase
                  .from('websites')
                  .update({ hosting_status: 'connected', last_status_check: timestamp })
                  .in('id', ids)
                  .eq('user_token', userToken);
                if (bulkErr) {
                  console.error('[VERCEL OAUTH] Failed bulk update of hosting_status:', bulkErr);
                } else {
                  console.log('[VERCEL OAUTH] hosting_status updated for matched websites');
                }
              } else {
                console.warn('[VERCEL OAUTH] No matching website domains found for project');
              }
            }
          }
        }
      }
    } catch (updateError) {
      console.error('[VERCEL OAUTH] Error updating website hosting_status:', updateError);
      // Continue with successful response
    }

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
