'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ChatInterface from '@/components/website-chat/ChatInterface';
import WebsiteSetupModal from '@/components/WebsiteSetupModal';
import { ChevronDown, Send } from 'lucide-react';
import { useAuth } from '@/contexts/auth';

export default function WebsitePage() {
  const params = useParams();
  const rawDomain = decodeURIComponent(params.domain as string);
  
  // Clean the domain by removing sc-domain: prefix and protocol
  const domain = rawDomain.replace(/^sc-domain:/, '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  
  const { user } = useAuth();
  
  console.log('WebsitePage: Raw domain from URL:', rawDomain);
  console.log('WebsitePage: Cleaned domain:', domain);
  
  // New layout state management
  const [activeTab, setActiveTab] = useState<'performance' | 'technical' | 'content' | 'strategy'>('performance');
  const [logCollapsed, setLogCollapsed] = useState(false);
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [websiteDropdownOpen, setWebsiteDropdownOpen] = useState(false);
  const [userWebsites, setUserWebsites] = useState<Array<{ id: string; url: string; name: string }>>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Dynamic setup status state
  const [setupStatus, setSetupStatus] = useState({
    gscConnected: false,
    seoagentjsActive: false,
    cmsConnected: false,
    hostingConnected: false,
    progress: 0
  });

  // Fetch actual setup status
  const fetchSetupStatus = async (forceRefresh = true) => {
    if (!user?.token) return;
    
    try {
      console.log('🔄 [WEBSITE PAGE] Fetching setup status for domain:', domain);
      const refreshParam = forceRefresh ? '&forceRefresh=true' : '';
      const response = await fetch(`/api/website/setup-status?userToken=${user.token}&domain=${domain}${refreshParam}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        const statusData = data.data;
        
        setSetupStatus({
          gscConnected: statusData.gscStatus === 'connected',
          seoagentjsActive: statusData.seoagentjsStatus === 'active',
          cmsConnected: statusData.cmsStatus === 'connected',
          hostingConnected: statusData.hostingStatus === 'connected',
          progress: statusData.setupProgress || 0
        });
        console.log('✅ [WEBSITE PAGE] Setup status updated:', statusData);
      }
    } catch (error) {
      console.error('❌ [WEBSITE PAGE] Error fetching setup status:', error);
    }
  };

  // Handle setup status updates from modal
  const handleSetupStatusUpdate = async (updates: any) => {
    console.log('🔄 [WEBSITE PAGE] Setup status update received:', updates);
    
    // Update local state immediately for UI responsiveness
    setSetupStatus(prev => {
      const updated = { ...prev };
      
      // Map the modal's status format to the setup status format
      if ('gscStatus' in updates) {
        updated.gscConnected = updates.gscStatus === 'connected';
      }
      if ('cmsStatus' in updates) {
        updated.cmsConnected = updates.cmsStatus === 'connected';
      }
      if ('smartjsStatus' in updates) {
        updated.seoagentjsActive = updates.smartjsStatus === 'active';
      }
      if ('hostStatus' in updates) {
        updated.hostingConnected = updates.hostStatus === 'connected';
      }
      
      // Recalculate progress
      const connectedCount = [
        updated.gscConnected,
        updated.seoagentjsActive,
        updated.cmsConnected,
        updated.hostingConnected
      ].filter(Boolean).length;
      updated.progress = Math.round((connectedCount / 4) * 100);
      
      console.log('✅ [WEBSITE PAGE] Setup status after update:', updated);
      
      // Persist changes to database
      const persistUpdates = async () => {
        try {
          console.log('💾 [WEBSITE PAGE] Persisting setup status updates to database');
          
          // Only include the fields that were actually updated
          const payload: any = {
            userToken: user?.token,
            domain: domain
          };
          
          if ('gscStatus' in updates) {
            payload.gscStatus = updated.gscConnected ? 'connected' : 'none';
          }
          if ('smartjsStatus' in updates) {
            payload.seoagentjsStatus = updated.seoagentjsActive ? 'active' : 'inactive';
          }
          if ('cmsStatus' in updates) {
            payload.cmsStatus = updated.cmsConnected ? 'connected' : 'none';
          }
          if ('hostStatus' in updates) {
            payload.hostingStatus = updated.hostingConnected ? 'connected' : 'none';
          }
          
          console.log('💾 [WEBSITE PAGE] Payload to persist:', payload);
          
          const response = await fetch('/api/website/setup-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          const result = await response.json();
          if (result.success) {
            console.log('✅ [WEBSITE PAGE] Setup status successfully persisted to database');
          } else {
            console.error('❌ [WEBSITE PAGE] Failed to persist setup status:', result.error);
          }
        } catch (error) {
          console.error('❌ [WEBSITE PAGE] Error persisting setup status:', error);
        }
      };
      
      // Call persist function asynchronously
      persistUpdates();
      
      return updated;
    });
  };

  // Fetch user websites for dropdown
  const fetchUserWebsites = async () => {
    if (!user?.token) return;
    
    try {
      console.log('🌐 [WEBSITE PICKER] Fetching websites for token:', user.token);
      
      // Use /api/websites as primary source (shows all user websites like old sidebar)
      const response = await fetch(`/api/websites?userToken=${user.token}`);
      const data = await response.json();
      
      console.log('🌐 [WEBSITE PICKER] API Response:', data);
      
      if (data.success && data.websites && data.websites.length > 0) {
        console.log('🌐 [WEBSITE PICKER] Found websites:', data.websites.length);
        const mappedSites = data.websites.map((site: any) => ({
          id: site.domain,
          url: site.domain,
          name: site.domain,
          website_token: site.website_token
        }));
        setUserWebsites(mappedSites);
      } else {
        console.log('🌐 [WEBSITE PICKER] No websites found:', data);
        
        // Create default entry for current domain if no websites found
        setUserWebsites([{
          id: domain,
          url: domain,
          name: domain
        }]);
      }
    } catch (error) {
      console.error('❌ [WEBSITE PICKER] Error fetching user websites:', error);
      
      // Fallback to current domain on error
      setUserWebsites([{
        id: domain,
        url: domain,
        name: domain
      }]);
    }
  };

  // Handle website switching
  const handleWebsiteSwitch = (websiteUrl: string) => {
    setWebsiteDropdownOpen(false);
    // Navigate to the new website page
    window.location.href = `/website/${encodeURIComponent(websiteUrl)}`;
  };

  useEffect(() => {
    fetchSetupStatus();
    fetchUserWebsites();
  }, [user?.token, domain]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setWebsiteDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!user) {
    return null; // ProtectedRoute will handle the redirect
  }

  return (
    <ProtectedRoute>
      <div className="h-screen w-full bg-gray-50 text-gray-900">
        {/* Top Bar */}
        <header className="h-14 border-b bg-white flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="font-semibold text-gray-900">SEOAgent</div>
            <div className="mx-3 h-5 w-px bg-gray-200" />
            {/* Site Picker */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setWebsiteDropdownOpen(!websiteDropdownOpen)}
                className="flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                <div className="h-4 w-4 rounded-sm bg-gray-200" />
                <span className="truncate max-w-[200px]">{domain}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${websiteDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Dropdown Menu */}
              {websiteDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-2 border-b border-gray-100">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Your Websites</div>
                  </div>
                  <div className="max-h-60 overflow-auto">
                    {userWebsites.map((website) => (
                      <button
                        key={website.id}
                        onClick={() => handleWebsiteSwitch(website.url)}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                          website.url === domain || website.url.includes(domain) ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        <div className="h-3 w-3 rounded-sm bg-gray-300" />
                        <span className="truncate">{website.name || website.url}</span>
                      </button>
                    ))}
                    {userWebsites.length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-500">No websites found</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* Setup button */}
            <button 
              onClick={() => setSetupModalOpen(true)}
              className="ml-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Setup ({setupStatus.progress}%)
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gray-200" />
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-[480px_1fr_auto] gap-4 p-4 h-[calc(100vh-56px)]">
          {/* Left: Chat */}
          <aside className="bg-white border rounded-2xl flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b font-semibold text-sm">Chat with SEOAgent</div>
            <div className="flex-1 min-h-0 text-sm">
              <ChatInterface 
                userToken={user?.token || ''}
                selectedSite={domain}
                userSites={userWebsites.length > 0 ? userWebsites : [{ id: domain, url: domain, name: domain }]}
              />
            </div>
          </aside>

          {/* Center: Tabs + Content */}
          <main className="bg-white border rounded-2xl flex flex-col overflow-hidden">
            <div className="px-4 pt-3">
              <div className="border-b">
                <nav className="-mb-px flex space-x-8">
                  {['performance', 'technical', 'content', 'strategy'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab as any)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                        activeTab === tab
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {activeTab === 'performance' && (
                <section>
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { title: 'Impressions', value: '128k', change: '+12%', period: '30d' },
                      { title: 'Clicks', value: '9.2k', change: 'CTR 7.2%', period: '30d' },
                      { title: 'Queries', value: 'Top queries', change: '&ldquo;youtube translate&rdquo;, &ldquo;yt subtitles&rdquo;', period: '' },
                      { title: 'Referrers', value: 'Traffic sources', change: 'Perplexity, Reddit, Product Hunt', period: '' }
                    ].map((metric, i) => (
                      <div key={i} className="bg-white border rounded-lg p-4">
                        <div className="text-sm font-semibold mb-2">{metric.title}</div>
                        <div className="h-20 rounded-lg bg-gray-100 mb-2"></div>
                        <div className="text-xs text-gray-500" dangerouslySetInnerHTML={{ 
                          __html: `${metric.period && `${metric.period}: `}${metric.value} • ${metric.change}` 
                        }}></div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {activeTab === 'technical' && (
                <section>
                  <div className="bg-white border rounded-lg p-4">
                    <div className="text-sm font-semibold mb-4">Technical Overview</div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      {[
                        'Overall Score', 'Schema Markup', 'Alt Tags',
                        'Meta Tags', 'sitemap.xml', 'robots.txt', 'llms.txt'
                      ].map((item, i) => (
                        <div key={i} className="space-y-2">
                          <div className="font-medium">{item}</div>
                          <div className="h-16 rounded-lg bg-gray-100"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {activeTab === 'content' && (
                <section className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white border rounded-lg p-4">
                      <div className="text-sm font-semibold mb-2">Internal Links</div>
                      <div className="h-28 rounded-lg bg-gray-100 mb-2"></div>
                      <div className="text-xs text-gray-500">Suggested: 28 • Applied: 14</div>
                    </div>
                    <div className="bg-white border rounded-lg p-4">
                      <div className="text-sm font-semibold mb-2">Semantic Visibility Score</div>
                      <div className="h-24 rounded-lg bg-gray-100 mb-2"></div>
                      <div className="text-xs text-gray-500">Sitewide topical strength</div>
                    </div>
                  </div>
                </section>
              )}

              {activeTab === 'strategy' && (
                <section>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white border rounded-lg p-4">
                      <div className="text-sm font-semibold mb-2">Keywords</div>
                      <div className="h-28 rounded-lg bg-gray-100 mb-2"></div>
                      <div className="text-xs text-gray-500">Cluster coverage & priorities</div>
                    </div>
                    <div className="bg-white border rounded-lg p-4">
                      <div className="text-sm font-semibold mb-2">Opportunities</div>
                      <div className="h-28 rounded-lg bg-gray-100 mb-2"></div>
                      <div className="text-xs text-gray-500">Quick wins & gaps</div>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </main>

          {/* Right: Activity Log */}
          <aside className={`bg-white border rounded-2xl flex flex-col overflow-hidden transition-all duration-200 ${
            logCollapsed ? 'w-11' : 'w-80'
          }`}>
            <div className={`${logCollapsed ? 'px-1' : 'px-4'} py-3 border-b flex items-center ${logCollapsed ? 'justify-center' : 'justify-between'}`}>
              {!logCollapsed && <div className="font-semibold">Activity Log</div>}
              <button 
                onClick={() => setLogCollapsed(!logCollapsed)}
                className="p-1 hover:bg-gray-100 rounded text-gray-500 flex-shrink-0"
              >
                {logCollapsed ? '»' : '«'}
              </button>
            </div>
            {logCollapsed ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="origin-center -rotate-90 text-xs text-gray-500">Activity</div>
              </div>
            ) : (
              <div className="p-4 space-y-3 overflow-auto">
                {[
                  { title: 'Added alt text to 42 images', tag: 'Technical Fix', time: 'Today, 2:24 PM' },
                  { title: 'Published: 5 Tips for Shopify SEO', tag: 'Content', time: 'Today, 12:10 PM' },
                  { title: 'Updated schema on 12 pages', tag: 'Technical Fix', time: 'Yesterday, 6:01 PM' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-gray-300" />
                    <div className="flex-1">
                      <div className="text-sm">{item.title}</div>
                      <div className="text-xs text-gray-500">{item.tag} • {item.time}</div>
                    </div>
                    <button className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded">
                      Details
                    </button>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>

        {/* Setup Modal */}
        <WebsiteSetupModal 
          isOpen={setupModalOpen}
          onClose={() => setSetupModalOpen(false)}
          website={{
            id: domain,
            url: domain,
            name: domain,
            gscStatus: setupStatus.gscConnected ? 'connected' : 'none',
            cmsStatus: setupStatus.cmsConnected ? 'connected' : 'none',
            smartjsStatus: setupStatus.seoagentjsActive ? 'active' : 'inactive',
            hostStatus: setupStatus.hostingConnected ? 'connected' : 'none'
          }}
          onStatusUpdate={handleSetupStatusUpdate}
        />
      </div>
    </ProtectedRoute>
  );
}