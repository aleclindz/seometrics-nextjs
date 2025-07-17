'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import SnippetModal from '@/components/SnippetModal';
import { useAuth } from '@/contexts/auth';
import { createClientComponentClient } from '@/lib/supabase';

interface WebsiteData {
  url: string;
  website_token: string;
  enable_image_tags: boolean;
  enable_meta_tags: boolean;
  language: string;
  created_at: string;
  image_tags: number;
  meta_tags: number;
}

export default function WebsiteIntegrationPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [website, setWebsite] = useState<WebsiteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [snippetModalOpen, setSnippetModalOpen] = useState(false);
  
  const { user } = useAuth();
  const supabase = createClientComponentClient();
  const params = useParams();
  const token = params.token as string;

  useEffect(() => {
    const fetchWebsite = async () => {
      if (!user || !token) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setError('No session found');
          return;
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/websites`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.websites) {
          const foundWebsite = data.websites.find((w: any) => w.website_token === token);
          if (foundWebsite) {
            setWebsite({
              url: foundWebsite.url,
              website_token: foundWebsite.website_token,
              enable_image_tags: foundWebsite.enable_image_tags,
              enable_meta_tags: foundWebsite.enable_meta_tags,
              language: foundWebsite.language,
              created_at: foundWebsite.created_at,
              image_tags: foundWebsite.image_tags || 0,
              meta_tags: foundWebsite.meta_tags || 0
            });
          } else {
            setError('Website not found');
          }
        }
      } catch (error) {
        console.error('Error fetching website:', error);
        setError('Failed to fetch website data');
      } finally {
        setLoading(false);
      }
    };

    fetchWebsite();
  }, [user, token, supabase]);

  const copyToClipboard = async () => {
    if (!website) return;
    
    const snippet = `<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/smart.js"></script>
<script>
const idv = '${website.website_token}';
</script>`;
    
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  if (loading) {
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
            <main className="grow flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center animate-pulse mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Loading website...
                </h2>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  if (error || !website) {
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
            <main className="grow flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Error Loading Website
                </h2>
                <p className="text-gray-600 dark:text-gray-400">{error}</p>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

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
                    Website Integration - {website.url}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Copy the JavaScript code below and paste it into your website
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {website.image_tags} alt-tags • {website.meta_tags} meta-tags
                  </div>
                </div>
              </div>

              {/* Website stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
                  <div className="flex items-center">
                    <div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg">
                      <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</h3>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white">Active</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
                  <div className="flex items-center">
                    <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Image Alt-Tags</h3>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white">{website.image_tags}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
                  <div className="flex items-center">
                    <div className="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                      <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Meta-Tags</h3>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white">{website.meta_tags}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* JavaScript snippet */}
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
                <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
                  <h2 className="font-semibold text-gray-800 dark:text-gray-100">JavaScript Integration Code</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Copy and paste this code just before the closing &lt;/body&gt; tag on your website
                  </p>
                </header>
                <div className="p-5">
                  <div className="mb-4">
                    <textarea
                      className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono resize-none"
                      rows={4}
                      readOnly
                      value={`<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/smart.js"></script>
<script>
const idv = '${website.website_token}';
</script>`}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => setSnippetModalOpen(true)}
                      className="btn bg-violet-600 hover:bg-violet-700 text-white"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      View Integration Code
                    </button>
                    <div className="flex space-x-2">
                      <a
                        href={`/alt-tags/${website.website_token}`}
                        className="btn bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
                      >
                        View Alt-tags
                      </a>
                      <a
                        href={`/meta-tags/${website.website_token}`}
                        className="btn bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
                      >
                        View Meta-tags
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Configuration */}
              <div className="mt-8 bg-white dark:bg-gray-800 shadow-sm rounded-xl">
                <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
                  <h2 className="font-semibold text-gray-800 dark:text-gray-100">Configuration</h2>
                </header>
                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Features Enabled</h3>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-3 ${website.enable_image_tags ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            AI Image Alt-Tags {website.enable_image_tags ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-3 ${website.enable_meta_tags ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            AI Meta-Tags {website.enable_meta_tags ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Settings</h3>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Language:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">{website.language}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Added:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {new Date(website.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </main>
        </div>
      </div>
      
      {/* Snippet Modal */}
      <SnippetModal
        isOpen={snippetModalOpen}
        onClose={() => setSnippetModalOpen(false)}
        websiteToken={website?.website_token || ''}
        websiteUrl={website?.url || ''}
      />
    </div>
  );
}