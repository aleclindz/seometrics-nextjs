'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

export default function Autopilot() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  return (
    <ProtectedRoute>
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
          {/* Site header */}
          <Header 
            sidebarOpen={sidebarOpen} 
            setSidebarOpen={setSidebarOpen} 
          />

          <main className="grow">
            <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
              
              {/* Page header */}
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
                      🤖 Autopilot
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                      Automated technical SEO monitoring and fixes for your websites
                    </p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-1">
                    <span className="text-green-700 text-sm font-medium">✨ Set & Forget</span>
                  </div>
                </div>
              </div>

              {/* Configuration Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                
                {/* Google Search Console Integration */}
                <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          Google Search Console
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Connect for automated performance monitoring
                        </p>
                      </div>
                    </div>
                    <div className="w-3 h-3 bg-red-500 rounded-full" title="Not connected"></div>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <span className="w-4 h-4 mr-2">📊</span>
                      Daily performance monitoring
                    </div>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <span className="w-4 h-4 mr-2">🔍</span>
                      Core Web Vitals tracking
                    </div>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <span className="w-4 h-4 mr-2">⚡</span>
                      Automated issue detection
                    </div>
                  </div>
                  
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                    Connect Google Search Console
                  </button>
                </div>

                {/* Smart.js Tracking Script */}
                <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          Smart.js Tracking
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Install tracking script for real-time monitoring
                        </p>
                      </div>
                    </div>
                    <div className="w-3 h-3 bg-red-500 rounded-full" title="Not installed"></div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 mb-4">
                    <code className="text-sm text-gray-700 dark:text-gray-300">
                      &lt;script src=&ldquo;https://agent.seoagent.com/smart.js&rdquo; data-site-id=&ldquo;your-site-id&rdquo;&gt;&lt;/script&gt;
                    </code>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <span className="w-4 h-4 mr-2">🚀</span>
                      Real-time performance tracking
                    </div>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <span className="w-4 h-4 mr-2">🔧</span>
                      Automatic technical SEO fixes
                    </div>
                  </div>
                  
                  <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                    Get Tracking Script
                  </button>
                </div>

              </div>

              {/* Autopilot Status Dashboard */}
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    Autopilot Status
                  </h2>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-500">Waiting for setup</span>
                  </div>
                </div>
                
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Ready to Enable Autopilot
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                    Connect Google Search Console and install the tracking script to enable automated technical SEO monitoring and fixes.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="mr-2">📈</span>
                      Performance monitoring
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="mr-2">🔧</span>
                      Automated fixes
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="mr-2">📊</span>
                      Daily reports
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}