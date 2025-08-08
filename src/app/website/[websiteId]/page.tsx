'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth';
import { getSmartJSStatus } from '@/lib/seoagent-js-status';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import TechnicalSEODashboard from '@/components/TechnicalSEODashboard';
import AIActivitySummary from '@/components/AIActivitySummary';
import WebsiteSetupModal from '@/components/WebsiteSetupModal';
import GSCAnalytics from '@/components/GSCAnalytics';

interface Website {
  id: string;
  url: string;
  name: string;
  gscStatus: 'connected' | 'pending' | 'error' | 'none';
  cmsStatus: 'connected' | 'pending' | 'error' | 'none';
  smartjsStatus: 'active' | 'inactive' | 'error';
  lastSync?: Date;
  metrics?: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    dateStart?: string;
    dateEnd?: string;
  };
  lastAuditDate?: string;
  auditScore?: number;
  criticalIssues?: number;
  metaTagsCount?: number;
  altTagsCount?: number;
}

interface Audit {
  id: string;
  status: string;
  overall_score?: number;
  total_issues?: number;
  critical_issues?: number;
  warning_issues?: number;
  info_issues?: number;
  progress_percentage?: number;
  current_step?: string;
  completed_at?: string;
  created_at: string;
}

export default function WebsitePage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const websiteId = params.websiteId as string;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [website, setWebsite] = useState<Website | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);
  const [latestAudit, setLatestAudit] = useState<Audit | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [setupModalOpen, setSetupModalOpen] = useState(false);

  useEffect(() => {
    const fetchWebsite = async () => {
      if (!user?.token || !websiteId) return;

      try {
        // Get website details from chat/sites API (which includes GSC data)
        const response = await fetch(`/api/chat/sites?userToken=${user.token}`);
        if (!response.ok) {
          throw new Error('Failed to fetch website data');
        }

        const { sites } = await response.json();
        const currentWebsite = sites.find((site: any) => site.id === websiteId);
        
        if (!currentWebsite) {
          router.push('/dashboard');
          return;
        }

        // Fetch latest audit data
        let auditData = null;
        try {
          const auditResponse = await fetch(`/api/audits?userToken=${user.token}&websiteUrl=${encodeURIComponent(currentWebsite.url)}&limit=1`);
          if (auditResponse.ok) {
            const auditResult = await auditResponse.json();
            if (auditResult.success && auditResult.audits.length > 0) {
              auditData = auditResult.audits[0];
              setLatestAudit(auditData);
            }
          }
        } catch (auditError) {
          console.log('No audit data available:', auditError);
        }

        // Fetch meta and alt tags stats
        let metaTagsCount = 0;
        let altTagsCount = 0;
        try {
          const statsResponse = await fetch(`/api/websites/${websiteId}/stats?userToken=${user.token}`);
          if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            if (statsData.success) {
              metaTagsCount = statsData.stats.metaTagsCount;
              altTagsCount = statsData.stats.altTagsCount;
            }
          }
        } catch (statsError) {
          console.log('No stats data available:', statsError);
        }

        setWebsite({
          id: currentWebsite.id,
          url: currentWebsite.url,
          name: currentWebsite.name || currentWebsite.url,
          gscStatus: currentWebsite.gscStatus || 'none',
          cmsStatus: currentWebsite.cmsStatus || 'none',
          smartjsStatus: getSmartJSStatus(currentWebsite.url),
          lastSync: currentWebsite.lastSync ? new Date(currentWebsite.lastSync) : undefined,
          metrics: currentWebsite.metrics,
          lastAuditDate: auditData?.completed_at || auditData?.created_at,
          auditScore: auditData?.overall_score,
          criticalIssues: auditData?.critical_issues,
          metaTagsCount,
          altTagsCount
        });
      } catch (error) {
        console.error('Error fetching website:', error);
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchWebsite();
  }, [user, websiteId, router]);

  const handleStartAudit = async () => {
    if (!website || !user?.token) return;

    setAuditLoading(true);
    setAuditError(null);
    
    try {
      const response = await fetch(`/api/audits/start?userToken=${user.token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          websiteUrl: website.url,
          websiteId: websiteId,
          auditType: 'full',
          maxPages: 50
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to start audit');
      }

      if (result.success) {
        // Start polling for audit status
        pollAuditStatus(result.auditId);
      }
    } catch (error) {
      console.error('Error starting audit:', error);
      setAuditError(error instanceof Error ? error.message : 'Failed to start audit');
      setAuditLoading(false);
    }
  };

  const pollAuditStatus = async (auditId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/audits/${auditId}?userToken=${user?.token}`);
        const result = await response.json();

        if (result.success && result.audit) {
          const audit = result.audit;
          setLatestAudit(audit);

          // Update website state with new audit data
          if (website) {
            setWebsite(prev => prev ? {
              ...prev,
              lastAuditDate: audit.completed_at || audit.created_at,
              auditScore: audit.overall_score,
              criticalIssues: audit.critical_issues
            } : null);
          }

          // Stop polling if audit is completed
          if (audit.status === 'completed' || audit.status === 'failed') {
            clearInterval(pollInterval);
            setAuditLoading(false);
            
            if (audit.status === 'failed') {
              setAuditError('Audit failed. Please try again.');
            }
          }
        }
      } catch (error) {
        console.error('Error polling audit status:', error);
        clearInterval(pollInterval);
        setAuditLoading(false);
        setAuditError('Failed to get audit status');
      }
    }, 2000); // Poll every 2 seconds

    // Stop polling after 5 minutes max
    setTimeout(() => {
      clearInterval(pollInterval);
      setAuditLoading(false);
    }, 300000);
  };

  const handleStatusUpdate = (updates: {
    gscStatus?: 'connected' | 'pending' | 'error' | 'none';
    cmsStatus?: 'connected' | 'pending' | 'error' | 'none';
    smartjsStatus?: 'active' | 'inactive' | 'error';
  }) => {
    if (website) {
      setWebsite(prev => prev ? {
        ...prev,
        ...updates
      } : null);
    }
  };

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
            <main className="grow">
              <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  if (!website) {
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
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Website Not Found</h1>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    The website you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
                  </p>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="btn bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    Return to Dashboard
                  </button>
                </div>
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
              
              {/* Website header */}
              <div className="sm:flex sm:justify-between sm:items-center mb-6">
                <div className="mb-4 sm:mb-0">
                  <nav className="flex mb-3" aria-label="Breadcrumb">
                    <ol className="inline-flex items-center space-x-1 md:space-x-3">
                      <li className="inline-flex items-center">
                        <button
                          onClick={() => router.push('/dashboard')}
                          className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-violet-600 dark:text-gray-400 dark:hover:text-white"
                        >
                          <svg className="w-3 h-3 mr-2.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                          </svg>
                          Dashboard
                        </button>
                      </li>
                      <li>
                        <div className="flex items-center">
                          <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2 dark:text-gray-400">
                            {website.name}
                          </span>
                        </div>
                      </li>
                    </ol>
                  </nav>
                  <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
                    {website.name}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">{website.url}</p>
                </div>
                
                {/* Setup Button */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => setSetupModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Manage Setup
                  </button>
                </div>
              </div>

              {/* AI Activity Summary - Top Priority */}
              {user?.token && (
                <AIActivitySummary 
                  userToken={user.token}
                  siteUrl={website.url}
                  className="mb-8"
                  websiteStatus={{
                    gscConnected: website.gscStatus === 'connected',
                    seoagentjsInstalled: website.smartjsStatus === 'active',
                    hasAuditScore: website.auditScore !== undefined,
                    criticalIssues: website.criticalIssues || 0,
                    mobileFriendly: 0, // TODO: Fetch from technical SEO API
                    withSchema: 0, // TODO: Fetch from technical SEO API  
                    totalPages: 0 // TODO: Fetch from technical SEO API
                  }}
                />
              )}

              {/* Setup Status Alert */}
              {(website.gscStatus !== 'connected' || website.smartjsStatus !== 'active' || website.cmsStatus !== 'connected') && (
                <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-8">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Setup Required</h3>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        Complete your website setup to unlock the full potential of SEOAgent. 
                        {website.gscStatus !== 'connected' && ' Connect Google Search Console for performance data.'}
                        {website.smartjsStatus !== 'active' && ' Install SEOAgent.js for automated optimizations.'}
                        {website.cmsStatus !== 'connected' && ' Connect your CMS for content management.'}
                      </p>
                      <div className="mt-3">
                        <button
                          onClick={() => setSetupModalOpen(true)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-yellow-800 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-900/20 hover:bg-yellow-200 dark:hover:bg-yellow-900/30"
                        >
                          Complete Setup →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* Date Range Header for Metrics */}
              {website.metrics?.dateStart && website.metrics?.dateEnd && (
                <div className="grid grid-cols-1 gap-4 mb-4">
                  <div className="text-center text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg py-2">
                    Performance data: {new Date(website.metrics.dateStart).toLocaleDateString()} - {new Date(website.metrics.dateEnd).toLocaleDateString()}
                  </div>
                </div>
              )}

              {/* Performance Metrics */}
              {website.metrics && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Clicks</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                          {website.metrics.clicks.toLocaleString()}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Impressions</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                          {website.metrics.impressions.toLocaleString()}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">CTR</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                          {website.metrics.ctr.toFixed(2)}%
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* GSC Analytics */}
              {user?.token && website.gscStatus === 'connected' && (
                <GSCAnalytics 
                  siteUrl={website.url}
                  className="mb-8"
                />
              )}

              {/* Technical SEO Dashboard */}
              {user?.token && website.smartjsStatus === 'active' && (
                <div className="mt-8">
                  <TechnicalSEODashboard 
                    userToken={user.token}
                    websites={[
                      { 
                        domain: website.url.replace(/^https?:\/\//, '').replace(/\/$/, ''), 
                        website_token: websiteId 
                      }
                    ]}
                  />
                </div>
              )}

            </div>
          </main>
        </div>
      </div>

      {/* Website Setup Modal */}
      <WebsiteSetupModal 
        isOpen={setupModalOpen}
        onClose={() => setSetupModalOpen(false)}
        website={website}
        onStatusUpdate={handleStatusUpdate}
      />
    </div>
  );
}
