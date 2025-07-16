'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/auth';
import { createClientComponentClient } from '@/lib/supabase';

interface AltTag {
  id: number;
  image_url: string;
  alt_text: string;
  created_at: string;
  updated_at: string;
}

interface WebsiteData {
  domain: string;
  token: string;
  enable_image_tags: boolean;
  language: string;
}

export default function AltTagsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [altTags, setAltTags] = useState<AltTag[]>([]);
  const [website, setWebsite] = useState<WebsiteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const supabase = createClientComponentClient();
  const params = useParams();
  const token = params.token as string;

  useEffect(() => {
    const fetchAltTags = async () => {
      if (!user || !token) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setError('No session found');
          return;
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-alt-tags?token=${token}`,
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
        
        if (data.error) {
          setError(data.error);
        } else {
          setWebsite(data.website);
          setAltTags(data.alt_tags);
        }
      } catch (error) {
        console.error('Error fetching alt tags:', error);
        setError('Failed to fetch alt tags');
      } finally {
        setLoading(false);
      }
    };

    fetchAltTags();
  }, [user, token, supabase]);

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
                  Loading alt tags...
                </h2>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
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
                  Error Loading Alt Tags
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
                  <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
                    Alt Tags - {website?.domain}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Manage AI-generated alt tags for your website images
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Total: {altTags.length} alt tags
                  </div>
                  {website && !website.enable_image_tags && (
                    <div className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                      Image tags disabled
                    </div>
                  )}
                </div>
              </div>

              {/* Alt tags table */}
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
                <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
                  <h2 className="font-semibold text-gray-800 dark:text-gray-100">Generated Alt Tags</h2>
                </header>
                <div className="p-3">
                  <div className="overflow-x-auto">
                    <table className="table-auto w-full dark:text-gray-300">
                      <thead className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 dark:bg-opacity-50 rounded-sm">
                        <tr>
                          <th className="p-2 text-left">
                            <div className="font-semibold">Image</div>
                          </th>
                          <th className="p-2 text-left">
                            <div className="font-semibold">Image URL</div>
                          </th>
                          <th className="p-2 text-left">
                            <div className="font-semibold">Alt Text</div>
                          </th>
                          <th className="p-2 text-left">
                            <div className="font-semibold">Generated</div>
                          </th>
                          <th className="p-2 text-left">
                            <div className="font-semibold">Actions</div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="text-sm font-medium divide-y divide-gray-100 dark:divide-gray-700/60">
                        {altTags.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center">
                              <div className="text-gray-500 dark:text-gray-400">
                                <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-lg font-medium mb-2">No alt tags found</p>
                                <p>Add the JavaScript code to your website to start generating alt tags automatically.</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          altTags.map((altTag) => (
                            <tr key={altTag.id}>
                              <td className="p-2">
                                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                                  <img 
                                    src={altTag.image_url} 
                                    alt={altTag.alt_text}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                    }}
                                  />
                                </div>
                              </td>
                              <td className="p-2">
                                <div className="text-gray-800 dark:text-gray-100 break-all max-w-xs">
                                  <a 
                                    href={altTag.image_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                                  >
                                    {altTag.image_url.length > 50 
                                      ? `${altTag.image_url.substring(0, 50)}...` 
                                      : altTag.image_url}
                                  </a>
                                </div>
                              </td>
                              <td className="p-2">
                                <div className="text-gray-800 dark:text-gray-100 max-w-sm">
                                  {altTag.alt_text}
                                </div>
                              </td>
                              <td className="p-2">
                                <div className="text-gray-500 dark:text-gray-400 text-xs">
                                  {new Date(altTag.created_at).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="p-2">
                                <div className="flex space-x-2">
                                  <button className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm">
                                    Edit
                                  </button>
                                  <button className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm">
                                    Delete
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
          </main>
        </div>
      </div>
    </div>
  );
}