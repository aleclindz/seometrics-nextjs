'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';

interface GSCAnalyticsProps {
  siteUrl: string;
  className?: string;
}

interface PerformanceData {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  total: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
  topQueries: Array<{
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  topPages: Array<{
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  topCountries: Array<{
    country: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  deviceData: Array<{
    device: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  rawRowCount: number;
}

export default function GSCAnalytics({ siteUrl, className = '' }: GSCAnalyticsProps) {
  const { user } = useAuth();
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0] // Today
  });

  const fetchAnalytics = async () => {
    if (!user?.token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/gsc/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteUrl,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          userToken: user.token
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch analytics data');
      }

      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch analytics data');
      }
    } catch (error) {
      console.error('Error fetching GSC analytics:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [user?.token, siteUrl, dateRange]);

  if (!user?.token) {
    return null;
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Search Performance
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Google Search Console analytics data
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-200"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-200"
            />
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="px-3 py-1 text-xs bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white rounded transition-colors"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading analytics...</p>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Overview Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {data.total.clicks.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Total Clicks
                </div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {data.total.impressions.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Impressions
                </div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {(data.total.ctr * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Average CTR
                </div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {data.total.position.toFixed(1)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Avg Position
                </div>
              </div>
            </div>

            {/* Top Queries */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                Top Queries
              </h4>
              <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Query
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Clicks
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Impressions
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        CTR
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Position
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {data.topQueries.slice(0, 10).map((query, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate">
                          {query.query}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 text-right">
                          {query.clicks.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 text-right">
                          {query.impressions.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 text-right">
                          {(query.ctr * 100).toFixed(1)}%
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 text-right">
                          {query.position.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Pages */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                Top Pages
              </h4>
              <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Page
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Clicks
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Impressions
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        CTR
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {data.topPages.slice(0, 10).map((page, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate">
                          <a 
                            href={page.page} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-violet-600 hover:text-violet-700 dark:text-violet-400"
                          >
                            {page.page.replace(siteUrl, '')}
                          </a>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 text-right">
                          {page.clicks.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 text-right">
                          {page.impressions.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 text-right">
                          {(page.ctr * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Device Breakdown */}
            {data.deviceData.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Device Performance
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {data.deviceData.map((device, index) => (
                    <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
                        {device.device}
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Clicks:</span>
                          <span className="text-gray-900 dark:text-gray-100">{device.clicks.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">CTR:</span>
                          <span className="text-gray-900 dark:text-gray-100">{(device.ctr * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Data from {new Date(data.dateRange.startDate).toLocaleDateString()} to {new Date(data.dateRange.endDate).toLocaleDateString()} • 
              {data.rawRowCount.toLocaleString()} data points
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No Analytics Data
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Connect Google Search Console to see performance analytics
            </p>
          </div>
        )}
      </div>
    </div>
  );
}