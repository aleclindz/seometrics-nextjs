'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';

interface Website {
  id: string;
  domain: string;
  website_token: string;
  is_managed: boolean;
  is_excluded_from_sync: boolean;
  attribution_enabled: boolean;
  created_at: string;
}

export default function WebsiteManagement() {
  const { user } = useAuth();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<{ plan_id: string; maxSites: number }>({ plan_id: 'free', maxSites: 1 });
  const [error, setError] = useState<string | null>(null);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [switchTarget, setSwitchTarget] = useState<{ websiteId: string; domain: string } | null>(null);
  const [switchInfo, setSwitchInfo] = useState<{
    canSwitch: boolean;
    cooldownEndsAt: string | null;
    reason: string;
    accountAge: number;
  } | null>(null);

  useEffect(() => {
    fetchWebsites();
    fetchUserPlan();
    fetchSwitchInfo();
  }, [user]);

  const fetchUserPlan = async () => {
    if (!user?.token) return;

    try {
      const response = await fetch(`/api/subscription/manage?userToken=${user.token}`);
      const data = await response.json();

      if (data.success && data.plan) {
        const planId = data.plan.tier || 'free';
        // Use sites_allowed from the database instead of hardcoded limits
        const maxSites = data.plan.sites_allowed !== undefined ? data.plan.sites_allowed : 1;
        setUserPlan({ plan_id: planId, maxSites });
      }
    } catch (error) {
      console.error('Error fetching user plan:', error);
    }
  };

  const fetchSwitchInfo = async () => {
    if (!user?.token) return;

    try {
      const response = await fetch(`/api/websites/switch-info?userToken=${user.token}`);
      const data = await response.json();
      
      if (data.success) {
        setSwitchInfo({
          canSwitch: data.canSwitch,
          cooldownEndsAt: data.cooldownEndsAt,
          reason: data.reason,
          accountAge: data.accountAge
        });
      }
    } catch (error) {
      console.error('Error fetching switch info:', error);
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
        setError(data.error || 'Failed to load websites');
      }
    } catch (error) {
      console.error('Error fetching websites:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load websites';
      if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
        setError('Database migration required. Please contact support or run the database migration.');
      } else {
        setError('Failed to load websites');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchRequest = (websiteId: string, domain: string) => {
    if (!switchInfo?.canSwitch) {
      setError(`Cannot switch websites at this time. ${getSwitchRestrictionMessage()}`);
      return;
    }

    setSwitchTarget({ websiteId, domain });
    setShowSwitchModal(true);
  };

  const confirmWebsiteSwitch = async () => {
    if (!user?.token || !switchTarget) return;

    setUpdating(switchTarget.websiteId);
    setError(null);
    setShowSwitchModal(false);

    try {
      // First, unmanage all currently managed websites
      const currentlyManagedWebsites = websites.filter(w => w.is_managed);
      
      for (const website of currentlyManagedWebsites) {
        const response = await fetch(`/api/websites?userToken=${user.token}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            websiteId: website.website_token,
            is_managed: false
          })
        });

        if (!response.ok) {
          throw new Error('Failed to unmanage previous website');
        }
      }

      // Then, manage the new website
      const response = await fetch(`/api/websites?userToken=${user.token}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          websiteId: switchTarget.websiteId,
          is_managed: true
        })
      });

      const data = await response.json();

      if (data.success) {
        // Record the switch in the database
        await fetch(`/api/websites/record-switch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userToken: user.token,
            fromWebsiteToken: currentlyManagedWebsites[0]?.website_token || null,
            toWebsiteToken: switchTarget.websiteId,
            reason: 'user_switch'
          })
        });

        // Update local state: unmanage all others, manage the selected one
        setWebsites(prev => prev.map(w => ({
          ...w,
          is_managed: w.website_token === switchTarget.websiteId
        })));

        // Refresh switch info to update cooldown
        await fetchSwitchInfo();
      } else {
        setError(data.error || 'Failed to switch managed website');
      }
    } catch (error) {
      console.error('Error switching managed website:', error);
      setError('Failed to switch managed website');
    } finally {
      setUpdating(null);
      setSwitchTarget(null);
    }
  };

  const getSwitchRestrictionMessage = () => {
    if (!switchInfo) return '';
    
    switch (switchInfo.reason) {
      case 'new_user_grace_period':
        return `You can switch freely during your first 7 days (${Math.ceil(7 - switchInfo.accountAge)} days remaining).`;
      case 'cooldown_active':
        const cooldownDate = switchInfo.cooldownEndsAt ? new Date(switchInfo.cooldownEndsAt).toLocaleDateString() : '';
        return `You can switch again on ${cooldownDate} (30-day cooldown after last switch).`;
      case 'cooldown_expired':
      case 'no_previous_switches':
        return 'You can switch your managed website now.';
      default:
        return '';
    }
  };

  const handleManageToggle = async (websiteId: string, currentlyManaged: boolean) => {
    if (!user?.token) return;

    const newManagedState = !currentlyManaged;
    
    // For single-website plans (starter), use switching logic with confirmation
    if (newManagedState && userPlan.maxSites === 1) {
      const currentManagedCount = websites.filter(w => w.is_managed).length;
      if (currentManagedCount >= 1) {
        const websiteDomain = websites.find(w => w.website_token === websiteId)?.domain || '';
        handleSwitchRequest(websiteId, websiteDomain);
        return;
      }
    }
    
    // For multi-website plans, check if we&apos;re trying to manage a new website and would exceed limits
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
          w.website_token === websiteId ? { ...w, is_managed: newManagedState } : w
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

  const handleAttributionToggle = async (websiteId: string, currentEnabled: boolean) => {
    if (!user?.token) return;

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
          attribution_enabled: !currentEnabled
        })
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        setWebsites(prev => prev.map(w => 
          w.website_token === websiteId ? { ...w, attribution_enabled: !currentEnabled } : w
        ));
      } else {
        setError(data.error || 'Failed to update attribution setting');
      }
    } catch (error) {
      console.error('Error updating attribution:', error);
      setError('Failed to update attribution setting');
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
        setWebsites(prev => prev.filter(w => w.website_token !== websiteId));
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
                key={website.website_token}
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

                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    {website.is_managed ? (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full font-medium">
                          Currently Managed
                        </span>
                        {userPlan.maxSites === 1 && (
                          <button
                            onClick={() => handleSwitchRequest(website.website_token, website.domain)}
                            disabled={updating === website.website_token || !switchInfo?.canSwitch}
                            className="text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-3 py-1 rounded font-medium"
                            title={switchInfo?.canSwitch ? "Switch to different website" : getSwitchRestrictionMessage()}
                          >
                            {updating === website.website_token ? 'Switching...' : 'Switch'}
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleManageToggle(website.website_token, website.is_managed)}
                        disabled={updating === website.website_token}
                        className="text-xs bg-violet-600 hover:bg-violet-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-3 py-1 rounded font-medium"
                      >
                        {updating === website.website_token ? 'Managing...' : 'Manage'}
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleRemoveWebsite(website.website_token, website.domain)}
                      disabled={updating === website.website_token}
                      className="text-red-600 hover:text-red-700 disabled:opacity-50 p-1"
                      title="Remove website permanently"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Attribution Toggle */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleAttributionToggle(website.website_token, website.attribution_enabled)}
                      disabled={updating === website.website_token}
                      className={`text-xs px-3 py-1 rounded font-medium transition-colors ${
                        website.attribution_enabled
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      } ${updating === website.website_token ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={website.attribution_enabled ? 'Click to hide SEOAgent attribution link' : 'Click to show SEOAgent attribution link'}
                    >
                      {website.attribution_enabled ? '✓ Attribution' : '✗ Attribution'}
                    </button>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {website.attribution_enabled ? 'Shows "SEO by SEOAgent" link' : 'Attribution hidden'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pro Plan CTA for users with only 1 managed website */}
        {userPlan.plan_id === 'pro' && managedCount === 1 && websites.length > 1 && (
          <div className="mt-6 p-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-lg border border-violet-200 dark:border-violet-700">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-violet-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-violet-800 dark:text-violet-200">
                  🚀 Pro Plan: Add More Websites
                </h3>
                <div className="mt-2 text-sm text-violet-700 dark:text-violet-300">
                  <p className="mb-3">
                    You&apos;re currently managing 1 website, but your Pro plan supports up to <strong>5 managed websites</strong>! 
                    Maximize your subscription value by managing more of your properties.
                  </p>
                  <div className="flex items-center space-x-4">
                    <div className="text-xs bg-violet-100 dark:bg-violet-800 px-2 py-1 rounded-full">
                      💡 Pro Tip: Manage your highest-traffic websites for maximum SEO impact
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
                How SEOAgent Website Management Works
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Selective Management:</strong> Choose which websites receive SEOAgent&apos;s automated SEO services</li>
                  <li><strong>Plan Limits:</strong> Your {userPlan.plan_id === 'starter' ? 'Starter ($29/month)' : userPlan.plan_id === 'pro' ? 'Pro ($79/month)' : userPlan.plan_id === 'enterprise' ? 'Enterprise' : userPlan.plan_id.charAt(0).toUpperCase() + userPlan.plan_id.slice(1)} plan includes {userPlan.maxSites === -1 ? 'unlimited' : userPlan.maxSites} managed website{userPlan.maxSites === 1 ? '' : 's'} with unlimited content generation</li>
                  <li><strong>SEO Services:</strong> Managed websites get technical SEO analysis, content optimization, and automated improvements</li>
                  <li><strong>Permanent Removal:</strong> Deleted websites won&apos;t return when syncing Google Search Console</li>
                  <li><strong>Flexible Changes:</strong> Switch managed websites anytime within your subscription limits</li>
                  {userPlan.maxSites === 1 && (
                    <li><strong>Single Website Focus:</strong> Your plan optimizes one website completely rather than spreading resources thin</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Website Switch Confirmation Modal */}
      {showSwitchModal && switchTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Switch Managed Website
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This will change which website SEOAgent optimizes
                </p>
              </div>
            </div>

            <div className="mb-6">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">What happens when you switch:</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Your current managed website will stop receiving SEO optimization</li>
                  <li>• <strong>{switchTarget.domain}</strong> will become your actively managed website</li>
                  <li>• You won&apos;t be able to switch again for 30 days</li>
                  <li>• All generated content and optimization data will be preserved</li>
                </ul>
              </div>

              {switchInfo && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Switch Status:</strong> {getSwitchRestrictionMessage()}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowSwitchModal(false);
                  setSwitchTarget(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmWebsiteSwitch}
                disabled={updating === switchTarget.websiteId}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium"
              >
                {updating === switchTarget.websiteId ? 'Switching...' : 'Confirm Switch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}