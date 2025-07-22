'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import FeatureGate from '@/components/FeatureGate';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import CMSConnectionWizard from '@/components/CMSConnectionWizard';
import CMSConnectionsList from '@/components/CMSConnectionsList';

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

export default function CMSConnections() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [connections, setConnections] = useState<CMSConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.token) {
      fetchConnections();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchConnections = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[CMS CONNECTIONS UI] Fetching connections for user:', user?.token);
      
      const response = await fetch(`/api/cms/connections?userToken=${user?.token}`);
      
      if (!response.ok) {
        // Try to get the error message from the response
        let errorMessage = 'Failed to fetch CMS connections';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error('[CMS CONNECTIONS UI] API error:', errorData);
        } catch (parseError) {
          console.error('[CMS CONNECTIONS UI] Failed to parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('[CMS CONNECTIONS UI] Received data:', data);
      
      if (data.message) {
        console.log('[CMS CONNECTIONS UI] API message:', data.message);
      }
      
      setConnections(data.connections || []);
    } catch (err) {
      console.error('[CMS CONNECTIONS UI] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectionAdded = () => {
    setShowForm(false);
    fetchConnections();
  };

  const handleConnectionDeleted = (connectionId: number) => {
    setConnections(prev => prev.filter(conn => conn.id !== connectionId));
  };

  const handleConnectionUpdated = () => {
    fetchConnections();
  };

  return (
    <ProtectedRoute>
      <FeatureGate feature="articleGeneration">
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
                  
                  <div className="mb-8 flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">CMS Connections</h1>
                      <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Connect your content management systems for automated article publishing
                      </p>
                    </div>
                    <button
                      onClick={() => setShowForm(true)}
                      className="btn bg-violet-600 hover:bg-violet-700 text-white"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Connect CMS
                    </button>
                  </div>

                  {showForm && (
                    <div className="mb-8">
                      <CMSConnectionWizard
                        onComplete={handleConnectionAdded}
                        onCancel={() => setShowForm(false)}
                      />
                    </div>
                  )}

                  {loading ? (
                    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
                      <div className="p-8 text-center">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600 dark:text-gray-400">Loading CMS connections...</p>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
                      <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Error Loading Connections</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                        <button
                          onClick={fetchConnections}
                          className="btn bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Try Again
                        </button>
                      </div>
                    </div>
                  ) : connections.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
                      <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                          No CMS Connections
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                          Connect your Strapi or other CMS to start automated article publishing.
                        </p>
                        <button
                          onClick={() => setShowForm(true)}
                          className="btn bg-violet-600 hover:bg-violet-700 text-white"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Get Started
                        </button>
                      </div>
                    </div>
                  ) : (
                    <CMSConnectionsList
                      connections={connections}
                      onConnectionDeleted={handleConnectionDeleted}
                      onConnectionUpdated={handleConnectionUpdated}
                    />
                  )}
                </div>
              </main>
            </div>
          </div>
        </div>
      </FeatureGate>
    </ProtectedRoute>
  );
}