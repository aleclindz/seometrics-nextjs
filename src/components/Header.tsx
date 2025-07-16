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
          <div className="flex">
            <a 
              href="/support" 
              className="btn bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
            >
              Support
            </a>
          </div>

          {/* Header: Right side */}
          <div className="flex items-center space-x-3">

            {/* Upgrade button for free users */}
            {userPlan === 0 && (
              <a 
                href="/plans" 
                className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white inline-flex items-center"
                style={{ backgroundColor: '#7e6ced' }}
              >
                <svg className="fill-current text-white-400 shrink-0 mr-2" width="16" height="16" viewBox="0 0 16 16">
                  <path d="M15 7H9V1c0-.6-.4-1-1-1S7 .4 7 1v6H1c-.6 0-1 .4-1 1s.4 1 1 1h6v6c0 .6.4 1 1 1s1-.4 1-1V9h6c.6 0 1-.4 1-1s-.4-1-1-1z"></path>
                </svg>
                Upgrade Now
              </a>
            )}

            {/* Dark mode toggle */}
            <ThemeToggle />

            {/* Divider */}
            <hr className="w-px h-6 bg-gray-200 dark:bg-gray-700/60 border-none" />

            {/* User button */}
            <div className="relative inline-flex">
              <button
                className="inline-flex justify-center items-center group"
                aria-haspopup="true"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-expanded={userMenuOpen}
              >
                <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex items-center truncate">
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
                <div className="origin-top-right z-10 absolute top-full right-0 min-w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 py-1.5 rounded-lg shadow-lg overflow-hidden mt-1">
                  <div className="pt-0.5 pb-2 px-3 mb-1 border-b border-gray-200 dark:border-gray-700/60">
                    <div className="font-medium text-gray-800 dark:text-gray-100">{user?.email}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 italic">User</div>
                  </div>
                  <ul>
                    <li>
                      <button 
                        className="w-full text-left font-medium text-sm text-violet-500 hover:text-violet-600 dark:hover:text-violet-400 flex items-center py-1 px-3" 
                        onClick={handleSignOut}
                      >
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