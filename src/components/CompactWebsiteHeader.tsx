import React from 'react';

interface CompactWebsiteHeaderProps {
  domain: string;
  metrics: {
    clicks: number;
    clicksChange: number;
    indexed: string;
    techScore: number;
    techScorePercent: number;
  };
  setupStatus: {
    gscConnected: boolean;
    seoagentjsActive: boolean;
    cmsConnected: boolean;
    hostingConnected: boolean;
    progress: number;
  };
  isActive: boolean;
}

export const CompactWebsiteHeader: React.FC<CompactWebsiteHeaderProps> = ({
  domain,
  metrics,
  setupStatus,
  isActive
}) => {
  const connectedCount = [
    setupStatus.gscConnected,
    setupStatus.seoagentjsActive,
    setupStatus.cmsConnected,
    setupStatus.hostingConnected
  ].filter(Boolean).length;

  const needsSetup = connectedCount < 2;

  return (
    <div className="bg-white/95 backdrop-blur-sm border-0 shadow-sm rounded-xl p-4">
      <div className="flex items-center justify-between">
        {/* Left: Website Info */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            {domain.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900">{domain}</h1>
            <p className="text-xs text-gray-500">SEO Performance</p>
          </div>
        </div>

        {/* Center: Key Metrics */}
        <div className="flex items-center gap-6">
          {/* Clicks */}
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-green-500">
              <path d="M12.586 12.586 19 19"></path>
              <path d="M3.688 3.037a.497.497 0 0 0-.651.651l6.5 15.999a.501.501 0 0 0 .947-.062l1.569-6.083a2 2 0 0 1 1.448-1.479l6.124-1.579a.5.5 0 0 0 .063-.947z"></path>
            </svg>
            <div className="text-right">
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold text-gray-900">{metrics.clicks}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-red-500">
                  <path d="m6 9 6 6 6-6"></path>
                </svg>
                <span className="text-xs text-red-600">{metrics.clicksChange}%</span>
              </div>
              <div className="text-xs text-gray-500">Clicks</div>
            </div>
          </div>

          {/* Indexed */}
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-blue-500">
              <path d="M16 7h6v6"></path>
              <path d="m22 7-8.5 8.5-5-5L2 17"></path>
            </svg>
            <div className="text-right">
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold text-gray-900">{metrics.indexed}</span>
              </div>
              <div className="text-xs text-gray-500">Indexed</div>
            </div>
          </div>

          {/* Tech Score */}
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-orange-500">
              <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <div className="text-right">
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold text-gray-900">{metrics.techScore}/100</span>
                <span className="text-xs text-gray-500">{metrics.techScorePercent}%</span>
              </div>
              <div className="text-xs text-gray-500">Tech Score</div>
            </div>
          </div>

          {/* Setup Status Compact */}
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gray-600">
              <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <div className="text-right">
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold text-gray-900">{setupStatus.progress}%</span>
                {needsSetup && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                    Setup Needed
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500">Setup</div>
            </div>
          </div>

          {/* Coming Soon Items */}
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-purple-500">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
            <div className="text-right">
              <div className="flex items-center gap-1">
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Coming Soon</span>
              </div>
              <div className="text-xs text-gray-500">Backlinks</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-indigo-500">
              <path d="M12 8V4H8"></path>
              <rect width="16" height="12" x="4" y="8" rx="2"></rect>
              <path d="M2 14h2"></path>
              <path d="M20 14h2"></path>
              <path d="M15 13v2"></path>
              <path d="M9 13v2"></path>
            </svg>
            <div className="text-right">
              <div className="flex items-center gap-1">
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">Coming Soon</span>
              </div>
              <div className="text-xs text-gray-500">GEO Visibility</div>
            </div>
          </div>
        </div>

        {/* Right: Status Badge */}
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
            isActive 
              ? 'bg-green-50 text-green-700 border-green-200' 
              : 'bg-gray-50 text-gray-700 border-gray-200'
          }`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Setup Progress Bar - Only show if setup needed */}
      {needsSetup && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span>Setup Required: {setupStatus.progress}% Complete</span>
            </div>
            <div className="flex gap-1">
              {[
                { connected: setupStatus.gscConnected, name: 'GSC', color: 'blue' },
                { connected: setupStatus.seoagentjsActive, name: 'JS', color: 'violet' },
                { connected: setupStatus.cmsConnected, name: 'CMS', color: 'green' },
                { connected: setupStatus.hostingConnected, name: 'Host', color: 'orange' }
              ].map((item, index) => (
                <div key={index} className={`w-2 h-2 rounded-full ${
                  item.connected ? 'bg-green-500' : 'bg-gray-300'
                }`} title={item.name} />
              ))}
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="h-1.5 rounded-full transition-all duration-300 bg-orange-500" 
              style={{ width: `${setupStatus.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};