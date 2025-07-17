'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';

interface UsageStats {
  currentMonth: string;
  sites: number;
  articles: number;
  plan: {
    tier: string;
    sites_allowed: number;
    posts_allowed: number;
    status: string;
  };
}

export default function UsageDashboard() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.token) {
      fetchUsageStats();
    }
  }, [user]);

  const fetchUsageStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/subscription/manage?userToken=${user?.token}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch usage data');
      }
      
      const data = await response.json();
      setUsage({
        currentMonth: data.usage.month,
        sites: data.usage.sites,
        articles: data.usage.articles,
        plan: data.plan
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getUsageTextColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 dark:text-red-400';
    if (percentage >= 75) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
        <div className="p-8 text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading usage data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Error Loading Usage</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchUsageStats}
            className="btn bg-blue-600 hover:bg-blue-700 text-white"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!usage) {
    return null;
  }

  const sitesPercentage = getUsagePercentage(usage.sites, usage.plan.sites_allowed);
  const articlesPercentage = getUsagePercentage(usage.articles, usage.plan.posts_allowed);

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">Usage Statistics</h2>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {formatMonth(usage.currentMonth)}
          </div>
        </div>
      </header>
      
      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Sites Usage */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Connected Sites</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Sites you&apos;ve added to your account
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {usage.sites}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  of {usage.plan.sites_allowed === -1 ? '∞' : usage.plan.sites_allowed}
                </div>
              </div>
            </div>
            
            {usage.plan.sites_allowed !== -1 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Usage</span>
                  <span className={getUsageTextColor(sitesPercentage)}>
                    {sitesPercentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(sitesPercentage)}`}
                    style={{ width: `${sitesPercentage}%` }}
                  ></div>
                </div>
                {sitesPercentage >= 90 && (
                  <div className="text-sm text-red-600 dark:text-red-400">
                    ⚠️ You&apos;re approaching your site limit
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Articles Usage */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Articles Generated</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Articles created this month
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {usage.articles}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  of {usage.plan.posts_allowed === -1 ? '∞' : usage.plan.posts_allowed}
                </div>
              </div>
            </div>
            
            {usage.plan.posts_allowed !== -1 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Usage</span>
                  <span className={getUsageTextColor(articlesPercentage)}>
                    {articlesPercentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(articlesPercentage)}`}
                    style={{ width: `${articlesPercentage}%` }}
                  ></div>
                </div>
                {articlesPercentage >= 90 && (
                  <div className="text-sm text-red-600 dark:text-red-400">
                    ⚠️ You&apos;re approaching your article limit
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Usage Summary */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900 dark:text-white">This Month&apos;s Summary</h4>
            <button
              onClick={fetchUsageStats}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Refresh
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {usage.plan.tier.charAt(0).toUpperCase() + usage.plan.tier.slice(1)}
              </div>
              <div className="text-gray-600 dark:text-gray-400">Current Plan</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {usage.plan.sites_allowed === -1 ? '∞' : usage.plan.sites_allowed - usage.sites}
              </div>
              <div className="text-gray-600 dark:text-gray-400">Sites Remaining</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {usage.plan.posts_allowed === -1 ? '∞' : usage.plan.posts_allowed - usage.articles}
              </div>
              <div className="text-gray-600 dark:text-gray-400">Articles Remaining</div>
            </div>
          </div>
        </div>

        {/* Reset Information */}
        <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Usage resets on the 1st of each month
        </div>
      </div>
    </div>
  );
}