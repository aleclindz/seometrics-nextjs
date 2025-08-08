'use client';

import React from 'react';
import { StatusIndicator } from './StatusIndicator';

interface Site {
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
  };
}

interface SiteCardProps {
  site: Site;
  isSelected: boolean;
  onClick: () => void;
}

export function SiteCard({ site, isSelected, onClick }: SiteCardProps) {
  const getOverallStatus = () => {
    if (site.gscStatus === 'error' || site.cmsStatus === 'error' || site.smartjsStatus === 'error') {
      return 'error';
    }
    if (site.gscStatus === 'connected' && site.cmsStatus === 'connected' && site.smartjsStatus === 'active') {
      return 'healthy';
    }
    if (site.gscStatus === 'pending' || site.cmsStatus === 'pending') {
      return 'warning';
    }
    return 'partial';
  };

  const overallStatus = getOverallStatus();

  const formatLastSync = (date?: Date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 rounded-lg transition-all duration-200 text-left group ${
        isSelected 
          ? 'bg-[#5E6AD2]/20 border border-[#5E6AD2]/50' 
          : 'hover:bg-white/5 border border-transparent'
      }`}
    >
      {/* Site Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
              overallStatus === 'healthy' ? 'bg-green-500' :
              overallStatus === 'warning' ? 'bg-yellow-500' :
              overallStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
            }`} />
            <h3 className="font-medium text-white truncate text-sm">{site.name}</h3>
          </div>
          <p className="text-xs text-gray-400 truncate mt-1">{site.url}</p>
        </div>
        
        {/* Quick action indicator */}
        <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
          isSelected ? 'rotate-90' : 'group-hover:translate-x-1'
        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {/* Status Indicators */}
      <div className="flex items-center space-x-2 mb-2">
        <StatusIndicator 
          type="gsc" 
          status={site.gscStatus} 
          tooltip="Google Search Console" 
        />
        <StatusIndicator 
          type="cms" 
          status={site.cmsStatus} 
          tooltip="CMS Connection" 
        />
        <StatusIndicator 
          type="smartjs" 
          status={site.smartjsStatus} 
          tooltip="SEOAgent.js Status" 
        />
      </div>

      {/* Metrics */}
      {site.metrics && (
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div className="text-center">
            <div className="text-xs font-medium text-green-400">{formatNumber(site.metrics.clicks)}</div>
            <div className="text-xs text-gray-500">Clicks</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-medium text-blue-400">{formatNumber(site.metrics.impressions)}</div>
            <div className="text-xs text-gray-500">Views</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-medium text-purple-400">{site.metrics.ctr}%</div>
            <div className="text-xs text-gray-500">CTR</div>
          </div>
        </div>
      )}

      {/* Last Sync */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Last sync:</span>
        <span className={`${
          site.lastSync && new Date().getTime() - site.lastSync.getTime() < 3600000 
            ? 'text-green-400' : 'text-gray-400'
        }`}>
          {formatLastSync(site.lastSync)}
        </span>
      </div>

      {/* Progress indicator for incomplete setups */}
      {overallStatus !== 'healthy' && (
        <div className="mt-2">
          <div className="w-full bg-gray-700 rounded-full h-1">
            <div 
              className={`h-1 rounded-full transition-all duration-300 ${
                overallStatus === 'error' ? 'bg-red-500' :
                overallStatus === 'warning' ? 'bg-yellow-500' : 'bg-gray-500'
              }`}
              style={{ 
                width: `${
                  (site.gscStatus === 'connected' ? 33 : 0) +
                  (site.cmsStatus === 'connected' ? 33 : 0) +
                  (site.smartjsStatus === 'active' ? 34 : 0)
                }%` 
              }}
            />
          </div>
        </div>
      )}
    </button>
  );
}