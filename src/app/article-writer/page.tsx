'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import FeatureGate from '@/components/FeatureGate';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

export default function ArticleWriter() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

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
                  
                  <div className="mb-8">
                    <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Article Writer</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                      AI-powered article generation for your SEO content
                    </p>
                  </div>

                  <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
                    <div className="px-6 py-8">
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                          Coming Soon
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                          AI-powered article generation feature is currently in development. 
                          This will allow you to create high-quality, SEO-optimized articles automatically.
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