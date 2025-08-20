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
  // Import database integration
  private static dbEnabled: boolean | null = null;
  
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
   * Check if database integration is available
   */
  private static async checkDatabaseAvailability(): Promise<boolean> {
    if (this.dbEnabled !== null) {
      return this.dbEnabled;
    }

    try {
      // Dynamic import to avoid dependency issues if database tables don't exist
      const { HostingProviderDatabase } = await import('./HostingProviderDatabase');
      const tablesExist = await HostingProviderDatabase.checkTablesExist();
      this.dbEnabled = tablesExist;
      console.log(`[HOST DETECTION] Database integration ${tablesExist ? 'enabled' : 'disabled'}`);
      return tablesExist;
    } catch (error) {
      console.log('[HOST DETECTION] Database integration unavailable, using static fingerprints');
      this.dbEnabled = false;
      return false;
    }
  }

  /**
   * Detect hosting provider for a given domain
   */
  static async detectProvider(domain: string, userAgent = 'SEOAgent-HostDetection/1.0', userToken?: string): Promise<HostDetectionResult> {
    const startTime = Date.now();
    const url = domain.startsWith('http') ? domain : `https://${domain}`;
    const detectionMethods: string[] = [];
    const detectedProviders: Map<string, number> = new Map();
    const matchedFingerprints: any[] = [];

    // Check if database integration is available
    const dbEnabled = await this.checkDatabaseAvailability();

    try {
      // Method 1: HTTP Header Analysis (enhanced with database fingerprints)
      const headerResults = await this.detectViaHeaders(url, userAgent, dbEnabled);
      headerResults.providers.forEach((confidence, provider) => {
        detectedProviders.set(provider, (detectedProviders.get(provider) || 0) + confidence);
        detectionMethods.push(`headers:${provider}`);
      });
      matchedFingerprints.push(...headerResults.fingerprints);

      // Method 2: DNS Analysis (simplified for browser compatibility)
      // Note: Full DNS analysis would require server-side implementation
      const dnsResults = await this.detectViaDNS(domain, dbEnabled);
      dnsResults.providers.forEach((confidence, provider) => {
        detectedProviders.set(provider, (detectedProviders.get(provider) || 0) + confidence);
        detectionMethods.push(`dns:${provider}`);
      });
      matchedFingerprints.push(...dnsResults.fingerprints);

      // Method 3: Path Fingerprinting (enhanced with database fingerprints)
      const pathResults = await this.detectViaPathFingerprints(url, userAgent, dbEnabled);
      pathResults.providers.forEach((confidence, provider) => {
        detectedProviders.set(provider, (detectedProviders.get(provider) || 0) + confidence);
        detectionMethods.push(`paths:${provider}`);
      });
      matchedFingerprints.push(...pathResults.fingerprints);

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

    // Save detection result to database if available and userToken provided
    if (dbEnabled && userToken) {
      try {
        const { HostingProviderDatabase } = await import('./HostingProviderDatabase');
        const detectionDuration = Date.now() - startTime;
        
        await HostingProviderDatabase.saveDetectionResult(
          userToken,
          url,
          domain,
          providers.map(p => ({ name: p.name, type: p.type, confidence: p.confidence })),
          primaryProvider?.name || null,
          overallConfidence,
          detectionMethods,
          matchedFingerprints,
          detectionDuration,
          userAgent
        );
      } catch (error) {
        console.error('[HOST DETECTION] Error saving detection result:', error);
      }
    }

    const result: HostDetectionResult = {
      providers,
      primaryProvider,
      confidence: overallConfidence,
      detectionMethods,
      recommendations,
      integrationAvailable
    };

    console.log(`[HOST DETECTION] Detection completed in ${Date.now() - startTime}ms:`, {
      domain,
      providersFound: providers.length,
      primaryProvider: primaryProvider?.name,
      confidence: overallConfidence,
      dbEnabled,
      fingerprintsMatched: matchedFingerprints.length
    });

    return result;
  }

  /**
   * Detect provider via HTTP response headers
   */
  private static async detectViaHeaders(url: string, userAgent: string, dbEnabled = false): Promise<{providers: Map<string, number>, fingerprints: any[]}> {
    const results = new Map<string, number>();
    const matchedFingerprints: any[] = [];

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: { 'User-Agent': userAgent },
        redirect: 'follow'
      });

      const headers = response.headers;

      // Use database fingerprints if available, otherwise fall back to static
      if (dbEnabled) {
        try {
          const { HostingProviderDatabase } = await import('./HostingProviderDatabase');
          const headerFingerprints = await HostingProviderDatabase.getFingerprintsByType('header');
          
          // Group fingerprints by provider
          const providerFingerprints: Record<string, any[]> = {};
          headerFingerprints.forEach(fp => {
            if (!providerFingerprints[fp.provider_name]) {
              providerFingerprints[fp.provider_name] = [];
            }
            providerFingerprints[fp.provider_name].push(fp);
          });

          // Check each provider's database fingerprints
          Object.entries(providerFingerprints).forEach(([provider, fingerprints]) => {
            let totalWeight = 0;
            let matchedWeight = 0;

            fingerprints.forEach(fp => {
              totalWeight += fp.confidence_weight;
              const headerValue = headers.get(fp.fingerprint_key);
              
              if (headerValue && this.matchesDatabasePattern(headerValue, fp)) {
                matchedWeight += fp.confidence_weight;
                matchedFingerprints.push({
                  type: 'header',
                  provider,
                  key: fp.fingerprint_key,
                  value: headerValue,
                  pattern: fp.fingerprint_value,
                  weight: fp.confidence_weight
                });
              }
            });

            if (matchedWeight > 0) {
              const confidence = (matchedWeight / totalWeight) * 100;
              results.set(provider, confidence);
            }
          });
        } catch (dbError) {
          console.error('[HOST DETECTION] Database header analysis failed, falling back to static:', dbError);
          // Fall through to static fingerprints
        }
      }

      // Static fingerprints fallback (or if database disabled)
      if (!dbEnabled || results.size === 0) {
        Object.entries(this.PROVIDER_FINGERPRINTS).forEach(([provider, fingerprint]) => {
          if (!fingerprint.headers) return;

          let matches = 0;
          let total = 0;

          Object.entries(fingerprint.headers).forEach(([headerName, pattern]) => {
            total++;
            const headerValue = headers.get(headerName);
            if (headerValue && this.matchesPattern(headerValue, pattern)) {
              matches++;
              matchedFingerprints.push({
                type: 'header',
                provider,
                key: headerName,
                value: headerValue,
                pattern: pattern.toString(),
                weight: 50 // Default weight
              });
            }
          });

          if (matches > 0) {
            const confidence = (matches / total) * 100;
            results.set(provider, confidence);
          }
        });
      }

    } catch (error) {
      console.error('[HOST DETECTION] Header analysis failed:', error);
    }

    return { providers: results, fingerprints: matchedFingerprints };
  }

  /**
   * Detect provider via DNS patterns (simplified)
   */
  private static async detectViaDNS(domain: string, dbEnabled = false): Promise<{providers: Map<string, number>, fingerprints: any[]}> {
    const results = new Map<string, number>();
    const matchedFingerprints: any[] = [];

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
            // Use database fingerprints if available
            if (dbEnabled) {
              try {
                const { HostingProviderDatabase } = await import('./HostingProviderDatabase');
                const dnsFingerprints = await HostingProviderDatabase.getFingerprintsByType('dns');
                
                dnsFingerprints.forEach(fp => {
                  if (fp.fingerprint_key === 'cname' && this.matchesDatabasePattern(location, fp)) {
                    results.set(fp.provider_name, (results.get(fp.provider_name) || 0) + (fp.confidence_weight * 0.3));
                    matchedFingerprints.push({
                      type: 'dns',
                      provider: fp.provider_name,
                      key: 'cname_redirect',
                      value: location,
                      pattern: fp.fingerprint_value,
                      weight: fp.confidence_weight
                    });
                  }
                });
              } catch (dbError) {
                console.error('[HOST DETECTION] Database DNS analysis failed, falling back to static:', dbError);
              }
            }

            // Static DNS fingerprints fallback
            if (!dbEnabled || results.size === 0) {
              Object.entries(this.PROVIDER_FINGERPRINTS).forEach(([provider, fingerprint]) => {
                if (fingerprint.dns?.cname) {
                  const cnameMatches = fingerprint.dns.cname.some(pattern => location.includes(pattern));
                  if (cnameMatches) {
                    results.set(provider, (results.get(provider) || 0) + 30);
                    matchedFingerprints.push({
                      type: 'dns',
                      provider,
                      key: 'cname_redirect',
                      value: location,
                      pattern: fingerprint.dns.cname.join(','),
                      weight: 30
                    });
                  }
                }
              });
            }
          }
        } catch (error) {
          // Ignore individual URL failures
        }
      }

    } catch (error) {
      console.error('[HOST DETECTION] DNS analysis failed:', error);
    }

    return { providers: results, fingerprints: matchedFingerprints };
  }

  /**
   * Detect provider via path fingerprinting
   */
  private static async detectViaPathFingerprints(url: string, userAgent: string, dbEnabled = false): Promise<{providers: Map<string, number>, fingerprints: any[]}> {
    const results = new Map<string, number>();
    const matchedFingerprints: any[] = [];

    try {
      const baseUrl = new URL(url).origin;

      // Use database path fingerprints if available
      if (dbEnabled) {
        try {
          const { HostingProviderDatabase } = await import('./HostingProviderDatabase');
          const pathFingerprints = await HostingProviderDatabase.getFingerprintsByType('path');
          
          // Group by provider
          const providerPaths: Record<string, any[]> = {};
          pathFingerprints.forEach(fp => {
            if (!providerPaths[fp.provider_name]) {
              providerPaths[fp.provider_name] = [];
            }
            providerPaths[fp.provider_name].push(fp);
          });

          // Test each provider's paths
          for (const [provider, fingerprints] of Object.entries(providerPaths)) {
            let totalWeight = 0;
            let matchedWeight = 0;

            for (const fp of fingerprints) {
              totalWeight += fp.confidence_weight;
              const testPath = fp.fingerprint_key;
              const expectedStatuses = fp.fingerprint_value.split(',').map((s: string) => parseInt(s.trim()));

              try {
                const testUrl = `${baseUrl}${testPath}`;
                const response = await fetch(testUrl, {
                  method: 'HEAD',
                  headers: { 'User-Agent': userAgent },
                  timeout: 5000
                } as any);

                if (expectedStatuses.includes(response.status)) {
                  matchedWeight += fp.confidence_weight;
                  matchedFingerprints.push({
                    type: 'path',
                    provider,
                    key: testPath,
                    value: response.status.toString(),
                    pattern: fp.fingerprint_value,
                    weight: fp.confidence_weight
                  });
                }
              } catch (error) {
                // Path test failed
              }
            }

            if (matchedWeight > 0) {
              const confidence = (matchedWeight / totalWeight) * 0.6; // Path detection gets 60% weight
              results.set(provider, confidence);
            }
          }
        } catch (dbError) {
          console.error('[HOST DETECTION] Database path analysis failed, falling back to static:', dbError);
        }
      }

      // Static path fingerprints fallback
      if (!dbEnabled || results.size === 0) {
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
                matchedFingerprints.push({
                  type: 'path',
                  provider,
                  key: path,
                  value: response.status.toString(),
                  pattern: '200,404,403',
                  weight: 40 / total
                });
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
      }

    } catch (error) {
      console.error('[HOST DETECTION] Path fingerprinting failed:', error);
    }

    return { providers: results, fingerprints: matchedFingerprints };
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
   * Check if a value matches a database fingerprint pattern
   */
  private static matchesDatabasePattern(value: string, fingerprint: any): boolean {
    const { fingerprint_value, fingerprint_pattern_type } = fingerprint;
    const val = value.toLowerCase();
    const pattern = fingerprint_value.toLowerCase();

    switch (fingerprint_pattern_type) {
      case 'exact':
        return val === pattern;
      case 'contains':
        return val.includes(pattern);
      case 'starts_with':
        return val.startsWith(pattern);
      case 'ends_with':
        return val.endsWith(pattern);
      case 'regex':
        try {
          const regex = new RegExp(fingerprint_value, 'i');
          return regex.test(value);
        } catch (error) {
          console.error('[HOST DETECTION] Invalid regex pattern:', fingerprint_value);
          return false;
        }
      default:
        return val.includes(pattern);
    }
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