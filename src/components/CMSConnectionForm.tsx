'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';

interface Website {
  id: number;
  domain: string;
  website_token: string;
}

interface CMSConnectionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  connection?: any; // For editing existing connections
}

export default function CMSConnectionForm({ onSuccess, onCancel, connection }: CMSConnectionFormProps) {
  const { user } = useAuth();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [formData, setFormData] = useState({
    connection_name: connection?.connection_name || '',
    website_id: connection?.website_id || '',
    cms_type: connection?.cms_type || 'strapi',
    base_url: connection?.base_url || '',
    api_token: connection?.api_token || '',
    content_type: connection?.content_type || 'api::article::article'
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

  const testConnection = async () => {
    if (!formData.base_url || !formData.api_token) {
      setTestResult({
        success: false,
        message: 'Please enter both base URL and API token to test the connection'
      });
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);
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
          content_type: formData.content_type,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTestResult({
          success: true,
          message: data.message || 'Connection successful!'
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Connection failed'
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Connection test failed'
      });
    } finally {
      setTesting(false);
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

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">
          {connection ? 'Edit' : 'Add'} CMS Connection
        </h2>
      </div>
      
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Connection Name *
            </label>
            <input
              type="text"
              name="connection_name"
              value={formData.connection_name}
              onChange={handleInputChange}
              placeholder="My Blog CMS"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Website *
            </label>
            <select
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              CMS Type
            </label>
            <select
              name="cms_type"
              value={formData.cms_type}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="strapi">Strapi</option>
              <option value="wordpress" disabled>WordPress (Coming Soon)</option>
              <option value="contentful" disabled>Contentful (Coming Soon)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Content Type
            </label>
            <input
              type="text"
              name="content_type"
              value={formData.content_type}
              onChange={handleInputChange}
              placeholder="api::article::article"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Strapi content type identifier (e.g., api::article::article)
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Base URL *
          </label>
          <input
            type="url"
            name="base_url"
            value={formData.base_url}
            onChange={handleInputChange}
            placeholder="https://your-strapi-instance.com"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            API Token *
          </label>
          <input
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

        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            onClick={testConnection}
            disabled={testing || !formData.base_url || !formData.api_token}
            className="btn border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300 disabled:opacity-50"
          >
            {testing ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
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

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="btn border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
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
        </div>

        {testResult && (
          <div className={`rounded-lg p-4 ${testResult.success ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800'}`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {testResult.success ? (
                  <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className={`text-sm ${testResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {testResult.message}
                </p>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}