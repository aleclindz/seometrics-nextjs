'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';

interface GSCConnectionProps {
  onConnectionChange?: (connected: boolean) => void;
}

interface ConnectionStatus {
  connected: boolean;
  connection?: {
    id: string;
    email: string;
    connected_at: string;
    last_sync_at: string | null;
    expires_at: string;
    is_expired: boolean;
    properties_count: number;
    sync_errors: any[];
  };
}

interface Property {
  siteUrl: string;
  permissionLevel: string;
  verified: boolean;
}

export default function GSCConnection({ onConnectionChange }: GSCConnectionProps) {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ connected: false });
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProperties, setShowProperties] = useState(false);
  const [syncResults, setSyncResults] = useState<any>(null);

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  // Check for connection callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    console.log('[GSC COMPONENT] URL params on load:', urlParams.toString());
    
    if (urlParams.get('gsc_connected') === 'true') {
      console.log('[GSC COMPONENT] GSC connection success detected, refreshing status...');
      // Remove the parameter from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Refresh connection status
      setTimeout(() => {
        console.log('[GSC COMPONENT] Running delayed connection status check...');
        checkConnectionStatus();
      }, 1000);
    }
    
    const errorParam = urlParams.get('error');
    if (errorParam) {
      console.log('[GSC COMPONENT] OAuth error detected:', errorParam);
      const details = urlParams.get('details');
      setError(getErrorMessage(errorParam) + (details ? `: ${details}` : ''));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const getErrorMessage = (errorCode: string): string => {
    const messages: Record<string, string> = {
      'oauth_denied': 'Google Search Console access was denied. Please try again.',
      'invalid_request': 'Invalid OAuth request. Please try again.',
      'invalid_state': 'Security validation failed. Please try again.',
      'server_error': 'Server configuration error. Please contact support.',
      'token_error': 'Failed to obtain access tokens. Please try again.',
      'email_error': 'Unable to get user email from Google. Please try again.',
      'auth_required': 'Authentication required. Please log in and try again.',
      'db_error': 'Database error. Please try again or contact support.',
      'unexpected': 'Unexpected error occurred. Please try again.'
    };
    return messages[errorCode] || 'An error occurred during connection.';
  };

  const checkConnectionStatus = async () => {
    if (!user?.token) {
      console.log('[GSC COMPONENT] No user token available, skipping connection check');
      setLoading(false);
      return;
    }

    try {
      console.log('[GSC COMPONENT] Checking connection status for user token:', user.token);
      setLoading(true);
      const response = await fetch(`/api/gsc/connection?userToken=${user.token}`);
      const data = await response.json();
      
      console.log('[GSC COMPONENT] Connection status response:', data);
      setConnectionStatus(data);
      onConnectionChange?.(data.connected);
      
      if (data.connected) {
        console.log('[GSC COMPONENT] Connection found, fetching properties...');
        await fetchProperties();
      } else {
        console.log('[GSC COMPONENT] No connection found');
      }
    } catch (error) {
      console.error('[GSC COMPONENT] Error checking GSC connection:', error);
      setError('Failed to check connection status');
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    if (!user?.token) return;

    try {
      const response = await fetch(`/api/gsc/properties?userToken=${user.token}`);
      if (response.ok) {
        const data = await response.json();
        setProperties(data.properties || []);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const handleConnect = async () => {
    if (!user?.token) {
      setError('Authentication required');
      return;
    }

    try {
      setConnecting(true);
      setError(null);
      
      const response = await fetch(`/api/gsc/oauth/start?userToken=${user.token}`);
      const data = await response.json();
      
      if (data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      } else {
        setError('Failed to start OAuth process');
      }
    } catch (error) {
      console.error('Error starting OAuth:', error);
      setError('Failed to connect to Google Search Console');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user?.token) return;
    
    if (!confirm('Are you sure you want to disconnect Google Search Console? This will stop automated monitoring.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/gsc/connection?userToken=${user.token}`, { method: 'DELETE' });
      
      if (response.ok) {
        setConnectionStatus({ connected: false });
        setProperties([]);
        onConnectionChange?.(false);
      } else {
        setError('Failed to disconnect');
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      setError('Failed to disconnect');
    } finally {
      setLoading(false);
    }
  };

  const refreshProperties = async () => {
    try {
      setLoading(true);
      await fetchProperties();
    } catch (error) {
      setError('Failed to refresh properties');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!user?.token || !connectionStatus.connected) return;
    
    try {
      setSyncing(true);
      setError(null);
      setSyncResults(null);
      
      console.log('[GSC COMPONENT] Starting manual sync...');
      const response = await fetch('/api/gsc/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userToken: user.token
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('[GSC COMPONENT] Sync completed:', data);
        setSyncResults(data);
        // Refresh connection status to update last sync time
        await checkConnectionStatus();
      } else {
        setError(data.error || 'Failed to sync GSC data');
      }
    } catch (error) {
      console.error('[GSC COMPONENT] Error during sync:', error);
      setError('Failed to sync GSC data');
    } finally {
      setSyncing(false);
    }
  };

  // Backfill functionality moved to Website Performance tab

  const handleSyncProperties = async () => {
    if (!user?.token || !connectionStatus.connected) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('[GSC COMPONENT] Syncing properties...');
      const response = await fetch(`/api/gsc/properties?userToken=${user.token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('[GSC COMPONENT] Properties synced successfully:', data);
        setProperties(data.properties || []);
        // Refresh connection status to update property count
        await checkConnectionStatus();
      } else {
        setError(data.error || 'Failed to sync properties');
      }
    } catch (error) {
      console.error('[GSC COMPONENT] Error syncing properties:', error);
      setError('Failed to sync properties');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !connectionStatus.connected) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-200 rounded-lg mr-3"></div>
              <div>
                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-48"></div>
              </div>
            </div>
            <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Google Search Console
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {connectionStatus.connected 
                ? `Connected as ${connectionStatus.connection?.email}`
                : 'Connect for automated performance monitoring'
              }
            </p>
          </div>
        </div>
        <div 
          className={`w-3 h-3 rounded-full ${
            connectionStatus.connected ? 'bg-green-500' : 'bg-red-500'
          }`} 
          title={connectionStatus.connected ? 'Connected' : 'Not connected'}
        ></div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {connectionStatus.connected && connectionStatus.connection ? (
        <div className="space-y-4">
          {/* Connection Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Properties:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                {connectionStatus.connection.properties_count}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Last Sync:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                {connectionStatus.connection.last_sync_at 
                  ? new Date(connectionStatus.connection.last_sync_at).toLocaleDateString()
                  : 'Never'
                }
              </span>
            </div>
          </div>

          {/* Sync Buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={handleSyncProperties}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Syncing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Sync Properties
                </>
              )}
            </button>
            {/* Backfill button removed to avoid duplication; now lives on Website Performance tab */}
            <button
              onClick={handleSync}
              disabled={syncing || loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm flex items-center gap-2"
            >
              {syncing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Syncing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Sync Data
                </>
              )}
            </button>
          </div>

          {/* Sync Results */}
          {syncResults && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600 font-medium mb-2">
                ✅ Sync completed successfully!
              </p>
              <div className="text-xs text-green-600 space-y-1">
                <div>Properties synced: {syncResults.propertiesCount}</div>
                <div>Successful: {syncResults.successCount}</div>
                {syncResults.errorCount > 0 && (
                  <div>Errors: {syncResults.errorCount}</div>
                )}
              </div>
            </div>
          )}

          {/* Token Status */}
          {connectionStatus.connection.is_expired && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-600">
                ⚠️ Access token expired. Some features may not work properly.
              </p>
            </div>
          )}

          {/* Properties Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Connected Properties
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={refreshProperties}
                  disabled={loading}
                  className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Refreshing...' : 'Refresh'}
                </button>
                <button
                  onClick={() => setShowProperties(!showProperties)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  {showProperties ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {showProperties && (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {properties.length > 0 ? (
                  properties.map((property, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs"
                    >
                      <span className="truncate flex-1 mr-2">{property.siteUrl}</span>
                      <span className="text-gray-500 capitalize">{property.permissionLevel}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500">No properties found</p>
                )}
              </div>
            )}
          </div>

          {/* Disconnect Button */}
          <div className="flex gap-2">
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
            >
              {loading ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Features */}
          <div className="space-y-3">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <span className="w-4 h-4 mr-2">📊</span>
              Daily performance monitoring
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <span className="w-4 h-4 mr-2">🔍</span>
              Core Web Vitals tracking
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <span className="w-4 h-4 mr-2">⚡</span>
              Automated issue detection
            </div>
          </div>

          {/* Connect Button */}
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {connecting ? 'Connecting...' : 'Connect Google Search Console'}
          </button>
        </div>
      )}
    </div>
  );
}
