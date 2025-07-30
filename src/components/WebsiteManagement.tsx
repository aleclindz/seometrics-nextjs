'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';

interface Website {
  id: string;
  domain: string;
  is_managed: boolean;
  is_excluded_from_sync: boolean;
  created_at: string;
}

export default function WebsiteManagement() {
  const { user } = useAuth();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<{ plan_id: string; maxSites: number }>({ plan_id: 'free', maxSites: 1 });
  const [error, setError] = useState<string | null>(null);

  const planLimits = {
    free: 1,
    starter: 1,
    pro: 10,
    enterprise: -1
  };

  useEffect(() => {
    fetchWebsites();
    fetchUserPlan();
  }, [user]);

  const fetchUserPlan = async () => {
    if (!user?.token) return;

    try {
      const response = await fetch(`/api/subscription/manage?userToken=${user.token}`);
      const data = await response.json();
      
      if (data.success && data.subscription) {
        const planId = data.subscription.plan_id || 'free';
        const maxSites = planLimits[planId as keyof typeof planLimits] || 1;
        setUserPlan({ plan_id: planId, maxSites });
      }
    } catch (error) {
      console.error('Error fetching user plan:', error);
    }
  };

  const fetchWebsites = async () => {
    if (!user?.token) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/websites?userToken=${user.token}`);
      const data = await response.json();

      if (data.success) {
        // Filter out excluded websites for display
        const activeWebsites = data.websites.filter((w: Website) => !w.is_excluded_from_sync);
        setWebsites(activeWebsites);
      } else {
        setError('Failed to load websites');
      }
    } catch (error) {
      console.error('Error fetching websites:', error);
      setError('Failed to load websites');
    } finally {
      setLoading(false);
    }
  };

  const handleManageToggle = async (websiteId: string, currentlyManaged: boolean) => {
    if (!user?.token) return;

    const newManagedState = !currentlyManaged;
    
    // Check if we&apos;re trying to manage a new website and would exceed limits
    if (newManagedState) {
      const currentManagedCount = websites.filter(w => w.is_managed).length;
      if (userPlan.maxSites !== -1 && currentManagedCount >= userPlan.maxSites) {
        setError(`You can only manage ${userPlan.maxSites} website${userPlan.maxSites === 1 ? '' : 's'} on your current plan. Upgrade to manage more websites.`);
        return;
      }
    }

    setUpdating(websiteId);
    setError(null);

    try {
      const response = await fetch(`/api/websites?userToken=${user.token}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          websiteId,
          is_managed: newManagedState
        })
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        setWebsites(prev => prev.map(w => 
          w.id === websiteId ? { ...w, is_managed: newManagedState } : w
        ));
      } else {
        setError(data.error || 'Failed to update website status');
      }
    } catch (error) {
      console.error('Error updating website:', error);
      setError('Failed to update website status');
    } finally {
      setUpdating(null);
    }
  };

  const handleRemoveWebsite = async (websiteId: string, domain: string) => {
    if (!user?.token) return;

    if (!confirm(`Are you sure you want to remove "${domain}" from SEOAgent? This action cannot be undone and the website will not be re-imported from Google Search Console.`)) {
      return;
    }

    setUpdating(websiteId);
    setError(null);

    try {
      const response = await fetch(`/api/websites?userToken=${user.token}&websiteId=${websiteId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        // Remove from local state
        setWebsites(prev => prev.filter(w => w.id !== websiteId));
      } else {
        setError(data.error || 'Failed to remove website');
      }
    } catch (error) {
      console.error('Error removing website:', error);
      setError('Failed to remove website');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
        <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">Website Management</h2>
        </header>
        <div className="p-5">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
          </div>
        </div>
      </div>
    );
  }

  const managedCount = websites.filter(w => w.is_managed).length;

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Website Management</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Choose which websites SEOAgent should actively manage
            </p>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {managedCount} of {userPlan.maxSites === -1 ? '∞' : userPlan.maxSites} managed
          </div>
        </div>
      </header>
      
      <div className="p-5">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {websites.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No websites found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Connect your Google Search Console to import your websites.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {websites.map((website) => (
              <div
                key={website.id}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className={`w-3 h-3 rounded-full ${
                      website.is_managed ? 'bg-green-500' : 'bg-gray-300'
                    }`}></div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {website.domain}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {website.is_managed ? 'Actively managed by SEOAgent' : 'Available to manage'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {userPlan.plan_id === 'starter' || userPlan.maxSites === 1 ? (
                    // Radio button for single selection plans
                    <input
                      type="radio"
                      checked={website.is_managed}
                      onChange={() => handleManageToggle(website.id, website.is_managed)}
                      disabled={updating === website.id}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300"
                      name="managed-website"
                    />
                  ) : (
                    // Checkbox for multi-selection plans
                    <input
                      type="checkbox"
                      checked={website.is_managed}
                      onChange={() => handleManageToggle(website.id, website.is_managed)}
                      disabled={updating === website.id}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                    />
                  )}
                  
                  <button
                    onClick={() => handleRemoveWebsite(website.id, website.domain)}
                    disabled={updating === website.id}
                    className="text-red-600 hover:text-red-700 disabled:opacity-50 p-1"
                    title="Remove website permanently"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                About Website Management
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Only managed websites appear in your dashboard and receive SEO services</li>
                  <li>Your {userPlan.plan_id} plan allows {userPlan.maxSites === -1 ? 'unlimited' : userPlan.maxSites} managed website{userPlan.maxSites === 1 ? '' : 's'}</li>
                  <li>Removed websites will not be re-imported from Google Search Console</li>
                  <li>You can change managed websites anytime within your plan limits</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}