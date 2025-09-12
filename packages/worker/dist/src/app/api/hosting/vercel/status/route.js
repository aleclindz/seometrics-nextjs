"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const VercelIntegration_1 = require("@/lib/hosting-providers/VercelIntegration");
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        const integrationId = searchParams.get('integrationId');
        const deploymentId = searchParams.get('deploymentId');
        if (!userToken || !integrationId) {
            return server_1.NextResponse.json({ error: 'Missing required parameters: userToken and integrationId' }, { status: 400 });
        }
        console.log(`[VERCEL STATUS] Checking status for integration ${integrationId}`);
        // Get integration from database
        const { data: integration, error: integrationError } = await supabase
            .from('hosting_integrations')
            .select('*')
            .eq('id', integrationId)
            .eq('user_token', userToken)
            .single();
        if (integrationError || !integration) {
            return server_1.NextResponse.json({ error: 'Integration not found' }, { status: 404 });
        }
        // Create Vercel integration instance
        const vercelIntegration = new VercelIntegration_1.VercelIntegration({
            accessToken: integration.api_credentials?.access_token || '',
            teamId: integration.api_credentials?.team_id,
            projectId: integration.api_credentials?.project_id || '',
            deploymentMethod: integration.configuration?.deployment_method || 'redirects',
            sitemapProxyUrl: integration.configuration?.sitemap_proxy_url || `${process.env.NEXT_PUBLIC_APP_URL}/api/seo-proxy/sitemap`,
            robotsProxyUrl: integration.configuration?.robots_proxy_url || `${process.env.NEXT_PUBLIC_APP_URL}/api/seo-proxy/robots`,
            autoDeployment: integration.configuration?.auto_deployment || false,
            targetEnvironments: integration.configuration?.target_environments || ['production']
        });
        let deploymentStatus = null;
        // If deployment ID provided, get specific deployment status
        if (deploymentId) {
            try {
                deploymentStatus = await vercelIntegration.getDeploymentStatus(deploymentId);
            }
            catch (error) {
                console.error('[VERCEL STATUS] Error fetching deployment status:', error);
                deploymentStatus = { error: 'Unable to fetch deployment status' };
            }
        }
        // Get recent deployments for the project
        let recentDeployments = null;
        try {
            const deploymentsResponse = await vercelIntegration.getProjectDeployments(10);
            recentDeployments = deploymentsResponse.deployments;
        }
        catch (error) {
            console.error('[VERCEL STATUS] Error fetching recent deployments:', error);
        }
        // Get project details
        let projectDetails = null;
        try {
            projectDetails = await vercelIntegration.getProject();
        }
        catch (error) {
            console.error('[VERCEL STATUS] Error fetching project details:', error);
        }
        return server_1.NextResponse.json({
            success: true,
            integration: {
                id: integration.id,
                status: integration.status,
                provider: integration.provider_name,
                deploymentMethod: integration.configuration?.deployment_method || 'redirects',
                lastDeploymentAt: integration.last_deployment_at,
                deploymentCount: integration.deployment_count,
                errorCount: integration.error_count,
                lastErrorMessage: integration.last_error_message,
                lastErrorAt: integration.last_error_at,
                configuration: {
                    sitemapUrl: integration.configuration?.sitemap_url,
                    robotsUrl: integration.configuration?.robots_url,
                    lastDeploymentId: integration.configuration?.last_deployment_id,
                    lastDeploymentUrl: integration.configuration?.last_deployment_url,
                    autoDeployment: integration.configuration?.auto_deployment || false,
                    targetEnvironments: integration.configuration?.target_environments || ['production']
                }
            },
            deployment: deploymentStatus,
            recentDeployments,
            project: projectDetails ? {
                id: projectDetails.id,
                name: projectDetails.name,
                framework: projectDetails.framework,
                accountId: projectDetails.accountId,
                createdAt: projectDetails.createdAt,
                gitRepository: projectDetails.gitRepository
            } : null
        });
    }
    catch (error) {
        console.error('[VERCEL STATUS] API error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error during status check' }, { status: 500 });
    }
}
async function POST(request) {
    try {
        const { userToken, integrationId, deploymentId } = await request.json();
        if (!userToken || !integrationId || !deploymentId) {
            return server_1.NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }
        console.log(`[VERCEL STATUS] Updating deployment status for ${deploymentId}`);
        // Get integration from database
        const { data: integration, error: integrationError } = await supabase
            .from('hosting_integrations')
            .select('*')
            .eq('id', integrationId)
            .eq('user_token', userToken)
            .single();
        if (integrationError || !integration) {
            return server_1.NextResponse.json({ error: 'Integration not found' }, { status: 404 });
        }
        // Create Vercel integration instance
        const vercelIntegration = new VercelIntegration_1.VercelIntegration({
            accessToken: integration.api_credentials?.access_token || '',
            teamId: integration.api_credentials?.team_id,
            projectId: integration.api_credentials?.project_id || '',
            deploymentMethod: integration.configuration?.deployment_method || 'redirects',
            sitemapProxyUrl: integration.configuration?.sitemap_proxy_url || `${process.env.NEXT_PUBLIC_APP_URL}/api/seo-proxy/sitemap`,
            robotsProxyUrl: integration.configuration?.robots_proxy_url || `${process.env.NEXT_PUBLIC_APP_URL}/api/seo-proxy/robots`,
            autoDeployment: integration.configuration?.auto_deployment || false,
            targetEnvironments: integration.configuration?.target_environments || ['production']
        });
        // Get fresh deployment status
        const deploymentStatus = await vercelIntegration.getDeploymentStatus(deploymentId);
        // Update integration based on deployment state
        let integrationUpdate = {
            updated_at: new Date().toISOString()
        };
        if (deploymentStatus.state === 'READY') {
            integrationUpdate.status = 'active';
            integrationUpdate.last_deployment_at = new Date().toISOString();
            integrationUpdate.configuration = {
                ...integration.configuration,
                last_deployment_id: deploymentStatus.uid,
                last_deployment_url: `https://${deploymentStatus.url}`
            };
        }
        else if (deploymentStatus.state === 'ERROR' || deploymentStatus.state === 'CANCELED') {
            integrationUpdate.status = 'error';
            integrationUpdate.last_error_message = `Deployment ${deploymentStatus.state.toLowerCase()}`;
            integrationUpdate.last_error_at = new Date().toISOString();
            integrationUpdate.error_count = (integration.error_count || 0) + 1;
        }
        else if (['BUILDING', 'INITIALIZING', 'QUEUED'].includes(deploymentStatus.state)) {
            integrationUpdate.status = 'deploying';
        }
        // Update integration in database
        await supabase
            .from('hosting_integrations')
            .update(integrationUpdate)
            .eq('id', integrationId);
        return server_1.NextResponse.json({
            success: true,
            deployment: {
                id: deploymentStatus.uid,
                name: deploymentStatus.name,
                url: deploymentStatus.url,
                state: deploymentStatus.state,
                created: deploymentStatus.created,
                type: deploymentStatus.type,
                target: deploymentStatus.target,
                inspectorUrl: deploymentStatus.inspectorUrl
            },
            integration: {
                status: integrationUpdate.status,
                lastDeploymentAt: integrationUpdate.last_deployment_at,
                errorCount: integrationUpdate.error_count,
                lastErrorMessage: integrationUpdate.last_error_message
            }
        });
    }
    catch (error) {
        console.error('[VERCEL STATUS] Update error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error during status update' }, { status: 500 });
    }
}
