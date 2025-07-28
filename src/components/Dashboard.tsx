'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '@/contexts/auth';

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [gscWebsites, setGscWebsites] = useState<Array<{
    id: string;
    domain: string;
    gscStatus: string;
    lastSync?: Date;
    metrics?: {
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    };
  }>>([]);
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuth();

  useEffect(() => {
    const fetchGscWebsites = async () => {
      if (!user) return;

      try {
        // Get user token from auth
        const response = await fetch('/api/auth/get-token');
        if (!response.ok) {
          throw new Error('Failed to get user token');
        }
        
        const { userToken } = await response.json();
        
        // Fetch GSC websites
        const sitesResponse = await fetch(`/api/chat/sites?userToken=${userToken}`);
        if (!sitesResponse.ok) {
          throw new Error('Failed to fetch GSC websites');
        }
        
        const sitesData = await sitesResponse.json();
        
        if (sitesData.success && sitesData.sites) {
          console.log('GSC websites data:', sitesData.sites);
          
          const formattedWebsites = sitesData.sites.map((site: any) => ({
            id: site.id,
            domain: site.url,
            gscStatus: site.gscStatus,
            lastSync: site.lastSync ? new Date(site.lastSync) : undefined,
            metrics: site.metrics
          }));

          setGscWebsites(formattedWebsites);
        }
      } catch (error) {
        console.error('Error fetching GSC websites:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGscWebsites();
  }, [user]);

  const refreshGscData = async () => {
    if (!user) return;
    
    try {
      // Get user token from auth
      const response = await fetch('/api/auth/get-token');
      if (!response.ok) {
        throw new Error('Failed to get user token');
      }
      
      const { userToken } = await response.json();
      
      // Trigger GSC properties refresh
      await fetch(`/api/gsc/properties?userToken=${userToken}`, {
        method: 'POST'
      });
      
      // Refresh the dashboard data
      const sitesResponse = await fetch(`/api/chat/sites?userToken=${userToken}`);
      if (sitesResponse.ok) {
        const sitesData = await sitesResponse.json();
        if (sitesData.success && sitesData.sites) {
          const formattedWebsites = sitesData.sites.map((site: any) => ({
            id: site.id,
            domain: site.url,
            gscStatus: site.gscStatus,
            lastSync: site.lastSync ? new Date(site.lastSync) : undefined,
            metrics: site.metrics
          }));
          setGscWebsites(formattedWebsites);
        }
      }
    } catch (error) {
      console.error('Error refreshing GSC data:', error);
      alert('Failed to refresh data. Please try again.');
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
                  Loading your data...
                </h2>
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
        {/* Sidebar */}
        <Sidebar 
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          sidebarExpanded={sidebarExpanded}
          setSidebarExpanded={setSidebarExpanded}
        />

        {/* Content area */}
        <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          {/* Header */}
          <Header 
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />

          {/* Main content */}
          <main className="grow">
            <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
              
              {/* Dashboard header */}
              <div className="sm:flex sm:justify-between sm:items-center mb-8">
                <div className="mb-4 sm:mb-0">
                  <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Dashboard</h1>
                </div>
                <div className="grid grid-flow-col sm:auto-cols-max justify-start sm:justify-end gap-2">
                  {/* AI Chat Toggle - matching violet theme */}
                  <a
                    href="/chat"
                    className="btn bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    AI Chat
                    <div className="w-2 h-2 bg-green-400 rounded-full ml-2"></div>
                  </a>
                  <button
                    onClick={refreshGscData}
                    className="btn bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh GSC
                  </button>
                </div>
              </div>

              {/* Connect to GSC if no websites */}
              {gscWebsites.length === 0 && (
                <div className="mb-8 text-center bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8">
                  <div className="max-w-md mx-auto">
                    <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-8 h-8 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2V7a2 2 0 012-2h2a2 2 0 002-2V1a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 002 2h2a2 2 0 012 2v2a2 2 0 00-2 2h-2a2 2 0 00-2 2v6a2 2 0 01-2 2H9z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                      Connect to Google Search Console
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Connect your Google Search Console to view your websites and start optimizing with AI.
                    </p>
                    <a
                      href="/websites"
                      className="btn bg-violet-600 hover:bg-violet-700 text-white inline-flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Connect GSC
                    </a>
                  </div>
                </div>
              )}

              {/* GSC Websites */}
              {gscWebsites.length > 0 && (
                <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
                  <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
                    <div className="flex justify-between items-center">
                      <h2 className="font-semibold text-gray-800 dark:text-gray-100">Your Websites from Google Search Console</h2>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {gscWebsites.length} website{gscWebsites.length !== 1 ? 's' : ''} found
                      </div>
                    </div>
                  </header>
                  <div className="p-3">
                    <div className="overflow-x-auto">
                      <table className="table-auto w-full dark:text-gray-300">
                        <thead className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 dark:bg-opacity-50 rounded-sm">
                          <tr>
                            <th className="p-2">
                              <div className="font-semibold text-left">Domain</div>
                            </th>
                            <th className="p-2">
                              <div className="font-semibold text-center">GSC Status</div>
                            </th>
                            <th className="p-2">
                              <div className="font-semibold text-center">Clicks</div>
                            </th>
                            <th className="p-2">
                              <div className="font-semibold text-center">Impressions</div>
                            </th>
                            <th className="p-2">
                              <div className="font-semibold text-center">CTR</div>
                            </th>
                            <th className="p-2">
                              <div className="font-semibold text-center">Position</div>
                            </th>
                            <th className="p-2">
                              <div className="font-semibold text-center">Last Sync</div>
                            </th>
                            <th className="p-2">
                              <div className="font-semibold text-center">Actions</div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="text-sm font-medium divide-y divide-gray-100 dark:divide-gray-700/60">
                          {gscWebsites.map((website, index) => (
                            <tr key={index}>
                              <td className="p-2">
                                <div className="text-left">
                                  <div className="font-medium text-gray-900 dark:text-gray-100">
                                    {website.domain}
                                  </div>
                                </div>
                              </td>
                              <td className="p-2">
                                <div className="text-center">
                                  {website.gscStatus === 'connected' ? (
                                    <div className="text-xs inline-flex font-medium bg-green-500/20 text-green-700 rounded-full text-center px-2.5 py-1">
                                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                      Connected
                                    </div>
                                  ) : (
                                    <div className="text-xs inline-flex font-medium bg-gray-500/20 text-gray-700 rounded-full text-center px-2.5 py-1">
                                      Not Connected
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="p-2">
                                <div className="text-center text-gray-900 dark:text-gray-100">
                                  {website.metrics?.clicks?.toLocaleString() || '-'}
                                </div>
                              </td>
                              <td className="p-2">
                                <div className="text-center text-gray-900 dark:text-gray-100">
                                  {website.metrics?.impressions?.toLocaleString() || '-'}
                                </div>
                              </td>
                              <td className="p-2">
                                <div className="text-center text-gray-900 dark:text-gray-100">
                                  {website.metrics?.ctr ? `${website.metrics.ctr.toFixed(2)}%` : '-'}
                                </div>
                              </td>
                              <td className="p-2">
                                <div className="text-center text-gray-900 dark:text-gray-100">
                                  {website.metrics?.position ? website.metrics.position.toFixed(1) : '-'}
                                </div>
                              </td>
                              <td className="p-2">
                                <div className="text-center text-gray-500 dark:text-gray-400 text-xs">
                                  {website.lastSync ? website.lastSync.toLocaleDateString() : 'Never'}
                                </div>
                              </td>
                              <td className="p-2">
                                <div className="text-center">
                                  <a
                                    href={`/chat?site=${website.id}`}
                                    className="btn bg-violet-600 hover:bg-violet-700 text-white text-sm"
                                  >
                                    Chat
                                  </a>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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