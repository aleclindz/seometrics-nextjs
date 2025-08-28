'use client';

import { useState } from 'react';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '@/contexts/auth';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    setUserMenuOpen(false);
  };

  // For now, assume all users are free tier (can be expanded later)
  const userPlan = 0; // 0 = free, 1 = paid

  return (
    <header className="sticky top-0 before:absolute before:inset-0 before:backdrop-blur-md before:bg-white/90 dark:before:bg-gray-800/90 lg:before:bg-gray-100/90 dark:lg:before:bg-gray-900/90 before:-z-10 max-lg:shadow-sm z-30">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:border-b border-gray-200 dark:border-gray-700/60">

          {/* Header: Left side */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Mobile hamburger menu button */}
            <button
              className="lg:hidden btn-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300 touch-target"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle navigation menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <a 
              href="https://calendly.com/alec-aleclindz/30min" 
              target="_blank"
              rel="noopener noreferrer"
              className="btn-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300 touch-target"
              aria-label="Get support via Calendly"
            >
              <span className="mr-1 sm:mr-2">🛟</span>
              <span className="hidden sm:inline">Support</span>
            </a>
            <a 
              href="https://seoagent.canny.io/" 
              target="_blank"
              rel="noopener noreferrer"
              className="btn-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300 touch-target"
              aria-label="Share feedback on Canny"
            >
              <svg className="w-4 h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <span className="hidden sm:inline">Feedback</span>
            </a>
          </div>

          {/* Header: Right side */}
          <div className="flex items-center space-x-2 sm:space-x-3">


            {/* Dark mode toggle */}
            <div className="touch-target">
              <ThemeToggle />
            </div>

            {/* Divider - hidden on mobile */}
            <hr className="w-px h-6 bg-gray-200 dark:bg-gray-700/60 border-none hidden sm:block" />

            {/* User button */}
            <div className="relative inline-flex">
              <button
                className="inline-flex justify-center items-center group touch-target min-h-[44px]"
                aria-haspopup="true"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-expanded={userMenuOpen}
              >
                <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="hidden sm:flex items-center truncate">
                  <span className="truncate ml-2 text-sm font-medium text-gray-600 dark:text-gray-100 group-hover:text-gray-800 dark:group-hover:text-white">
                    {user?.email}
                  </span>
                  <svg className="w-3 h-3 shrink-0 ml-1 fill-current text-gray-400 dark:text-gray-500" viewBox="0 0 12 12">
                    <path d="M5.9 11.4L.5 6l1.4-1.4 4 4 4-4L11.3 6z" />
                  </svg>
                </div>
              </button>

              {/* User dropdown menu */}
              {userMenuOpen && (
                <div className="origin-top-right z-10 absolute top-full right-0 min-w-44 sm:min-w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 py-1.5 rounded-lg shadow-lg overflow-hidden mt-1 dropdown-menu">
                  <div className="pt-2 pb-3 px-4 mb-2 border-b border-gray-200 dark:border-gray-700/60">
                    <div className="font-medium text-gray-800 dark:text-gray-100 text-sm sm:text-base">{user?.email}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 italic">User</div>
                  </div>
                  <ul>
                    <li>
                      <button 
                        className="w-full text-left font-medium text-base text-violet-500 hover:text-violet-600 dark:hover:text-violet-400 flex items-center py-3 px-4 touch-target min-h-[44px]" 
                        onClick={handleSignOut}
                      >
                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}