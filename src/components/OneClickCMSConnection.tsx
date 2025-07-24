'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { CMSType, CMSConnection } from '@/lib/cms/types';

interface OneClickCMSConnectionProps {
  onConnectionComplete?: (connection: CMSConnection) => void;
  className?: string;
}

const CMS_PROVIDERS = [
  {
    type: 'wordpress' as CMSType,
    name: 'WordPress',
    description: 'Connect your self-hosted WordPress site',
    icon: '🔷',
    requiresSiteUrl: true,
    placeholder: 'https://yoursite.com',
    isOAuth: true,
  },
  {
    type: 'webflow' as CMSType,
    name: 'Webflow',
    description: 'Connect your Webflow CMS',
    icon: '🌊',
    requiresSiteUrl: false,
    isOAuth: true,
  },
  {
    type: 'shopify' as CMSType,
    name: 'Shopify',
    description: 'Connect your Shopify store blog',
    icon: '🛍️',
    requiresSiteUrl: true,
    placeholder: 'your-store.myshopify.com',
    isOAuth: true,
  },
  {
    type: 'strapi' as CMSType,
    name: 'Strapi',
    description: 'Connect your Strapi CMS with API token',
    icon: '📄',
    requiresSiteUrl: true,
    placeholder: 'https://your-strapi.com',
    isOAuth: false,
  },
];

export default function OneClickCMSConnection({ onConnectionComplete, className = '' }: OneClickCMSConnectionProps) {
  const { user } = useAuth();
  const [connections, setConnections] = useState<CMSConnection[]>([]);
  const [supportedProviders, setSupportedProviders] = useState<CMSType[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectingType, setConnectingType] = useState<CMSType | null>(null);
  const [siteUrl, setSiteUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Strapi-specific fields
  const [strapiConfig, setStrapiConfig] = useState({
    apiToken: '',
    contentType: 'api::blog-post.blog-post',
    connectionName: ''
  });

  useEffect(() => {
    if (user?.token) {
      fetchConnections();
    }
  }, [user?.token]);

  useEffect(() => {
    // Listen for OAuth completion messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'cms_oauth_complete') {
        const { cmsType, success, connection, error } = event.data;
        
        setConnectingType(null);
        
        if (success && connection) {
          setConnections(prev => [...prev, connection]);
          setError(null);
          onConnectionComplete?.(connection);
          
          // Show success notification
          setError(null);
        } else {
          setError(`Failed to connect ${cmsType}: ${error}`);
        }
      } else if (event.data.type === 'cms_oauth_error') {
        const { cmsType, error } = event.data;
        setConnectingType(null);
        setError(`${cmsType} connection failed: ${error}`);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onConnectionComplete]);

  const fetchConnections = async () => {
    if (!user?.token) return;

    try {
      setLoading(true);
      
      // Fetch both new modular connections and legacy connections
      const [newConnectionsResponse, legacyConnectionsResponse] = await Promise.all([
        fetch(`/api/cms/connections?userId=${user.token}`).catch(() => null),
        fetch(`/api/cms/connections?userToken=${user.token}`).catch(() => null)
      ]);

      let allConnections: CMSConnection[] = [];
      let supportedProviders: CMSType[] = ['wordpress', 'webflow', 'shopify', 'strapi'];

      // Process new modular connections
      if (newConnectionsResponse?.ok) {
        const newData = await newConnectionsResponse.json();
        if (newData.success && newData.connections) {
          allConnections = [...allConnections, ...newData.connections];
        }
        if (newData.supportedProviders) {
          supportedProviders = newData.supportedProviders;
        }
      }

      // Process legacy connections 
      if (legacyConnectionsResponse?.ok) {
        const legacyData = await legacyConnectionsResponse.json();
        if (legacyData.success && legacyData.connections) {
          // Convert legacy format to new format for UI consistency
          const convertedLegacy = legacyData.connections.map((conn: any) => ({
            id: conn.id.toString(),
            userId: user.token,
            type: conn.cms_type,
            name: conn.connection_name,
            isActive: conn.status === 'active',
            createdAt: new Date(conn.created_at),
            updatedAt: new Date(conn.updated_at || conn.created_at),
            // Legacy connections don't have full credential structure
            credentials: {
              type: conn.cms_type,
              accessToken: conn.api_token || '',
              siteUrl: conn.base_url
            }
          }));
          allConnections = [...allConnections, ...convertedLegacy];
        }
      }

      setConnections(allConnections);
      setSupportedProviders(supportedProviders);
      
    } catch (err) {
      console.error('Error fetching connections:', err);
      setError('Failed to load CMS connections');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (type: CMSType, providerConfig: any) => {
    if (!user?.token) return;

    // Validate site URL if required
    if (providerConfig.requiresSiteUrl && !siteUrl.trim()) {
      setError(`Please enter your ${providerConfig.name} site URL`);
      return;
    }

    // Handle Strapi separately (manual setup)
    if (type === 'strapi') {
      return handleStrapiConnect();
    }

    try {
      setConnectingType(type);
      setError(null);

      // Start OAuth flow for WordPress, Webflow, Shopify
      const response = await fetch('/api/cms/oauth/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          userId: user.token,
          siteUrl: providerConfig.requiresSiteUrl ? siteUrl.trim() : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Open OAuth window
        const popup = window.open(
          data.authUrl,
          `${type}_oauth`,
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );

        // Check if popup was blocked
        if (!popup) {
          setError('Popup blocked. Please allow popups and try again.');
          setConnectingType(null);
          return;
        }

        // Monitor popup
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            if (connectingType === type) {
              setConnectingType(null);
            }
          }
        }, 1000);
      } else {
        setError(data.error || 'Failed to start connection');
        setConnectingType(null);
      }
    } catch (err) {
      setError('Failed to start connection process');
      setConnectingType(null);
    }
  };

  const handleStrapiConnect = async () => {
    if (!siteUrl.trim() || !strapiConfig.apiToken.trim() || !strapiConfig.connectionName.trim()) {
      setError('Please fill in all required fields for Strapi connection');
      return;
    }

    try {
      setConnectingType('strapi');
      setError(null);

      // Create legacy Strapi connection (compatible with existing system)
      const response = await fetch('/api/cms/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken: user?.token,
          connection_name: strapiConfig.connectionName,
          cms_type: 'strapi',
          base_url: siteUrl.trim(),
          api_token: strapiConfig.apiToken,
          content_type: strapiConfig.contentType,
          website_id: 1 // Default website - could be made configurable
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Reset form
        setSiteUrl('');
        setStrapiConfig({
          apiToken: '',
          contentType: 'api::blog-post.blog-post',
          connectionName: ''
        });
        
        // Refresh connections
        fetchConnections();
        onConnectionComplete?.(data.connection);
        setError(null);
      } else {
        setError(data.error || 'Failed to create Strapi connection');
      }
    } catch (err) {
      setError('Failed to create Strapi connection');
    } finally {
      setConnectingType(null);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!user?.token) return;

    try {
      const response = await fetch(`/api/cms/connections?connectionId=${connectionId}&userId=${user.token}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setConnections(prev => prev.filter(conn => conn.id !== connectionId));
      } else {
        setError(data.error || 'Failed to disconnect');
      }
    } catch (err) {
      setError('Failed to disconnect');
    }
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading CMS connections...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          1-Click CMS Connections
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Connect your CMS to automatically publish SEO-optimized articles.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 text-xs mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Existing Connections */}
      {connections.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Connected CMS Platforms
          </h3>
          <div className="space-y-3">
            {connections.map((connection) => (
              <div
                key={connection.id}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">
                    {CMS_PROVIDERS.find(p => p.type === connection.type)?.icon || '🔗'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {connection.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {connection.type} • Connected {connection.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full">
                    ● Active
                  </span>
                  <button
                    onClick={() => handleDisconnect(connection.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Providers */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Connect New CMS
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {CMS_PROVIDERS.filter(provider => supportedProviders.includes(provider.type)).map((provider) => (
            <div
              key={provider.type}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-violet-300 dark:hover:border-violet-600 transition-colors"
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className="text-3xl">{provider.icon}</div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {provider.name}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {provider.description}
                  </p>
                </div>
              </div>

              {provider.requiresSiteUrl && (
                <div className="mb-3">
                  <input
                    type="url"
                    placeholder={provider.placeholder}
                    value={siteUrl}
                    onChange={(e) => setSiteUrl(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    disabled={connectingType === provider.type}
                  />
                </div>
              )}

              {provider.type === 'strapi' && (
                <div className="space-y-3 mb-3">
                  <input
                    type="text"
                    placeholder="Connection Name"
                    value={strapiConfig.connectionName}
                    onChange={(e) => setStrapiConfig(prev => ({ ...prev, connectionName: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    disabled={connectingType === provider.type}
                  />
                  <input
                    type="password"
                    placeholder="API Token"
                    value={strapiConfig.apiToken}
                    onChange={(e) => setStrapiConfig(prev => ({ ...prev, apiToken: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    disabled={connectingType === provider.type}
                  />
                  <input
                    type="text"
                    placeholder="Content Type (e.g., api::blog-post.blog-post)"
                    value={strapiConfig.contentType}
                    onChange={(e) => setStrapiConfig(prev => ({ ...prev, contentType: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    disabled={connectingType === provider.type}
                  />
                </div>
              )}

              <button
                onClick={() => handleConnect(provider.type, provider)}
                disabled={connectingType !== null}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
              >
                {connectingType === provider.type ? (
                  <span className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Connecting...
                  </span>
                ) : (
                  provider.isOAuth ? `Connect ${provider.name}` : `Setup ${provider.name}`
                )}
              </button>
            </div>
          ))}
        </div>

        {supportedProviders.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No CMS providers are currently configured. Please check your environment variables.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}