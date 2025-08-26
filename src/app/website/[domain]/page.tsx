'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import AgentChat from '@/components/agent/AgentChat';
import { useAuth } from '@/contexts/auth';

export default function WebsitePage() {
  const params = useParams();
  const domain = decodeURIComponent(params.domain as string);
  const { user } = useAuth();
  
  // Sidebar state management
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  if (!user) {
    return null; // ProtectedRoute will handle the redirect
  }

  return (
    <ProtectedRoute>
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <Header 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen}
        />
        
        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <Sidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            sidebarExpanded={sidebarExpanded}
            setSidebarExpanded={setSidebarExpanded}
          />
          
          {/* Website Agent Chat Interface */}
          <main className="flex-1 overflow-hidden">
            <div className="h-full p-4">
              {/* Website Header */}
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                    {domain.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {domain}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      SEO Agent Chat
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Full-Screen Agent Chat */}
              <div className="h-[calc(100%-80px)]">
                <AgentChat 
                  userToken={user.token || ''}
                  selectedSite={domain}
                  userSites={[{ id: domain, url: domain, name: domain }]}
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}