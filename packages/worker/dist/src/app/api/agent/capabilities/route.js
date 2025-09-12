"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
exports.POST = POST;
exports.PUT = PUT;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
exports.dynamic = 'force-dynamic';
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
// GET /api/agent/capabilities - Discover available capabilities for a site
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        const siteUrl = searchParams.get('siteUrl');
        const category = searchParams.get('category');
        if (!userToken) {
            return server_1.NextResponse.json({ error: 'User token required' }, { status: 401 });
        }
        // Get all active capabilities
        let query = supabase
            .from('agent_capabilities')
            .select('*')
            .eq('is_active', true)
            .order('category')
            .order('capability_name');
        if (category) {
            query = query.eq('category', category);
        }
        const { data: capabilities, error } = await query;
        if (error) {
            console.error('[AGENT CAPABILITIES] Query error:', error);
            return server_1.NextResponse.json({ error: 'Failed to fetch capabilities' }, { status: 500 });
        }
        // Filter capabilities by site availability and user integrations
        const availableCapabilities = [];
        const unavailableCapabilities = [];
        if (siteUrl) {
            // Check user's integrations for this site
            const userIntegrations = await getUserIntegrations(userToken, siteUrl);
            for (const capability of capabilities) {
                // Check if capability is available for this site
                const isAvailableForSite = capability.available_for_sites.length === 0 ||
                    capability.available_for_sites.includes(siteUrl);
                // Check if user has required integrations
                const hasRequiredIntegrations = capability.required_integrations.every((integration) => userIntegrations.includes(integration));
                if (isAvailableForSite && hasRequiredIntegrations) {
                    availableCapabilities.push({
                        ...capability,
                        integration_status: 'available'
                    });
                }
                else {
                    unavailableCapabilities.push({
                        ...capability,
                        integration_status: !isAvailableForSite ? 'site_restricted' : 'missing_integration',
                        missing_integrations: capability.required_integrations.filter((integration) => !userIntegrations.includes(integration))
                    });
                }
            }
        }
        else {
            // No site specified, return all capabilities with general availability
            capabilities.forEach(capability => {
                availableCapabilities.push({
                    ...capability,
                    integration_status: 'general'
                });
            });
        }
        // Group by category for easier consumption
        const capabilitiesByCategory = availableCapabilities.reduce((acc, capability) => {
            if (!acc[capability.category])
                acc[capability.category] = [];
            acc[capability.category].push(capability);
            return acc;
        }, {});
        return server_1.NextResponse.json({
            success: true,
            capabilities: {
                available: availableCapabilities,
                unavailable: unavailableCapabilities,
                by_category: capabilitiesByCategory
            },
            site_context: siteUrl ? {
                site_url: siteUrl,
                user_integrations: await getUserIntegrations(userToken, siteUrl)
            } : null
        });
    }
    catch (error) {
        console.error('[AGENT CAPABILITIES] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
async function getUserIntegrations(userToken, siteUrl) {
    try {
        const integrations = [];
        // Check Google Search Console integration
        const { data: gscData } = await supabase
            .from('gsc_properties')
            .select('id')
            .eq('user_token', userToken)
            .eq('site_url', siteUrl)
            .eq('is_active', true)
            .limit(1);
        if (gscData && gscData.length > 0) {
            integrations.push('google_search_console');
        }
        // Check CMS connections
        const { data: cmsData } = await supabase
            .from('cms_connections')
            .select('cms_type')
            .eq('user_token', userToken)
            .eq('status', 'active');
        if (cmsData && cmsData.length > 0) {
            cmsData.forEach(connection => {
                integrations.push(`cms_${connection.cms_type}`);
            });
        }
        // Check if website has SEOAgent.js installed
        // This would typically be checked via the smartjs status API
        // For now, we'll assume it's available for all sites
        integrations.push('seoagent_js');
        return integrations;
    }
    catch (error) {
        console.error('[AGENT CAPABILITIES] Error checking integrations:', error);
        return [];
    }
}
// POST /api/agent/capabilities - Register new capability (service role only)
async function POST(request) {
    try {
        const body = await request.json();
        const { capabilityName, category, description, parametersSchema, availableForSites, requiredIntegrations } = body;
        if (!capabilityName || !category) {
            return server_1.NextResponse.json({ error: 'Missing required fields: capabilityName, category' }, { status: 400 });
        }
        // This endpoint should be restricted to service role or admin users
        // For now, we'll allow it but in production you'd add proper auth
        const { data: capability, error } = await supabase
            .from('agent_capabilities')
            .insert({
            capability_name: capabilityName,
            category,
            description: description || null,
            parameters_schema: parametersSchema || {},
            available_for_sites: availableForSites || [],
            required_integrations: requiredIntegrations || [],
            is_active: true
        })
            .select()
            .single();
        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                return server_1.NextResponse.json({ error: 'Capability already exists' }, { status: 409 });
            }
            console.error('[AGENT CAPABILITIES] Insert error:', error);
            return server_1.NextResponse.json({ error: 'Failed to register capability' }, { status: 500 });
        }
        console.log(`[AGENT CAPABILITIES] Registered new capability: ${capabilityName}`);
        return server_1.NextResponse.json({
            success: true,
            capability,
            message: `Capability "${capabilityName}" registered successfully`
        });
    }
    catch (error) {
        console.error('[AGENT CAPABILITIES] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
// PUT /api/agent/capabilities - Update capability status
async function PUT(request) {
    try {
        const body = await request.json();
        const { capabilityName, isActive, updates } = body;
        if (!capabilityName) {
            return server_1.NextResponse.json({ error: 'Capability name required' }, { status: 400 });
        }
        const updateData = { updated_at: new Date().toISOString() };
        if (typeof isActive === 'boolean') {
            updateData.is_active = isActive;
        }
        if (updates) {
            Object.assign(updateData, updates);
        }
        const { data: capability, error } = await supabase
            .from('agent_capabilities')
            .update(updateData)
            .eq('capability_name', capabilityName)
            .select()
            .single();
        if (error) {
            console.error('[AGENT CAPABILITIES] Update error:', error);
            return server_1.NextResponse.json({ error: 'Failed to update capability' }, { status: 500 });
        }
        return server_1.NextResponse.json({
            success: true,
            capability,
            message: `Capability "${capabilityName}" updated successfully`
        });
    }
    catch (error) {
        console.error('[AGENT CAPABILITIES] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
