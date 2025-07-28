'use client';

import React from 'react';

interface StatusIndicatorProps {
  type: 'gsc' | 'cms' | 'smartjs';
  status: 'connected' | 'pending' | 'error' | 'none' | 'active' | 'inactive';
  tooltip: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusIndicator({ type, status, tooltip, size = 'sm' }: StatusIndicatorProps) {
  const getIcon = () => {
    switch (type) {
      case 'gsc':
        return (
          <svg className="w-full h-full" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'cms':
        return (
          <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
      case 'smartjs':
        return (
          <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
      case 'active':
        return 'text-green-500 bg-green-500/20';
      case 'pending':
        return 'text-yellow-500 bg-yellow-500/20';
      case 'error':
        return 'text-red-500 bg-red-500/20';
      case 'inactive':
      case 'none':
        return 'text-gray-500 bg-gray-500/20';
      default:
        return 'text-gray-500 bg-gray-500/20';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'active':
        return 'Active';
      case 'pending':
        return 'Pending';
      case 'error':
        return 'Error';
      case 'inactive':
        return 'Inactive';
      case 'none':
        return 'Not connected';
      default:
        return 'Unknown';
    }
  };

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const statusColor = getStatusColor();

  return (
    <div className="group relative">
      <div className={`${sizeClasses[size]} ${statusColor} rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110`}>
        {getIcon()}
      </div>
      
      {/* Status indicator dot */}
      <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full border border-[#15151B] ${
        status === 'connected' || status === 'active' ? 'bg-green-500' :
        status === 'pending' ? 'bg-yellow-500' :
        status === 'error' ? 'bg-red-500' : 'bg-gray-500'
      }`} />

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
        {tooltip}: {getStatusText()}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-black/90" />
      </div>
    </div>
  );
}