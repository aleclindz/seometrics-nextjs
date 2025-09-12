"use strict";
/**
 * VercelIntegration - Automated sitemap and robots.txt deployment via Vercel API
 *
 * This service integrates with Vercel's Projects API to automatically deploy
 * sitemap.xml and robots.txt files through serverless functions and redirects.
 *
 * Deployment Methods:
 * 1. Edge Functions - Dynamic serving via @vercel/edge
 * 2. API Routes - Next.js API routes for sitemap/robots serving
 * 3. Redirects - vercel.json redirects to seoagent.com proxy
 * 4. Static Files - Direct file deployment to public directory
 *
 * Vercel API Documentation: https://vercel.com/docs/rest-api
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VercelIntegration = void 0;
class VercelIntegration {
    config;
    baseUrl = 'https://api.vercel.com';
    constructor(config) {
        this.config = config;
    }
    /**
     * Verify Vercel API access and project permissions
     */
    async verifyConnection() {
        try {
            const headers = this.getAuthHeaders();
            // Test API access
            const userResponse = await fetch(`${this.baseUrl}/v2/user`, { headers });
            if (!userResponse.ok) {
                return {
                    valid: false,
                    error: `API access denied: ${userResponse.status} ${userResponse.statusText}`
                };
            }
            // Test project access
            const projectResponse = await fetch(`${this.baseUrl}/v9/projects/${this.config.projectId}${this.config.teamId ? `?teamId=${this.config.teamId}` : ''}`, { headers });
            if (!projectResponse.ok) {
                return {
                    valid: false,
                    error: `Project access denied: ${projectResponse.status} ${projectResponse.statusText}`
                };
            }
            const project = await projectResponse.json();
            return { valid: true, project };
        }
        catch (error) {
            return {
                valid: false,
                error: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    /**
     * Deploy sitemap and robots.txt using the configured method
     */
    async deploySEOFiles(domain, sitemapContent, robotsContent, userToken) {
        const startTime = Date.now();
        try {
            console.log(`[VERCEL] Starting deployment for ${domain} using method: ${this.config.deploymentMethod}`);
            let result;
            switch (this.config.deploymentMethod) {
                case 'edge_function':
                    result = await this.deployViaEdgeFunctions(domain, sitemapContent, robotsContent, userToken);
                    break;
                case 'api_routes':
                    result = await this.deployViaAPIRoutes(domain, sitemapContent, robotsContent, userToken);
                    break;
                case 'redirects':
                    result = await this.deployViaRedirects(domain, sitemapContent, robotsContent, userToken);
                    break;
                case 'static_files':
                    result = await this.deployViaStaticFiles(domain, sitemapContent, robotsContent, userToken);
                    break;
                default:
                    throw new Error(`Unsupported deployment method: ${this.config.deploymentMethod}`);
            }
            result.duration = Date.now() - startTime;
            result.method = this.config.deploymentMethod;
            console.log(`[VERCEL] Deployment completed in ${result.duration}ms:`, result);
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown deployment error';
            console.error('[VERCEL] Deployment failed:', error);
            return {
                success: false,
                method: this.config.deploymentMethod,
                duration: Date.now() - startTime,
                error: errorMessage
            };
        }
    }
    /**
     * Deploy via Vercel Edge Functions (Recommended)
     */
    async deployViaEdgeFunctions(domain, sitemapContent, robotsContent, userToken) {
        console.log('[VERCEL] Deploying via Edge Functions');
        // Edge function code for sitemap.xml
        const sitemapEdgeFunction = `
import { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: NextRequest) {
  const sitemapContent = \`${sitemapContent.replace(/`/g, '\\`')}\`;
  
  return new Response(sitemapContent, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
      'X-SEOAgent-Generated': '${new Date().toISOString()}',
      'X-SEOAgent-Domain': '${domain}',
    },
  });
}
`;
        // Edge function code for robots.txt
        const robotsEdgeFunction = `
import { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: NextRequest) {
  const robotsContent = \`${robotsContent.replace(/`/g, '\\`')}\`;
  
  return new Response(robotsContent, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=3600',
      'X-SEOAgent-Generated': '${new Date().toISOString()}',
      'X-SEOAgent-Domain': '${domain}',
    },
  });
}
`;
        // Deploy via file creation API
        const files = {
            'api/sitemap.xml.ts': sitemapEdgeFunction,
            'api/robots.txt.ts': robotsEdgeFunction,
        };
        const deploymentResult = await this.createDeployment(files, {
            name: `seo-deployment-${domain}`,
            target: 'production',
            meta: {
                seoagent: 'true',
                domain,
                method: 'edge_functions',
                userToken,
                generatedAt: new Date().toISOString()
            }
        });
        if (deploymentResult.success) {
            return {
                success: true,
                deploymentId: deploymentResult.deploymentId,
                deploymentUrl: deploymentResult.deploymentUrl,
                sitemapUrl: `${deploymentResult.deploymentUrl}/api/sitemap.xml`,
                robotsUrl: `${deploymentResult.deploymentUrl}/api/robots.txt`,
                method: 'edge_function',
                logs: [`Edge functions deployed successfully`]
            };
        }
        throw new Error(deploymentResult.error || 'Edge function deployment failed');
    }
    /**
     * Deploy via Next.js API Routes
     */
    async deployViaAPIRoutes(domain, sitemapContent, robotsContent, userToken) {
        console.log('[VERCEL] Deploying via API Routes');
        // API route for sitemap.xml
        const sitemapAPIRoute = `
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const sitemapContent = \`${sitemapContent.replace(/`/g, '\\`')}\`;
  
  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('X-SEOAgent-Generated', '${new Date().toISOString()}');
  res.setHeader('X-SEOAgent-Domain', '${domain}');
  
  res.status(200).send(sitemapContent);
}
`;
        // API route for robots.txt
        const robotsAPIRoute = `
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const robotsContent = \`${robotsContent.replace(/`/g, '\\`')}\`;
  
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('X-SEOAgent-Generated', '${new Date().toISOString()}');
  res.setHeader('X-SEOAgent-Domain', '${domain}');
  
  res.status(200).send(robotsContent);
}
`;
        const files = {
            'pages/api/sitemap.xml.ts': sitemapAPIRoute,
            'pages/api/robots.txt.ts': robotsAPIRoute,
        };
        const deploymentResult = await this.createDeployment(files, {
            name: `seo-api-deployment-${domain}`,
            target: 'production',
            meta: {
                seoagent: 'true',
                domain,
                method: 'api_routes',
                userToken,
                generatedAt: new Date().toISOString()
            }
        });
        if (deploymentResult.success) {
            return {
                success: true,
                deploymentId: deploymentResult.deploymentId,
                deploymentUrl: deploymentResult.deploymentUrl,
                sitemapUrl: `${deploymentResult.deploymentUrl}/api/sitemap.xml`,
                robotsUrl: `${deploymentResult.deploymentUrl}/api/robots.txt`,
                method: 'api_routes',
                logs: [`API routes deployed successfully`]
            };
        }
        throw new Error(deploymentResult.error || 'API routes deployment failed');
    }
    /**
     * Deploy via vercel.json redirects to SEOAgent proxy (Recommended for existing projects)
     */
    async deployViaRedirects(domain, sitemapContent, robotsContent, userToken) {
        console.log('[VERCEL] Deploying via redirects to SEOAgent proxy');
        // First, store the content in SEOAgent's proxy service
        await this.storeSEOContentInProxy(domain, sitemapContent, robotsContent, userToken);
        // Get existing vercel.json config
        const currentConfig = await this.getVercelConfig();
        // Add SEO redirects
        const seoRedirects = [
            {
                source: '/sitemap.xml',
                destination: `${this.config.sitemapProxyUrl}?domain=${domain}&token=${userToken}`,
                permanent: false,
                statusCode: 307 // Temporary redirect to ensure fresh content
            },
            {
                source: '/robots.txt',
                destination: `${this.config.robotsProxyUrl}?domain=${domain}&token=${userToken}`,
                permanent: false,
                statusCode: 307
            }
        ];
        // Merge with existing redirects, removing any existing SEO redirects
        const existingRedirects = (currentConfig.redirects || [])
            .filter(redirect => !redirect.source.match(/^\/(sitemap\.xml|robots\.txt)$/));
        const updatedConfig = {
            ...currentConfig,
            redirects: [...existingRedirects, ...seoRedirects]
        };
        // Deploy updated vercel.json
        const files = {
            'vercel.json': JSON.stringify(updatedConfig, null, 2)
        };
        const deploymentResult = await this.createDeployment(files, {
            name: `seo-redirects-${domain}`,
            target: 'production',
            meta: {
                seoagent: 'true',
                domain,
                method: 'redirects',
                userToken,
                generatedAt: new Date().toISOString()
            }
        });
        if (deploymentResult.success) {
            return {
                success: true,
                deploymentId: deploymentResult.deploymentId,
                deploymentUrl: deploymentResult.deploymentUrl,
                sitemapUrl: `${deploymentResult.deploymentUrl}/sitemap.xml`,
                robotsUrl: `${deploymentResult.deploymentUrl}/robots.txt`,
                method: 'redirects',
                logs: [`Redirects configured to SEOAgent proxy`]
            };
        }
        throw new Error(deploymentResult.error || 'Redirects deployment failed');
    }
    /**
     * Deploy via static files in public directory
     */
    async deployViaStaticFiles(domain, sitemapContent, robotsContent, userToken) {
        console.log('[VERCEL] Deploying via static files');
        const files = {
            'public/sitemap.xml': sitemapContent,
            'public/robots.txt': robotsContent,
            'public/.seoagent-generated': JSON.stringify({
                domain,
                userToken,
                generatedAt: new Date().toISOString(),
                method: 'static_files'
            })
        };
        const deploymentResult = await this.createDeployment(files, {
            name: `seo-static-${domain}`,
            target: 'production',
            meta: {
                seoagent: 'true',
                domain,
                method: 'static_files',
                userToken,
                generatedAt: new Date().toISOString()
            }
        });
        if (deploymentResult.success) {
            return {
                success: true,
                deploymentId: deploymentResult.deploymentId,
                deploymentUrl: deploymentResult.deploymentUrl,
                sitemapUrl: `${deploymentResult.deploymentUrl}/sitemap.xml`,
                robotsUrl: `${deploymentResult.deploymentUrl}/robots.txt`,
                method: 'static_files',
                logs: [`Static files deployed to public directory`]
            };
        }
        throw new Error(deploymentResult.error || 'Static files deployment failed');
    }
    /**
     * Create a Vercel deployment
     */
    async createDeployment(files, options) {
        try {
            const headers = this.getAuthHeaders();
            // Prepare deployment data
            const deploymentData = {
                name: options.name,
                files: Object.entries(files).map(([file, content]) => ({
                    file,
                    data: Buffer.from(content).toString('base64')
                })),
                projectSettings: {
                    framework: 'nextjs'
                },
                target: options.target || 'production',
                meta: options.meta || {}
            };
            const response = await fetch(`${this.baseUrl}/v13/deployments${this.config.teamId ? `?teamId=${this.config.teamId}` : ''}`, {
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(deploymentData)
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Deployment failed: ${response.status} ${response.statusText} - ${errorText}`);
            }
            const deployment = await response.json();
            return {
                success: true,
                deploymentId: deployment.uid,
                deploymentUrl: `https://${deployment.url}`
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown deployment error'
            };
        }
    }
    /**
     * Get current vercel.json configuration
     */
    async getVercelConfig() {
        try {
            // This would typically read from the project's vercel.json file
            // For now, return a basic config
            return {
                redirects: [],
                functions: {},
                framework: 'nextjs'
            };
        }
        catch (error) {
            console.warn('[VERCEL] Could not read existing vercel.json:', error);
            return { redirects: [] };
        }
    }
    /**
     * Store SEO content in SEOAgent proxy service
     */
    async storeSEOContentInProxy(domain, sitemapContent, robotsContent, userToken) {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/hosting/store-seo-content`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    domain,
                    userToken,
                    sitemapContent,
                    robotsContent,
                    provider: 'vercel'
                })
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to store content in proxy: ${response.status} ${response.statusText} - ${errorText}`);
            }
            const result = await response.json();
            console.log('[VERCEL] SEO content stored in proxy:', result);
        }
        catch (error) {
            console.error('[VERCEL] Error storing content in proxy:', error);
            throw error;
        }
    }
    /**
     * Get deployment status
     */
    async getDeploymentStatus(deploymentId) {
        const headers = this.getAuthHeaders();
        const response = await fetch(`${this.baseUrl}/v13/deployments/${deploymentId}${this.config.teamId ? `?teamId=${this.config.teamId}` : ''}`, { headers });
        if (!response.ok) {
            throw new Error(`Failed to get deployment status: ${response.statusText}`);
        }
        return response.json();
    }
    /**
     * List project deployments
     */
    async getProjectDeployments(limit = 20) {
        const headers = this.getAuthHeaders();
        const response = await fetch(`${this.baseUrl}/v6/deployments?projectId=${this.config.projectId}&limit=${limit}${this.config.teamId ? `&teamId=${this.config.teamId}` : ''}`, { headers });
        if (!response.ok) {
            throw new Error(`Failed to get deployments: ${response.statusText}`);
        }
        return response.json();
    }
    /**
     * Get project details
     */
    async getProject() {
        const headers = this.getAuthHeaders();
        const response = await fetch(`${this.baseUrl}/v9/projects/${this.config.projectId}${this.config.teamId ? `?teamId=${this.config.teamId}` : ''}`, { headers });
        if (!response.ok) {
            throw new Error(`Failed to get project: ${response.statusText}`);
        }
        return response.json();
    }
    /**
     * Set environment variables for the project
     */
    async setEnvironmentVariables(envVars) {
        const headers = this.getAuthHeaders();
        const results = [];
        for (const envVar of envVars) {
            const response = await fetch(`${this.baseUrl}/v10/projects/${this.config.projectId}/env${this.config.teamId ? `?teamId=${this.config.teamId}` : ''}`, {
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(envVar)
            });
            if (response.ok) {
                results.push(await response.json());
            }
            else {
                console.error(`Failed to set env var ${envVar.key}:`, response.statusText);
            }
        }
        return results;
    }
    /**
     * Get authentication headers
     */
    getAuthHeaders() {
        return {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'User-Agent': 'SEOAgent/1.0'
        };
    }
    /**
     * Static method to create integration from database config
     */
    static fromDatabaseConfig(integration) {
        const config = {
            accessToken: integration.api_credentials?.access_token || '',
            teamId: integration.api_credentials?.team_id,
            projectId: integration.api_credentials?.project_id || '',
            deploymentMethod: integration.configuration?.deployment_method || 'redirects',
            sitemapProxyUrl: integration.configuration?.sitemap_proxy_url || `${process.env.NEXT_PUBLIC_APP_URL}/api/seo-proxy/sitemap`,
            robotsProxyUrl: integration.configuration?.robots_proxy_url || `${process.env.NEXT_PUBLIC_APP_URL}/api/seo-proxy/robots`,
            autoDeployment: integration.configuration?.auto_deployment || false,
            targetEnvironments: integration.configuration?.target_environments || ['production']
        };
        return new VercelIntegration(config);
    }
}
exports.VercelIntegration = VercelIntegration;
// Types are already exported with their interface declarations above
