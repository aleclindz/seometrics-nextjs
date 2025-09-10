'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/auth';
import { UrlNormalizationService } from '@/lib/UrlNormalizationService';
import { getSmartJSStatus } from '@/lib/seoagent-js-status';
import CMSConnectionForm from './CMSConnectionForm';
import LovableSetupInstructions from './LovableSetupInstructions';

interface WebsiteSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  website: {
    id: string;
    url: string;
    name: string;
    gscStatus: 'connected' | 'pending' | 'error' | 'none';
    cmsStatus: 'connected' | 'pending' | 'error' | 'none';
    smartjsStatus: 'active' | 'inactive' | 'error';
    hostStatus?: 'connected' | 'pending' | 'error' | 'none';
  };
  onStatusUpdate?: (updates: {
    gscStatus?: 'connected' | 'pending' | 'error' | 'none';
    cmsStatus?: 'connected' | 'pending' | 'error' | 'none';
    smartjsStatus?: 'active' | 'inactive' | 'error';
    hostStatus?: 'connected' | 'pending' | 'error' | 'none';
  }) => void;
}

type SetupTab = 'gsc' | 'cms' | 'smartjs' | 'host';

interface GSCConnectionStatus {
  connected: boolean;
  connection?: {
    id: string;
    email: string;
    connected_at: string;
    last_sync_at: string | null;
    expires_at: string;
    is_expired: boolean;
    properties_count: number;
    sync_errors: any[];
  };
}

interface CMSConnection {
  id: number;
  cms_type: string;
  connection_name: string;
  base_url: string;
  status: 'active' | 'error' | 'pending';
  content_type?: string;
  created_at: string;
  last_used_at?: string;
}

interface HostConnection {
  id: number;
  host_type: string;
  connection_name: string;
  project_name?: string;
  domain?: string;
  deployment_status: 'active' | 'inactive' | 'error';
  last_deployment_at?: string;
  auto_deploy_enabled: boolean;
  created_at: string;
}

export default function WebsiteSetupModal({ isOpen, onClose, website, onStatusUpdate }: WebsiteSetupModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SetupTab>('gsc');
  
  // GSC State
  const [gscStatus, setGscStatus] = useState<GSCConnectionStatus>({ connected: false });
  const [gscLoading, setGscLoading] = useState(false);
  const [gscConnecting, setGscConnecting] = useState(false);
  const [gscError, setGscError] = useState<string | null>(null);
  
  // CMS State
  const [cmsConnections, setCmsConnections] = useState<CMSConnection[]>([]);
  const [cmsLoading, setCmsLoading] = useState(false);
  const [cmsError, setCmsError] = useState<string | null>(null);

  // Host Connection State
  const [hostConnections, setHostConnections] = useState<HostConnection[]>([]);
  const [hostLoading, setHostLoading] = useState(false);
  const [hostError, setHostError] = useState<string | null>(null);
  
  // SEOAgent.js State
  const [smartjsInstallCode, setSmartjsInstallCode] = useState('');
  const [smartjsLoading, setSmartjsLoading] = useState(false);
  const [smartjsDetected, setSmartjsDetected] = useState(website.smartjsStatus === 'active');

  useEffect(() => {
    if (isOpen) {
      // Only generate install code and set initial tab when modal opens
      // Don't automatically check statuses - user can manually refresh
      generateSmartJSCode();
      
      // Set initial tab based on what needs setup
      if (website.gscStatus !== 'connected') {
        setActiveTab('gsc');
      } else if (website.smartjsStatus !== 'active') {
        setActiveTab('smartjs');
      } else if (website.cmsStatus !== 'connected') {
        setActiveTab('cms');
      } else if (website.hostStatus !== 'connected') {
        setActiveTab('host');
      }
    }
  }, [isOpen, website]);

  // Check SEOAgent.js installation status
  const checkSmartJSStatus = async () => {
    if (!user?.token) return;

    try {
      console.log('🔍 [SETUP MODAL] Starting SEOAgent.js Status Check for website:', website.url);
      
      // Use the simple status function instead of the API call
      const status = getSmartJSStatus(website.url);
      console.log('✅ [SETUP MODAL] SEOAgent.js Status Check Result:', status);
      
      if (status === 'active') {
        setSmartjsDetected(true);
        // Only update parent if status actually changed
        if (website.smartjsStatus !== 'active') {
          onStatusUpdate?.({ smartjsStatus: 'active' });
        }
      } else {
        setSmartjsDetected(false);
        // Only update parent if status actually changed
        if (website.smartjsStatus !== 'inactive') {
          onStatusUpdate?.({ smartjsStatus: 'inactive' });
        }
      }
    } catch (error) {
      console.error('❌ [SETUP MODAL] Error checking SEOAgent.js status:', error);
      setSmartjsDetected(false);
    }
  };

  // GSC Functions
  const checkGSCStatus = async () => {
    if (!user?.token) return;

    try {
      console.log('🔍 [SETUP MODAL] Starting GSC Status Check for website:', website.url);
      setGscLoading(true);
      const response = await fetch(`/api/gsc/connection?userToken=${user.token}`);
      const data = await response.json();
      console.log('✅ [SETUP MODAL] GSC Status Check Result:', JSON.stringify(data, null, 2));
      setGscStatus(data);
      
      // Update parent component with GSC status
      const gscConnected = data.connected === true;
      if (gscConnected && website.gscStatus !== 'connected') {
        console.log('🔄 [SETUP MODAL] Updating parent GSC status to connected');
        onStatusUpdate?.({ gscStatus: 'connected' });
      } else if (!gscConnected && website.gscStatus !== 'none') {
        console.log('🔄 [SETUP MODAL] Updating parent GSC status to none');
        onStatusUpdate?.({ gscStatus: 'none' });
      }
    } catch (error) {
      console.error('❌ [SETUP MODAL] Error checking GSC connection:', error);
      setGscError('Failed to check connection status');
    } finally {
      setGscLoading(false);
    }
  };

  const handleGSCConnect = async () => {
    if (!user?.token) return;

    try {
      setGscConnecting(true);
      setGscError(null);
      
      const response = await fetch(`/api/gsc/oauth/start?userToken=${user.token}`);
      const data = await response.json();
      
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setGscError('Failed to start OAuth process');
      }
    } catch (error) {
      console.error('Error starting OAuth:', error);
      setGscError('Failed to connect to Google Search Console');
    } finally {
      setGscConnecting(false);
    }
  };

  const handleGSCDisconnect = async () => {
    if (!user?.token) return;
    
    if (!confirm('Are you sure you want to disconnect Google Search Console?')) {
      return;
    }

    try {
      setGscLoading(true);
      const response = await fetch(`/api/gsc/connection?userToken=${user.token}`, { method: 'DELETE' });
      
      if (response.ok) {
        setGscStatus({ connected: false });
        onStatusUpdate?.({ gscStatus: 'none' });
      }
    } catch (error) {
      console.error('Error disconnecting GSC:', error);
      setGscError('Failed to disconnect');
    } finally {
      setGscLoading(false);
    }
  };

  // CMS Functions  
  const fetchCMSConnections = async () => {
    if (!user?.token) return;

    try {
      console.log('🔍 [SETUP MODAL] Starting CMS Connections Check for website:', website.url);
      setCmsLoading(true);
      const response = await fetch(`/api/cms/connections?userToken=${user.token}&domain=${website.url}`);
      const data = await response.json();
      console.log('✅ [SETUP MODAL] CMS Connections Check Result:', JSON.stringify(data, null, 2));
      
      if (data.success) {
        // Connections are already filtered by domain in the API call
        setCmsConnections(data.connections);
        
        // Update parent status if we have active CMS connections
        const hasActiveConnection = data.connections && data.connections.length > 0 && 
          data.connections.some((conn: any) => conn.status === 'active');
        
        if (hasActiveConnection && website.cmsStatus !== 'connected') {
          console.log('🔄 [SETUP MODAL] Updating parent CMS status to connected');
          onStatusUpdate?.({ cmsStatus: 'connected' });
        } else if (!hasActiveConnection && website.cmsStatus !== 'none') {
          console.log('🔄 [SETUP MODAL] Updating parent CMS status to none');
          onStatusUpdate?.({ cmsStatus: 'none' });
        }
      }
    } catch (error) {
      console.error('❌ [SETUP MODAL] Error fetching CMS connections:', error);
      setCmsError('Failed to fetch CMS connections');
    } finally {
      setCmsLoading(false);
    }
  };

  const [showCMSForm, setShowCMSForm] = useState(false);

  const handleCMSSuccess = async () => {
    // Refresh CMS connections and update parent
    await fetchCMSConnections();
    onStatusUpdate?.({ cmsStatus: 'connected' });
    setShowCMSForm(false);
  };

  // Host Connection Functions
  const fetchHostConnections = async () => {
    if (!user?.token) return;

    try {
      console.log('🔍 [SETUP MODAL] Starting Host Connections Check for website:', website.url);
      setHostLoading(true);
      setHostError(null);
      
      const response = await fetch(`/api/host/connections?userToken=${user.token}&websiteId=${website.url}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ [SETUP MODAL] Host Connections Check Result:', JSON.stringify(data, null, 2));
        
        if (data.success) {
          setHostConnections(data.connections);
          // Update parent status if we have any host connections (regardless of deployment status)
          const hasConnection = data.connections && data.connections.length > 0;
          if (hasConnection && website.hostStatus !== 'connected') {
            console.log('🔄 [SETUP MODAL] Updating parent host status to connected');
            onStatusUpdate?.({ hostStatus: 'connected' });
          } else if (!hasConnection && website.hostStatus !== 'none') {
            console.log('🔄 [SETUP MODAL] Updating parent host status to none');
            onStatusUpdate?.({ hostStatus: 'none' });
          }
        } else {
          console.log('[HOST CONNECTIONS] API returned unsuccessful response:', data.error);
          // Don't show error to user for missing features
        }
      } else if (response.status === 404) {
        // Host connections API/table not yet available, silently handle
        console.log('[HOST CONNECTIONS] Host connections feature not yet available (404)');
      } else {
        // Other HTTP errors
        console.error('[HOST CONNECTIONS] HTTP error:', response.status, response.statusText);
        setHostError('Failed to load host connections');
      }
    } catch (error) {
      console.error('Error fetching host connections:', error);
      // Only show error for actual network/unexpected errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setHostError('Network error loading host connections');
      } else {
        console.log('[HOST CONNECTIONS] Silently handling error - feature may not be available yet');
      }
    } finally {
      setHostLoading(false);
    }
  };

  // SEOAgent.js Functions
  const generateSmartJSCode = () => {
    setSmartjsInstallCode(`<!-- SEOAgent.js -->
<script>
  // Define your website token
  const idv = "${website.id}";
</script>
<script src="https://seoagent.com/seoagent.js" defer></script>
<!-- End SEOAgent.js -->`);
  };

  const copyInstallCode = async () => {
    try {
      await navigator.clipboard.writeText(smartjsInstallCode);
      // You might want to show a toast notification here
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  const handleVercelConnection = async () => {
    if (!user?.token) return;
    
    try {
      setHostLoading(true);
      setHostError(null);
      
      // Initiate Vercel OAuth flow
      const response = await fetch(`/api/hosting/vercel/oauth?userToken=${user.token}`);
      const data = await response.json();
      
      if (response.ok && data.oauthUrl) {
        // Redirect to Vercel OAuth
        window.location.href = data.oauthUrl;
      } else {
        // Handle setup required error specifically
        if (data.setupRequired) {
          setHostError(
            `${data.error} Steps: 1) Go to vercel.com/integrations/console 2) Create a new integration 3) Update your environment variables with the Client ID and Secret`
          );
        } else {
          setHostError(data.error || 'Failed to initiate Vercel connection');
        }
      }
    } catch (error) {
      console.error('Error connecting to Vercel:', error);
      setHostError('Failed to connect to Vercel. Please try again.');
    } finally {
      setHostLoading(false);
    }
  };

  const handleLovableConnection = async () => {
    if (!user?.token) return;
    
    try {
      setHostLoading(true);
      setHostError(null);
      
      // Create a Lovable connection entry
      const response = await fetch('/api/host/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userToken: user.token,
          websiteId: website.url,
          hostType: 'lovable',
          connectionName: 'Lovable Project',
          domain: UrlNormalizationService.domainPropertyToHttps(website.url),
          autoDeploy: false, // Manual setup
          outputDirectory: 'dist'
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        // Refresh connections and show success
        await fetchHostConnections();
        onStatusUpdate?.({ hostStatus: 'connected' });
      } else {
        setHostError(data.error || 'Failed to create Lovable connection');
      }
    } catch (error) {
      console.error('Error creating Lovable connection:', error);
      setHostError('Failed to connect to Lovable. Please try again.');
    } finally {
      setHostLoading(false);
    }
  };

  const testSmartJSInstallation = async () => {
    if (!user?.token) return;

    try {
      setSmartjsLoading(true);
      
      console.log('🔍 [SETUP MODAL] Testing SEOAgent.js installation for:', website.url);
      
      // Call the proper API endpoint to test installation
      const response = await fetch('/api/smartjs/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          websiteUrl: website.url
        })
      });
      
      const result = await response.json();
      console.log('✅ [SETUP MODAL] SEOAgent.js test result:', result);
      
      if (result.success && result.data?.status === 'active') {
        setSmartjsDetected(true);
        // Only update parent if status actually changed
        if (website.smartjsStatus !== 'active') {
          onStatusUpdate?.({ smartjsStatus: 'active' });
        }
      } else {
        setSmartjsDetected(false);
        // Only update parent if status actually changed  
        if (website.smartjsStatus !== 'inactive') {
          onStatusUpdate?.({ smartjsStatus: 'inactive' });
        }
      }
    } catch (error) {
      console.error('❌ [SETUP MODAL] Error testing SEOAgent.js:', error);
      setSmartjsDetected(false);
    } finally {
      setSmartjsLoading(false);
    }
  };

  // Add body scroll lock when modal is open
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '0px'; // Prevent layout shift
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'active':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'pending':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Setup & Connections
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {website.name}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  // Manually refresh all connection statuses
                  checkGSCStatus();
                  fetchCMSConnections();
                  fetchHostConnections();
                  checkSmartJSStatus();
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh All
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('gsc')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                activeTab === 'gsc'
                  ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <span>Google Search Console</span>
              {website.gscStatus === 'connected' && (
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setActiveTab('smartjs')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                activeTab === 'smartjs'
                  ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <span>SEOAgent.js</span>
              {website.smartjsStatus === 'active' && (
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setActiveTab('cms')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                activeTab === 'cms'
                  ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <span>CMS Integration</span>
              {website.cmsStatus === 'connected' && (
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setActiveTab('host')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                activeTab === 'host'
                  ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <span>Hosting</span>
              {website.hostStatus === 'connected' && (
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
          
          {/* Google Search Console Tab */}
          {activeTab === 'gsc' && (
            <div className="space-y-6">
              {gscLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
                </div>
              ) : gscStatus.connected ? (
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Connected to Google Search Console
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {gscStatus.connection?.email} • {gscStatus.connection?.properties_count} properties
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">Connection Details</h4>
                    <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                      <p>Connected: {new Date(gscStatus.connection?.connected_at || '').toLocaleDateString()}</p>
                      <p>Last Sync: {gscStatus.connection?.last_sync_at ? new Date(gscStatus.connection.last_sync_at).toLocaleDateString() : 'Never'}</p>
                      <p>Expires: {new Date(gscStatus.connection?.expires_at || '').toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleGSCDisconnect}
                    className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 dark:bg-red-900/10 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div>
                  <div className="text-center py-6">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Connect Google Search Console
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                      Connect your Google Search Console to access performance data, submit sitemaps, and enable advanced SEO monitoring.
                    </p>
                    
                    {gscError && (
                      <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 text-sm text-red-700 dark:text-red-300">
                        {gscError}
                      </div>
                    )}
                    
                    <button
                      onClick={handleGSCConnect}
                      disabled={gscConnecting}
                      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {gscConnecting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Connecting...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                          Connect Google Search Console
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SEOAgent.js Tab */}
          {activeTab === 'smartjs' && (
            <div className="space-y-6">
              {smartjsDetected ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    SEOAgent.js is Active
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Your website is successfully running SEOAgent.js and automated SEO optimizations are active.
                  </p>
                  
                  <button
                    onClick={testSmartJSInstallation}
                    disabled={smartjsLoading}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50"
                  >
                    {smartjsLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                        Checking...
                      </>
                    ) : (
                      'Re-check Installation'
                    )}
                  </button>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    SEOAgent.js Installation
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Add this script to your website&apos;s HTML to enable automated SEO optimizations including meta tags, alt tags, and schema markup.
                  </p>
                  
                  <div className="bg-gray-900 dark:bg-gray-950 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400">HTML</span>
                      <button
                        onClick={copyInstallCode}
                        className="text-xs text-gray-400 hover:text-white"
                      >
                        Copy
                      </button>
                    </div>
                    <pre className="text-sm text-green-400 overflow-x-auto">
                      <code>{smartjsInstallCode}</code>
                    </pre>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Installation Instructions</h4>
                    <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-2 list-decimal list-inside">
                      <li>Copy the code above</li>
                      <li>Paste it into your website&apos;s HTML, preferably in the &lt;head&gt; section</li>
                      <li>Deploy your website</li>
                      <li>Click &ldquo;Test Installation&rdquo; below to verify it&apos;s working</li>
                    </ol>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={testSmartJSInstallation}
                      disabled={smartjsLoading}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50"
                    >
                      {smartjsLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Testing...
                        </>
                      ) : (
                        'Test Installation'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CMS Integration Tab */}
          {activeTab === 'cms' && (
            <div className="space-y-6">
              {cmsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
                </div>
              ) : cmsConnections.length > 0 && !showCMSForm ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Connected CMS</h4>
                    <button
                      onClick={() => setShowCMSForm(true)}
                      className="inline-flex items-center px-3 py-1 text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400"
                    >
                      Add Another
                    </button>
                  </div>
                  {cmsConnections.map((connection) => (
                    <div key={connection.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                            {connection.cms_type}
                          </h5>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {connection.connection_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {connection.base_url}
                          </p>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(connection.status)}`}>
                          {connection.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : showCMSForm ? (
                <CMSConnectionForm
                  onSuccess={handleCMSSuccess}
                  onCancel={() => setShowCMSForm(false)}
                  preselectedWebsiteId={website.id}
                />
              ) : (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    CMS Integration
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Connect your Content Management System to enable automated article publishing and content management.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {[
                      { type: 'strapi', name: 'Strapi', icon: '🚀', available: true },
                      { type: 'wix', name: 'Wix', icon: '🌟', available: true },
                      { type: 'wordpress', name: 'WordPress', icon: '📝', available: false },
                      { type: 'webflow', name: 'Webflow', icon: '🌊', available: false },
                      { type: 'shopify', name: 'Shopify', icon: '🛒', available: false },
                    ].map((cms) => (
                      <div key={cms.type} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <div className="flex items-center space-x-3 mb-3">
                          <span className="text-2xl">{cms.icon}</span>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">{cms.name}</h4>
                        </div>
                        <button
                          onClick={() => cms.available && setShowCMSForm(true)}
                          disabled={!cms.available}
                          className={`w-full inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md ${
                            cms.available
                              ? 'border-violet-300 text-violet-700 bg-violet-50 hover:bg-violet-100 dark:bg-violet-900/10 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-900/20'
                              : 'border-gray-300 text-gray-500 bg-gray-50 cursor-not-allowed dark:bg-gray-700/30 dark:border-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {cms.available ? `Connect ${cms.name}` : 'Coming Soon'}
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Benefits of CMS Integration</h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                      <li>Automated article publishing</li>
                      <li>Content synchronization</li>
                      <li>SEO metadata management</li>
                      <li>Bulk content operations</li>
                    </ul>
                  </div>
                </div>
              )}
                
              {cmsError && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
                  {cmsError}
                </div>
              )}
            </div>
          )}

          {/* Host Connection Tab */}
          {activeTab === 'host' && (
            <div className="space-y-6">
              {hostLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
                </div>
              ) : hostConnections.length > 0 ? (
                <div className="space-y-4">
                  {/* Check if there's a Lovable connection and show setup instructions */}
                  {hostConnections.some(conn => conn.host_type === 'lovable') ? (
                    <LovableSetupInstructions 
                      domain={website.url}
                      onComplete={async () => {
                        try {
                          console.log('🎉 [SETUP MODAL] Lovable setup completed');
                          // Update parent status immediately
                          onStatusUpdate?.({ hostStatus: 'connected' });
                          // Also refresh connections to sync local state
                          await fetchHostConnections();
                          console.log('✅ [SETUP MODAL] Lovable setup completion handlers executed successfully');
                        } catch (error) {
                          console.error('❌ [SETUP MODAL] Error in Lovable setup completion:', error);
                          // Still try to update status even if refresh fails
                          onStatusUpdate?.({ hostStatus: 'connected' });
                        }
                      }}
                    />
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">Connected Hosting Platforms</h4>
                        <button
                          onClick={() => {/* Add host connection functionality */}}
                          className="inline-flex items-center px-3 py-1 text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400"
                        >
                          Add Connection
                        </button>
                      </div>
                      {hostConnections.map((connection) => (
                        <div key={connection.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center space-x-2">
                                <h5 className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                                  {connection.host_type}
                                </h5>
                                {connection.auto_deploy_enabled && (
                                  <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 dark:bg-green-900/20 dark:text-green-300 rounded-full">
                                    Auto Deploy
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {connection.project_name || connection.connection_name}
                              </p>
                              {connection.domain && (
                                <p className="text-xs text-blue-600 dark:text-blue-400">
                                  {connection.domain}
                                </p>
                              )}
                              {connection.last_deployment_at && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Last deployed: {new Date(connection.last_deployment_at).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(connection.deployment_status)}`}>
                              {connection.deployment_status}
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Hosting Integration
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Connect your hosting platform to enable automated deployments and seamless content publishing.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {[
                      { type: 'vercel', name: 'Vercel', icon: '▲', available: true },
                      { type: 'lovable', name: 'Lovable', icon: '💖', available: true },
                      { type: 'netlify', name: 'Netlify', icon: '🌐', available: false },
                      { type: 'github_pages', name: 'GitHub Pages', icon: '🐙', available: false },
                      { type: 'custom', name: 'Custom Host', icon: '🔧', available: false },
                    ].map((host) => (
                      <div key={host.type} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <div className="flex items-center space-x-3 mb-3">
                          <span className="text-2xl">{host.icon}</span>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">{host.name}</h4>
                        </div>
                        <button
                          onClick={() => {
                            if (host.type === 'vercel') {
                              handleVercelConnection();
                            } else if (host.type === 'lovable') {
                              handleLovableConnection();
                            } else {
                              // Add other host connection functionality
                            }
                          }}
                          disabled={!host.available || ((host.type === 'vercel' || host.type === 'lovable') && hostLoading)}
                          className={`w-full inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md ${
                            host.available
                              ? 'border-violet-300 text-violet-700 bg-violet-50 hover:bg-violet-100 dark:bg-violet-900/10 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-900/20'
                              : 'border-gray-300 text-gray-500 bg-gray-50 cursor-not-allowed dark:bg-gray-700/30 dark:border-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {(host.type === 'vercel' || host.type === 'lovable') && hostLoading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                              Connecting...
                            </>
                          ) : host.available ? (
                            `Connect ${host.name}`
                          ) : (
                            'Coming Soon'
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Benefits of Hosting Integration</h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                      <li>Automated deployments on content changes</li>
                      <li>Seamless CI/CD pipeline integration</li>
                      <li>Real-time deployment status monitoring</li>
                      <li>Environment-specific configurations</li>
                      <li>Build optimization and performance tracking</li>
                    </ul>
                  </div>
                </div>
              )}
                
              {hostError && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
                  {hostError}
                </div>
              )}
            </div>
          )}
          
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );

  // Use createPortal to render the modal at the document root level
  return typeof document !== 'undefined' 
    ? createPortal(modalContent, document.body)
    : null;
}