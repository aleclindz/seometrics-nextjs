'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import GSCConnection from './GSCConnection';
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
  const [gscConnected, setGscConnected] = useState(false);
  const [checkingGsc, setCheckingGsc] = useState(true);
  
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !user.token) {
        console.log('No user or token available:', { user: !!user, token: !!user?.token });
        return;
      }

      try {
        // Use token from auth context
        const userToken = user.token;
        
        // Check GSC connection status first
        const gscResponse = await fetch(`/api/gsc/connection?userToken=${userToken}`);
        const gscData = await gscResponse.json();
        
        console.log('GSC connection status:', gscData);
        setGscConnected(gscData.connected || false);
        setCheckingGsc(false);
        
        // If GSC is connected, fetch websites
        if (gscData.connected) {
          const sitesResponse = await fetch(`/api/chat/sites?userToken=${userToken}`);
          if (sitesResponse.ok) {
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
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleGscConnectionChange = (connected: boolean) => {
    console.log('GSC connection changed:', connected);
    setGscConnected(connected);
    
    // If GSC was just connected, refresh the data
    if (connected) {
      setTimeout(() => {
        window.location.reload(); // Simple refresh to reload all data
      }, 1000);
    }
  };

  const refreshGscData = async () => {
    if (!user || !user.token) return;
    
    try {
      // Use token from auth context
      const userToken = user.token;
      
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

              {/* GSC Connection or No Connection State */}
              {!checkingGsc && !gscConnected && (
                <div className="mb-8">
                  <GSCConnection onConnectionChange={handleGscConnectionChange} />
                </div>
              )}

              {/* GSC Websites */}
              {!checkingGsc && gscConnected && (
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
                    {gscWebsites.length > 0 ? (
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
                    ) : (
                      <div className="text-center py-8">
                        <div className="max-w-md mx-auto">
                          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                            Google Search Console Connected!
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Your GSC is connected but no websites were found. This may take a few moments to sync.
                          </p>
                          <button
                            onClick={refreshGscData}
                            className="btn bg-violet-600 hover:bg-violet-700 text-white inline-flex items-center"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Refresh Data
                          </button>
                        </div>
                      </div>
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