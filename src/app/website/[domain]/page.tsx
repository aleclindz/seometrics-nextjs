'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ChatInterface from '@/components/website-chat/ChatInterface';
import MetricsDashboard from '@/components/website-chat/MetricsDashboard';
import ActivityFeed from '@/components/website-chat/ActivityFeed';
import SetupStatusCard from '@/components/website-chat/SetupStatusCard';
import { CompactWebsiteHeader } from '@/components/CompactWebsiteHeader';
import { CompactActivityFeed } from '@/components/CompactActivityFeed';
import { useAuth } from '@/contexts/auth';

export default function WebsitePage() {
  const params = useParams();
  const rawDomain = decodeURIComponent(params.domain as string);
  
  // Clean the domain by removing sc-domain: prefix and protocol
  const domain = rawDomain.replace(/^sc-domain:/, '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  
  const { user } = useAuth();
  
  console.log('WebsitePage: Raw domain from URL:', rawDomain);
  console.log('WebsitePage: Cleaned domain:', domain);
  
  // Sidebar state management
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  if (!user) {
    return null; // ProtectedRoute will handle the redirect
  }

  return (
    <ProtectedRoute>
      <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
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
          
          {/* Main Content Area */}
          <main className="flex-1 overflow-hidden flex flex-col">
            {/* Compact Website Header - Combined metrics and setup status */}
            <div className="p-4 pt-20 pb-0">
              <CompactWebsiteHeader 
                domain={domain}
                metrics={{
                  clicks: 4,
                  clicksChange: -71,
                  indexed: "0/0",
                  techScore: 59,
                  techScorePercent: 59
                }}
                setupStatus={{
                  gscConnected: true,
                  seoagentjsActive: true,
                  cmsConnected: false,
                  hostingConnected: false,
                  progress: 50
                }}
                isActive={true}
              />
            </div>
            
            {/* Chat Interface and Activity Feed - 2-Column Layout */}
            <div className="flex-1 flex gap-4 p-4 pt-2 pb-2 overflow-hidden">
              {/* Chat Interface - Main Column */}
              <div className="flex-1 min-w-0">
                <ChatInterface 
                  userToken={user.token || ''}
                  selectedSite={domain}
                  userSites={[{ id: domain, url: domain, name: domain }]}
                />
              </div>
              
              {/* Compact Activity Feed - Right Column */}
              <div className="flex-shrink-0">
                <CompactActivityFeed 
                  activities={[
                    {
                      id: '1',
                      title: 'Connect GSC',
                      description: 'Executed connect gsc operation',
                      status: 'done',
                      timestamp: '1d ago'
                    },
                    {
                      id: '2',
                      title: 'Get Site Status',
                      description: 'Executed get site status operation',
                      status: 'done',
                      timestamp: '1d ago'
                    },
                    {
                      id: '3',
                      title: '🗺️ Sitemap Regenerated',
                      description: 'Automated sitemap generation completed',
                      status: 'done',
                      timestamp: '3d ago',
                      hasDetails: true
                    },
                    {
                      id: '4',
                      title: '🗺️ Sitemap Regenerated',
                      description: 'Automated sitemap generation completed',
                      status: 'done',
                      timestamp: '9d ago',
                      hasDetails: true
                    }
                  ]}
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}