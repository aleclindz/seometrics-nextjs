'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import WebsiteSetupModal from '@/components/WebsiteSetupModal';
import { 
  CheckCircle,
  AlertCircle, 
  XCircle,
  Clock,
  Settings,
  Bot,
  Database,
  Globe,
  Search
} from 'lucide-react';

interface SetupStatusCardProps {
  domain: string;
  userToken: string;
}

interface SetupStatus {
  gscStatus: 'connected' | 'pending' | 'error' | 'none';
  seoagentjsStatus: 'active' | 'inactive' | 'error';
  cmsStatus: 'connected' | 'pending' | 'error' | 'none';
  hostStatus: 'connected' | 'pending' | 'error' | 'none';
  setupProgress: number; // 0-100
  isFullySetup: boolean;
}

type SetupTab = 'gsc' | 'cms' | 'smartjs' | 'host';

export default function SetupStatusCard({ domain, userToken }: SetupStatusCardProps) {
  const [setupStatus, setSetupStatus] = useState<SetupStatus>({
    gscStatus: 'none',
    seoagentjsStatus: 'inactive',
    cmsStatus: 'none',
    hostStatus: 'none',
    setupProgress: 0,
    isFullySetup: false
  });
  const [loading, setLoading] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [modalActiveTab, setModalActiveTab] = useState<SetupTab>('gsc');
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    checkSetupStatus();
  }, [domain, userToken]);

  const checkSetupStatus = async () => {
    try {
      setLoading(true);
      
      // First, try to get existing setup status from database
      const dbResponse = await fetch(`/api/website/setup-status?userToken=${userToken}&domain=${domain}`);
      let existingStatus = null;
      if (dbResponse.ok) {
        const dbData = await dbResponse.json();
        if (dbData.success && dbData.data.exists) {
          existingStatus = dbData.data;
        }
      }

      // Check GSC connection
      const gscResponse = await fetch(`/api/gsc/connection?userToken=${userToken}`);
      let gscStatus: 'connected' | 'none' = 'none';
      if (gscResponse.ok) {
        const gscData = await gscResponse.json();
        gscStatus = gscData.connected ? 'connected' : 'none';
      }

      // Check SEOAgent.js status
      const smartjsResponse = await fetch('/api/smartjs/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          websiteUrl: domain.startsWith('http') ? domain : `https://${domain}`
        })
      });
      let seoagentjsStatus: 'active' | 'inactive' = 'inactive';
      if (smartjsResponse.ok) {
        const smartjsData = await smartjsResponse.json();
        seoagentjsStatus = smartjsData.success && smartjsData.data.active ? 'active' : 'inactive';
      }

      // Check CMS connections for this specific domain
      const cmsResponse = await fetch(`/api/cms/connections?userToken=${userToken}&domain=${domain}`);
      let cmsStatus: 'connected' | 'none' = 'none';
      if (cmsResponse.ok) {
        const cmsData = await cmsResponse.json();
        cmsStatus = cmsData.success && cmsData.connections.length > 0 ? 'connected' : 'none';
      }

      // Check hosting connections (simplified for now)
      let hostStatus: 'connected' | 'none' = 'none'; // TODO: Implement host connection check

      // Calculate setup progress
      const statusCount = [gscStatus, seoagentjsStatus, cmsStatus, hostStatus];
      const completedCount = statusCount.filter(status => 
        status === 'connected' || status === 'active'
      ).length;
      const setupProgress = Math.round((completedCount / 4) * 100);
      const isFullySetup = completedCount === 4;

      const newStatus = {
        gscStatus,
        seoagentjsStatus,
        cmsStatus,
        hostStatus,
        setupProgress,
        isFullySetup
      };

      setSetupStatus(newStatus);

      // Update database with latest status
      await updateSetupStatusInDB(newStatus);

    } catch (error) {
      console.error('Error checking setup status:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetupStatusInDB = async (status: SetupStatus) => {
    try {
      await fetch('/api/website/setup-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken,
          domain,
          gscStatus: status.gscStatus,
          seoagentjsStatus: status.seoagentjsStatus,
          cmsStatus: status.cmsStatus,
          hostingStatus: status.hostStatus
        })
      });
    } catch (error) {
      console.error('Error updating setup status in database:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
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

  const openSetupModal = (tab: SetupTab) => {
    setModalActiveTab(tab);
    setShowSetupModal(true);
  };

  const handleStatusUpdate = (updates: any) => {
    setSetupStatus(prev => ({
      ...prev,
      ...updates
    }));
    // Refresh full status after update
    setTimeout(checkSetupStatus, 1000);
  };

  if (loading) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-2 bg-gray-200 rounded w-full mb-4"></div>
            <div className="flex space-x-4">
              <div className="h-6 bg-gray-200 rounded w-20"></div>
              <div className="h-6 bg-gray-200 rounded w-20"></div>
              <div className="h-6 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isMinimized) {
    return (
      <Card className={`mb-4 ${setupStatus.isFullySetup ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {setupStatus.isFullySetup ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Setup Complete - SEOAgent Fully Active
                  </span>
                </>
              ) : (
                <>
                  <Settings className="w-5 h-5 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800">
                    Website Setup ({setupStatus.setupProgress}% Complete)
                  </span>
                </>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(false)}
              className={`h-6 px-2 ${setupStatus.isFullySetup ? 'text-green-700 hover:text-green-800' : 'text-orange-700 hover:text-orange-800'}`}
            >
              Show Details
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={`mb-4 ${setupStatus.isFullySetup ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Settings className="w-5 h-5 text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-800">
                Website Setup & Connections
              </h3>
              {setupStatus.isFullySetup && (
                <Badge className="bg-green-100 text-green-800 text-xs">
                  Complete
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-600">
                {setupStatus.setupProgress}% Complete
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(true)}
                className="h-6 px-2 text-gray-600 hover:text-gray-700"
              >
                Minimize
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                setupStatus.setupProgress === 100 ? 'bg-green-500' : 'bg-orange-500'
              }`}
              style={{ width: `${setupStatus.setupProgress}%` }}
            />
          </div>

          {/* Status Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <button
              onClick={() => openSetupModal('gsc')}
              className="flex items-center space-x-2 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
            >
              <Search className="w-4 h-4 text-blue-600" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1">
                  {getStatusIcon(setupStatus.gscStatus)}
                  <span className="text-xs font-medium text-gray-900 truncate">
                    Search Console
                  </span>
                </div>
              </div>
            </button>

            <button
              onClick={() => openSetupModal('smartjs')}
              className="flex items-center space-x-2 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
            >
              <Bot className="w-4 h-4 text-violet-600" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1">
                  {getStatusIcon(setupStatus.seoagentjsStatus)}
                  <span className="text-xs font-medium text-gray-900 truncate">
                    SEOAgent.js
                  </span>
                </div>
              </div>
            </button>

            <button
              onClick={() => openSetupModal('cms')}
              className="flex items-center space-x-2 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
            >
              <Database className="w-4 h-4 text-green-600" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1">
                  {getStatusIcon(setupStatus.cmsStatus)}
                  <span className="text-xs font-medium text-gray-900 truncate">
                    CMS
                  </span>
                </div>
              </div>
            </button>

            <button
              onClick={() => openSetupModal('host')}
              className="flex items-center space-x-2 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
            >
              <Globe className="w-4 h-4 text-orange-600" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1">
                  {getStatusIcon(setupStatus.hostStatus)}
                  <span className="text-xs font-medium text-gray-900 truncate">
                    Hosting
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* Setup Message */}
          {!setupStatus.isFullySetup && (
            <div className="bg-orange-100 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-800 mb-2">
                <strong>Setup Required:</strong> To unlock SEOAgent&apos;s full automation capabilities, please complete the missing connections above.
              </p>
              <p className="text-xs text-orange-700">
                Each connection enables specific features: GSC for performance data, SEOAgent.js for automated fixes, CMS for content publishing, and Hosting for sitemap management.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Modal */}
      {showSetupModal && (
        <WebsiteSetupModal
          isOpen={showSetupModal}
          onClose={() => setShowSetupModal(false)}
          website={{
            id: domain,
            url: domain,
            name: domain,
            gscStatus: setupStatus.gscStatus,
            cmsStatus: setupStatus.cmsStatus,
            smartjsStatus: setupStatus.seoagentjsStatus,
            hostStatus: setupStatus.hostStatus
          }}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </>
  );
}