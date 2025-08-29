'use client';

import { useState } from 'react';
import { Copy, CheckCircle, ExternalLink, FileText, Settings, RefreshCw, AlertCircle, Check, X } from 'lucide-react';

interface LovableSetupInstructionsProps {
  domain: string;
  onComplete?: () => void;
}

export default function LovableSetupInstructions({ domain, onComplete }: LovableSetupInstructionsProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<{
    testing: boolean;
    sitemapResult: 'pending' | 'success' | 'error';
    robotsResult: 'pending' | 'success' | 'error';
    sitemapError?: string;
    robotsError?: string;
  }>({
    testing: false,
    sitemapResult: 'pending',
    robotsResult: 'pending'
  });

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

  const testConnection = async () => {
    console.log('🧪 [LOVABLE TEST] Starting connection test for:', normalizedDomain);
    
    setTestStatus({
      testing: true,
      sitemapResult: 'pending',
      robotsResult: 'pending'
    });

    try {
      // Step 1: Test SEOAgent source endpoints first
      const seoagentSitemapUrl = `https://seoagent.com/sitemaps/${normalizedDomain}.xml`;
      const seoagentRobotsUrl = `https://seoagent.com/robots/${normalizedDomain}.txt`;
      
      console.log('🧪 [LOVABLE TEST] Step 1: Testing SEOAgent source endpoints');
      console.log('🧪 [LOVABLE TEST] Testing SEOAgent sitemap:', seoagentSitemapUrl);
      
      // Test SEOAgent sitemap endpoint
      let seoagentSitemapWorking = false;
      try {
        const seoagentSitemapResponse = await fetch(seoagentSitemapUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/xml, text/xml' }
        });
        
        if (seoagentSitemapResponse.ok) {
          const content = await seoagentSitemapResponse.text();
          if (content.includes('<urlset') || content.includes('<?xml')) {
            seoagentSitemapWorking = true;
            console.log('✅ [LOVABLE TEST] SEOAgent sitemap endpoint working');
          }
        }
      } catch (err) {
        console.log('❌ [LOVABLE TEST] SEOAgent sitemap endpoint failed:', err);
      }

      console.log('🧪 [LOVABLE TEST] Testing SEOAgent robots.txt:', seoagentRobotsUrl);
      
      // Test SEOAgent robots endpoint  
      let seoagentRobotsWorking = false;
      try {
        const seoagentRobotsResponse = await fetch(seoagentRobotsUrl, {
          method: 'GET',
          headers: { 'Accept': 'text/plain' }
        });
        
        if (seoagentRobotsResponse.ok) {
          const content = await seoagentRobotsResponse.text();
          if (content.includes('User-agent') || content.includes('Sitemap:')) {
            seoagentRobotsWorking = true;
            console.log('✅ [LOVABLE TEST] SEOAgent robots.txt endpoint working');
          }
        }
      } catch (err) {
        console.log('❌ [LOVABLE TEST] SEOAgent robots.txt endpoint failed:', err);
      }

      // Step 2: Test Lovable proxy endpoints
      console.log('🧪 [LOVABLE TEST] Step 2: Testing Lovable proxy endpoints');
      const lovableSitemapUrl = `https://${normalizedDomain}/sitemap.xml`;
      const lovableRobotsUrl = `https://${normalizedDomain}/robots.txt`;
      
      console.log('🧪 [LOVABLE TEST] Testing Lovable sitemap proxy:', lovableSitemapUrl);
      
      // Test sitemap.xml proxy
      let sitemapResult: 'success' | 'error' = 'error';
      let sitemapError = '';
      
      if (!seoagentSitemapWorking) {
        sitemapError = 'SEOAgent source endpoint not working - check https://seoagent.com/sitemaps/' + normalizedDomain + '.xml first';
        console.log('❌ [LOVABLE TEST] Skipping Lovable sitemap test - source not working');
      } else {
        try {
          const sitemapResponse = await fetch(lovableSitemapUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/xml, text/xml' }
          });
          
          if (sitemapResponse.ok) {
            const sitemapContent = await sitemapResponse.text();
            // Check if the content looks like it's from SEOAgent
            if (sitemapContent.includes('seoagent.com') || sitemapContent.includes('<urlset') || sitemapContent.includes('SEOAgent')) {
              sitemapResult = 'success';
              console.log('✅ [LOVABLE TEST] Lovable sitemap proxy working');
            } else {
              sitemapError = 'Sitemap found but doesn&apos;t appear to be from SEOAgent proxy';
              console.log('❌ [LOVABLE TEST] Lovable sitemap content not from SEOAgent:', sitemapContent.substring(0, 200));
            }
          } else {
            sitemapError = `HTTP ${sitemapResponse.status}: ${sitemapResponse.statusText}`;
            console.log('❌ [LOVABLE TEST] Lovable sitemap HTTP error:', sitemapResponse.status);
          }
        } catch (sitemapErr: any) {
          sitemapError = sitemapErr.message || 'Network error';
          console.log('❌ [LOVABLE TEST] Lovable sitemap fetch error:', sitemapErr);
        }
      }

      console.log('🧪 [LOVABLE TEST] Testing Lovable robots.txt proxy:', lovableRobotsUrl);
      
      // Test robots.txt proxy
      let robotsResult: 'success' | 'error' = 'error';
      let robotsError = '';
      
      if (!seoagentRobotsWorking) {
        robotsError = 'SEOAgent source endpoint not working - check https://seoagent.com/robots/' + normalizedDomain + '.txt first';
        console.log('❌ [LOVABLE TEST] Skipping Lovable robots.txt test - source not working');
      } else {
        try {
          const robotsResponse = await fetch(lovableRobotsUrl, {
            method: 'GET',
            headers: { 'Accept': 'text/plain' }
          });
          
          if (robotsResponse.ok) {
            const robotsContent = await robotsResponse.text();
            // Check if the content looks like it's from SEOAgent
            if (robotsContent.includes('User-agent') || robotsContent.includes('seoagent.com') || robotsContent.includes('SEOAgent')) {
              robotsResult = 'success';
              console.log('✅ [LOVABLE TEST] Lovable robots.txt proxy working');
            } else {
              robotsError = 'Robots.txt found but doesn&apos;t appear to be from SEOAgent proxy';
              console.log('❌ [LOVABLE TEST] Lovable robots.txt content not from SEOAgent:', robotsContent.substring(0, 200));
            }
          } else {
            robotsError = `HTTP ${robotsResponse.status}: ${robotsResponse.statusText}`;
            console.log('❌ [LOVABLE TEST] Lovable robots.txt HTTP error:', robotsResponse.status);
          }
        } catch (robotsErr: any) {
          robotsError = robotsErr.message || 'Network error';
          console.log('❌ [LOVABLE TEST] Lovable robots.txt fetch error:', robotsErr);
        }
      }

      setTestStatus({
        testing: false,
        sitemapResult,
        robotsResult,
        sitemapError: sitemapResult === 'error' ? sitemapError : undefined,
        robotsError: robotsResult === 'error' ? robotsError : undefined
      });

      console.log('🧪 [LOVABLE TEST] Test complete:', { 
        seoagentSitemapWorking, 
        seoagentRobotsWorking, 
        sitemapResult, 
        robotsResult 
      });

    } catch (error) {
      console.error('🧪 [LOVABLE TEST] General test error:', error);
      setTestStatus({
        testing: false,
        sitemapResult: 'error',
        robotsResult: 'error',
        sitemapError: 'Test failed to complete',
        robotsError: 'Test failed to complete'
      });
    }
  };

  const lovablePrompt = `Please wire my site to use SEOAgent for sitemap and robots.

If this project uses the Next.js App Router, add two files exactly as below and redeploy:

app/sitemap.xml/route.ts and app/robots.txt/route.ts (use the full contents I provide).

If App Router isn&apos;t available, then create vercel.json at the repo root with these rewrites and redeploy:

{
  "rewrites": [
    { "source": "/sitemap.xml", "destination": "https://seoagent.com/sitemaps/${normalizedDomain}.xml" },
    { "source": "/robots.txt",  "destination": "https://seoagent.com/robots/${normalizedDomain}.txt" }
  ]
}


Replace ${normalizedDomain} with the live domain. After deploy, confirm:

https://${normalizedDomain}/sitemap.xml returns the SEOAgent sitemap

https://${normalizedDomain}/robots.txt returns the SEOAgent robots

If verification fails, switch to the code approach in step 1.`;

  const sitemapRouteCode = `import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const sitemapUrl = 'https://seoagent.com/sitemaps/${normalizedDomain}.xml';
    const response = await fetch(sitemapUrl);
    
    if (!response.ok) {
      throw new Error('Failed to fetch sitemap');
    }
    
    const sitemapData = await response.text();
    
    return new NextResponse(sitemapData, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    });
  } catch (error) {
    console.error('Error serving sitemap:', error);
    return new NextResponse('Sitemap not available', { status: 500 });
  }
}`;

  const robotsRouteCode = `import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const robotsUrl = 'https://seoagent.com/robots/${normalizedDomain}.txt';
    const response = await fetch(robotsUrl);
    
    if (!response.ok) {
      throw new Error('Failed to fetch robots.txt');
    }
    
    const robotsData = await response.text();
    
    return new NextResponse(robotsData, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    });
  } catch (error) {
    console.error('Error serving robots.txt:', error);
    return new NextResponse('User-agent: *\\nDisallow:', { 
      headers: { 'Content-Type': 'text/plain' },
      status: 500 
    });
  }
}`;

  const vercelJsonCode = `{
  "rewrites": [
    { "source": "/sitemap.xml", "destination": "https://seoagent.com/sitemaps/${normalizedDomain}.xml" },
    { "source": "/robots.txt",  "destination": "https://seoagent.com/robots/${normalizedDomain}.txt" }
  ]
}`;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/10 dark:to-purple-900/10 border border-pink-200 dark:border-pink-800 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-pink-100 dark:bg-pink-900/20 rounded-lg">
            <span className="text-2xl">💖</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Lovable Setup Instructions</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Configure SEOAgent sitemap and robots.txt serving</p>
          </div>
        </div>
        
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
          Give these instructions to your Lovable agent to set up automatic SEO file serving for <strong>{normalizedDomain}</strong>:
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
          <h4 className="font-medium text-gray-900 dark:text-gray-100">Alternative: Manual File Creation</h4>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          If Lovable needs the exact file contents, provide these files:
        </p>

        <div className="space-y-4">
          {/* Sitemap Route */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                  app/sitemap.xml/route.ts
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
                  app/robots.txt/route.ts
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

          {/* Vercel.json Alternative */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                  vercel.json (if App Router not available)
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(vercelJsonCode, 'vercel')}
                className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
              >
                {copiedSection === 'vercel' ? (
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
              <pre>{vercelJsonCode}</pre>
            </div>
          </div>
        </div>
      </div>

      {/* Step 3: Verification */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex items-center justify-center w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-full">
            <span className="text-purple-600 dark:text-purple-400 font-semibold text-sm">3</span>
          </div>
          <h4 className="font-medium text-gray-900 dark:text-gray-100">Verify Setup</h4>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          After deployment, verify these URLs work correctly:
        </p>
        
        <div className="space-y-2">
          <a
            href={`https://${normalizedDomain}/sitemap.xml`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-mono text-gray-800 dark:text-gray-200">
              https://{normalizedDomain}/sitemap.xml
            </span>
          </a>
          
          <a
            href={`https://${normalizedDomain}/robots.txt`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-mono text-gray-800 dark:text-gray-200">
              https://{normalizedDomain}/robots.txt
            </span>
          </a>
        </div>
      </div>

      {/* Step 4: Test Connection */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex items-center justify-center w-8 h-8 bg-amber-100 dark:bg-amber-900/20 rounded-full">
            <span className="text-amber-600 dark:text-amber-400 font-semibold text-sm">4</span>
          </div>
          <h4 className="font-medium text-gray-900 dark:text-gray-100">Test SEOAgent Connection</h4>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Test if your deployment successfully serves SEOAgent sitemaps and robots.txt files:
        </p>

        <div className="space-y-3">
          <button
            onClick={testConnection}
            disabled={testStatus.testing}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              testStatus.testing
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40'
            }`}
          >
            {testStatus.testing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Testing Connection...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Test Connection</span>
              </>
            )}
          </button>

          {/* Test Results */}
          {(testStatus.sitemapResult !== 'pending' || testStatus.robotsResult !== 'pending') && (
            <div className="space-y-2">
              {/* Sitemap Result */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Sitemap Test:</span>
                  <span className="font-mono text-xs text-gray-500">
                    https://{normalizedDomain}/sitemap.xml
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {testStatus.sitemapResult === 'success' ? (
                    <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                      <Check className="w-4 h-4" />
                      <span className="text-sm font-medium">Success</span>
                    </div>
                  ) : testStatus.sitemapResult === 'error' ? (
                    <div className="flex items-center space-x-1 text-red-600 dark:text-red-400">
                      <X className="w-4 h-4" />
                      <span className="text-sm font-medium">Failed</span>
                    </div>
                  ) : null}
                </div>
              </div>

              {testStatus.sitemapError && (
                <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
                  {testStatus.sitemapError}
                </div>
              )}

              {/* Robots.txt Result */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Robots.txt Test:</span>
                  <span className="font-mono text-xs text-gray-500">
                    https://{normalizedDomain}/robots.txt
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {testStatus.robotsResult === 'success' ? (
                    <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                      <Check className="w-4 h-4" />
                      <span className="text-sm font-medium">Success</span>
                    </div>
                  ) : testStatus.robotsResult === 'error' ? (
                    <div className="flex items-center space-x-1 text-red-600 dark:text-red-400">
                      <X className="w-4 h-4" />
                      <span className="text-sm font-medium">Failed</span>
                    </div>
                  ) : null}
                </div>
              </div>

              {testStatus.robotsError && (
                <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
                  {testStatus.robotsError}
                </div>
              )}

              {/* Success Message */}
              {testStatus.sitemapResult === 'success' && testStatus.robotsResult === 'success' && (
                <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-sm text-green-700 dark:text-green-300">
                  <CheckCircle className="w-4 h-4" />
                  <span>🎉 Perfect! Both sitemap and robots.txt are serving SEOAgent content correctly.</span>
                </div>
              )}
            </div>
          )}
        </div>
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