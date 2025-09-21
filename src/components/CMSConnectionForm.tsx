'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';

interface Website {
  id: number;
  domain: string;
  website_token: string;
}

interface DiscoveredContentType {
  uid: string;
  apiID: string;
  displayName: string;
  pluralName: string;
  singularName: string;
  apiEndpoint: string;
  attributes: any;
  fieldCount: number;
  hasRichText: boolean;
  hasMedia: boolean;
  hasUID: boolean;
  hasString: boolean;
  hasText: boolean;
  hasRelation: boolean;
  hasDraftAndPublish: boolean;
  isEmpty: boolean;
  category: string;
  suitableForBlogging: number;
}

interface CMSConnectionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  connection?: any; // For editing existing connections
  preselectedWebsiteId?: string; // For modal usage
}

export default function CMSConnectionForm({ onSuccess, onCancel, connection, preselectedWebsiteId }: CMSConnectionFormProps) {
  const { user } = useAuth();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [testingToken, setTestingToken] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [discoveredTypes, setDiscoveredTypes] = useState<DiscoveredContentType[]>([]);
  const [currentStep, setCurrentStep] = useState(connection ? 3 : 1); // Skip discovery for existing connections

  const [formData, setFormData] = useState({
    connection_name: connection?.connection_name || '',
    website_id: connection?.website_id || preselectedWebsiteId || '',
    cms_type: connection?.cms_type || 'wordpress',
    base_url: connection?.base_url || '',
    api_token: connection?.api_token || '',
    content_type: connection?.content_type || ''
  });

  useEffect(() => {
    fetchUserWebsites();
  }, [user]);

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'blog': return 'text-emerald-600 dark:text-emerald-400';
      case 'page': return 'text-blue-600 dark:text-blue-400';
      case 'user': return 'text-purple-600 dark:text-purple-400';
      case 'taxonomy': return 'text-orange-600 dark:text-orange-400';
      case 'media': return 'text-pink-600 dark:text-pink-400';
      case 'interaction': return 'text-cyan-600 dark:text-cyan-400';
      case 'empty': return 'text-gray-500 dark:text-gray-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const fetchUserWebsites = async () => {
    try {
      const response = await fetch(`/api/websites?userToken=${user?.token}`);
      if (response.ok) {
        const data = await response.json();
        const websitesList = data.websites || [];
        setWebsites(websitesList);
        
        // Convert preselectedWebsiteId to the actual database ID
        if (preselectedWebsiteId && typeof preselectedWebsiteId === 'string') {
          let matchingWebsite = null;
          
          // Try different matching strategies:
          // 1. UUID token match
          if (preselectedWebsiteId.includes('-')) {
            matchingWebsite = websitesList.find((w: Website) => w.website_token === preselectedWebsiteId);
          }
          
          // 2. Domain string match (cleaned_domain or domain)
          if (!matchingWebsite) {
            matchingWebsite = websitesList.find((w: Website) => {
              // Check if website has cleaned_domain field and matches
              if ((w as any).cleaned_domain === preselectedWebsiteId) {
                return true;
              }
              // Also check raw domain (handles sc-domain: prefixed domains)
              return w.domain === preselectedWebsiteId || w.domain === `sc-domain:${preselectedWebsiteId}`;
            });
          }
          
          // 3. Numeric ID match (already a database ID)
          if (!matchingWebsite && !isNaN(Number(preselectedWebsiteId))) {
            matchingWebsite = websitesList.find((w: Website) => w.id === Number(preselectedWebsiteId));
          }
          
          if (matchingWebsite) {
            console.log('CMSConnectionForm: Mapped preselectedWebsiteId', preselectedWebsiteId, 'to website ID', matchingWebsite.id);
            setFormData(prev => ({
              ...prev,
              website_id: matchingWebsite.id.toString()
            }));
          } else {
            console.warn('CMSConnectionForm: Could not find matching website for preselectedWebsiteId:', preselectedWebsiteId);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching websites:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Reset token validation when API token changes
    if (name === 'api_token') {
      setTokenValid(null);
    }
  };

  const testToken = async () => {
    if (!formData.base_url || !formData.api_token) {
      setError('Please enter both base URL and API token');
      return;
    }

    try {
      setTestingToken(true);
      setError(null);

      const cleanUrl = formData.base_url.replace(/\/$/, '');
      
      // Test the token with content-type-builder endpoint
      const response = await fetch(`${cleanUrl}/api/content-type-builder/content-types`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${formData.api_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setTokenValid(true);
        setError(null);
      } else if (response.status === 401) {
        setTokenValid(false);
        setError('Invalid API token. Please check your token and try again.');
      } else if (response.status === 403) {
        setTokenValid(false);
        setError('API token lacks permissions. Please create a Custom token with Content-Type-Builder.read permission.');
      } else {
        setTokenValid(false);
        setError(`Connection failed: ${response.status}`);
      }
    } catch (err) {
      setTokenValid(false);
      setError('Could not connect to Strapi instance. Please check your base URL.');
    } finally {
      setTestingToken(false);
    }
  };

  const discoverContentTypes = async () => {
    if (!formData.base_url || !formData.api_token) {
      setError('Please enter both base URL and API token');
      return;
    }

    // WordPress doesn't need content type discovery - skip to final step
    if (formData.cms_type === 'wordpress') {
      setFormData(prev => ({
        ...prev,
        content_type: 'posts', // WordPress uses posts by default
        connection_name: prev.connection_name || `WordPress - ${prev.base_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}`
      }));
      setCurrentStep(3);
      return;
    }

    try {
      setDiscovering(true);
      setError(null);

      const response = await fetch('/api/cms/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cms_type: formData.cms_type,
          base_url: formData.base_url,
          api_token: formData.api_token,
          userToken: user?.token,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const discoveredTypes = data.details?.discoveredContentTypes || [];
        setDiscoveredTypes(discoveredTypes);
        setCurrentStep(2);
        
        // Auto-select the content type with the highest blogging suitability score
        const recommended = discoveredTypes.length > 0 ? discoveredTypes[0] : null;
        
        if (recommended) {
          setFormData(prev => ({
            ...prev,
            content_type: recommended.uid
          }));
        }
      } else {
        setError(data.error || 'Failed to discover content types');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Discovery failed');
    } finally {
      setDiscovering(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.connection_name || !formData.website_id || !formData.base_url || !formData.api_token) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const url = connection ? `/api/cms/connections/${connection.id}` : '/api/cms/connections';
      const method = connection ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          userToken: user?.token,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save connection');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      <div className="flex items-center space-x-4">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 1 ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
          1
        </div>
        <div className={`h-0.5 w-12 ${currentStep >= 2 ? 'bg-violet-600' : 'bg-gray-200'}`}></div>
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 2 ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
          2
        </div>
        <div className={`h-0.5 w-12 ${currentStep >= 3 ? 'bg-violet-600' : 'bg-gray-200'}`}></div>
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 3 ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
          3
        </div>
      </div>
    </div>
  );

  const renderStep1 = () => {
    const getCMSDisplayName = () => {
      switch (formData.cms_type) {
        case 'wordpress': return 'WordPress';
        case 'wix': return 'Wix';
        case 'strapi': return 'Strapi';
        default: return 'CMS';
      }
    };

    const getCMSDescription = () => {
      switch (formData.cms_type) {
        case 'wordpress': return 'Enter your WordPress site URL and Application Password';
        case 'wix': return 'Enter your Wix Site ID and API token to get started';
        case 'strapi': return 'Enter your Strapi URL and API token to get started';
        default: return 'Configure your CMS connection';
      }
    };

    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Connect to your {getCMSDisplayName()} CMS
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {getCMSDescription()}
          </p>
        </div>

        {/* CMS Type Selector */}
        <div>
          <label htmlFor="cms_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            CMS Platform *
          </label>
          <select
            id="cms_type"
            name="cms_type"
            value={formData.cms_type}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            required
          >
            <option value="wordpress">WordPress</option>
            <option value="strapi">Strapi</option>
            <option value="wix">Wix</option>
          </select>
        </div>

        <div>
          <label htmlFor="base_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {formData.cms_type === 'wordpress' ? 'WordPress Site URL *' :
             formData.cms_type === 'wix' ? 'Wix Site ID *' : 'Strapi Base URL *'}
          </label>
          <input
            id="base_url"
            type={formData.cms_type === 'wix' ? "text" : "url"}
            name="base_url"
            value={formData.base_url}
            onChange={handleInputChange}
            placeholder={formData.cms_type === 'wordpress'
              ? "https://your-wordpress-site.com"
              : formData.cms_type === 'wix'
              ? "Your Wix site ID (e.g., 12345678-1234-1234-1234-123456789abc)"
              : "https://your-strapi-instance.railway.app"
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            required
          />
          {formData.cms_type === 'wordpress' && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              <p>Enter your full WordPress site URL (e.g., https://myblog.com)</p>
            </div>
          )}
          {formData.cms_type === 'wix' && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              <p>Find your Site ID in your Wix dashboard under Settings → Business Info</p>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="api_token" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {formData.cms_type === 'wordpress' ? 'Application Password *' : 'API Token *'}
          </label>
          <input
            id="api_token"
            type="password"
            name="api_token"
            value={formData.api_token}
            onChange={handleInputChange}
            placeholder={formData.cms_type === 'wordpress'
              ? "username:application-password"
              : formData.cms_type === 'wix'
              ? "Your Wix API Key"
              : "Your Strapi API token"
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            required
          />
          {formData.cms_type === 'wordpress' && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              <p>Format: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">username:your-app-password</code></p>
              <p className="mt-1">Create an Application Password in WordPress Admin → Users → Profile → Application Passwords</p>
            </div>
          )}
        </div>

        {/* Test buttons */}
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={testToken}
            disabled={!formData.base_url || !formData.api_token || testingToken}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {testingToken ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Testing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Test Connection
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={discoverContentTypes}
            disabled={!formData.base_url || !formData.api_token || discovering || tokenValid !== true}
            className="flex items-center px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {discovering ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                {formData.cms_type === 'wordpress' ? 'Configuring...' : 'Discovering...'}
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={formData.cms_type === 'wordpress' ? "M13 7l5 5m0 0l-5 5m5-5H6" : "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"} />
                </svg>
                {formData.cms_type === 'wordpress' ? 'Continue Setup' : 'Discover Content Types'}
              </>
            )}
          </button>
        </div>

        {/* Connection status feedback */}
        {tokenValid === true && (
          <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-green-800 dark:text-green-200">Connection successful!</span>
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">API token is valid and ready to use.</p>
          </div>
        )}
        
        {tokenValid === false && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm font-medium text-red-800 dark:text-red-200">Connection failed</span>
            </div>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">Please check your credentials and try again.</p>
          </div>
        )}
      </div>
    );
  };

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Choose Content Type</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Found {discoveredTypes.length} content type(s) in your Strapi CMS
        </p>
      </div>

      {discoveredTypes.length > 0 ? (
        <div className="space-y-3">
          {discoveredTypes.map((type) => (
            <div
              key={type.uid}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                formData.content_type === type.uid
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
              onClick={() => setFormData(prev => ({ ...prev, content_type: type.uid }))}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-gray-900 dark:text-white">{type.displayName}</div>
                    {type.suitableForBlogging >= 10 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                        ✨ Recommended
                      </span>
                    )}
                    {type.isEmpty && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
                        Empty
                      </span>
                    )}
                    {type.hasRichText && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Rich Text
                      </span>
                    )}
                    {type.hasText && !type.hasRichText && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                        Text
                      </span>
                    )}
                    {type.hasMedia && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        Media
                      </span>
                    )}
                    {type.hasUID && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">
                        UID/Slug
                      </span>
                    )}
                    {type.hasDraftAndPublish && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                        Draft/Publish
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    API endpoint: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">{type.apiEndpoint}</code>
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-2">
                    <span>{type.fieldCount} field{type.fieldCount !== 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span className={`capitalize ${getCategoryColor(type.category)}`}>{type.category}</span>
                    <span>•</span>
                    <span className="text-gray-300 dark:text-gray-600">{type.uid}</span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-1 ${
                  formData.content_type === type.uid
                    ? 'border-violet-500 bg-violet-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {formData.content_type === type.uid && (
                    <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-500 dark:text-gray-400">No accessible content types found</div>
          <div className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Check your API token permissions and ensure content types exist in Strapi
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={() => setCurrentStep(1)}
          className="btn border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => setCurrentStep(3)}
          disabled={!formData.content_type}
          className="btn bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Finalize Connection</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Review and save your CMS connection</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="connection_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Connection Name *
          </label>
          <input
            id="connection_name"
            type="text"
            name="connection_name"
            value={formData.connection_name}
            onChange={handleInputChange}
            placeholder="My Blog CMS"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            required
          />
        </div>

{!preselectedWebsiteId && (
          <div>
            <label htmlFor="website_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Website *
            </label>
            <select
              id="website_id"
              name="website_id"
              value={formData.website_id}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              required
            >
              <option value="">Select a website</option>
              {websites.map(website => (
                <option key={website.id} value={website.id}>
                  {website.domain}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Connection Summary */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Connection Summary</h4>
        <div className="space-y-2 text-sm">
          <div><span className="font-medium">CMS Type:</span> <span className="text-gray-600 dark:text-gray-400">Strapi</span></div>
          <div><span className="font-medium">Base URL:</span> <span className="text-gray-600 dark:text-gray-400">{formData.base_url}</span></div>
          {preselectedWebsiteId && (
            <div><span className="font-medium">Website:</span> <span className="text-gray-600 dark:text-gray-400">
              {websites.find(w => w.id.toString() === preselectedWebsiteId)?.domain || 'Selected website'}
            </span></div>
          )}
          <div><span className="font-medium">Content Type:</span> <span className="text-gray-600 dark:text-gray-400">
            {discoveredTypes.find(t => t.uid === formData.content_type)?.displayName || formData.content_type}
          </span></div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={() => setCurrentStep(connection ? 3 : 2)}
          className="btn border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300"
        >
          {connection ? 'Cancel' : 'Back'}
        </button>
        <button
          type="submit"
          disabled={loading || !formData.connection_name || !formData.website_id || !formData.content_type}
          className="btn bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {connection ? 'Update' : 'Create'} Connection
            </>
          )}
        </button>
      </div>
    </form>
  );

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">
          {connection ? 'Edit CMS Connection' : 'Add CMS Connection'}
        </h2>
      </div>
      
      <div className="p-5">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!connection && renderStepIndicator()}
        
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </div>
    </div>
  );
}