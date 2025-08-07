'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';

interface GSCConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export default function GSCConnectionModal({ isOpen, onClose, onConnectionChange }: GSCConnectionModalProps) {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkConnectionStatus();
    }
  }, [isOpen]);

  const checkConnectionStatus = async () => {
    if (!user?.token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/gsc/connection?userToken=${user.token}`);
      const data = await response.json();
      
      setConnectionStatus(data);
      onConnectionChange?.(data.connected);
    } catch (error) {
      console.error('Error checking GSC connection:', error);
      setError('Failed to check connection status');
    } finally {
      setLoading(false);
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
        // Redirect to Google OAuth - this will close the modal
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
    
    if (!confirm('Are you sure you want to disconnect Google Search Console? This will stop sitemap generation and other automated features.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/gsc/connection?userToken=${user.token}`, { method: 'DELETE' });
      
      if (response.ok) {
        setConnectionStatus({ connected: false });
        onConnectionChange?.(false);
        setError(null);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Google Search Console
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Checking connection status...</p>
            </div>
          ) : connectionStatus.connected && connectionStatus.connection ? (
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Connected as {connectionStatus.connection.email}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {connectionStatus.connection.properties_count} properties available
                  </p>
                </div>
              </div>

              {connectionStatus.connection.is_expired && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-600">
                    ⚠️ Access token expired. Reconnect to restore full functionality.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  {connecting ? 'Reconnecting...' : 'Reconnect (Updated Permissions)'}
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Connect Google Search Console
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Enable automated sitemap generation and performance monitoring
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <span className="w-4 h-4 mr-2">🗺️</span>
                  Automatic sitemap generation and submission
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <span className="w-4 h-4 mr-2">📊</span>
                  Performance data and analytics
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <span className="w-4 h-4 mr-2">🔍</span>
                  URL inspection and technical SEO monitoring
                </div>
              </div>

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
      </div>
    </div>
  );
}