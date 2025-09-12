"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
/**
 * Direct marketplace entry point for Vercel integration
 * This endpoint immediately redirects to Vercel OAuth for marketplace users
 * Vercel marketplace should point to: https://seoagent.com/api/hosting/vercel/marketplace
 */
async function GET(request) {
    try {
        console.log('[VERCEL MARKETPLACE] Direct marketplace OAuth initiation');
        // Call the main OAuth endpoint without userToken to trigger marketplace flow
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seoagent.com';
        const oauthEndpoint = `${baseUrl}/api/hosting/vercel/oauth`;
        const response = await fetch(oauthEndpoint);
        const data = await response.json();
        if (response.ok && data.oauthUrl) {
            console.log('[VERCEL MARKETPLACE] Redirecting to OAuth URL:', data.oauthUrl);
            return server_1.NextResponse.redirect(data.oauthUrl);
        }
        else {
            console.error('[VERCEL MARKETPLACE] Failed to get OAuth URL:', data);
            return server_1.NextResponse.json({ error: 'Failed to initiate OAuth flow' }, { status: 500 });
        }
    }
    catch (error) {
        console.error('[VERCEL MARKETPLACE] Error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
