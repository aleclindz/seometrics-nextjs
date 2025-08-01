'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Globe, 
  Search,
  Code,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';

interface WebsiteHealthOverviewProps {
  website: {
    id: string;
    url: string;
    name: string;
    gscStatus: 'connected' | 'pending' | 'error' | 'none';
    smartjsStatus: 'active' | 'inactive' | 'error';
    auditScore?: number;
    criticalIssues?: number;
  };
  latestAudit?: {
    status: string;
    progress_percentage?: number;
  } | null;
  auditLoading: boolean;
  onStartAudit: () => void;
}

export default function WebsiteHealthOverview({ 
  website, 
  latestAudit, 
  auditLoading, 
  onStartAudit 
}: WebsiteHealthOverviewProps) {
  const router = useRouter();
  const [codeCopied, setCodeCopied] = useState(false);

  const handleCopyCode = async () => {
    const code = `<script src="https://seoagent.com/seoagent.js"></script>
<script>const idv = '${website.id}';</script>`;
    
    try {
      await navigator.clipboard.writeText(code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  const getHealthStatusIcon = () => {
    if (latestAudit?.status === 'running') {
      return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
    }
    
    if (!website.auditScore) {
      return <AlertTriangle className="w-5 h-5 text-gray-400" />;
    }
    
    if (website.auditScore >= 80) {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    } else if (website.auditScore >= 60) {
      return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    } else {
      return <XCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const getHealthStatusColor = () => {
    if (latestAudit?.status === 'running') return 'text-blue-600';
    if (!website.auditScore) return 'text-gray-400';
    if (website.auditScore >= 80) return 'text-green-600';
    if (website.auditScore >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthStatusText = () => {
    if (latestAudit?.status === 'running') return 'Analyzing...';
    if (!website.auditScore) return 'Not Checked';
    return `${website.auditScore}/100`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Website Health Overview
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Monitor and manage your website&apos;s SEO setup and performance
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SEO Health Check */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              {getHealthStatusIcon()}
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 ml-2">
                SEO Health
              </h3>
            </div>
            <div className={`text-lg font-bold ${getHealthStatusColor()}`}>
              {getHealthStatusText()}
            </div>
          </div>

          {/* Progress bar for running audit */}
          {latestAudit?.status === 'running' && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Progress</span>
                <span className="text-xs text-gray-900">{latestAudit.progress_percentage || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${latestAudit.progress_percentage || 0}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Critical issues indicator */}
          {website.criticalIssues && website.criticalIssues > 0 && (
            <div className="mb-3">
              <p className="text-xs text-red-600 font-medium">
                {website.criticalIssues} critical issues need attention
              </p>
            </div>
          )}

          <button
            onClick={onStartAudit}
            disabled={auditLoading || latestAudit?.status === 'running'}
            className="w-full btn bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white flex items-center justify-center text-sm py-2"
          >
            {auditLoading || latestAudit?.status === 'running' ? (
              <>
                <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="w-3 h-3 mr-2" />
                {website.auditScore ? 'Re-check Health' : 'Check Health'}
              </>
            )}
          </button>
        </div>

        {/* Google Search Console */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              {website.gscStatus === 'connected' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              )}
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 ml-2">
                Search Console
              </h3>
            </div>
            <div className={`text-sm font-medium ${
              website.gscStatus === 'connected' ? 'text-green-600' : 'text-orange-500'
            }`}>
              {website.gscStatus === 'connected' ? 'Connected' : 'Not Connected'}
            </div>
          </div>

          <div className="mb-3">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {website.gscStatus === 'connected' 
                ? 'Tracking search performance and indexing status'
                : 'Connect to track search performance and get indexing insights'
              }
            </p>
          </div>

          {website.gscStatus !== 'connected' ? (
            <button
              onClick={() => router.push('/add-website')}
              className="w-full btn bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center text-sm py-2"
            >
              <Globe className="w-3 h-3 mr-2" />
              Connect Now
            </button>
          ) : (
            <button
              onClick={() => router.push('/add-website')}
              className="w-full btn bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 flex items-center justify-center text-sm py-2"
            >
              <ExternalLink className="w-3 h-3 mr-2" />
              Manage Connection
            </button>
          )}
        </div>

        {/* SEOAgent.js Installation */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              {website.smartjsStatus === 'active' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              )}
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 ml-2">
                SEOAgent.js
              </h3>
            </div>
            <div className={`text-sm font-medium ${
              website.smartjsStatus === 'active' ? 'text-green-600' : 'text-orange-500'
            }`}>
              {website.smartjsStatus === 'active' ? 'Active' : 'Not Installed'}
            </div>
          </div>

          <div className="mb-3">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {website.smartjsStatus === 'active' 
                ? 'Automatically optimizing your technical SEO'
                : 'Install to enable automated technical SEO optimizations'
              }
            </p>
          </div>

          {website.smartjsStatus !== 'active' ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                Add to your website&apos;s &lt;head&gt; section:
              </p>
              <div className="relative">
                <div className="bg-gray-900 rounded-md p-2 overflow-x-auto">
                  <code className="text-xs text-gray-100 whitespace-pre">
{`<script src="https://seoagent.com/seoagent.js"></script>
<script>const idv = '${website.id}';</script>`}
                  </code>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="absolute top-1 right-1 p-1 bg-gray-700 hover:bg-gray-600 rounded text-white"
                  title="Copy code"
                >
                  {codeCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          ) : (
            <button
              className="w-full btn bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 flex items-center justify-center text-sm py-2"
              disabled
            >
              <Code className="w-3 h-3 mr-2" />
              Installation Complete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}