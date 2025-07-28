'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function InterfaceToggle() {
  const pathname = usePathname();
  const isChatMode = pathname === '/chat';

  return (
    <div className="fixed top-4 right-4 z-50">
      <Link
        href={isChatMode ? '/dashboard' : '/chat'}
        className="bg-[#1E1E26] border border-white/10 hover:border-white/20 rounded-lg p-3 text-gray-300 hover:text-white transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
      >
        {isChatMode ? (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <span className="text-sm font-medium">Dashboard</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="text-sm font-medium">AI Chat</span>
            {/* New feature indicator */}
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </>
        )}
      </Link>
    </div>
  );
}