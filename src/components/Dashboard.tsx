'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import SnippetModal from './SnippetModal';
import OnboardingFlow from './OnboardingFlow';
import { useAuth } from '@/contexts/auth';
import { createClientComponentClient } from '@/lib/supabase';
import { generateToken } from '@/lib/utils';

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [stats, setStats] = useState({
    websites: 0,
    imageTags: 0,
    metaTags: 0
  });
  const [websites, setWebsites] = useState<Array<{
    url: string;
    token: string;
    imageTags: number;
    metaTags: number;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [snippetModalOpen, setSnippetModalOpen] = useState(false);
  const [selectedWebsite, setSelectedWebsite] = useState<{url: string; token: string} | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  
  const { user } = useAuth();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        // Get session for authorization
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.error('No session found');
          return;
        }

        // Call Edge Function to get websites
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/websites`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.websites) {
          console.log('Raw website data:', data.websites);
          const websiteData = data.websites.map((site: any) => ({
            url: site.domain || site.url,
            token: site.website_token,
            imageTags: site.image_tags || 0,
            metaTags: site.meta_tags || 0
          }));

          console.log('Mapped website data:', websiteData);
          setWebsites(websiteData);
          
          // Calculate totals
          const totalStats = websiteData.reduce(
            (acc: { websites: number; imageTags: number; metaTags: number }, site: { imageTags: number; metaTags: number }) => ({
              websites: acc.websites + 1,
              imageTags: acc.imageTags + site.imageTags,
              metaTags: acc.metaTags + site.metaTags
            }),
            { websites: 0, imageTags: 0, metaTags: 0 }
          );

          setStats(totalStats);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user, supabase]);

  const deleteWebsite = async (token: string, url: string) => {
    if (!user) return;
    
    const confirmed = window.confirm(`Are you sure you want to delete ${url}? This action cannot be undone.`);
    if (!confirmed) return;

    setDeleteLoading(token);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert('Please log in to delete websites');
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/websites`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ website_token: token }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Refresh the websites list
      const updatedWebsites = websites.filter(w => w.token !== token);
      setWebsites(updatedWebsites);
      
      // Update stats
      const totalStats = updatedWebsites.reduce(
        (acc: { websites: number; imageTags: number; metaTags: number }, site: { imageTags: number; metaTags: number }) => ({
          websites: acc.websites + 1,
          imageTags: acc.imageTags + site.imageTags,
          metaTags: acc.metaTags + site.metaTags
        }),
        { websites: 0, imageTags: 0, metaTags: 0 }
      );
      setStats(totalStats);

    } catch (error) {
      console.error('Error deleting website:', error);
      alert('Failed to delete website. Please try again.');
    } finally {
      setDeleteLoading(null);
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
                  <a
                    href="/add-website"
                    className="btn bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Website
                  </a>
                </div>
              </div>

              {/* Onboarding Flow for new users */}
              {websites.length === 0 && (
                <div className="mb-8">
                  <OnboardingFlow />
                </div>
              )}

              {/* Stats cards */}
              <div className="grid grid-cols-12 gap-6">
                
                {/* Websites card */}
                <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl">
                  <div className="px-5 pt-5">
                    <header className="flex justify-between items-start mb-2">
                      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Websites</h2>
                    </header>
                    <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1">Total</div>
                    <div className="flex items-start">
                      <div className="text-3xl font-bold text-gray-800 dark:text-gray-100 mr-2">{stats.websites}</div>
                    </div>
                  </div>
                  <br />
                  <br />
                </div>

                {/* Image Alt-Tags card */}
                <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl">
                  <div className="px-5 pt-5">
                    <header className="flex justify-between items-start mb-2">
                      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Image Alt-Tags</h2>
                    </header>
                    <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1">Total</div>
                    <div className="flex items-start">
                      <div className="text-3xl font-bold text-gray-800 dark:text-gray-100 mr-2">{stats.imageTags}</div>
                    </div>
                  </div>
                  <br />
                  <br />
                </div>

                {/* Meta-Tags card */}
                <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl">
                  <div className="px-5 pt-5">
                    <header className="flex justify-between items-start mb-2">
                      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Meta-Tags</h2>
                    </header>
                    <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1">Total</div>
                    <div className="flex items-start">
                      <div className="text-3xl font-bold text-gray-800 dark:text-gray-100 mr-2">{stats.metaTags}</div>
                    </div>
                  </div>
                  <br />
                  <br />
                </div>

                {/* Websites table */}
                <div className="col-span-full xl:col-span-12 bg-white dark:bg-gray-800 shadow-sm rounded-xl">
                  <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
                    <h2 className="font-semibold text-gray-800 dark:text-gray-100">Your Websites</h2>
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
                              <div className="font-semibold text-center">AI Tags Enabled</div>
                            </th>
                            <th className="p-2">
                              <div className="font-semibold text-center">Image Tags</div>
                            </th>
                            <th className="p-2">
                              <div className="font-semibold text-center">Meta Tags</div>
                            </th>
                            <th className="p-2">
                              <div className="font-semibold text-center">Alt Tags</div>
                            </th>
                            <th className="p-2">
                              <div className="font-semibold text-center">Meta Tags</div>
                            </th>
                            <th className="p-2">
                              <div className="font-semibold text-center">Integration</div>
                            </th>
                            <th className="p-2">
                              <div className="font-semibold text-center">Actions</div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="text-sm font-medium divide-y divide-gray-100 dark:divide-gray-700/60">
                          {websites.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="p-4 text-center">
                                <a 
                                  href="/add-website" 
                                  className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white inline-flex items-center"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                                    <path d="M12 5l0 14" />
                                    <path d="M5 12l14 0" />
                                  </svg>
                                  Add Website
                                </a>
                              </td>
                            </tr>
                          ) : (
                            websites.map((website, index) => (
                              <tr key={index}>
                                <td className="p-2">
                                  <div className="text-center">
                                    <a 
                                      href={`/website/${website.token}`}
                                      className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                                    >
                                      {website.url}
                                    </a>
                                  </div>
                                </td>
                                <td className="p-2">
                                  <div className="text-center text-green-500">
                                    <div className="text-xs inline-flex font-medium bg-green-500/20 text-green-700 rounded-full text-center px-2.5 py-1">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                                        <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"></path>
                                        <path d="M9 12l2 2l4 -4"></path>
                                      </svg>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-2">
                                  <div className="text-center">{website.imageTags}</div>
                                </td>
                                <td className="p-2">
                                  <div className="text-center">{website.metaTags}</div>
                                </td>
                                <td className="p-2">
                                  <div className="text-center">
                                    <a 
                                      href={`/alt-tags/${website.token}`}
                                      className="btn bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
                                    >
                                      View Alt-tags
                                    </a>
                                  </div>
                                </td>
                                <td className="p-2">
                                  <div className="text-center">
                                    <a 
                                      href={`/meta-tags/${website.token}`}
                                      className="btn bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
                                    >
                                      View Meta-tags
                                    </a>
                                  </div>
                                </td>
                                <td className="p-2">
                                  <div className="text-center">
                                    <button 
                                      onClick={() => {
                                        setSelectedWebsite({ url: website.url, token: website.token });
                                        setSnippetModalOpen(true);
                                      }}
                                      className="btn bg-violet-600 hover:bg-violet-700 text-white text-sm"
                                    >
                                      Snippet
                                    </button>
                                  </div>
                                </td>
                                <td className="p-2">
                                  <div className="text-center">
                                    <button 
                                      onClick={() => deleteWebsite(website.token, website.url)}
                                      disabled={deleteLoading === website.token}
                                      className="btn bg-red-600 hover:bg-red-700 text-white text-sm disabled:opacity-50"
                                    >
                                      {deleteLoading === website.token ? (
                                        <>
                                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                          </svg>
                                          Deleting...
                                        </>
                                      ) : (
                                        <>
                                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                          Delete
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </main>
        </div>
      </div>
      
      {/* Snippet Modal */}
      {selectedWebsite && (
        <SnippetModal
          isOpen={snippetModalOpen}
          onClose={() => {
            setSnippetModalOpen(false);
            setSelectedWebsite(null);
          }}
          websiteToken={selectedWebsite.token}
          websiteUrl={selectedWebsite.url}
        />
      )}
    </div>
  );
}