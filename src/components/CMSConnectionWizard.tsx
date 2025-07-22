'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import ChatInterface from './ChatInterface';

interface Website {
  id: number;
  domain: string;
  website_token: string;
}

interface WizardStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

interface CMSConnectionWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

export default function CMSConnectionWizard({ onComplete, onCancel }: CMSConnectionWizardProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [wizardData, setWizardData] = useState({
    connection_name: '',
    website_id: '',
    cms_type: 'strapi',
    base_url: '',
    api_token: '',
    content_type: 'api::article::article'
  });

  const steps: WizardStep[] = [
    {
      id: 'select-website',
      title: 'Select Website',
      description: 'Choose which website you want to connect to your CMS',
      completed: !!wizardData.website_id
    },
    {
      id: 'cms-details',
      title: 'CMS Information',
      description: 'Enter your Strapi instance details',
      completed: !!(wizardData.connection_name && wizardData.base_url)
    },
    {
      id: 'authentication',
      title: 'API Authentication',
      description: 'Configure API token and content type',
      completed: !!(wizardData.api_token && wizardData.content_type)
    },
    {
      id: 'test-connection',
      title: 'Test Connection',
      description: 'Verify that everything works correctly',
      completed: testResult?.success || false
    }
  ];

  useEffect(() => {
    fetchUserWebsites();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleInputChange = (field: string, value: string) => {
    setWizardData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const testConnection = async () => {
    if (!wizardData.base_url || !wizardData.api_token) {
      setTestResult({
        success: false,
        message: 'Please enter both base URL and API token'
      });
      return;
    }

    try {
      setLoading(true);
      setTestResult(null);

      const response = await fetch('/api/cms/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cms_type: wizardData.cms_type,
          base_url: wizardData.base_url,
          api_token: wizardData.api_token,
          content_type: wizardData.content_type,
        }),
      });

      const data = await response.json();
      setTestResult({
        success: response.ok,
        message: data.message || data.error || (response.ok ? 'Connection successful!' : 'Connection failed')
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: 'Connection test failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!testResult?.success) {
      setError('Please test the connection successfully before completing setup');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/cms/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...wizardData,
          userToken: user?.token,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save connection');
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Select Website
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Choose Your Website
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Select which website you want to connect to your CMS for automated article publishing
              </p>
            </div>

            {websites.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  You don&apos;t have any websites set up yet.
                </p>
                <button
                  onClick={() => window.location.href = '/add-website'}
                  className="btn bg-violet-600 hover:bg-violet-700 text-white"
                >
                  Add Your First Website
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {websites.map(website => (
                  <div
                    key={website.id}
                    onClick={() => handleInputChange('website_id', website.id.toString())}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      wizardData.website_id === website.id.toString()
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                        wizardData.website_id === website.id.toString()
                          ? 'border-violet-500 bg-violet-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {wizardData.website_id === website.id.toString() && (
                          <div className="w-full h-full rounded-full bg-white transform scale-50"></div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {website.domain}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 1: // CMS Details
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                CMS Information
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Enter your Strapi instance details so we can connect to it
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Connection Name
                </label>
                <input
                  type="text"
                  value={wizardData.connection_name}
                  onChange={(e) => handleInputChange('connection_name', e.target.value)}
                  placeholder="My Blog CMS"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  A friendly name to identify this connection
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Strapi Base URL
                </label>
                <input
                  type="url"
                  value={wizardData.base_url}
                  onChange={(e) => handleInputChange('base_url', e.target.value)}
                  placeholder="https://your-strapi-instance.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  The full URL to your Strapi instance (including https://)
                </p>
              </div>
            </div>
          </div>
        );

      case 2: // Authentication
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m-2-2a2 2 0 00-2 2m2-2v2a2 2 0 01-2 2m-2-2a2 2 0 00-2 2v2a2 2 0 002 2m2-2a2 2 0 002-2V9a2 2 0 00-2-2m-2 2a2 2 0 002-2m0 0V5a2 2 0 012-2h4a2 2 0 012 2v2a2 2 0 01-2 2h-4a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                API Authentication
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Configure the API token and content type for automatic publishing
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  API Token
                </label>
                <input
                  type="password"
                  value={wizardData.api_token}
                  onChange={(e) => handleInputChange('api_token', e.target.value)}
                  placeholder="Your Strapi API token"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-1">
                    How to get your API token:
                  </p>
                  <ol className="text-xs text-blue-600 dark:text-blue-400 space-y-1 ml-4 list-decimal">
                    <li>Go to your Strapi admin panel</li>
                    <li>Navigate to Settings → API Tokens</li>
                    <li>Create a new token with &ldquo;Full Access&rdquo; type</li>
                    <li>Copy the token and paste it here</li>
                  </ol>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Content Type
                </label>
                <input
                  type="text"
                  value={wizardData.content_type}
                  onChange={(e) => handleInputChange('content_type', e.target.value)}
                  placeholder="api::article::article"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  The Strapi content type identifier where articles will be published
                </p>
              </div>
            </div>
          </div>
        );

      case 3: // Test Connection
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Test Connection
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Let&apos;s verify that everything is working correctly
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Connection Summary:</h4>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div><span className="font-medium">Website:</span> {websites.find(w => w.id.toString() === wizardData.website_id)?.domain}</div>
                  <div><span className="font-medium">Connection:</span> {wizardData.connection_name}</div>
                  <div><span className="font-medium">URL:</span> {wizardData.base_url}</div>
                  <div><span className="font-medium">Content Type:</span> {wizardData.content_type}</div>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={testConnection}
                  disabled={loading || !wizardData.api_token}
                  className="btn bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Testing Connection...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Test Connection
                    </>
                  )}
                </button>
              </div>

              {testResult && (
                <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800'}`}>
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
                      <p className={`text-sm font-medium ${testResult.success ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                        {testResult.success ? 'Connection Successful!' : 'Connection Failed'}
                      </p>
                      <p className={`text-sm mt-1 ${testResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {testResult.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return !!wizardData.website_id;
      case 1: return !!(wizardData.connection_name && wizardData.base_url);
      case 2: return !!(wizardData.api_token && wizardData.content_type);
      case 3: return testResult?.success;
      default: return false;
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 h-full">
      {/* Main Wizard */}
      <div className="col-span-12 lg:col-span-8">
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl h-full flex flex-col">
          {/* Progress Header */}
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                Connect Your CMS
              </h2>
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center space-x-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    index === currentStep
                      ? 'bg-violet-600 text-white'
                      : index < currentStep || step.completed
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {index < currentStep || step.completed ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 ml-2 ${
                      index < currentStep ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-2">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {steps[currentStep]?.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {steps[currentStep]?.description}
              </p>
            </div>
          </div>

          {/* Step Content */}
          <div className="flex-1 p-6">
            {error && (
              <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex">
                  <svg className="h-5 w-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {renderStepContent()}
          </div>

          {/* Navigation Footer */}
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700/60">
            <div className="flex justify-between">
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                className="btn border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              <div className="flex space-x-3">
                {currentStep === steps.length - 1 ? (
                  <button
                    onClick={handleComplete}
                    disabled={!canProceed() || loading}
                    className="btn bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Setting up...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Complete Setup
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={nextStep}
                    disabled={!canProceed()}
                    className="btn bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50"
                  >
                    Next
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="col-span-12 lg:col-span-4">
        <ChatInterface 
          context="cms-setup"
          placeholder="Ask questions about setting up your CMS connection..."
          title="Setup Assistant"
        />
      </div>
    </div>
  );
}