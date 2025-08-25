'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [isAuthError, setIsAuthError] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0] // Today
  });
  
  // New state for enhanced functionality
  const [activeTab, setActiveTab] = useState<'queries' | 'pages' | 'countries' | 'devices'>('queries');
  const [querySearch, setQuerySearch] = useState('');
  const [pageSearch, setPageSearch] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchAnalytics = useCallback(async () => {
    if (!user?.token) return;

    setLoading(true);
    setError(null);
    setIsAuthError(false);

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
        
        // Check if it's an authentication error
        if (response.status === 401 && (errorData.error?.includes('Authentication expired') || errorData.error?.includes('expired'))) {
          setIsAuthError(true);
        }
        
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
  }, [user?.token, siteUrl, dateRange.startDate, dateRange.endDate]);

  // Helper functions for filtering and pagination
  const getFilteredData = () => {
    if (!data) return [];
    
    let items: any[] = [];
    let searchTerm = '';
    
    switch (activeTab) {
      case 'queries':
        items = data.topQueries;
        searchTerm = querySearch.toLowerCase();
        return items.filter(item => 
          searchTerm === '' || item.query.toLowerCase().includes(searchTerm)
        );
      case 'pages':
        items = data.topPages;
        searchTerm = pageSearch.toLowerCase();
        return items.filter(item => 
          searchTerm === '' || item.page.toLowerCase().includes(searchTerm)
        );
      case 'countries':
        return data.topCountries;
      case 'devices':
        return data.deviceData;
      default:
        return [];
    }
  };

  const getPaginatedData = () => {
    const filtered = getFilteredData();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const filtered = getFilteredData();
    return Math.ceil(filtered.length / itemsPerPage);
  };

  // Reset pagination when tab changes
  const handleTabChange = (tab: 'queries' | 'pages' | 'countries' | 'devices') => {
    setActiveTab(tab);
    setCurrentPage(1);
    setQuerySearch('');
    setPageSearch('');
  };

  const handleReconnectGSC = () => {
    if (!user?.token) return;
    // Redirect to GSC OAuth flow
    window.location.href = `/api/gsc/oauth/start?userToken=${user.token}`;
  };

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [querySearch, pageSearch, itemsPerPage]);

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
          <div className={`mb-4 p-4 rounded-lg border ${isAuthError ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {isAuthError ? (
                  <svg className="h-5 w-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <h3 className={`text-sm font-medium ${isAuthError ? 'text-amber-800' : 'text-red-800'}`}>
                  {isAuthError ? 'Google Search Console Disconnected' : 'Error Loading Data'}
                </h3>
                <p className={`text-sm mt-1 ${isAuthError ? 'text-amber-700' : 'text-red-600'}`}>
                  {error}
                </p>
                {isAuthError && (
                  <div className="mt-3">
                    <button
                      onClick={handleReconnectGSC}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-amber-800 bg-amber-100 hover:bg-amber-200"
                    >
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Reconnect Google Search Console
                    </button>
                  </div>
                )}
              </div>
            </div>
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

            {/* Enhanced Tabbed Interface */}
            <div>
              {/* Tab Navigation */}
              <div className="flex flex-wrap items-center justify-between mb-4">
                <div className="flex space-x-1 border-b border-gray-200 dark:border-gray-700">
                  {[
                    { id: 'queries', label: 'Queries', count: data.topQueries.length },
                    { id: 'pages', label: 'Pages', count: data.topPages.length },
                    { id: 'countries', label: 'Countries', count: data.topCountries.length },
                    { id: 'devices', label: 'Devices', count: data.deviceData.length }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id as any)}
                      className={`px-3 py-2 text-sm font-medium border-b-2 ${
                        activeTab === tab.id
                          ? 'text-violet-600 border-violet-600'
                          : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.label}
                      <span className="ml-1 text-xs bg-gray-100 dark:bg-gray-700 rounded-full px-2 py-0.5">
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Items per page selector */}
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Show:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-700 dark:text-gray-200"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-gray-600 dark:text-gray-400">items</span>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="mb-4">
                {(activeTab === 'queries' || activeTab === 'pages') && (
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder={`Search ${activeTab}...`}
                        value={activeTab === 'queries' ? querySearch : pageSearch}
                        onChange={(e) => 
                          activeTab === 'queries' 
                            ? setQuerySearch(e.target.value)
                            : setPageSearch(e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-200 text-sm"
                      />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {getFilteredData().length} results
                    </span>
                  </div>
                )}
              </div>

              {/* Data Table */}
              <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
                {activeTab === 'queries' && (
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Query
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Clicks
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Impressions
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          CTR
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Position
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {getPaginatedData().map((query: any, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 max-w-sm">
                            <div className="truncate" title={query.query}>
                              {query.query}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right font-medium">
                            {query.clicks.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-right">
                            {query.impressions.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <span className={`font-medium ${
                              query.ctr > 0.05 ? 'text-green-600' : 
                              query.ctr > 0.02 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {(query.ctr * 100).toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <span className={`font-medium ${
                              query.position <= 3 ? 'text-green-600' : 
                              query.position <= 10 ? 'text-yellow-600' : 'text-gray-600'
                            }`}>
                              {query.position.toFixed(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'pages' && (
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Page
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Clicks
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Impressions
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          CTR
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Position
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {getPaginatedData().map((page: any, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3 text-sm max-w-sm">
                            <a 
                              href={page.page} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-violet-600 hover:text-violet-700 dark:text-violet-400 truncate block"
                              title={page.page}
                            >
                              {page.page.replace(siteUrl, '') || '/'}
                            </a>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right font-medium">
                            {page.clicks.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-right">
                            {page.impressions.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <span className={`font-medium ${
                              page.ctr > 0.05 ? 'text-green-600' : 
                              page.ctr > 0.02 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {(page.ctr * 100).toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <span className={`font-medium ${
                              page.position <= 3 ? 'text-green-600' : 
                              page.position <= 10 ? 'text-yellow-600' : 'text-gray-600'
                            }`}>
                              {page.position?.toFixed(1) || 'N/A'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'countries' && (
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Country
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Clicks
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Impressions
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          CTR
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Position
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {getPaginatedData().map((country: any, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-medium">
                            {country.country}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right font-medium">
                            {country.clicks.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-right">
                            {country.impressions.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right">
                            {(country.ctr * 100).toFixed(1)}%
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">
                            {country.position.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'devices' && (
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {getPaginatedData().map((device: any, index) => (
                        <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize mb-3">
                            {device.device}
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Clicks:</span>
                              <span className="text-gray-900 dark:text-gray-100 font-medium">
                                {device.clicks.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Impressions:</span>
                              <span className="text-gray-900 dark:text-gray-100">
                                {device.impressions.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">CTR:</span>
                              <span className="text-gray-900 dark:text-gray-100 font-medium">
                                {(device.ctr * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Avg Position:</span>
                              <span className="text-gray-900 dark:text-gray-100">
                                {device.position.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {getTotalPages() > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, getFilteredData().length)} of {getFilteredData().length} results
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    
                    {Array.from({ length: Math.min(5, getTotalPages()) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(getTotalPages() - 4, currentPage - 2)) + i;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 text-sm border rounded ${
                            currentPage === pageNum
                              ? 'bg-violet-600 text-white border-violet-600'
                              : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setCurrentPage(Math.min(getTotalPages(), currentPage + 1))}
                      disabled={currentPage === getTotalPages()}
                      className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

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