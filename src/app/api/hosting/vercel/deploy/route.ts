import { NextRequest, NextResponse } from 'next/server';
import { VercelIntegration } from '@/lib/hosting-providers/VercelIntegration';
import { HostingProviderDatabase } from '@/lib/HostingProviderDatabase';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const {
      userToken,
      integrationId,
      domain,
      sitemapContent,
      robotsContent,
      llmsTxtContent,
      deploymentMethod = 'redirects'
    } = await request.json();

    if (!userToken || !integrationId || !domain || !sitemapContent || !robotsContent) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log(`[VERCEL DEPLOY] Starting deployment for ${domain} via ${deploymentMethod}`);

    // Get integration from database
    const { data: integration, error: integrationError } = await supabase
      .from('hosting_integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('user_token', userToken)
      .eq('status', 'active')
      .single();

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'Integration not found or inactive' },
        { status: 404 }
      );
    }

    // Create Vercel integration instance
    const vercelIntegration = new VercelIntegration({
      accessToken: integration.api_credentials?.access_token || '',
      teamId: integration.api_credentials?.team_id,
      projectId: integration.api_credentials?.project_id || '',
      deploymentMethod: deploymentMethod,
      sitemapProxyUrl: integration.configuration?.sitemap_proxy_url || `${process.env.NEXT_PUBLIC_APP_URL}/api/seo-proxy/sitemap`,
      robotsProxyUrl: integration.configuration?.robots_proxy_url || `${process.env.NEXT_PUBLIC_APP_URL}/api/seo-proxy/robots`,
      autoDeployment: integration.configuration?.auto_deployment || false,
      targetEnvironments: integration.configuration?.target_environments || ['production']
    });

    // Update integration status to deploying
    await supabase
      .from('hosting_integrations')
      .update({ 
        status: 'deploying',
        updated_at: new Date().toISOString()
      })
      .eq('id', integrationId);

    try {
      // Perform deployment
      const deploymentResult = await vercelIntegration.deploySEOFiles(
        domain,
        sitemapContent,
        robotsContent,
        userToken,
        llmsTxtContent
      );

      if (deploymentResult.success) {
        // Record successful deployment
        await HostingProviderDatabase.recordDeployment(integrationId);
        
        // Update integration status
        await supabase
          .from('hosting_integrations')
          .update({ 
            status: 'active',
            last_deployment_at: new Date().toISOString(),
            configuration: {
              ...integration.configuration,
              last_deployment_id: deploymentResult.deploymentId,
              last_deployment_url: deploymentResult.deploymentUrl,
              sitemap_url: deploymentResult.sitemapUrl,
              robots_url: deploymentResult.robotsUrl
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', integrationId);

        return NextResponse.json({
          success: true,
          deployment: {
            id: deploymentResult.deploymentId,
            url: deploymentResult.deploymentUrl,
            sitemapUrl: deploymentResult.sitemapUrl,
            robotsUrl: deploymentResult.robotsUrl,
            method: deploymentResult.method,
            duration: deploymentResult.duration,
            logs: deploymentResult.logs
          }
        });

      } else {
        // Update integration with error
        await HostingProviderDatabase.updateIntegrationStatus(
          integrationId,
          'error',
          deploymentResult.error || 'Deployment failed'
        );

        return NextResponse.json(
          { 
            success: false, 
            error: deploymentResult.error || 'Deployment failed',
            method: deploymentResult.method,
            duration: deploymentResult.duration
          },
          { status: 500 }
        );
      }

    } catch (deploymentError) {
      console.error('[VERCEL DEPLOY] Deployment error:', deploymentError);
      
      // Update integration with error
      const errorMessage = deploymentError instanceof Error 
        ? deploymentError.message 
        : 'Unknown deployment error';
        
      await HostingProviderDatabase.updateIntegrationStatus(
        integrationId,
        'error',
        errorMessage
      );

      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[VERCEL DEPLOY] API error:', error);
    return NextResponse.json(
      { error: 'Internal server error during deployment' },
      { status: 500 }
    );
  }
}