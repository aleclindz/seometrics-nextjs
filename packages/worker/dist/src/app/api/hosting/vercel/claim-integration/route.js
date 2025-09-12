"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
/**
 * Claim a temporary Vercel integration after user signup
 * This is called after a user signs up via the marketplace OAuth flow
 */
async function POST(request) {
    try {
        const { tempIntegrationId, userToken } = await request.json();
        if (!tempIntegrationId || !userToken) {
            return server_1.NextResponse.json({ error: 'Missing required parameters: tempIntegrationId, userToken' }, { status: 400 });
        }
        console.log('[VERCEL CLAIM] Claiming integration:', tempIntegrationId, 'for user:', userToken);
        // Get the temporary integration
        const { data: tempIntegration, error: fetchError } = await supabase
            .from('temp_integrations')
            .select('*')
            .eq('temp_id', tempIntegrationId)
            .gte('expires_at', new Date().toISOString())
            .is('used_at', null)
            .single();
        if (fetchError || !tempIntegration) {
            console.error('[VERCEL CLAIM] Temp integration not found or expired:', fetchError);
            return server_1.NextResponse.json({ error: 'Integration not found or expired' }, { status: 404 });
        }
        const integrationData = tempIntegration.integration_data;
        // Create the permanent integration
        const hostingIntegrationData = {
            user_token: userToken,
            site_url: `${integrationData.username || 'project'}.vercel.app`, // Default, can be updated
            provider_name: 'vercel',
            integration_type: 'oauth',
            status: 'active',
            api_credentials: {
                access_token: integrationData.accessToken,
                team_id: integrationData.teamId,
                user_id: integrationData.userId
            },
            configuration: {
                deployment_method: 'redirects', // Default to most compatible method
                sitemap_proxy_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/seo-proxy/sitemap`,
                robots_proxy_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/seo-proxy/robots`,
                auto_deployment: false, // Let user enable this manually
                target_environments: ['production']
            },
            capabilities_enabled: ['sitemap_deployment', 'robots_deployment'],
            deployment_count: 0,
            error_count: 0
        };
        const { data: integration, error: createError } = await supabase
            .from('hosting_integrations')
            .insert(hostingIntegrationData)
            .select()
            .single();
        if (createError) {
            console.error('[VERCEL CLAIM] Error creating integration:', createError);
            return server_1.NextResponse.json({ error: 'Failed to create Vercel integration' }, { status: 500 });
        }
        // Mark temp integration as used
        await supabase
            .from('temp_integrations')
            .update({
            used_at: new Date().toISOString(),
            user_token: userToken
        })
            .eq('temp_id', tempIntegrationId);
        console.log('[VERCEL CLAIM] Integration claimed successfully:', integration.id);
        return server_1.NextResponse.json({
            success: true,
            message: 'Vercel integration claimed successfully',
            integration: {
                id: integration.id,
                provider: integration.provider_name,
                status: integration.status,
                projects: integrationData.projects || [],
                createdAt: integration.created_at
            }
        });
    }
    catch (error) {
        console.error('[VERCEL CLAIM] Error claiming integration:', error);
        return server_1.NextResponse.json({ error: 'Internal server error claiming integration' }, { status: 500 });
    }
}
/**
 * Get temporary integration data for preview during signup
 */
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const tempIntegrationId = searchParams.get('id');
        if (!tempIntegrationId) {
            return server_1.NextResponse.json({ error: 'Missing tempIntegrationId parameter' }, { status: 400 });
        }
        // Get the temporary integration (without claiming it)
        const { data: tempIntegration, error: fetchError } = await supabase
            .from('temp_integrations')
            .select('integration_data, expires_at')
            .eq('temp_id', tempIntegrationId)
            .gte('expires_at', new Date().toISOString())
            .is('used_at', null)
            .single();
        if (fetchError || !tempIntegration) {
            return server_1.NextResponse.json({ error: 'Integration not found or expired' }, { status: 404 });
        }
        const integrationData = tempIntegration.integration_data;
        return server_1.NextResponse.json({
            success: true,
            preview: {
                provider: 'vercel',
                username: integrationData.username,
                email: integrationData.email,
                projectCount: integrationData.projects?.length || 0,
                expiresAt: tempIntegration.expires_at
            }
        });
    }
    catch (error) {
        console.error('[VERCEL CLAIM] Error getting temp integration:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
