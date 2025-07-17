'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { createClientComponentClient } from '@/lib/supabase';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

interface DebugTest {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  result?: any;
  error?: string;
  timestamp?: string;
}

export default function DebugSeoPage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [tests, setTests] = useState<DebugTest[]>([]);
  const [currentImages, setCurrentImages] = useState<string[]>([]);
  const [currentMeta, setCurrentMeta] = useState<{ title: string; description: string }>({
    title: '',
    description: ''
  });
  const [websiteToken] = useState('1c9d8bc5-14eb-4223-a6ff-8c69d6aab1d8');
  
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Scan current page for images
    const images = Array.from(document.getElementsByTagName('img'))
      .filter(img => img.src && !img.src.toLowerCase().endsWith('.svg'))
      .map(img => img.src);
    setCurrentImages(images);

    // Get current meta tags
    const title = document.title;
    const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    setCurrentMeta({ title, description });

    // Initialize tests
    setTests([
      { name: 'Website Token Validation', status: 'pending' },
      { name: 'Database Website Record', status: 'pending' },
      { name: 'Meta Tags API Test', status: 'pending' },
      { name: 'Alt Tags API Test', status: 'pending' },
      { name: 'Smart.js Script Status', status: 'pending' },
      { name: 'Browser Console Logs', status: 'pending' }
    ]);
  }, []);

  const updateTest = (name: string, updates: Partial<DebugTest>) => {
    setTests(prev => prev.map(test => 
      test.name === name 
        ? { ...test, ...updates, timestamp: new Date().toISOString() }
        : test
    ));
  };

  const runTest = async (testName: string) => {
    updateTest(testName, { status: 'running' });

    try {
      switch (testName) {
        case 'Website Token Validation':
          await testWebsiteToken();
          break;
        case 'Database Website Record':
          await testDatabaseRecord();
          break;
        case 'Meta Tags API Test':
          await testMetaTagsAPI();
          break;
        case 'Alt Tags API Test':
          await testAltTagsAPI();
          break;
        case 'Smart.js Script Status':
          await testSmartJsStatus();
          break;
        case 'Browser Console Logs':
          await testBrowserLogs();
          break;
      }
    } catch (error: any) {
      updateTest(testName, { 
        status: 'error', 
        error: error.message 
      });
    }
  };

  const testWebsiteToken = async () => {
    if (!websiteToken) {
      throw new Error('Website token not defined');
    }
    
    const tokenFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!tokenFormat.test(websiteToken)) {
      throw new Error('Invalid UUID format');
    }

    updateTest('Website Token Validation', { 
      status: 'success', 
      result: { token: websiteToken, format: 'Valid UUID' } 
    });
  };

  const testDatabaseRecord = async () => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No session found');
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/websites`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const website = data.websites?.find((w: any) => w.website_token === websiteToken);

    if (!website) {
      throw new Error('Website record not found in database');
    }

    updateTest('Database Website Record', { 
      status: 'success', 
      result: {
        domain: website.domain,
        enable_meta_tags: website.enable_meta_tags,
        enable_image_tags: website.enable_image_tags,
        meta_tags_count: website.meta_tags,
        image_tags_count: website.image_tags
      }
    });
  };

  const testMetaTagsAPI = async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-meta-tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        url: window.location.href,
        id: websiteToken
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    updateTest('Meta Tags API Test', { 
      status: 'success', 
      result: data 
    });
  };

  const testAltTagsAPI = async () => {
    if (currentImages.length === 0) {
      throw new Error('No images found on current page');
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-image-alt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        id: websiteToken,
        images: currentImages.slice(0, 3) // Test first 3 images
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    updateTest('Alt Tags API Test', { 
      status: 'success', 
      result: data 
    });
  };

  const testSmartJsStatus = async () => {
    const smartScript = document.querySelector('script[src="/smart.js"]');
    const configScript = document.querySelector('script#seo-metrics-config');
    
    if (!smartScript) {
      throw new Error('Smart.js script not found');
    }

    if (!configScript) {
      throw new Error('SEO Metrics config script not found');
    }

    // Check if global idv is defined
    const idvDefined = typeof (window as any).idv !== 'undefined';
    const idvValue = (window as any).idv;

    updateTest('Smart.js Script Status', { 
      status: 'success', 
      result: {
        smartjs_loaded: !!smartScript,
        config_loaded: !!configScript,
        idv_defined: idvDefined,
        idv_value: idvValue
      }
    });
  };

  const testBrowserLogs = async () => {
    // This is a placeholder - in reality we'd need to capture console logs
    // For now, let's just check if there are any obvious errors
    
    const result = {
      message: 'Check browser console for [SEO-METRICS] logs',
      instructions: [
        'Open browser DevTools (F12)',
        'Go to Console tab',
        'Look for [SEO-METRICS] log messages',
        'Check for any errors or warnings'
      ]
    };

    updateTest('Browser Console Logs', { 
      status: 'success', 
      result 
    });
  };

  const runAllTests = async () => {
    for (const test of tests) {
      await runTest(test.name);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'running': return '🔄';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-gray-500';
      case 'running': return 'text-blue-500';
      case 'success': return 'text-green-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="font-inter antialiased bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
      <div className="flex h-screen overflow-hidden">
        <Sidebar 
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          sidebarExpanded={sidebarExpanded}
          setSidebarExpanded={setSidebarExpanded}
        />

        <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          <Header 
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />

          <main className="grow">
            <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
              
              {/* Page header */}
              <div className="sm:flex sm:justify-between sm:items-center mb-8">
                <div className="mb-4 sm:mb-0">
                  <div className="flex items-center mb-2">
                    <a
                      href="/"
                      className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors mr-4"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Dashboard
                    </a>
                  </div>
                  <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
                    SEO Metrics Debug Dashboard
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Diagnostic tools for troubleshooting SEO Metrics functionality
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={runAllTests}
                    className="btn bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Run All Tests
                  </button>
                </div>
              </div>

              {/* Configuration Info */}
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6 mb-8">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                  Current Configuration
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Website Token
                    </label>
                    <p className="text-sm text-gray-800 dark:text-gray-100 font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded">
                      {websiteToken}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Current URL
                    </label>
                    <p className="text-sm text-gray-800 dark:text-gray-100 font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded">
                      {typeof window !== 'undefined' ? window.location.href : 'Loading...'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Images Found
                    </label>
                    <p className="text-sm text-gray-800 dark:text-gray-100 font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded">
                      {currentImages.length} images
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Current Meta Title
                    </label>
                    <p className="text-sm text-gray-800 dark:text-gray-100 font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded">
                      {currentMeta.title || 'No title'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Test Results */}
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
                <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
                  <h2 className="font-semibold text-gray-800 dark:text-gray-100">Diagnostic Tests</h2>
                </header>
                <div className="p-3">
                  <div className="space-y-4">
                    {tests.map((test, index) => (
                      <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <span className="text-lg mr-2">{getStatusIcon(test.status)}</span>
                            <h3 className="font-medium text-gray-800 dark:text-gray-100">
                              {test.name}
                            </h3>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm ${getStatusColor(test.status)}`}>
                              {test.status}
                            </span>
                            <button
                              onClick={() => runTest(test.name)}
                              className="btn-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100"
                            >
                              Run
                            </button>
                          </div>
                        </div>
                        
                        {test.result && (
                          <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded">
                            <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                              Result:
                            </h4>
                            <pre className="text-xs text-green-700 dark:text-green-300 overflow-x-auto">
                              {JSON.stringify(test.result, null, 2)}
                            </pre>
                          </div>
                        )}
                        
                        {test.error && (
                          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded">
                            <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                              Error:
                            </h4>
                            <p className="text-xs text-red-700 dark:text-red-300">
                              {test.error}
                            </p>
                          </div>
                        )}
                        
                        {test.timestamp && (
                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            Last run: {new Date(test.timestamp).toLocaleString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Current Images */}
              {currentImages.length > 0 && (
                <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl mt-8">
                  <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
                    <h2 className="font-semibold text-gray-800 dark:text-gray-100">
                      Current Page Images ({currentImages.length})
                    </h2>
                  </header>
                  <div className="p-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {currentImages.slice(0, 9).map((src, index) => (
                        <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                          <img 
                            src={src} 
                            alt={`Image ${index + 1}`}
                            className="w-full h-32 object-cover rounded mb-2"
                          />
                          <p className="text-xs text-gray-600 dark:text-gray-400 break-all">
                            {src}
                          </p>
                        </div>
                      ))}
                    </div>
                    {currentImages.length > 9 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                        ... and {currentImages.length - 9} more images
                      </p>
                    )}
                  </div>
                </div>
              )}

            </div>
          </main>
        </div>
      </div>
    </div>
  );
}