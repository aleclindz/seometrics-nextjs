'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth';
import { Globe, Loader2, Settings, Home } from 'lucide-react';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarExpanded: boolean;
  setSidebarExpanded: (expanded: boolean) => void;
}

interface Website {
  site_url: string;
  permission_level: string;
  verified: boolean;
}

export default function Sidebar({ sidebarOpen, setSidebarOpen, sidebarExpanded, setSidebarExpanded }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  
  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname.startsWith(path);
  };

  const isWebsiteActive = (siteUrl: string) => {
    return pathname.includes(`/website/${encodeURIComponent(siteUrl)}`);
  };

  const getDomainFromUrl = (url: string) => {
    try {
      // Remove protocol prefixes like sc-domain:
      const cleanUrl = url.replace(/^sc-domain:/, '').replace(/^https?:\/\//, '');
      return cleanUrl.replace(/\/$/, ''); // Remove trailing slash
    } catch {
      return url;
    }
  };

  const getWebsiteIcon = (domain: string) => {
    return domain.charAt(0).toUpperCase();
  };

  useEffect(() => {
    const fetchWebsites = async () => {
      if (!user?.token) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/gsc/properties?userToken=${user.token}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.properties) {
            // Filter to only verified properties
            const verifiedSites = data.properties.filter((site: Website) => site.verified);
            setWebsites(verifiedSites);
          }
        }
      } catch (error) {
        console.error('Failed to fetch GSC properties:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWebsites();
  }, [user?.token]);

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
          {/* Logo/Icon */}
          <Link className="block" href="/dashboard">
            {/* Full logo for expanded sidebar */}
            <Image 
              src="/assets/SEOAgent_logo.png" 
              alt="SEOAgent" 
              width={120}
              height={32}
              style={{ height: '32px', width: 'auto' }}
              className={`lg:hidden ${sidebarExpanded ? 'lg:block' : ''} 2xl:block`}
            />
            {/* Icon for narrow sidebar */}
            <Image 
              src="/assets/agent_icon.png" 
              alt="SEOAgent" 
              width={32}
              height={32}
              style={{ height: '32px', width: '32px' }}
              className={`hidden lg:block ${sidebarExpanded ? 'lg:hidden' : ''} 2xl:hidden`}
            />
          </Link>
        </div>

        {/* Navigation */}
        <div className="space-y-6 flex-1">
          {/* Dashboard */}
          <div>
            <ul>
              <li className={`pl-4 pr-3 py-2 rounded-lg mb-2 transition-colors ${
                isActive('/dashboard') 
                  ? 'bg-[linear-gradient(135deg,var(--tw-gradient-stops))] from-violet-500/[0.12] dark:from-violet-500/[0.24] to-violet-500/[0.04]' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}>
                <Link className="block text-gray-800 dark:text-gray-100 truncate transition" href="/dashboard">
                  <div className="flex items-center">
                    <Home className={`shrink-0 transition-colors ${
                      isActive('/dashboard') ? 'text-violet-500' : 'text-gray-400 dark:text-gray-500'
                    }`} size={16} />
                    <span className={`text-sm font-medium ml-4 lg:opacity-0 ${sidebarExpanded ? 'lg:opacity-100' : ''} 2xl:opacity-100 duration-200`}>
                      Dashboard
                    </span>
                  </div>
                </Link>
              </li>
            </ul>
          </div>

          {/* Websites Section */}
          <div className="flex-1">
            <h3 className="text-xs uppercase text-gray-400 dark:text-gray-500 font-semibold pl-3 mb-3">
              <span className={`hidden lg:block ${sidebarExpanded ? 'lg:hidden' : ''} 2xl:hidden text-center w-6`} aria-hidden="true">🌐</span>
              <span className={`lg:hidden ${sidebarExpanded ? 'lg:block' : ''} 2xl:block`}>Websites</span>
            </h3>
            
            <ul className="space-y-1">
              {loading ? (
                <li className="pl-4 pr-3 py-2">
                  <div className="flex items-center">
                    <Loader2 className="animate-spin text-gray-400" size={16} />
                    <span className={`text-sm text-gray-500 ml-4 lg:opacity-0 ${sidebarExpanded ? 'lg:opacity-100' : ''} 2xl:opacity-100 duration-200`}>
                      Loading...
                    </span>
                  </div>
                </li>
              ) : websites.length > 0 ? (
                websites.map((website) => {
                  const domain = getDomainFromUrl(website.site_url);
                  const websiteActive = isWebsiteActive(domain);
                  
                  return (
                    <li key={website.site_url} className={`pl-4 pr-3 py-2 rounded-lg transition-colors ${
                      websiteActive
                        ? 'bg-[linear-gradient(135deg,var(--tw-gradient-stops))] from-violet-500/[0.12] dark:from-violet-500/[0.24] to-violet-500/[0.04]' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}>
                      <Link 
                        className="block text-gray-800 dark:text-gray-100 truncate transition" 
                        href={`/website/${encodeURIComponent(domain)}`}
                      >
                        <div className="flex items-center">
                          <div className={`shrink-0 w-4 h-4 rounded flex items-center justify-center text-xs font-bold transition-colors ${
                            websiteActive 
                              ? 'bg-violet-500 text-white' 
                              : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                          }`}>
                            {getWebsiteIcon(domain)}
                          </div>
                          <span className={`text-sm font-medium ml-4 lg:opacity-0 ${sidebarExpanded ? 'lg:opacity-100' : ''} 2xl:opacity-100 duration-200 truncate`}>
                            {domain}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })
              ) : (
                <li className="pl-4 pr-3 py-2">
                  <div className="flex items-center">
                    <Globe className="text-gray-400" size={16} />
                    <span className={`text-sm text-gray-500 ml-4 lg:opacity-0 ${sidebarExpanded ? 'lg:opacity-100' : ''} 2xl:opacity-100 duration-200`}>
                      No websites
                    </span>
                  </div>
                  <p className={`text-xs text-gray-400 mt-1 ml-8 lg:opacity-0 ${sidebarExpanded ? 'lg:opacity-100' : ''} 2xl:opacity-100 duration-200`}>
                    Connect Google Search Console
                  </p>
                </li>
              )}
            </ul>
          </div>

          {/* Account at bottom */}
          <div className="mt-auto">
            <ul>
              <li className={`pl-4 pr-3 py-2 rounded-lg transition-colors ${
                isActive('/account') 
                  ? 'bg-[linear-gradient(135deg,var(--tw-gradient-stops))] from-violet-500/[0.12] dark:from-violet-500/[0.24] to-violet-500/[0.04]' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}>
                <Link className="block text-gray-800 dark:text-gray-100 truncate transition" href="/account">
                  <div className="flex items-center">
                    <Settings className={`shrink-0 transition-colors ${
                      isActive('/account') ? 'text-violet-500' : 'text-gray-400 dark:text-gray-500'
                    }`} size={16} />
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
        <div className="pt-3 hidden lg:inline-flex 2xl:hidden justify-end">
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