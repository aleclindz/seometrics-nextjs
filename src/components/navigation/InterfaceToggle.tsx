'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

export function InterfaceToggle() {
  const pathname = usePathname();
  const isChatMode = pathname === '/chat';

  return (
    <div className="fixed top-4 right-4 z-50 bg-[#1E1E26] border border-white/10 rounded-lg p-1 flex items-center space-x-1">
      <Link
        href="/dashboard"
        className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          !isChatMode 
            ? 'bg-[#5E6AD2] text-white shadow-sm' 
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <span>Dashboard</span>
        </div>
      </Link>
      
      <Link
        href="/chat"
        className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 relative ${
          isChatMode 
            ? 'bg-[#5E6AD2] text-white shadow-sm' 
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span>Chat</span>
          {/* New feature indicator */}
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
        </div>
      </Link>
    </div>
  );
}