'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import FeatureGate from '@/components/FeatureGate';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

export default function Keywords() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  return (
    <ProtectedRoute>
      <FeatureGate feature="keywordsTool">
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
                  
                  <div className="mb-8">
                    <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Keyword Research</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                      Discover high-performing keywords for your SEO strategy
                    </p>
                  </div>

                  <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
                    <div className="px-6 py-8">
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                          Coming Soon
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                          Advanced keyword research tools are currently in development. 
                          This will help you discover profitable keywords and analyze search trends.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </main>
            </div>
          </div>
        </div>
      </FeatureGate>
    </ProtectedRoute>
  );
}