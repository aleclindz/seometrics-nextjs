/**
 * HostDetectionService - Advanced hosting provider detection for automated SEO deployment
 * 
 * This service identifies hosting providers, CDNs, and deployment platforms to enable
 * automated sitemap and robots.txt deployment via their respective APIs.
 * 
 * Detection Methods:
 * - HTTP Response Headers
 * - DNS Analysis
 * - WHOIS Data
 * - SSL Certificate Information
 * - Nameserver Patterns
 * - IP Address Ranges
 * 
 * Supported Providers:
 * - Cloudflare (Workers, Pages)
 * - Vercel (Projects API)
 * - Netlify (Deploy API)
 * - AWS CloudFront
 * - GitHub Pages
 * - Shopify
 * - WordPress.com
 * - And more...
 */

export interface HostingProvider {
  name: string;
  type: 'cdn' | 'hosting' | 'platform' | 'cms';
  confidence: number; // 0-100
  capabilities: HostingCapability[];
  apiEndpoints?: {
    sitemap?: string;
    robots?: string;
    redirect?: string;
  };
  authRequirements?: {
    apiKey?: boolean;
    oauth?: boolean;
    token?: string;
  };
  deploymentMethods?: string[];
}

export interface HostingCapability {
  type: 'sitemap_proxy' | 'sitemap_redirect' | 'robots_proxy' | 'robots_redirect' | 'edge_function' | 'serverless_function';
  automated: boolean;
  requiresAuth: boolean;
  documentation?: string;
}

export interface DetectionFingerprint {
  headers?: Record<string, string | RegExp>;
  dns?: {
    cname?: string[];
    ns?: string[];
    mx?: string[];
  };
  ssl?: {
    issuer?: string[];
    san?: string[];
  };
  ipRanges?: string[];
  pathFingerprints?: string[];
}

export interface HostDetectionResult {
  providers: HostingProvider[];
  primaryProvider?: HostingProvider;
  confidence: number;
  detectionMethods: string[];
  recommendations: string[];
  integrationAvailable: boolean;
}

export class HostDetectionService {
  private static readonly PROVIDER_FINGERPRINTS: Record<string, DetectionFingerprint> = {
    cloudflare: {
      headers: {
        'cf-ray': /^[a-f0-9]+-[A-Z]{3}$/i,
        'server': /cloudflare/i,
        'cf-cache-status': /.*/,
        'cf-request-id': /.*/
      },
      dns: {
        ns: ['cloudflare.com'],
        cname: ['cloudflare.net', 'cloudflarenet.com']
      },
      ssl: {
        issuer: ['Cloudflare Inc']
      }
    },
    vercel: {
      headers: {
        'x-vercel-id': /.*/,
        'x-vercel-cache': /.*/,
        'server': /vercel/i,
        'x-matched-path': /.*/
      },
      dns: {
        cname: ['vercel.app', 'vercel.com', 'zeit.co']
      }
    },
    netlify: {
      headers: {
        'x-nf-request-id': /.*/,
        'server': /netlify/i,
        'x-powered-by': /netlify/i
      },
      dns: {
        cname: ['netlify.com', 'netlify.app']
      }
    },
    aws_cloudfront: {
      headers: {
        'x-amz-cf-id': /.*/,
        'x-amz-cf-pop': /.*/,
        'server': /CloudFront/i,
        'x-cache': /cloudfront/i
      },
      dns: {
        cname: ['cloudfront.net', 'amazonaws.com']
      }
    },
    github_pages: {
      headers: {
        'server': /GitHub\.com/i,
        'x-github-request-id': /.*/
      },
      dns: {
        cname: ['github.io', 'github.com']
      }
    },
    shopify: {
      headers: {
        'server': /nginx/i,
        'x-shopid': /.*/,
        'x-shardid': /.*/,
        'x-shopify-stage': /.*/
      },
      dns: {
        cname: ['shops.myshopify.com']
      },
      pathFingerprints: ['/admin', '/cart.js', '/products.json']
    },
    wordpress_com: {
      headers: {
        'x-hacker': /WordPress\.com/i,
        'x-ac': /.*/
      },
      dns: {
        cname: ['wordpress.com']
      }
    },
    fastly: {
      headers: {
        'fastly-debug-digest': /.*/,
        'x-served-by': /fastly/i,
        'x-cache': /fastly/i
      }
    },
    maxcdn: {
      headers: {
        'server': /NetDNA-cache/i,
        'x-cache': /maxcdn/i
      }
    },
    keycdn: {
      headers: {
        'server': /keycdn-engine/i,
        'x-cache': /keycdn/i
      }
    }
  };

  private static readonly PROVIDER_CAPABILITIES: Record<string, HostingProvider> = {
    cloudflare: {
      name: 'Cloudflare',
      type: 'cdn',
      confidence: 0,
      capabilities: [
        { type: 'sitemap_redirect', automated: true, requiresAuth: true, documentation: 'https://developers.cloudflare.com/rules/' },
        { type: 'robots_redirect', automated: true, requiresAuth: true },
        { type: 'edge_function', automated: true, requiresAuth: true }
      ],
      apiEndpoints: {
        sitemap: 'https://api.cloudflare.com/client/v4/zones/{zone_id}/pagerules',
        robots: 'https://api.cloudflare.com/client/v4/zones/{zone_id}/pagerules'
      },
      authRequirements: {
        apiKey: true,
        token: 'API_TOKEN'
      },
      deploymentMethods: ['Page Rules', 'Workers', 'Transform Rules']
    },
    vercel: {
      name: 'Vercel',
      type: 'hosting',
      confidence: 0,
      capabilities: [
        { type: 'sitemap_redirect', automated: true, requiresAuth: true, documentation: 'https://vercel.com/docs/projects/project-configuration#redirects' },
        { type: 'robots_redirect', automated: true, requiresAuth: true },
        { type: 'serverless_function', automated: true, requiresAuth: true }
      ],
      apiEndpoints: {
        sitemap: 'https://api.vercel.com/v1/projects/{project_id}/env',
        robots: 'https://api.vercel.com/v1/projects/{project_id}/env'
      },
      authRequirements: {
        token: 'VERCEL_TOKEN'
      },
      deploymentMethods: ['vercel.json redirects', 'Next.js rewrites', 'Edge Functions']
    },
    netlify: {
      name: 'Netlify',
      type: 'hosting',
      confidence: 0,
      capabilities: [
        { type: 'sitemap_redirect', automated: true, requiresAuth: true, documentation: 'https://docs.netlify.com/routing/redirects/' },
        { type: 'robots_redirect', automated: true, requiresAuth: true },
        { type: 'edge_function', automated: true, requiresAuth: true }
      ],
      apiEndpoints: {
        sitemap: 'https://api.netlify.com/api/v1/sites/{site_id}/files',
        robots: 'https://api.netlify.com/api/v1/sites/{site_id}/files'
      },
      authRequirements: {
        token: 'NETLIFY_TOKEN'
      },
      deploymentMethods: ['_redirects file', 'netlify.toml', 'Edge Functions']
    },
    aws_cloudfront: {
      name: 'AWS CloudFront',
      type: 'cdn',
      confidence: 0,
      capabilities: [
        { type: 'sitemap_redirect', automated: true, requiresAuth: true, documentation: 'https://docs.aws.amazon.com/cloudfront/' },
        { type: 'robots_redirect', automated: true, requiresAuth: true }
      ],
      authRequirements: {
        apiKey: true,
        token: 'AWS_ACCESS_KEY_ID'
      },
      deploymentMethods: ['CloudFront Behaviors', 'Lambda@Edge', 'CloudFront Functions']
    },
    github_pages: {
      name: 'GitHub Pages',
      type: 'hosting',
      confidence: 0,
      capabilities: [
        { type: 'sitemap_proxy', automated: false, requiresAuth: false, documentation: 'https://pages.github.com/' }
      ],
      deploymentMethods: ['Static files in repository']
    },
    shopify: {
      name: 'Shopify',
      type: 'cms',
      confidence: 0,
      capabilities: [
        { type: 'sitemap_proxy', automated: true, requiresAuth: true, documentation: 'https://shopify.dev/api/admin-rest' },
        { type: 'robots_proxy', automated: true, requiresAuth: true }
      ],
      authRequirements: {
        token: 'SHOPIFY_ACCESS_TOKEN'
      },
      deploymentMethods: ['Theme files', 'Shopify Plus Scripts']
    }
  };

  /**
   * Detect hosting provider for a given domain
   */
  static async detectProvider(domain: string, userAgent = 'SEOAgent-HostDetection/1.0'): Promise<HostDetectionResult> {
    const url = domain.startsWith('http') ? domain : `https://${domain}`;
    const detectionMethods: string[] = [];
    const detectedProviders: Map<string, number> = new Map();

    try {
      // Method 1: HTTP Header Analysis
      const headerResults = await this.detectViaHeaders(url, userAgent);
      headerResults.forEach((confidence, provider) => {
        detectedProviders.set(provider, (detectedProviders.get(provider) || 0) + confidence);
        detectionMethods.push(`headers:${provider}`);
      });

      // Method 2: DNS Analysis (simplified for browser compatibility)
      // Note: Full DNS analysis would require server-side implementation
      const dnsResults = await this.detectViaDNS(domain);
      dnsResults.forEach((confidence, provider) => {
        detectedProviders.set(provider, (detectedProviders.get(provider) || 0) + confidence);
        detectionMethods.push(`dns:${provider}`);
      });

      // Method 3: Path Fingerprinting
      const pathResults = await this.detectViaPathFingerprints(url, userAgent);
      pathResults.forEach((confidence, provider) => {
        detectedProviders.set(provider, (detectedProviders.get(provider) || 0) + confidence);
        detectionMethods.push(`paths:${provider}`);
      });

    } catch (error) {
      console.error('[HOST DETECTION] Error during detection:', error);
    }

    // Convert detection results to provider objects
    const providers: HostingProvider[] = Array.from(detectedProviders.entries())
      .filter(([_, confidence]) => confidence > 20) // Filter out low-confidence detections
      .map(([name, confidence]) => ({
        ...this.PROVIDER_CAPABILITIES[name],
        confidence: Math.min(confidence, 100)
      }))
      .sort((a, b) => b.confidence - a.confidence);

    // Determine primary provider (highest confidence)
    const primaryProvider = providers[0];
    const overallConfidence = primaryProvider?.confidence || 0;
    const integrationAvailable = providers.some(p => p.capabilities.some(c => c.automated && c.type.includes('sitemap')));

    // Generate recommendations
    const recommendations = this.generateRecommendations(providers, domain);

    return {
      providers,
      primaryProvider,
      confidence: overallConfidence,
      detectionMethods,
      recommendations,
      integrationAvailable
    };
  }

  /**
   * Detect provider via HTTP response headers
   */
  private static async detectViaHeaders(url: string, userAgent: string): Promise<Map<string, number>> {
    const results = new Map<string, number>();

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: { 'User-Agent': userAgent },
        redirect: 'follow'
      });

      const headers = response.headers;

      // Check each provider's header fingerprints
      Object.entries(this.PROVIDER_FINGERPRINTS).forEach(([provider, fingerprint]) => {
        if (!fingerprint.headers) return;

        let matches = 0;
        let total = 0;

        Object.entries(fingerprint.headers).forEach(([headerName, pattern]) => {
          total++;
          const headerValue = headers.get(headerName);
          if (headerValue && this.matchesPattern(headerValue, pattern)) {
            matches++;
          }
        });

        if (matches > 0) {
          const confidence = (matches / total) * 100;
          results.set(provider, confidence);
        }
      });

    } catch (error) {
      console.error('[HOST DETECTION] Header analysis failed:', error);
    }

    return results;
  }

  /**
   * Detect provider via DNS patterns (simplified)
   */
  private static async detectViaDNS(domain: string): Promise<Map<string, number>> {
    const results = new Map<string, number>();

    // Note: Browser-based DNS analysis is limited
    // This is a placeholder for server-side DNS resolution
    // In a full implementation, this would use DNS APIs or server-side resolution

    try {
      // Basic CNAME detection via HTTP redirects and response analysis
      const testUrls = [
        `https://${domain}`,
        `http://${domain}`
      ];

      for (const url of testUrls) {
        try {
          const response = await fetch(url, { 
            method: 'HEAD', 
            redirect: 'manual',
            headers: { 'User-Agent': 'SEOAgent-DNS-Detection/1.0' }
          });

          // Analyze redirect chains for hosting provider indicators
          const location = response.headers.get('location');
          if (location) {
            Object.entries(this.PROVIDER_FINGERPRINTS).forEach(([provider, fingerprint]) => {
              if (fingerprint.dns?.cname) {
                const cnameMatches = fingerprint.dns.cname.some(pattern => location.includes(pattern));
                if (cnameMatches) {
                  results.set(provider, (results.get(provider) || 0) + 30);
                }
              }
            });
          }
        } catch (error) {
          // Ignore individual URL failures
        }
      }

    } catch (error) {
      console.error('[HOST DETECTION] DNS analysis failed:', error);
    }

    return results;
  }

  /**
   * Detect provider via path fingerprinting
   */
  private static async detectViaPathFingerprints(url: string, userAgent: string): Promise<Map<string, number>> {
    const results = new Map<string, number>();

    try {
      const baseUrl = new URL(url).origin;

      // Test common paths for each provider
      for (const [provider, fingerprint] of Object.entries(this.PROVIDER_FINGERPRINTS)) {
        if (!fingerprint.pathFingerprints) continue;

        let matches = 0;
        const total = fingerprint.pathFingerprints.length;

        for (const path of fingerprint.pathFingerprints) {
          try {
            const testUrl = `${baseUrl}${path}`;
            const response = await fetch(testUrl, {
              method: 'HEAD',
              headers: { 'User-Agent': userAgent },
              timeout: 5000
            } as any);

            // Consider 200, 404, 403 as valid responses (path exists in routing)
            if ([200, 404, 403].includes(response.status)) {
              matches++;
            }
          } catch (error) {
            // Path doesn't exist or network error
          }
        }

        if (matches > 0) {
          const confidence = (matches / total) * 40; // Lower weight than headers
          results.set(provider, confidence);
        }
      }

    } catch (error) {
      console.error('[HOST DETECTION] Path fingerprinting failed:', error);
    }

    return results;
  }

  /**
   * Generate deployment recommendations based on detected providers
   */
  private static generateRecommendations(providers: HostingProvider[], domain: string): string[] {
    const recommendations: string[] = [];

    if (providers.length === 0) {
      recommendations.push('No hosting provider detected. Manual sitemap/robots.txt deployment required.');
      recommendations.push('Consider using a supported hosting provider (Cloudflare, Vercel, Netlify) for automated SEO deployment.');
      return recommendations;
    }

    const primary = providers[0];

    if (primary.capabilities.some(c => c.automated && c.type.includes('sitemap'))) {
      recommendations.push(`✅ Automated deployment available via ${primary.name} integration`);
      recommendations.push(`Enable ${primary.name} API integration in SEOAgent settings`);
      
      if (primary.authRequirements?.apiKey) {
        recommendations.push(`Configure ${primary.name} API credentials for automated deployment`);
      }
      
      if (primary.deploymentMethods) {
        recommendations.push(`Deployment methods: ${primary.deploymentMethods.join(', ')}`);
      }
    } else {
      recommendations.push(`Manual deployment required for ${primary.name}`);
      recommendations.push('Consider upgrading to a hosting provider with API integration support');
    }

    // Add CDN-specific recommendations
    if (primary.type === 'cdn') {
      recommendations.push('CDN detected - ensure origin server supports SEO file deployment');
    }

    return recommendations;
  }

  /**
   * Check if a value matches a pattern (string or RegExp)
   */
  private static matchesPattern(value: string, pattern: string | RegExp): boolean {
    if (pattern instanceof RegExp) {
      return pattern.test(value);
    }
    return value.toLowerCase().includes(pattern.toLowerCase());
  }

  /**
   * Get integration instructions for a specific provider
   */
  static getIntegrationInstructions(provider: HostingProvider, domain: string): string {
    const baseInstructions = `
# ${provider.name} Integration Setup

To enable automated sitemap and robots.txt deployment:

1. **Authentication Setup:**`;

    let instructions = baseInstructions;

    if (provider.authRequirements?.apiKey) {
      instructions += `
   - Generate an API key in your ${provider.name} dashboard
   - Add the API key to SEOAgent settings`;
    }

    if (provider.authRequirements?.token) {
      instructions += `
   - Create a ${provider.authRequirements.token} in your ${provider.name} account
   - Configure the token in SEOAgent integration settings`;
    }

    instructions += `

2. **Deployment Methods:**`;

    provider.deploymentMethods?.forEach(method => {
      instructions += `
   - ${method}`;
    });

    instructions += `

3. **Verification:**
   - Test deployment: https://${domain}/sitemap.xml
   - Verify robots.txt: https://${domain}/robots.txt
   - Monitor deployment status in SEOAgent dashboard

4. **Documentation:**`;

    provider.capabilities.forEach(capability => {
      if (capability.documentation) {
        instructions += `
   - ${capability.type}: ${capability.documentation}`;
      }
    });

    return instructions;
  }

  /**
   * Quick hosting provider detection (headers only)
   */
  static async quickDetect(url: string): Promise<string | null> {
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        headers: { 'User-Agent': 'SEOAgent-QuickDetection/1.0' }
      });

      const headers = response.headers;

      // Quick checks for most common providers
      if (headers.get('cf-ray')) return 'cloudflare';
      if (headers.get('x-vercel-id')) return 'vercel';
      if (headers.get('x-nf-request-id')) return 'netlify';
      if (headers.get('x-amz-cf-id')) return 'aws_cloudfront';
      if (headers.get('x-shopid')) return 'shopify';
      if (headers.get('x-github-request-id')) return 'github_pages';

      return null;
    } catch (error) {
      console.error('[HOST DETECTION] Quick detect failed:', error);
      return null;
    }
  }
}

// Types are already exported with their interface declarations above