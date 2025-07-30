'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import SubscriptionManager from '@/components/SubscriptionManager';
import UsageDashboard from '@/components/UsageDashboard';
import WebsiteManagement from '@/components/WebsiteManagement';

export default function Account() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <ProtectedRoute>
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
                  <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Account Settings</h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Manage your account preferences and settings
                  </p>
                </div>

                <div className="grid grid-cols-12 gap-6">
                  
                  {/* Profile Information */}
                  <div className="col-span-full xl:col-span-6 bg-white dark:bg-gray-800 shadow-sm rounded-xl">
                    <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
                      <h2 className="font-semibold text-gray-800 dark:text-gray-100">Profile Information</h2>
                    </header>
                    <div className="p-5">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            User ID
                          </label>
                          <input
                            type="text"
                            value={user?.id || ''}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Account Created
                          </label>
                          <input
                            type="text"
                            value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : ''}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Account Actions */}
                  <div className="col-span-full xl:col-span-6 bg-white dark:bg-gray-800 shadow-sm rounded-xl">
                    <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
                      <h2 className="font-semibold text-gray-800 dark:text-gray-100">Account Actions</h2>
                    </header>
                    <div className="p-5">
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Sign Out
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Sign out of your account on this device
                          </p>
                          <button
                            onClick={handleSignOut}
                            className="btn border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
                          >
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Website Management */}
                  <div className="col-span-full">
                    <WebsiteManagement />
                  </div>

                  {/* Usage Dashboard */}
                  <div className="col-span-full">
                    <UsageDashboard />
                  </div>

                  {/* Subscription Management */}
                  <div className="col-span-full">
                    <SubscriptionManager />
                  </div>

                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}