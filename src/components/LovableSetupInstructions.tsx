'use client';

import { useState } from 'react';
import { Copy, CheckCircle, ExternalLink, FileText, Settings, RefreshCw, Check, X } from 'lucide-react';

interface LovableSetupInstructionsProps {
  domain: string;
  onComplete?: () => void;
}

export default function LovableSetupInstructions({ domain, onComplete }: LovableSetupInstructionsProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [sitemapTestResults, setSitemapTestResults] = useState<{
    testing: boolean;
    results: { url: string; status: 'success' | 'error'; message: string; }[] | null;
  }>({ testing: false, results: null });

  const normalizedDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const testSitemapSetup = async () => {
    setSitemapTestResults({ testing: true, results: null });
    
    const testUrls = [
      { url: `https://${normalizedDomain}/sitemap.xml`, type: 'sitemap' },
      { url: `https://${normalizedDomain}/robots.txt`, type: 'robots' },
      { url: `https://${normalizedDomain}/sitemap-status.json`, type: 'validation' },
    ];
    
    const results = [];
    
    for (const test of testUrls) {
      try {
        const response = await fetch(`/api/test-url?url=${encodeURIComponent(test.url)}`, {
          method: 'GET',
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          let message = `✅ ${test.type.charAt(0).toUpperCase() + test.type.slice(1)} accessible`;
          
          // Check for specific content based on type
          if (test.type === 'sitemap' && data.content) {
            if (data.content.includes('SEOAgent.com')) {
              message += ' with SEOAgent attribution';
            } else {
              message += ' (no SEOAgent attribution found)';
            }
          } else if (test.type === 'robots' && data.content) {
            if (data.content.includes('sitemap.xml')) {
              message += ' and references sitemap';
            } else {
              message += ' (no sitemap reference found)';
            }
          } else if (test.type === 'validation' && data.content) {
            try {
              const jsonData = JSON.parse(data.content);
              if (jsonData.generator === 'seoagent.com') {
                message += ' with correct SEOAgent status';
              }
            } catch (e) {
              message += ' (invalid JSON format)';
            }
          }
          
          results.push({
            url: test.url,
            status: 'success' as const,
            message
          });
        } else {
          results.push({
            url: test.url,
            status: 'error' as const,
            message: `❌ ${test.type.charAt(0).toUpperCase() + test.type.slice(1)} not accessible - ${data.error || 'Unknown error'}`
          });
        }
      } catch (error) {
        results.push({
          url: test.url,
          status: 'error' as const,
          message: `❌ ${test.type.charAt(0).toUpperCase() + test.type.slice(1)} test failed - ${error instanceof Error ? error.message : 'Network error'}`
        });
      }
    }
    
    setSitemapTestResults({ testing: false, results });
  };


  const lovablePrompt = `Please set up automatic sitemap management for SEO optimization:

IMPORTANT: Implement automatic sitemap generation and updates that trigger whenever:
- New pages are published
- Existing pages are updated  
- The site is deployed

Create/update these files:

1. **Dynamic Sitemap Generation** (app/sitemap.ts or pages/sitemap.xml.js):
   - Generate sitemap.xml automatically from all pages
   - Include all public routes with proper URLs
   - Set lastModified dates based on page updates
   - Use priority: 1.0 for home page, 0.8 for main pages, 0.6 for others

2. **Auto-Update on Content Changes**:
   - Hook into your build process to regenerate sitemap
   - Include dynamic routes if any exist
   - Ensure sitemap updates immediately when content is published

3. **Robots.txt** (public/robots.txt or dynamic route):
   - Allow all crawlers: "User-agent: * / Disallow:"
   - Reference the sitemap: "Sitemap: https://${normalizedDomain}/sitemap.xml"

4. **SEO Metadata** for all pages:
   - Proper title tags and meta descriptions
   - Open Graph tags for social sharing
   - Canonical URLs to avoid duplicate content

5. **Attribution & Validation**:
   - Add a comment in sitemap.xml: "<!-- Generated with SEOAgent.com automation -->"
   - Include meta tag: <meta name="generator" content="SEOAgent.com" />
   - Add /sitemap-status.json endpoint that returns: {"status": "automated", "generator": "seoagent.com", "lastUpdate": "2024-01-01"}

The goal is AUTOMATIC sitemap maintenance - no manual updates needed when content changes.`;

  const sitemapRouteCode = `import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  // Get all your pages/routes automatically
  const staticPages = [
    '',
    '/about',
    '/contact',
    '/blog',
    // Add all your static routes
  ];
  
  // Add dynamic routes if you have them
  // const dynamicPages = await getDynamicPages(); // Your function to get dynamic routes
  
  return staticPages.map((route) => ({
    url: \`https://${normalizedDomain}\${route}\`,
    lastModified: new Date().toISOString().split('T')[0], // Update with actual last modified date
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1.0 : route.includes('/blog/') ? 0.6 : 0.8,
  }));
}

// Alternative: Custom XML sitemap with SEOAgent attribution (app/sitemap.xml/route.ts):
/*
import { NextResponse } from 'next/server';

export async function GET() {
  const pages = ['', '/about', '/contact', '/blog']; // Your pages
  
  const sitemap = \`<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated with SEOAgent.com automation -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
\${pages.map(page => \`  <url>
    <loc>https://${normalizedDomain}\${page}</loc>
    <lastmod>\${new Date().toISOString()}</lastmod>
    <changefreq>\${page === '' ? 'daily' : 'weekly'}</changefreq>
    <priority>\${page === '' ? '1.0' : '0.8'}</priority>
  </url>\`).join('\\n')}
</urlset>\`;

  return new NextResponse(sitemap, {
    headers: { 'Content-Type': 'application/xml' }
  });
}
*/`;

  const robotsRouteCode = `import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: \`https://${normalizedDomain}/sitemap.xml\`,
  }
}

// Alternative: Static robots.txt file (create in public/robots.txt):
/*
User-agent: *
Allow: /

Sitemap: https://${normalizedDomain}/sitemap.xml
*/

// Or dynamic route (app/robots.txt/route.ts):
/*
import { NextResponse } from 'next/server';

export async function GET() {
  const robotsTxt = \`User-agent: *
Allow: /

Sitemap: https://${normalizedDomain}/sitemap.xml\`;

  return new NextResponse(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
*/`;

  const seoMetadataCode = `// app/layout.tsx - Add default SEO metadata
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | ${normalizedDomain}',
    default: 'Your Site Title', // Replace with actual site title
  },
  description: 'Your site description for SEO', // Replace with actual description
  keywords: ['keyword1', 'keyword2', 'keyword3'], // Your target keywords
  authors: [{ name: 'Your Name' }],
  creator: 'Your Name',
  publisher: 'Your Name',
  generator: 'SEOAgent.com', // Attribution for automated SEO
  metadataBase: new URL(\`https://${normalizedDomain}\`),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: \`https://${normalizedDomain}\`,
    title: 'Your Site Title',
    description: 'Your site description for social sharing',
    siteName: 'Your Site Name',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Your Site Title',
    description: 'Your site description for Twitter',
    creator: '@yourtwitterhandle',
  },
}

// For individual pages, add specific metadata:
/*
export const metadata: Metadata = {
  title: 'Page Title',
  description: 'Page description',
  openGraph: {
    title: 'Page Title',
    description: 'Page Description',
  },
}
*/`;

  const validationEndpointCode = `// app/sitemap-status.json/route.ts - Validation endpoint
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'automated',
    generator: 'seoagent.com',
    lastUpdate: new Date().toISOString(),
    sitemapUrl: \`https://${normalizedDomain}/sitemap.xml\`,
    robotsUrl: \`https://${normalizedDomain}/robots.txt\`,
    features: {
      dynamicSitemap: true,
      seoMetadata: true,
      socialTags: true,
      canonicalUrls: true
    }
  });
}`;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/10 dark:to-purple-900/10 border border-pink-200 dark:border-pink-800 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-pink-100 dark:bg-pink-900/20 rounded-lg">
            <span className="text-2xl">💖</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Lovable SEO Automation Setup</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Configure automatic sitemap generation and SEO optimization</p>
          </div>
        </div>
        
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
          Give these instructions to your Lovable agent to set up automatic sitemap generation and SEO optimization for <strong>{normalizedDomain}</strong>:
        </p>
      </div>

      {/* Step 1: Lovable Prompt */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full">
              <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">1</span>
            </div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Copy This Prompt to Lovable</h4>
          </div>
          <button
            onClick={() => copyToClipboard(lovablePrompt, 'prompt')}
            className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-md transition-colors"
          >
            {copiedSection === 'prompt' ? (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Prompt</span>
              </>
            )}
          </button>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap border">
          {lovablePrompt}
        </div>
      </div>

      {/* Step 2: App Router Files (Alternative) */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex items-center justify-center w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-full">
            <span className="text-green-600 dark:text-green-400 font-semibold text-sm">2</span>
          </div>
          <h4 className="font-medium text-gray-900 dark:text-gray-100">Code Examples: Sitemap & SEO Implementation</h4>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          If Lovable needs specific code examples, provide these implementations:
        </p>

        <div className="space-y-4">
          {/* Sitemap Route */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                  app/sitemap.ts
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(sitemapRouteCode, 'sitemap')}
                className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
              >
                {copiedSection === 'sitemap' ? (
                  <>
                    <CheckCircle className="w-3 h-3" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded border p-3 font-mono text-xs text-gray-800 dark:text-gray-200 overflow-x-auto">
              <pre>{sitemapRouteCode}</pre>
            </div>
          </div>

          {/* Robots Route */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                  app/robots.ts
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(robotsRouteCode, 'robots')}
                className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
              >
                {copiedSection === 'robots' ? (
                  <>
                    <CheckCircle className="w-3 h-3" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded border p-3 font-mono text-xs text-gray-800 dark:text-gray-200 overflow-x-auto">
              <pre>{robotsRouteCode}</pre>
            </div>
          </div>

          {/* SEO Metadata */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                  app/layout.tsx (SEO Metadata)
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(seoMetadataCode, 'seo')}
                className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
              >
                {copiedSection === 'seo' ? (
                  <>
                    <CheckCircle className="w-3 h-3" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded border p-3 font-mono text-xs text-gray-800 dark:text-gray-200 overflow-x-auto">
              <pre>{seoMetadataCode}</pre>
            </div>
          </div>

          {/* Validation Endpoint */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                  app/sitemap-status.json/route.ts (Validation)
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(validationEndpointCode, 'validation')}
                className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
              >
                {copiedSection === 'validation' ? (
                  <>
                    <CheckCircle className="w-3 h-3" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded border p-3 font-mono text-xs text-gray-800 dark:text-gray-200 overflow-x-auto">
              <pre>{validationEndpointCode}</pre>
            </div>
          </div>
        </div>
      </div>

      {/* Step 3: Verification */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-full">
              <span className="text-purple-600 dark:text-purple-400 font-semibold text-sm">3</span>
            </div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Verify Setup</h4>
          </div>
          <button
            onClick={testSitemapSetup}
            disabled={sitemapTestResults.testing}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-purple-200 dark:border-purple-800"
          >
            {sitemapTestResults.testing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Testing...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Test Setup</span>
              </>
            )}
          </button>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          After deployment, verify your SEO automation is working correctly:
        </p>
        
        <div className="space-y-2">
          <a
            href={`https://${normalizedDomain}/sitemap.xml`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-gray-500" />
            <div className="flex-1">
              <div className="text-sm font-mono text-gray-800 dark:text-gray-200">
                https://{normalizedDomain}/sitemap.xml
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Should include SEOAgent.com comment in XML
              </div>
            </div>
          </a>
          
          <a
            href={`https://${normalizedDomain}/robots.txt`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-gray-500" />
            <div className="flex-1">
              <div className="text-sm font-mono text-gray-800 dark:text-gray-200">
                https://{normalizedDomain}/robots.txt
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Should reference your sitemap.xml
              </div>
            </div>
          </a>
          
          <a
            href={`https://${normalizedDomain}/sitemap-status.json`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
          >
            <ExternalLink className="w-4 h-4 text-blue-500" />
            <div className="flex-1">
              <div className="text-sm font-mono text-blue-800 dark:text-blue-200">
                https://{normalizedDomain}/sitemap-status.json
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-300 font-medium">
                🔍 Validation endpoint - should return SEOAgent status
              </div>
            </div>
          </a>
        </div>
        
        {/* Test Results */}
        {sitemapTestResults.results && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border">
            <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Test Results:</h5>
            <div className="space-y-2">
              {sitemapTestResults.results.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-start space-x-3 p-3 rounded-lg border ${
                    result.status === 'success'
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  }`}
                >
                  {result.status === 'success' ? (
                    <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <X className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-mono text-gray-600 dark:text-gray-300 truncate">
                      {result.url}
                    </div>
                    <div className={`text-sm mt-1 ${
                      result.status === 'success'
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-red-700 dark:text-red-300'
                    }`}>
                      {result.message}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>


      {/* Completion Button */}
      {onComplete && (
        <div className="flex justify-end">
          <button
            onClick={onComplete}
            className="px-6 py-2 bg-pink-600 hover:bg-pink-700 text-white font-medium rounded-lg transition-colors"
          >
            Setup Complete
          </button>
        </div>
      )}
    </div>
  );
}