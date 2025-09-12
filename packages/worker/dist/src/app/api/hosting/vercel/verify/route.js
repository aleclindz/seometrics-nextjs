"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const VercelIntegration_1 = require("@/lib/hosting-providers/VercelIntegration");
async function POST(request) {
    try {
        const { accessToken, teamId, projectId } = await request.json();
        if (!accessToken || !projectId) {
            return server_1.NextResponse.json({ error: 'Access token and project ID are required' }, { status: 400 });
        }
        const integration = new VercelIntegration_1.VercelIntegration({
            accessToken,
            teamId,
            projectId,
            deploymentMethod: 'redirects', // Default method
            sitemapProxyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/seo-proxy/sitemap`,
            robotsProxyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/seo-proxy/robots`
        });
        const verification = await integration.verifyConnection();
        if (verification.valid && verification.project) {
            return server_1.NextResponse.json({
                success: true,
                project: {
                    id: verification.project.id,
                    name: verification.project.name,
                    framework: verification.project.framework,
                    accountId: verification.project.accountId,
                    createdAt: verification.project.createdAt,
                    gitRepository: verification.project.gitRepository
                },
                capabilities: [
                    'sitemap_deployment',
                    'robots_deployment',
                    'edge_functions',
                    'api_routes',
                    'redirects',
                    'static_files'
                ]
            });
        }
        return server_1.NextResponse.json({
            success: false,
            error: verification.error || 'Verification failed'
        }, { status: 400 });
    }
    catch (error) {
        console.error('[VERCEL API] Verification error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error during verification' }, { status: 500 });
    }
}
