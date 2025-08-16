'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import GSCConnection from './GSCConnection';
import { useAuth } from '@/contexts/auth';
import { UrlNormalizationService } from '@/lib/UrlNormalizationService';

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [managedWebsites, setManagedWebsites] = useState<Array<{
    id: string;
    domain: string;
    website_token: string;
    is_managed: boolean;
    created_at: string;
    metrics?: {
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
      dateStart?: string;
      dateEnd?: string;
    };
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [gscConnected, setGscConnected] = useState(false);
  const [checkingGsc, setCheckingGsc] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userPlan, setUserPlan] = useState<{ plan_id: string; maxSites: number } | null>(null);
  
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
        
        // Fetch user plan information
        try {
          const planResponse = await fetch(`/api/subscription/manage?userToken=${userToken}`);
          const planData = await planResponse.json();
          
          if (planData.success && planData.plan) {
            const planId = planData.plan.tier || 'free';
            const planLimits = {
              free: 0,
              starter: 1,
              pro: 5,
              enterprise: -1
            };
            const maxSites = planLimits[planId as keyof typeof planLimits] || 1;
            setUserPlan({ plan_id: planId, maxSites });
          }
        } catch (error) {
          console.error('Error fetching user plan:', error);
        }
        
        // Check GSC connection status first
        const gscResponse = await fetch(`/api/gsc/connection?userToken=${userToken}`);
        const gscData = await gscResponse.json();
        
        console.log('GSC connection status:', gscData);
        setGscConnected(gscData.connected || false);
        setCheckingGsc(false);
        
        // If GSC is connected, fetch managed websites
        if (gscData.connected) {
          const websitesResponse = await fetch(`/api/websites?userToken=${userToken}`);
          if (websitesResponse.ok) {
            const websitesData = await websitesResponse.json();
            
            if (websitesData.success && websitesData.websites) {
              console.log('Managed websites data:', websitesData.websites);
              
              // Filter for only managed websites and format for dashboard
              const managedOnly = websitesData.websites
                .filter((website: any) => website.is_managed)
                .map((website: any) => ({
                  id: website.id,
                  domain: website.domain,
                  website_token: website.website_token,
                  is_managed: website.is_managed,
                  created_at: website.created_at,
                  metrics: undefined // TODO: Fetch GSC metrics for managed websites
                }));

              setManagedWebsites(managedOnly);
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

  const refreshManagedWebsitesData = async () => {
    if (!user || !user.token) return;
    
    setRefreshing(true);
    
    try {
      // Use token from auth context
      const userToken = user.token;
      
      // Refresh managed websites data
      const websitesResponse = await fetch(`/api/websites?userToken=${userToken}`);
      if (!websitesResponse.ok) {
        throw new Error('Failed to fetch updated website data');
      }
      
      const websitesData = await websitesResponse.json();
      if (websitesData.success && websitesData.websites) {
        // Filter for only managed websites and format for dashboard
        const managedOnly = websitesData.websites
          .filter((website: any) => website.is_managed)
          .map((website: any) => ({
            id: website.id,
            domain: website.domain,
            website_token: website.website_token,
            is_managed: website.is_managed,
            created_at: website.created_at,
            metrics: undefined // TODO: Fetch GSC metrics for managed websites
          }));

        setManagedWebsites(managedOnly);
      }
    } catch (error) {
      console.error('Error refreshing managed websites data:', error);
      alert(`Failed to refresh data: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setRefreshing(false);
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
                    onClick={refreshManagedWebsitesData}
                    disabled={refreshing}
                    className="btn bg-gray-200 hover:bg-gray-300 disabled:bg-gray-300 disabled:cursor-not-allowed text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:disabled:bg-gray-600 dark:text-gray-200"
                  >
                    {refreshing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-800 dark:border-gray-200 mr-2"></div>
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh Data
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* GSC Connection or No Connection State */}
              {!checkingGsc && !gscConnected && (
                <div className="mb-8">
                  <GSCConnection onConnectionChange={handleGscConnectionChange} />
                </div>
              )}

              {/* Pro Plan Promotion for users with Pro plan but only 1 managed website */}
              {!checkingGsc && gscConnected && userPlan?.plan_id === 'pro' && managedWebsites.length === 1 && (
                <div className="mb-6 p-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-lg border border-violet-200 dark:border-violet-700">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-violet-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <h3 className="text-sm font-medium text-violet-800 dark:text-violet-200">
                        🚀 Pro Plan: Add More Websites
                      </h3>
                      <div className="mt-2 text-sm text-violet-700 dark:text-violet-300">
                        <p className="mb-3">
                          You&apos;re currently managing 1 website, but your Pro plan supports up to <strong>5 managed websites</strong>! 
                          Maximize your subscription value by managing more of your properties.
                        </p>
                        <div className="flex items-center space-x-4">
                          <div className="text-xs bg-violet-100 dark:bg-violet-800 px-2 py-1 rounded-full">
                            💡 Pro Tip: Manage your highest-traffic websites for maximum SEO impact
                          </div>
                          <a
                            href="/account"
                            className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-3 py-1 rounded font-medium transition-colors"
                          >
                            Add Websites
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Managed Websites */}
              {!checkingGsc && gscConnected && (
                <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
                  <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
                    <div className="flex justify-between items-center mb-2">
                      <h2 className="font-semibold text-gray-800 dark:text-gray-100">Your Managed Websites</h2>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {managedWebsites.length} website{managedWebsites.length !== 1 ? 's' : ''} managed
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      These are the websites currently being optimized by SEOAgent
                    </div>
                  </header>
                  <div className="p-3">
                    {managedWebsites.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="table-auto w-full dark:text-gray-300">
                          <thead className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 dark:bg-opacity-50 rounded-sm">
                            <tr>
                              <th className="p-2">
                                <div className="font-semibold text-left">Domain</div>
                              </th>
                              <th className="p-2">
                                <div className="font-semibold text-center">Status</div>
                              </th>
                              <th className="p-2">
                                <div className="font-semibold text-center">Managed Since</div>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="text-sm font-medium divide-y divide-gray-100 dark:divide-gray-700/60">
                            {managedWebsites.map((website, index) => (
                              <tr key={website.website_token}>
                                <td className="p-2">
                                  <div className="text-left">
                                    <a
                                      href={`/website/${website.website_token}`}
                                      className="inline-flex items-center px-3 py-1.5 bg-gray-100 hover:bg-violet-100 dark:bg-gray-700 dark:hover:bg-violet-900/20 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-violet-600 dark:hover:text-violet-400 rounded-md transition-colors cursor-pointer"
                                    >
                                      {UrlNormalizationService.domainPropertyToHttps(website.domain).replace(/^https?:\/\//, '')}
                                    </a>
                                  </div>
                                </td>
                                <td className="p-2">
                                  <div className="text-center">
                                    <div className="text-xs inline-flex font-medium bg-green-500/20 text-green-700 rounded-full text-center px-2.5 py-1">
                                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                      Actively Managed
                                    </div>
                                  </div>
                                </td>
                                <td className="p-2">
                                  <div className="text-center text-gray-500 dark:text-gray-400 text-xs">
                                    {new Date(website.created_at).toLocaleDateString()}
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
                          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                            No Managed Websites
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 mb-6">
                            You need to select which websites SEOAgent should manage. Go to your account settings to choose your websites.
                          </p>
                          <div className="space-y-2">
                            <a
                              href="/account"
                              className="btn bg-violet-600 hover:bg-violet-700 text-white inline-flex items-center"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              </svg>
                              Manage Websites
                            </a>
                            <button
                              onClick={refreshManagedWebsitesData}
                              disabled={refreshing}
                              className="btn bg-gray-200 hover:bg-gray-300 disabled:bg-gray-300 disabled:cursor-not-allowed text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:disabled:bg-gray-600 dark:text-gray-200 inline-flex items-center ml-2"
                            >
                              {refreshing ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-800 dark:border-gray-200 mr-2"></div>
                                  Refreshing...
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  Refresh Data
                                </>
                              )}
                            </button>
                          </div>
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