'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

interface Website {
  id: number;
  domain: string;
  language: string;
  enable_meta_tags: boolean;
  enable_image_tags: boolean;
  meta_tags: number;
  image_tags: number;
  website_token: string;
  created_at: string;
}

export default function Websites() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const router = useRouter();

  useEffect(() => {
    fetchWebsites();
  }, []);

  const fetchWebsites = async () => {
    try {
      const response = await fetch('/api/websites');
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to fetch websites');
        return;
      }

      setWebsites(data.websites || []);
    } catch (err) {
      setError('Failed to load websites');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
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
                  <div className="w-12 h-12 bg-violet-600 rounded-lg flex items-center justify-center animate-pulse mx-auto mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0 9c-5 0-9-4-9-9m9 9c5 0 9-4 9-9m-9 9v-9m0 9c-4 0-8-4-8-9s4-9 8-9m0 18V9" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Loading websites...
                  </h2>
                </div>
              </main>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
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
                
                <div className="sm:flex sm:justify-between sm:items-center mb-8">
                  <div className="mb-4 sm:mb-0">
                    <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">AI Tags</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                      Manage your websites and AI-powered SEO features
                    </p>
                  </div>
                  <div className="grid grid-flow-col sm:auto-cols-max justify-start sm:justify-end gap-2">
                    <button
                      onClick={() => router.push('/add-website')}
                      className="btn bg-violet-500 hover:bg-violet-600 text-white"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Website
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                    <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
                  </div>
                )}

                <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
                  <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
                    <h2 className="font-semibold text-gray-800 dark:text-gray-100">Your Websites</h2>
                  </header>
                  <div className="p-3">
                    {websites.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0 9c-5 0-9-4-9-9m9 9c5 0 9-4 9-9m-9 9v-9m0 9c-4 0-8-4-8-9s4-9 8-9m0 18V9" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No websites yet</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                          Add your first website to start generating AI-powered SEO content
                        </p>
                        <button
                          onClick={() => router.push('/add-website')}
                          className="btn bg-violet-500 hover:bg-violet-600 text-white"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Add Website
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="table-auto w-full dark:text-gray-300">
                          <thead className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 dark:bg-opacity-50 rounded-sm">
                            <tr>
                              <th className="p-2">
                                <div className="font-semibold text-left">Domain</div>
                              </th>
                              <th className="p-2">
                                <div className="font-semibold text-center">Language</div>
                              </th>
                              <th className="p-2">
                                <div className="font-semibold text-center">Meta Tags</div>
                              </th>
                              <th className="p-2">
                                <div className="font-semibold text-center">Image Tags</div>
                              </th>
                              <th className="p-2">
                                <div className="font-semibold text-center">Status</div>
                              </th>
                              <th className="p-2">
                                <div className="font-semibold text-center">Actions</div>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="text-sm font-medium divide-y divide-gray-100 dark:divide-gray-700/60">
                            {websites.map((website) => (
                              <tr key={website.id}>
                                <td className="p-2">
                                  <div className="text-left font-medium text-gray-800 dark:text-gray-100">
                                    {website.domain}
                                  </div>
                                </td>
                                <td className="p-2">
                                  <div className="text-center text-gray-600 dark:text-gray-400 capitalize">
                                    {website.language}
                                  </div>
                                </td>
                                <td className="p-2">
                                  <div className="text-center">
                                    <span className="text-gray-800 dark:text-gray-100 font-medium">
                                      {website.meta_tags}
                                    </span>
                                    {website.enable_meta_tags && (
                                      <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                                        (Enabled)
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-2">
                                  <div className="text-center">
                                    <span className="text-gray-800 dark:text-gray-100 font-medium">
                                      {website.image_tags}
                                    </span>
                                    {website.enable_image_tags && (
                                      <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                                        (Enabled)
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-2">
                                  <div className="text-center">
                                    <div className="text-xs inline-flex font-medium bg-green-500/20 text-green-700 dark:text-green-400 rounded-full text-center px-2.5 py-1">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                                        <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"></path>
                                        <path d="M9 12l2 2l4 -4"></path>
                                      </svg>
                                      Active
                                    </div>
                                  </div>
                                </td>
                                <td className="p-2">
                                  <div className="text-center space-x-2">
                                    <button
                                      onClick={() => router.push(`/meta-tags/${website.website_token}`)}
                                      className="btn bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-800 dark:text-gray-300 text-xs"
                                    >
                                      Meta Tags
                                    </button>
                                    <button
                                      onClick={() => router.push(`/alt-tags/${website.website_token}`)}
                                      className="btn bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-800 dark:text-gray-300 text-xs"
                                    >
                                      Alt Tags
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}