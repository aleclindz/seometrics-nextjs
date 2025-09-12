"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const crypto_1 = __importDefault(require("crypto"));
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
/**
 * Vercel Webhook Handler
 *
 * Receives deployment status updates from Vercel and updates
 * integration status in the database accordingly.
 *
 * Webhook Events:
 * - deployment.created
 * - deployment.ready
 * - deployment.error
 * - deployment.canceled
 */
async function POST(request) {
    try {
        const body = await request.text();
        const signature = request.headers.get('x-vercel-signature');
        // Verify webhook signature if secret is configured
        if (process.env.VERCEL_WEBHOOK_SECRET && signature) {
            const expectedSignature = crypto_1.default
                .createHmac('sha256', process.env.VERCEL_WEBHOOK_SECRET)
                .update(body)
                .digest('hex');
            if (signature !== `sha256=${expectedSignature}`) {
                console.error('[VERCEL WEBHOOK] Invalid signature');
                return server_1.NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
            }
        }
        const event = JSON.parse(body);
        const { type, payload } = event;
        console.log(`[VERCEL WEBHOOK] Received event: ${type}`, {
            deploymentId: payload?.deployment?.uid,
            projectId: payload?.project?.id,
            state: payload?.deployment?.state
        });
        // Only process deployment events
        if (!type.startsWith('deployment.')) {
            return server_1.NextResponse.json({ message: 'Event ignored' });
        }
        const deployment = payload?.deployment;
        const project = payload?.project;
        if (!deployment || !project) {
            console.error('[VERCEL WEBHOOK] Missing deployment or project data');
            return server_1.NextResponse.json({ error: 'Missing required data' }, { status: 400 });
        }
        // Find integrations for this project
        const { data: integrations, error: integrationError } = await supabase
            .from('hosting_integrations')
            .select('*')
            .eq('provider_name', 'vercel')
            .eq('status', 'active');
        if (integrationError) {
            console.error('[VERCEL WEBHOOK] Error fetching integrations:', integrationError);
            return server_1.NextResponse.json({ error: 'Database error' }, { status: 500 });
        }
        // Filter integrations that match this project
        const matchingIntegrations = integrations?.filter(integration => integration.api_credentials?.project_id === project.id) || [];
        if (matchingIntegrations.length === 0) {
            console.log('[VERCEL WEBHOOK] No matching integrations found for project:', project.id);
            return server_1.NextResponse.json({ message: 'No matching integrations' });
        }
        // Process each matching integration
        for (const integration of matchingIntegrations) {
            await processDeploymentEvent(type, deployment, project, integration);
        }
        return server_1.NextResponse.json({
            success: true,
            message: `Processed ${type} for ${matchingIntegrations.length} integration(s)`
        });
    }
    catch (error) {
        console.error('[VERCEL WEBHOOK] Error processing webhook:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
/**
 * Process deployment event for a specific integration
 */
async function processDeploymentEvent(eventType, deployment, project, integration) {
    try {
        const deploymentId = deployment.uid;
        const deploymentUrl = deployment.url;
        const deploymentState = deployment.state;
        let integrationUpdate = {
            updated_at: new Date().toISOString()
        };
        // Check if this deployment is SEOAgent-related (has our metadata)
        const isSEODeployment = deployment.meta?.seoagent === 'true' ||
            deployment.name?.includes('seo-') ||
            deployment.meta?.generatedBy === 'seoagent';
        if (!isSEODeployment) {
            console.log('[VERCEL WEBHOOK] Ignoring non-SEO deployment:', deploymentId);
            return;
        }
        switch (eventType) {
            case 'deployment.created':
                integrationUpdate.status = 'deploying';
                integrationUpdate.configuration = {
                    ...integration.configuration,
                    last_deployment_id: deploymentId,
                    deployment_state: 'BUILDING'
                };
                console.log(`[VERCEL WEBHOOK] Deployment created: ${deploymentId}`);
                break;
            case 'deployment.ready':
                integrationUpdate.status = 'active';
                integrationUpdate.last_deployment_at = new Date().toISOString();
                integrationUpdate.deployment_count = (integration.deployment_count || 0) + 1;
                integrationUpdate.configuration = {
                    ...integration.configuration,
                    last_deployment_id: deploymentId,
                    last_deployment_url: `https://${deploymentUrl}`,
                    deployment_state: 'READY',
                    sitemap_url: `https://${deploymentUrl}/sitemap.xml`,
                    robots_url: `https://${deploymentUrl}/robots.txt`
                };
                console.log(`[VERCEL WEBHOOK] Deployment ready: ${deploymentId} -> https://${deploymentUrl}`);
                break;
            case 'deployment.error':
                integrationUpdate.status = 'error';
                integrationUpdate.last_error_message = `Deployment failed: ${deployment.errorMessage || 'Unknown error'}`;
                integrationUpdate.last_error_at = new Date().toISOString();
                integrationUpdate.error_count = (integration.error_count || 0) + 1;
                integrationUpdate.configuration = {
                    ...integration.configuration,
                    last_deployment_id: deploymentId,
                    deployment_state: 'ERROR'
                };
                console.log(`[VERCEL WEBHOOK] Deployment error: ${deploymentId}`);
                break;
            case 'deployment.canceled':
                integrationUpdate.status = 'error';
                integrationUpdate.last_error_message = 'Deployment was canceled';
                integrationUpdate.last_error_at = new Date().toISOString();
                integrationUpdate.error_count = (integration.error_count || 0) + 1;
                integrationUpdate.configuration = {
                    ...integration.configuration,
                    last_deployment_id: deploymentId,
                    deployment_state: 'CANCELED'
                };
                console.log(`[VERCEL WEBHOOK] Deployment canceled: ${deploymentId}`);
                break;
            default:
                console.log(`[VERCEL WEBHOOK] Unhandled event type: ${eventType}`);
                return;
        }
        // Update integration in database
        const { error: updateError } = await supabase
            .from('hosting_integrations')
            .update(integrationUpdate)
            .eq('id', integration.id);
        if (updateError) {
            console.error('[VERCEL WEBHOOK] Error updating integration:', updateError);
        }
        else {
            console.log(`[VERCEL WEBHOOK] Integration ${integration.id} updated for event ${eventType}`);
        }
        // Optionally notify user of deployment status changes
        if (eventType === 'deployment.ready') {
            await notifyUserOfSuccessfulDeployment(integration, deploymentUrl);
        }
        else if (eventType === 'deployment.error') {
            await notifyUserOfDeploymentError(integration, deployment);
        }
    }
    catch (error) {
        console.error('[VERCEL WEBHOOK] Error processing deployment event:', error);
    }
}
/**
 * Notify user of successful deployment (optional)
 */
async function notifyUserOfSuccessfulDeployment(integration, deploymentUrl) {
    try {
        // You could implement user notifications here:
        // - Email notification
        // - In-app notification
        // - Webhook to user's endpoint
        console.log(`[VERCEL WEBHOOK] SEO deployment successful for ${integration.site_url}: https://${deploymentUrl}`);
        // Example: Create in-app notification (if you have a notifications system)
        // await createNotification({
        //   userToken: integration.user_token,
        //   type: 'deployment_success',
        //   title: 'SEO Deployment Successful',
        //   message: `Your sitemap and robots.txt have been deployed to ${deploymentUrl}`,
        //   actionUrl: `https://${deploymentUrl}/sitemap.xml`
        // });
    }
    catch (error) {
        console.error('[VERCEL WEBHOOK] Error sending success notification:', error);
    }
}
/**
 * Notify user of deployment error (optional)
 */
async function notifyUserOfDeploymentError(integration, deployment) {
    try {
        const errorMessage = deployment.errorMessage || 'Unknown deployment error';
        console.log(`[VERCEL WEBHOOK] SEO deployment failed for ${integration.site_url}: ${errorMessage}`);
        // Example: Create in-app notification for errors
        // await createNotification({
        //   userToken: integration.user_token,
        //   type: 'deployment_error',
        //   title: 'SEO Deployment Failed',
        //   message: `Deployment failed: ${errorMessage}`,
        //   actionUrl: `/dashboard/integrations?error=${encodeURIComponent(errorMessage)}`
        // });
    }
    catch (error) {
        console.error('[VERCEL WEBHOOK] Error sending error notification:', error);
    }
}
// Handle GET requests for webhook verification
async function GET(request) {
    return server_1.NextResponse.json({
        message: 'Vercel webhook endpoint is active',
        timestamp: new Date().toISOString(),
        endpoints: {
            webhook: '/api/hosting/vercel/webhook',
            oauth: '/api/hosting/vercel/oauth',
            deploy: '/api/hosting/vercel/deploy',
            status: '/api/hosting/vercel/status'
        }
    });
}
