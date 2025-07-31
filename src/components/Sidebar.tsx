'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useFeatures } from '@/hooks/useFeatures';
import UpgradeBadge from './UpgradeBadge';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarExpanded: boolean;
  setSidebarExpanded: (expanded: boolean) => void;
}

export default function Sidebar({ sidebarOpen, setSidebarOpen, sidebarExpanded, setSidebarExpanded }: SidebarProps) {
  const pathname = usePathname();
  const { features, hasFeature } = useFeatures();
  
  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  return (
    <div className="min-w-fit">
      {/* Sidebar backdrop (mobile only) */}
      <div
        className={`fixed inset-0 bg-gray-900 bg-opacity-30 z-40 lg:hidden lg:z-auto transition-opacity duration-200 ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <div
        className={`flex flex-col absolute z-40 left-0 top-0 lg:static lg:left-auto lg:top-auto lg:translate-x-0 h-screen overflow-y-scroll lg:overflow-y-auto no-scrollbar w-64 lg:w-20 ${
          sidebarExpanded ? 'lg:!w-64' : ''
        } 2xl:!w-64 shrink-0 bg-white dark:bg-gray-800 shadow-sm p-4 transition-all duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-64'
        }`}
      >
        {/* Sidebar header */}
        <div className="flex justify-between mb-10 pr-3 sm:px-2">
          {/* Close button */}
          <button 
            className="lg:hidden text-gray-500 hover:text-gray-400" 
            onClick={() => setSidebarOpen(false)}
            aria-controls="sidebar"
          >
            <span className="sr-only">Close sidebar</span>
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.7 18.7l1.4-1.4L7.8 13H20v-2H7.8l4.3-4.3-1.4-1.4L4 12z" />
            </svg>
          </button>
          {/* Logo */}
          <Link className="block" href="/">
            <Image 
              src="/assets/SEOAgent_logo.png" 
              alt="SEOAgent" 
              width={120}
              height={32}
              style={{ height: '32px', width: 'auto' }}
            />
          </Link>
        </div>

        {/* Links */}
        <div className="space-y-8">
          {/* Pages group */}
          <div>
            <h3 className="text-xs uppercase text-gray-400 dark:text-gray-500 font-semibold pl-3">
              <span className={`hidden lg:block ${sidebarExpanded ? 'lg:hidden' : ''} 2xl:hidden text-center w-6`} aria-hidden="true">🤖</span>
              <span className={`lg:hidden ${sidebarExpanded ? 'lg:block' : ''} 2xl:block`}>SEO Agent</span>
            </h3>
            <ul className="mt-3">
              
              {/* Dashboard */}
              <li className={`pl-4 pr-3 py-2 rounded-lg mb-0.5 last:mb-0 transition-colors ${
                isActive('/') 
                  ? 'bg-[linear-gradient(135deg,var(--tw-gradient-stops))] from-violet-500/[0.12] dark:from-violet-500/[0.24] to-violet-500/[0.04]' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}>
                <Link className="block text-gray-800 dark:text-gray-100 truncate transition" href="/">
                  <div className="flex items-center">
                    <svg className={`shrink-0 fill-current transition-colors ${
                      isActive('/') ? 'text-violet-500' : 'text-gray-400 dark:text-gray-500 group-hover:text-violet-500'
                    }`} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                      <path d="M5.936.278A7.983 7.983 0 0 1 8 0a8 8 0 1 1-8 8c0-.722.104-1.413.278-2.064a1 1 0 1 1 1.932.516A5.99 5.99 0 0 0 2 8a6 6 0 1 0 6-6c-.53 0-1.045.076-1.548.21A1 1 0 1 1 5.936.278Z"></path>
                      <path d="M6.068 7.482A2.003 2.003 0 0 0 8 10a2 2 0 1 0-.518-3.932L3.707 2.293a1 1 0 0 0-1.414 1.414l3.775 3.775Z"></path>
                    </svg>
                    <span className={`text-sm font-medium ml-4 lg:opacity-0 ${sidebarExpanded ? 'lg:opacity-100' : ''} 2xl:opacity-100 duration-200`}>
                      Dashboard
                    </span>
                  </div>
                </Link>
              </li>


              {/* Content Writer */}
              <li className={`pl-4 pr-3 py-2 rounded-lg mb-0.5 last:mb-0 transition-colors group ${
                isActive('/content-writer') 
                  ? 'bg-[linear-gradient(135deg,var(--tw-gradient-stops))] from-violet-500/[0.12] dark:from-violet-500/[0.24] to-violet-500/[0.04]' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}>
                <Link className="block text-gray-800 dark:text-gray-100 hover:text-gray-900 dark:hover:text-white truncate transition" href="/content-writer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0">
                      <svg className={`shrink-0 fill-current transition-colors ${
                        isActive('/content-writer') ? 'text-violet-500' : 'text-gray-400 dark:text-gray-500 group-hover:text-violet-500'
                      }`} width="16" height="16" viewBox="0 0 16 16">
                        <path d="M13.95.879a3 3 0 0 0-4.243 0L1.293 9.293a1 1 0 0 0-.274.51l-1 5a1 1 0 0 0 1.177 1.177l5-1a1 1 0 0 0 .511-.273l8.414-8.414a3 3 0 0 0 0-4.242L13.95.879ZM11.12 2.293a1 1 0 0 1 1.414 0l1.172 1.172a1 1 0 0 1 0 1.414l-8.2 8.2-3.232.646.646-3.232 8.2-8.2Z"></path>
                        <path d="M10 14a1 1 0 1 0 0 2h5a1 1 0 1 0 0-2h-5Z"></path>
                      </svg>
                      <span className={`text-sm font-medium ml-4 lg:opacity-0 ${sidebarExpanded ? 'lg:opacity-100' : ''} 2xl:opacity-100 duration-200 truncate`}>
                        Content Writer
                      </span>
                    </div>
                    {!hasFeature('articleGeneration') && (
                      <div className={`ml-2 lg:opacity-0 ${sidebarExpanded ? 'lg:opacity-100' : ''} 2xl:opacity-100 duration-200`}>
                        <UpgradeBadge feature="Content Writer" plan="starter" size="sm" />
                      </div>
                    )}
                  </div>
                </Link>
              </li>


              {/* Account */}
              <li className={`pl-4 pr-3 py-2 rounded-lg mb-0.5 last:mb-0 transition-colors group ${
                isActive('/account') 
                  ? 'bg-[linear-gradient(135deg,var(--tw-gradient-stops))] from-violet-500/[0.12] dark:from-violet-500/[0.24] to-violet-500/[0.04]' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}>
                <Link className="block text-gray-800 dark:text-gray-100 hover:text-gray-900 dark:hover:text-white truncate transition" href="/account">
                  <div className="flex items-center">
                    <svg className={`shrink-0 fill-current transition-colors ${
                      isActive('/account') ? 'text-violet-500' : 'text-gray-400 dark:text-gray-500 group-hover:text-violet-500'
                    }`} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                      <path d="M10.5 1a3.502 3.502 0 0 1 3.355 2.5H15a1 1 0 1 1 0 2h-1.145a3.502 3.502 0 0 1-6.71 0H1a1 1 0 0 1 0-2h6.145A3.502 3.502 0 0 1 10.5 1ZM9 4.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM5.5 9a3.502 3.502 0 0 1 3.355 2.5H15a1 1 0 1 1 0 2H8.855a3.502 3.502 0 0 1-6.71 0H1a1 1 0 1 1 0-2h1.145A3.502 3.502 0 0 1 5.5 9ZM4 12.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0Z" fillRule="evenodd"></path>
                    </svg>
                    <span className={`text-sm font-medium ml-4 lg:opacity-0 ${sidebarExpanded ? 'lg:opacity-100' : ''} 2xl:opacity-100 duration-200`}>
                      Account
                    </span>
                  </div>
                </Link>
              </li>

            </ul>
          </div>
        </div>

        {/* Expand / collapse button */}
        <div className="pt-3 hidden lg:inline-flex 2xl:hidden justify-end mt-auto">
          <div className="w-12 pl-4 pr-3 py-2">
            <button 
              className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 transition-colors" 
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
            >
              <span className="sr-only">Expand / collapse sidebar</span>
              <svg className={`shrink-0 fill-current text-gray-400 dark:text-gray-500 ${sidebarExpanded ? 'rotate-180' : ''} transition-transform`} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                <path d="M15 16a1 1 0 0 1-1-1V1a1 1 0 1 1 2 0v14a1 1 0 0 1-1 1ZM8.586 7H1a1 1 0 1 0 0 2h7.586l-2.793 2.793a1 1 0 1 0 1.414 1.414l4.5-4.5A.997.997 0 0 0 12 8.01M11.924 7.617a.997.997 0 0 0-.217-.324l-4.5-4.5a1 1 0 0 0-1.414 1.414L8.586 7M12 7.99a.996.996 0 0 0-.076-.373Z" />
              </svg>                            
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}