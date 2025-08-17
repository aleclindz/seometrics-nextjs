'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';

interface Website {
  id: number;
  domain: string;
  website_token: string;
}

interface DiscoveredContentType {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  entryCount?: number;
  verified: boolean;
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
  const [error, setError] = useState<string | null>(null);
  const [discoveredTypes, setDiscoveredTypes] = useState<DiscoveredContentType[]>([]);
  const [currentStep, setCurrentStep] = useState(connection ? 3 : 1); // Skip discovery for existing connections

  const [formData, setFormData] = useState({
    connection_name: connection?.connection_name || '',
    website_id: connection?.website_id || preselectedWebsiteId || '',
    cms_type: connection?.cms_type || 'strapi',
    base_url: connection?.base_url || '',
    api_token: connection?.api_token || '',
    content_type: connection?.content_type || ''
  });

  useEffect(() => {
    fetchUserWebsites();
  }, [user]);

  const fetchUserWebsites = async () => {
    try {
      const response = await fetch(`/api/websites?userToken=${user?.token}`);
      if (response.ok) {
        const data = await response.json();
        setWebsites(data.websites || []);
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
  };

  const discoverContentTypes = async () => {
    if (!formData.base_url || !formData.api_token) {
      setError('Please enter both base URL and API token');
      return;
    }

    try {
      setDiscovering(true);
      setError(null);

      const response = await fetch(`/api/cms/discover-content-types?userToken=${user?.token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          base_url: formData.base_url,
          api_token: formData.api_token,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setDiscoveredTypes(data.discoveredTypes || []);
        setCurrentStep(2);
        
        // Auto-select recommended content type
        if (data.recommended) {
          setFormData(prev => ({
            ...prev,
            content_type: data.recommended.id
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

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Connect to your Strapi CMS</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enter your Strapi URL and API token to get started</p>
      </div>

      <div>
        <label htmlFor="base_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Strapi Base URL *
        </label>
        <input
          id="base_url"
          type="url"
          name="base_url"
          value={formData.base_url}
          onChange={handleInputChange}
          placeholder="https://your-strapi-instance.railway.app"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label htmlFor="api_token" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          API Token *
        </label>
        <input
          id="api_token"
          type="password"
          name="api_token"
          value={formData.api_token}
          onChange={handleInputChange}
          placeholder="Your Strapi API token"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          required
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Generate this in your Strapi admin panel under Settings → API Tokens
        </p>
      </div>

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="btn border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={discoverContentTypes}
          disabled={discovering || !formData.base_url || !formData.api_token}
          className="btn bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50"
        >
          {discovering ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Discovering...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Connect & Discover
            </>
          )}
        </button>
      </div>
    </div>
  );

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
              key={type.id}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                formData.content_type === type.id
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
              onClick={() => setFormData(prev => ({ ...prev, content_type: type.id }))}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{type.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{type.description}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{type.id}</div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 ${
                  formData.content_type === type.id
                    ? 'border-violet-500 bg-violet-500'
                    : 'border-gray-300'
                }`}>
                  {formData.content_type === type.id && (
                    <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-500 dark:text-gray-400">No content types found</div>
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
            {discoveredTypes.find(t => t.id === formData.content_type)?.name || formData.content_type}
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