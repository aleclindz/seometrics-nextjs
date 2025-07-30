'use client';

import React, { useState, useEffect } from 'react';
import { SiteCard } from './SiteCard';
import { useAuth } from '@/contexts/auth';

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
    position: number;
  };
}

interface ChatSidebarProps {
  sites: Site[];
  selectedSite: Site | null;
  onSiteSelect: (site: Site) => void;
  sitesLoading: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function ChatSidebar({ 
  sites, 
  selectedSite, 
  onSiteSelect, 
  sitesLoading, 
  collapsed, 
  onToggleCollapsed 
}: ChatSidebarProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSites = sites.filter(site =>
    site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    site.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewSite = () => {
    // TODO: Implement new site addition flow
    console.log('Add new site');
  };

  if (collapsed) {
    return (
      <div className="fixed top-0 left-0 h-full w-16 bg-[#15151B] border-r border-white/10 z-20 flex flex-col items-center py-4">
        <button
          onClick={onToggleCollapsed}
          className="p-3 rounded-md hover:bg-white/10 transition-colors mb-4"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        {/* Collapsed site indicators */}
        <div className="space-y-2">
          {sitesLoading ? (
            <div className="w-10 h-10 rounded-lg bg-white/10 animate-pulse"></div>
          ) : (
            filteredSites.slice(0, 5).map((site) => (
              <button
                key={site.id}
                onClick={() => onSiteSelect(site)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-medium transition-colors ${
                  selectedSite?.id === site.id 
                    ? 'bg-[#5E6AD2] text-white' 
                    : 'bg-white/10 hover:bg-white/20'
                }`}
                title={site.name}
              >
                {site.name.charAt(0).toUpperCase()}
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 h-full w-64 bg-[#15151B] border-r border-white/10 z-20 flex flex-col">
      {/* Header */}
      <div className="p-5 flex items-center border-b border-white/10">
        <button
          onClick={onToggleCollapsed}
          className="p-2 rounded-md hover:bg-white/10 transition-colors mr-3"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center">
          <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-lg font-medium">SEOAgent</span>
        </div>
      </div>

      {/* New Site Button */}
      <div className="p-4">
        <button 
          onClick={handleNewSite}
          className="w-full bg-[#5E6AD2] hover:bg-[#5E6AD2]/90 text-white py-2 px-4 rounded-md flex items-center justify-center transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Site
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search sites..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5E6AD2] focus:border-transparent"
          />
        </div>
      </div>

      {/* Sites List */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-2 text-xs font-medium text-gray-400 uppercase">
          Your Sites ({filteredSites.length})
        </div>
        
        <div className="space-y-1 px-3">
          {sitesLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-white/5 rounded-lg animate-pulse"></div>
              ))}
            </div>
          ) : (
            filteredSites.map((site) => (
              <SiteCard
                key={site.id}
                site={site}
                isSelected={selectedSite?.id === site.id}
                onClick={() => onSiteSelect(site)}
              />
            ))
          )}
        </div>

        {filteredSites.length === 0 && searchQuery && (
          <div className="p-4 text-center text-gray-400">
            <p>No sites found matching &ldquo;{searchQuery}&rdquo;</p>
          </div>
        )}

        {sites.length === 0 && (
          <div className="p-4 text-center text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="mb-2">No sites yet</p>
            <p className="text-sm">Add your first site to get started</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="border-t border-white/10 p-4">
        <div className="text-xs font-medium text-gray-400 uppercase mb-3">Quick Actions</div>
        <div className="space-y-2">
          <button className="w-full flex items-center py-2 px-3 rounded-md hover:bg-white/10 transition-colors text-left">
            <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-sm">Analytics Dashboard</span>
          </button>
          <button className="w-full flex items-center py-2 px-3 rounded-md hover:bg-white/10 transition-colors text-left">
            <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-sm">Sync All Sites</span>
          </button>
          <button className="w-full flex items-center py-2 px-3 rounded-md hover:bg-white/10 transition-colors text-left">
            <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm">Generate Report</span>
          </button>
        </div>
      </div>
    </div>
  );
}