'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';

interface UserPlan {
  id: number;
  user_token: string;
  tier: string;
  sites_allowed: number;
  posts_allowed: number;
  status: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  created_at: string;
  updated_at: string;
}

interface Usage {
  sites: number;
  articles: number;
  month: string;
}

interface SubscriptionData {
  plan: UserPlan;
  usage: Usage;
  subscription?: {
    id: string;
    status: string;
    current_period_start: number;
    current_period_end: number;
    cancel_at_period_end: boolean;
  };
}

const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free Plan',
    price: 0,
    features: [
      '1 connected site',
      'Free alt-tags generation',
      'Free meta-tags generation',
      'Community support'
    ]
  },
  starter: {
    name: 'Starter Plan',
    price: 29,
    features: [
      '1 managed website',
      'Unlimited article generation',
      'Technical SEO optimization',
      'Content optimization',
      'Keywords research tool',
      'Email support'
    ]
  },
  pro: {
    name: 'Pro Plan',
    price: 79,
    features: [
      '5 managed websites',
      'Unlimited article generation',
      'All Starter features',
      'Priority support',
      'Analytics dashboard',
      'Advanced SEO debugging tools'
    ]
  },
  enterprise: {
    name: 'Enterprise Plan',
    price: null,
    features: [
      'Unlimited connected sites',
      'Unlimited articles',
      'All Pro features',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee'
    ]
  }
};

export default function SubscriptionManager() {
  const { user } = useAuth();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.token) {
      fetchSubscriptionData();
    } else if (user && !user.token) {
      // User is authenticated but token is missing - show error
      setError('Authentication token not found. Please refresh the page.');
      setLoading(false);
    }
  }, [user]);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[SUBSCRIPTION MANAGER] Fetching subscription data for user token:', user?.token);
      const response = await fetch(`/api/subscription/manage?userToken=${user?.token}`);
      console.log('[SUBSCRIPTION MANAGER] Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SUBSCRIPTION MANAGER] Response error:', errorText);
        throw new Error('Failed to fetch subscription data');
      }
      
      const data = await response.json();
      console.log('[SUBSCRIPTION MANAGER] Response data:', data);
      setSubscriptionData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (tier: string) => {
    if (!user?.token || !user?.email) return;

    try {
      setActionLoading(true);
      setError(null);

      const response = await fetch('/api/subscription/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier,
          userToken: user.token,
          email: user.email,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user?.token) return;

    try {
      setActionLoading(true);
      setError(null);

      const response = await fetch('/api/subscription/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'cancel',
          userToken: user.token,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      await fetchSubscriptionData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    if (!user?.token) return;

    try {
      setActionLoading(true);
      setError(null);

      const response = await fetch('/api/subscription/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reactivate',
          userToken: user.token,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reactivate subscription');
      }

      await fetchSubscriptionData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleManageBilling = async () => {
    if (!user?.token) return;

    try {
      setActionLoading(true);
      setError(null);

      const response = await fetch('/api/subscription/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create-portal-session',
          userToken: user.token,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
        <div className="p-8 text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading subscription data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Error Loading Subscription</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchSubscriptionData}
            className="btn bg-blue-600 hover:bg-blue-700 text-white"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!subscriptionData) {
    return null;
  }

  const { plan, usage, subscription } = subscriptionData;
  const currentTier = SUBSCRIPTION_TIERS[plan.tier as keyof typeof SUBSCRIPTION_TIERS];

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
        <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">Current Plan</h2>
        </header>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {currentTier.name}
              </h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentTier.price === 0 ? 'Free' : currentTier.price ? `$${currentTier.price}` : 'Custom'}
                {(currentTier.price && currentTier.price > 0) && (
                  <span className="text-sm font-normal text-gray-600 dark:text-gray-400">/month</span>
                )}
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              plan.status === 'active' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
            }`}>
              {plan.status === 'active' ? 'Active' : plan.status}
            </div>
          </div>

          {subscription && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Current period:</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(subscription.current_period_start * 1000).toLocaleDateString()} - {new Date(subscription.current_period_end * 1000).toLocaleDateString()}
                </span>
              </div>
              {subscription.cancel_at_period_end && (
                <div className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
                  ⚠️ This subscription will cancel at the end of the current period
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {plan.sites_allowed === -1 ? '∞' : plan.sites_allowed}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Websites allowed</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                ∞
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Article generation</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {plan.tier === 'free' && (
              <>
                <button
                  onClick={() => handleUpgrade('starter')}
                  disabled={actionLoading}
                  className="btn bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50"
                >
                  {actionLoading ? 'Loading...' : 'Upgrade to Starter'}
                </button>
                <button
                  onClick={() => handleUpgrade('pro')}
                  disabled={actionLoading}
                  className="btn bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  {actionLoading ? 'Loading...' : 'Upgrade to Pro'}
                </button>
                <button
                  onClick={() => window.open('https://calendly.com/alec-baxter/15min', '_blank')}
                  className="btn bg-gray-900 hover:bg-gray-800 text-white"
                >
                  Enterprise - Book Call
                </button>
              </>
            )}
            
            {plan.tier === 'starter' && (
              <>
                <button
                  onClick={() => handleUpgrade('pro')}
                  disabled={actionLoading}
                  className="btn bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  {actionLoading ? 'Loading...' : 'Upgrade to Pro'}
                </button>
                <button
                  onClick={() => window.open('https://calendly.com/alec-baxter/15min', '_blank')}
                  className="btn bg-gray-900 hover:bg-gray-800 text-white"
                >
                  Enterprise - Book Call
                </button>
              </>
            )}
            
            {plan.tier === 'pro' && (
              <button
                onClick={() => window.open('https://calendly.com/alec-baxter/15min', '_blank')}
                className="btn bg-gray-900 hover:bg-gray-800 text-white"
              >
                Enterprise - Book Call
              </button>
            )}

            {subscription && (
              <>
                {subscription.cancel_at_period_end ? (
                  <button
                    onClick={handleReactivateSubscription}
                    disabled={actionLoading}
                    className="btn bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                  >
                    {actionLoading ? 'Loading...' : 'Reactivate Subscription'}
                  </button>
                ) : (
                  <button
                    onClick={handleCancelSubscription}
                    disabled={actionLoading}
                    className="btn border-red-200 hover:border-red-300 text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    {actionLoading ? 'Loading...' : 'Cancel Subscription'}
                  </button>
                )}

                <button
                  onClick={handleManageBilling}
                  disabled={actionLoading}
                  className="btn border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300 disabled:opacity-50"
                >
                  {actionLoading ? 'Loading...' : 'Manage Billing'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Available Plans */}
      {plan.tier === 'free' && (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
          <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Available Plans</h2>
          </header>
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(SUBSCRIPTION_TIERS).map(([key, tier]) => {
                if (key === plan.tier) return null;
                
                return (
                  <div key={key} className="border border-gray-200 dark:border-gray-600 rounded-lg p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {tier.name}
                      </h3>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                        {tier.price === 0 ? 'Free' : tier.price ? `$${tier.price}` : 'Custom'}
                        {(tier.price && tier.price > 0) && (
                          <span className="text-sm font-normal text-gray-600 dark:text-gray-400">/month</span>
                        )}
                      </p>
                    </div>
                    
                    <ul className="space-y-2 mb-6">
                      {tier.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <svg className="w-4 h-4 text-green-600 dark:text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    
                    <button
                      onClick={() => key === 'enterprise' 
                        ? window.open('https://calendly.com/alec-baxter/15min', '_blank')
                        : handleUpgrade(key)
                      }
                      disabled={actionLoading && key !== 'enterprise'}
                      className={`w-full btn ${
                        key === 'enterprise' 
                          ? 'bg-gray-900 hover:bg-gray-800 text-white'
                          : key === 'pro' 
                            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                            : 'bg-violet-600 hover:bg-violet-700 text-white'
                      } disabled:opacity-50`}
                    >
                      {actionLoading && key !== 'enterprise' ? 'Loading...' : 
                       key === 'enterprise' ? 'Book Call' : 'Upgrade Now'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}