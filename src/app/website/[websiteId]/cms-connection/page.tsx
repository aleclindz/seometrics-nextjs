'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import OneClickCMSConnection from '@/components/OneClickCMSConnection';

interface CMSConnection {
  id: number;
  connection_name: string;
  cms_type: string;
  base_url: string;
  content_type: string;
  status: string;
  website_id: number;
  website_domain?: string;
  last_sync_at?: string;
  error_message?: string;
}

interface Website {
  id: string;
  url: string;
  name: string;
}

export default function WebsiteCMSConnection() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const websiteId = params.websiteId as string;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [website, setWebsite] = useState<Website | null>(null);
  const [connections, setConnections] = useState<CMSConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.token || !websiteId) return;

      try {
        // Get website details
        const sitesResponse = await fetch(`/api/chat/sites?userToken=${user.token}`);
        if (!sitesResponse.ok) {
          throw new Error('Failed to fetch website data');
        }

        const { sites } = await sitesResponse.json();
        const currentWebsite = sites.find((site: any) => site.id === websiteId);
        
        if (!currentWebsite) {
          router.push('/dashboard');
          return;
        }

        setWebsite({
          id: currentWebsite.id,
          url: currentWebsite.url,
          name: currentWebsite.name || currentWebsite.url
        });

        // Get CMS connections for this website
        const cmsResponse = await fetch(`/api/cms/connections?userToken=${user.token}`);
        if (cmsResponse.ok) {
          const cmsData = await cmsResponse.json();
          // Filter connections for this specific website
          const websiteConnections = cmsData.filter((conn: CMSConnection) => 
            conn.website_domain === currentWebsite.url || 
            conn.website_id?.toString() === websiteId
          );
          setConnections(websiteConnections);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load website data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, websiteId, router]);

  const handleConnectionComplete = (connection: any) => {
    console.log('CMS connection completed:', connection);
    // Refresh connections list
    if (user?.token) {
      fetchConnections();
    }
  };

  const fetchConnections = async () => {
    if (!user?.token) return;

    try {
      const response = await fetch(`/api/cms/connections?userToken=${user.token}`);
      if (response.ok) {
        const data = await response.json();
        const websiteConnections = data.filter((conn: CMSConnection) => 
          conn.website_domain === website?.url || 
          conn.website_id?.toString() === websiteId
        );
        setConnections(websiteConnections);
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
    }
  };

  const handleDisconnect = async (connectionId: number) => {
    if (!user?.token) return;

    try {
      const response = await fetch(`/api/cms/connections/${connectionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setConnections(connections.filter(conn => conn.id !== connectionId));
      } else {
        throw new Error('Failed to disconnect CMS');
      }
    } catch (error) {
      console.error('Error disconnecting CMS:', error);
      setError('Failed to disconnect CMS');
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
            <main className="grow">
              <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  if (!website) {
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
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Website Not Found</h1>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="btn bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    Return to Dashboard
                  </button>
                </div>
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
              
              {/* Page header */}
              <div className="sm:flex sm:justify-between sm:items-center mb-8">
                <div className="mb-4 sm:mb-0">
                  <nav className="flex mb-4" aria-label="Breadcrumb">
                    <ol className="inline-flex items-center space-x-1 md:space-x-3">
                      <li className="inline-flex items-center">
                        <button
                          onClick={() => router.push('/dashboard')}
                          className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-violet-600 dark:text-gray-400 dark:hover:text-white"
                        >
                          Dashboard
                        </button>
                      </li>
                      <li>
                        <div className="flex items-center">
                          <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                          <button
                            onClick={() => router.push(`/website/${websiteId}`)}
                            className="ml-1 text-sm font-medium text-gray-700 hover:text-violet-600 dark:text-gray-400 dark:hover:text-white md:ml-2"
                          >
                            {website.name}
                          </button>
                        </div>
                      </li>
                      <li>
                        <div className="flex items-center">
                          <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2 dark:text-gray-400">
                            CMS Connection
                          </span>
                        </div>
                      </li>
                    </ol>
                  </nav>
                  <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
                    CMS Connection
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Connect {website.name} to your content management system
                  </p>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Existing Connections */}
              {connections.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Current Connections
                  </h2>
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Connected CMS Platforms</h3>
                    </div>
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {connections.map((connection) => (
                        <div key={connection.id} className="px-6 py-4 flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900/20 rounded-lg flex items-center justify-center">
                                <svg className="w-4 h-4 text-violet-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                                </svg>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {connection.connection_name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {connection.cms_type.charAt(0).toUpperCase() + connection.cms_type.slice(1)} • {connection.base_url}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              {connection.status === 'active' ? (
                                <>
                                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                  <span className="text-sm text-green-700 dark:text-green-400">Active</span>
                                </>
                              ) : (
                                <>
                                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                                  <span className="text-sm text-red-700 dark:text-red-400">Error</span>
                                </>
                              )}
                            </div>
                            <button
                              onClick={() => handleDisconnect(connection.id)}
                              className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Disconnect
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* CMS Connection Component */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {connections.length > 0 ? 'Add Another Connection' : 'Connect Your CMS'}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Choose your content management system to enable automated publishing for {website.name}
                  </p>
                </div>

                <OneClickCMSConnection
                  onConnectionComplete={handleConnectionComplete}
                />
              </div>

            </div>
          </main>
        </div>
      </div>
    </div>
  );
}