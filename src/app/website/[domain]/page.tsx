'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ChatInterface from '@/components/website-chat/ChatInterface';
import WebsiteSetupModal from '@/components/WebsiteSetupModal';
import { ChevronDown, Send, Loader2, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
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

  // Performance data state
  const [performanceData, setPerformanceData] = useState({
    total: { impressions: 0, clicks: 0, ctr: 0, position: 0 },
    topQueries: [],
    topPages: [],
    referrers: [],
    hasData: false,
    isLoading: true,
    error: null,
    lastUpdated: null
  });

  // Technical SEO data state
  const [technicalData, setTechnicalData] = useState({
    overallScore: 0,
    schemaMarkup: { count: 0, status: 'unknown' },
    altTags: { count: 0, status: 'unknown' },
    metaTags: { count: 0, status: 'unknown' },
    sitemapStatus: 'unknown',
    robotsStatus: 'unknown',
    llmsTxtStatus: 'unknown',
    setupStatuses: {
      gsc: 'none',
      seoagentjs: 'inactive',
      cms: 'none',
      hosting: 'none'
    },
    hasData: false,
    isLoading: true,
    error: null,
    lastUpdated: null
  });

  // Content and Strategy data state
  const [contentData, setContentData] = useState({
    internalLinks: { suggested: 0, applied: 0, pending: 0, status: 'no_data' },
    semanticVisibility: { score: 0, trend: '', status: 'no_data' },
    hasData: false,
    isLoading: true,
    error: null,
    message: ''
  });

  const [strategyData, setStrategyData] = useState({
    keywords: { tracked: 0, clusters: 0, opportunities: 0, topKeywords: [], status: 'no_data' },
    opportunities: { quickWins: 0, contentGaps: 0, technicalIssues: 0, items: [], status: 'no_data' },
    hasData: false,
    isLoading: true,
    error: null,
    message: ''
  });

  // Fetch performance data
  const fetchPerformanceData = async () => {
    if (!user?.token) return;
    
    try {
      console.log('🔄 [PERFORMANCE] Fetching performance data for domain:', domain);
      setPerformanceData(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await fetch(`/api/dashboard/performance?userToken=${user.token}&domain=${domain}&days=30`);
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ [PERFORMANCE] Performance data fetched:', data.data);
        setPerformanceData({
          ...data.data,
          isLoading: false,
          error: null,
          lastUpdated: new Date()
        });
      } else {
        console.error('❌ [PERFORMANCE] API error:', data.error);
        setPerformanceData(prev => ({
          ...prev,
          isLoading: false,
          error: data.error || 'Failed to fetch performance data'
        }));
      }
    } catch (error) {
      console.error('❌ [PERFORMANCE] Fetch error:', error);
      setPerformanceData(prev => ({
        ...prev,
        isLoading: false,
        error: 'Network error'
      }));
    }
  };

  // Fetch technical SEO data
  const fetchTechnicalData = async () => {
    if (!user?.token) return;
    
    try {
      console.log('🔄 [TECHNICAL SEO] Fetching technical SEO data for domain:', domain);
      setTechnicalData(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await fetch(`/api/dashboard/technical-seo?userToken=${user.token}&domain=${domain}`);
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ [TECHNICAL SEO] Technical SEO data fetched:', data.data);
        setTechnicalData({
          ...data.data,
          isLoading: false,
          error: null,
          lastUpdated: new Date()
        });
      } else {
        console.error('❌ [TECHNICAL SEO] API error:', data.error);
        setTechnicalData(prev => ({
          ...prev,
          isLoading: false,
          error: data.error || 'Failed to fetch technical SEO data'
        }));
      }
    } catch (error) {
      console.error('❌ [TECHNICAL SEO] Fetch error:', error);
      setTechnicalData(prev => ({
        ...prev,
        isLoading: false,
        error: 'Network error'
      }));
    }
  };

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

  // Fetch content and strategy data
  const fetchContentData = async () => {
    if (!user?.token) return;
    try {
      const response = await fetch(`/api/dashboard/content?userToken=${user.token}&domain=${domain}`);
      const data = await response.json();
      if (data.success) {
        setContentData({ ...data.data, isLoading: false, error: null });
      }
    } catch (error) {
      setContentData(prev => ({ ...prev, isLoading: false, error: 'Network error' }));
    }
  };

  const fetchStrategyData = async () => {
    if (!user?.token) return;
    try {
      const response = await fetch(`/api/dashboard/strategy?userToken=${user.token}&domain=${domain}`);
      const data = await response.json();
      if (data.success) {
        setStrategyData({ ...data.data, isLoading: false, error: null });
      }
    } catch (error) {
      setStrategyData(prev => ({ ...prev, isLoading: false, error: 'Network error' }));
    }
  };

  useEffect(() => {
    fetchSetupStatus();
    fetchUserWebsites();
    fetchPerformanceData();
    fetchTechnicalData();
    fetchContentData();
    fetchStrategyData();
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
                  {/* Header with refresh button */}
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Performance Overview</h2>
                    <button
                      onClick={fetchPerformanceData}
                      disabled={performanceData.isLoading}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {performanceData.isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Refresh
                    </button>
                  </div>

                  {performanceData.isLoading ? (
                    <div className="grid grid-cols-4 gap-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white border rounded-lg p-4">
                          <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse"></div>
                          <div className="h-20 rounded-lg bg-gray-100 mb-2 animate-pulse"></div>
                          <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  ) : performanceData.error ? (
                    <div className="bg-white border rounded-lg p-6 text-center">
                      <div className="text-red-600 mb-2">Failed to load performance data</div>
                      <div className="text-sm text-gray-500 mb-4">{performanceData.error}</div>
                      <button
                        onClick={fetchPerformanceData}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : !performanceData.hasData ? (
                    <div className="bg-white border rounded-lg p-6 text-center">
                      <div className="text-gray-600 mb-2">No performance data available</div>
                      <div className="text-sm text-gray-500">{performanceData.message || 'Connect Google Search Console to see performance data'}</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-4">
                      {/* Impressions */}
                      <div className="bg-white border rounded-lg p-4">
                        <div className="text-sm font-semibold mb-2">Impressions</div>
                        <div className="h-20 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 mb-2 flex items-end justify-center p-2">
                          <div className="text-2xl font-bold text-blue-700">
                            {performanceData.total.impressions.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          30d total • Avg position: {performanceData.total.position.toFixed(1)}
                        </div>
                      </div>

                      {/* Clicks */}
                      <div className="bg-white border rounded-lg p-4">
                        <div className="text-sm font-semibold mb-2">Clicks</div>
                        <div className="h-20 rounded-lg bg-gradient-to-br from-green-50 to-green-100 mb-2 flex items-end justify-center p-2">
                          <div className="text-2xl font-bold text-green-700">
                            {performanceData.total.clicks.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          30d total • CTR: {performanceData.total.ctr.toFixed(2)}%
                        </div>
                      </div>

                      {/* Top Queries */}
                      <div className="bg-white border rounded-lg p-4">
                        <div className="text-sm font-semibold mb-2">Top Queries</div>
                        <div className="h-20 rounded-lg bg-gray-50 p-2 overflow-y-auto">
                          {performanceData.topQueries.slice(0, 3).map((query: any, i: number) => (
                            <div key={i} className="text-xs mb-1 truncate">
                              <span className="font-medium">&ldquo;{query.query}&rdquo;</span>
                              <span className="text-gray-500 ml-1">({query.clicks})</span>
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-gray-500">
                          {performanceData.topQueries.length} total queries tracked
                        </div>
                      </div>

                      {/* Referrers */}
                      <div className="bg-white border rounded-lg p-4">
                        <div className="text-sm font-semibold mb-2">Traffic Sources</div>
                        <div className="h-20 rounded-lg bg-gray-50 p-2 overflow-y-auto">
                          {performanceData.referrers.length > 0 ? performanceData.referrers.slice(0, 3).map((ref: any, i: number) => (
                            <div key={i} className="text-xs mb-1 flex justify-between">
                              <span className="font-medium truncate">{ref.source}</span>
                              <span className="text-gray-500">{ref.percentage}%</span>
                            </div>
                          )) : (
                            <div className="text-xs text-gray-500">
                              <div>Organic Search</div>
                              <div>Google Search</div>
                              <div>Direct Traffic</div>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {performanceData.lastUpdated && `Updated: ${new Date(performanceData.lastUpdated).toLocaleTimeString()}`}
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {activeTab === 'technical' && (
                <section>
                  {/* Header with refresh button */}
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Technical SEO</h2>
                    <button
                      onClick={fetchTechnicalData}
                      disabled={technicalData.isLoading}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {technicalData.isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Refresh
                    </button>
                  </div>

                  {technicalData.isLoading ? (
                    <div className="bg-white border rounded-lg p-4">
                      <div className="h-4 bg-gray-200 rounded mb-4 animate-pulse"></div>
                      <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                          <div key={i} className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-16 rounded-lg bg-gray-100 animate-pulse"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : technicalData.error ? (
                    <div className="bg-white border rounded-lg p-6 text-center">
                      <div className="text-red-600 mb-2">Failed to load technical SEO data</div>
                      <div className="text-sm text-gray-500 mb-4">{technicalData.error}</div>
                      <button
                        onClick={fetchTechnicalData}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : (
                    <div className="bg-white border rounded-lg p-4">
                      <div className="text-sm font-semibold mb-4">Technical Overview</div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        {/* Overall Score */}
                        <div className="space-y-2">
                          <div className="font-medium">Overall Score</div>
                          <div className="h-16 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-purple-700">
                                {technicalData.overallScore}
                              </div>
                              <div className="text-xs text-purple-600">/ 100</div>
                            </div>
                          </div>
                        </div>

                        {/* Schema Markup */}
                        <div className="space-y-2">
                          <div className="font-medium">Schema Markup</div>
                          <div className={`h-16 rounded-lg flex items-center justify-center ${
                            technicalData.schemaMarkup.status === 'good' ? 'bg-gradient-to-br from-green-50 to-green-100' :
                            technicalData.schemaMarkup.status === 'needs_attention' ? 'bg-gradient-to-br from-yellow-50 to-yellow-100' :
                            'bg-gradient-to-br from-gray-50 to-gray-100'
                          }`}>
                            <div className="text-center">
                              <div className={`text-xl font-bold ${
                                technicalData.schemaMarkup.status === 'good' ? 'text-green-700' :
                                technicalData.schemaMarkup.status === 'needs_attention' ? 'text-yellow-700' :
                                'text-gray-600'
                              }`}>
                                {technicalData.schemaMarkup.count}
                              </div>
                              <div className={`text-xs ${
                                technicalData.schemaMarkup.status === 'good' ? 'text-green-600' :
                                technicalData.schemaMarkup.status === 'needs_attention' ? 'text-yellow-600' :
                                'text-gray-500'
                              }`}>
                                items
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Alt Tags */}
                        <div className="space-y-2">
                          <div className="font-medium">Alt Tags</div>
                          <div className={`h-16 rounded-lg flex items-center justify-center ${
                            technicalData.altTags.status === 'good' ? 'bg-gradient-to-br from-green-50 to-green-100' :
                            technicalData.altTags.status === 'needs_attention' ? 'bg-gradient-to-br from-yellow-50 to-yellow-100' :
                            'bg-gradient-to-br from-gray-50 to-gray-100'
                          }`}>
                            <div className="text-center">
                              <div className={`text-xl font-bold ${
                                technicalData.altTags.status === 'good' ? 'text-green-700' :
                                technicalData.altTags.status === 'needs_attention' ? 'text-yellow-700' :
                                'text-gray-600'
                              }`}>
                                {technicalData.altTags.count}
                              </div>
                              <div className={`text-xs ${
                                technicalData.altTags.status === 'good' ? 'text-green-600' :
                                technicalData.altTags.status === 'needs_attention' ? 'text-yellow-600' :
                                'text-gray-500'
                              }`}>
                                images
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Meta Tags */}
                        <div className="space-y-2">
                          <div className="font-medium">Meta Tags</div>
                          <div className={`h-16 rounded-lg flex items-center justify-center ${
                            technicalData.metaTags.status === 'good' ? 'bg-gradient-to-br from-green-50 to-green-100' :
                            technicalData.metaTags.status === 'needs_attention' ? 'bg-gradient-to-br from-yellow-50 to-yellow-100' :
                            'bg-gradient-to-br from-gray-50 to-gray-100'
                          }`}>
                            <div className="text-center">
                              <div className={`text-xl font-bold ${
                                technicalData.metaTags.status === 'good' ? 'text-green-700' :
                                technicalData.metaTags.status === 'needs_attention' ? 'text-yellow-700' :
                                'text-gray-600'
                              }`}>
                                {technicalData.metaTags.count}
                              </div>
                              <div className={`text-xs ${
                                technicalData.metaTags.status === 'good' ? 'text-green-600' :
                                technicalData.metaTags.status === 'needs_attention' ? 'text-yellow-600' :
                                'text-gray-500'
                              }`}>
                                pages
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Sitemap.xml */}
                        <div className="space-y-2">
                          <div className="font-medium">sitemap.xml</div>
                          <div className={`h-16 rounded-lg flex items-center justify-center ${
                            technicalData.sitemapStatus === 'good' ? 'bg-gradient-to-br from-green-50 to-green-100' :
                            technicalData.sitemapStatus === 'needs_check' ? 'bg-gradient-to-br from-yellow-50 to-yellow-100' :
                            'bg-gradient-to-br from-gray-50 to-gray-100'
                          }`}>
                            <div className="text-center">
                              <div className={`text-sm font-semibold ${
                                technicalData.sitemapStatus === 'good' ? 'text-green-700' :
                                technicalData.sitemapStatus === 'needs_check' ? 'text-yellow-700' :
                                'text-gray-600'
                              }`}>
                                {technicalData.sitemapStatus === 'good' ? '✓ Active' :
                                 technicalData.sitemapStatus === 'needs_check' ? '⚠ Check' :
                                 '? Unknown'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Robots.txt */}
                        <div className="space-y-2">
                          <div className="font-medium">robots.txt</div>
                          <div className={`h-16 rounded-lg flex items-center justify-center ${
                            technicalData.robotsStatus === 'good' ? 'bg-gradient-to-br from-green-50 to-green-100' :
                            technicalData.robotsStatus === 'needs_check' ? 'bg-gradient-to-br from-yellow-50 to-yellow-100' :
                            'bg-gradient-to-br from-gray-50 to-gray-100'
                          }`}>
                            <div className="text-center">
                              <div className={`text-sm font-semibold ${
                                technicalData.robotsStatus === 'good' ? 'text-green-700' :
                                technicalData.robotsStatus === 'needs_check' ? 'text-yellow-700' :
                                'text-gray-600'
                              }`}>
                                {technicalData.robotsStatus === 'good' ? '✓ Active' :
                                 technicalData.robotsStatus === 'needs_check' ? '⚠ Check' :
                                 '? Unknown'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* llms.txt */}
                        <div className="space-y-2">
                          <div className="font-medium">llms.txt</div>
                          <div className="h-16 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-sm font-semibold text-orange-700">
                                📝 Todo
                              </div>
                              <div className="text-xs text-orange-600">
                                Not implemented
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {technicalData.lastUpdated && (
                        <div className="mt-4 text-xs text-gray-500 text-right">
                          Last updated: {new Date(technicalData.lastUpdated).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}

              {activeTab === 'content' && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Content Analysis</h2>
                    <button
                      onClick={fetchContentData}
                      disabled={contentData.isLoading}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {contentData.isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Refresh
                    </button>
                  </div>

                  {contentData.isLoading ? (
                    <div className="grid grid-cols-2 gap-4">
                      {[1, 2].map((i) => (
                        <div key={i} className="bg-white border rounded-lg p-4">
                          <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse"></div>
                          <div className="h-28 rounded-lg bg-gray-100 mb-2 animate-pulse"></div>
                          <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  ) : !contentData.hasData ? (
                    <div className="bg-white border rounded-lg p-6 text-center">
                      <div className="text-gray-600 mb-2">Content Analysis Placeholder</div>
                      <div className="text-sm text-gray-500">{contentData.message}</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white border rounded-lg p-4">
                        <div className="text-sm font-semibold mb-2">Internal Links</div>
                        <div className="h-28 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 p-4 flex flex-col justify-center">
                          <div className="text-center mb-2">
                            <div className="text-xl font-bold text-blue-700">
                              {contentData.internalLinks.applied}/{contentData.internalLinks.suggested}
                            </div>
                            <div className="text-xs text-blue-600">Applied / Suggested</div>
                          </div>
                          <div className="w-full bg-blue-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all" 
                              style={{
                                width: `${(contentData.internalLinks.applied / contentData.internalLinks.suggested) * 100}%`
                              }}
                            ></div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          Suggested: {contentData.internalLinks.suggested} • Applied: {contentData.internalLinks.applied}
                        </div>
                      </div>
                      
                      <div className="bg-white border rounded-lg p-4">
                        <div className="text-sm font-semibold mb-2">Semantic Visibility Score</div>
                        <div className="h-28 rounded-lg bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-3xl font-bold text-green-700">
                              {contentData.semanticVisibility.score}
                            </div>
                            <div className="text-xs text-green-600">
                              {contentData.semanticVisibility.trend && `${contentData.semanticVisibility.trend} trend`}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">Sitewide topical strength</div>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {activeTab === 'strategy' && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">SEO Strategy</h2>
                    <button
                      onClick={fetchStrategyData}
                      disabled={strategyData.isLoading}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {strategyData.isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Refresh
                    </button>
                  </div>

                  {strategyData.isLoading ? (
                    <div className="grid grid-cols-2 gap-4">
                      {[1, 2].map((i) => (
                        <div key={i} className="bg-white border rounded-lg p-4">
                          <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse"></div>
                          <div className="h-28 rounded-lg bg-gray-100 mb-2 animate-pulse"></div>
                          <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  ) : !strategyData.hasData ? (
                    <div className="bg-white border rounded-lg p-6 text-center">
                      <div className="text-gray-600 mb-2">SEO Strategy Insights</div>
                      <div className="text-sm text-gray-500">{strategyData.message}</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white border rounded-lg p-4">
                        <div className="text-sm font-semibold mb-2">Keywords</div>
                        <div className="h-28 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 p-3">
                          <div className="grid grid-cols-3 gap-2 text-center mb-2">
                            <div>
                              <div className="text-lg font-bold text-purple-700">{strategyData.keywords.tracked}</div>
                              <div className="text-xs text-purple-600">Tracked</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-purple-700">{strategyData.keywords.clusters}</div>
                              <div className="text-xs text-purple-600">Clusters</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-purple-700">{strategyData.keywords.opportunities}</div>
                              <div className="text-xs text-purple-600">Opps</div>
                            </div>
                          </div>
                          {strategyData.keywords.topKeywords.slice(0, 2).map((kw: any, i: number) => (
                            <div key={i} className="text-xs text-purple-700 truncate">
                              {kw.keyword} ({kw.impressions})
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-gray-500">Cluster coverage & priorities</div>
                      </div>
                      
                      <div className="bg-white border rounded-lg p-4">
                        <div className="text-sm font-semibold mb-2">Opportunities</div>
                        <div className="h-28 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 p-3">
                          <div className="grid grid-cols-3 gap-2 text-center mb-2">
                            <div>
                              <div className="text-lg font-bold text-orange-700">{strategyData.opportunities.quickWins}</div>
                              <div className="text-xs text-orange-600">Quick</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-orange-700">{strategyData.opportunities.contentGaps}</div>
                              <div className="text-xs text-orange-600">Content</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-orange-700">{strategyData.opportunities.technicalIssues}</div>
                              <div className="text-xs text-orange-600">Technical</div>
                            </div>
                          </div>
                          {strategyData.opportunities.items.slice(0, 2).map((item: any, i: number) => (
                            <div key={i} className="text-xs text-orange-700 truncate">
                              {item.type === 'quick_win' ? '⚡' : '📝'} {item.title}
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-gray-500">Quick wins & content gaps</div>
                      </div>
                    </div>
                  )}
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