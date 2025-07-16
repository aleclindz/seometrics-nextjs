'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
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
          const websiteData = data.websites.map((site: any) => ({
            url: site.domain,
            token: site.website_token,
            imageTags: site.image_tags,
            metaTags: site.meta_tags
          }));

          setWebsites(websiteData);
          
          // Calculate totals
          const totalStats = websiteData.reduce(
            (acc, site) => ({
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
              </div>

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
                            <th></th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody className="text-sm font-medium divide-y divide-gray-100 dark:divide-gray-700/60">
                          {websites.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-4 text-center">
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
                                  <div className="text-center">{website.url}</div>
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
    </div>
  );
}