"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.POST = POST;
const cms_manager_1 = require("@/lib/cms/cms-manager");
// Edge Runtime for better performance
exports.runtime = 'edge';
const cmsManager = new cms_manager_1.CMSManager();
async function POST(request) {
    try {
        const body = await request.json();
        const { type, userId, siteUrl } = body;
        if (!type || !userId) {
            return new Response(JSON.stringify({ error: 'Missing required fields: type, userId' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        if (!cmsManager.getSupportedProviders().includes(type)) {
            return new Response(JSON.stringify({ error: `Unsupported CMS type: ${type}` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        // For WordPress and Shopify, siteUrl is required
        if ((type === 'wordpress' || type === 'shopify') && !siteUrl) {
            return new Response(JSON.stringify({ error: `Site URL is required for ${type}` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        const redirectUri = `${request.headers.get('origin')}/api/cms/oauth/callback/${type}`;
        const { authUrl, state } = await cmsManager.startOAuthFlow(type, userId, redirectUri, siteUrl);
        console.log(`[CMS OAUTH] Started ${type} OAuth flow for user ${userId}`);
        return new Response(JSON.stringify({
            success: true,
            authUrl,
            state,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    catch (error) {
        console.error('[CMS OAUTH] Failed to start OAuth flow:', error);
        return new Response(JSON.stringify({
            error: 'Failed to start OAuth flow',
            details: error instanceof Error ? error.message : 'Unknown error'
        }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
