'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth';

const PLANS = [
  {
    name: 'Starter',
    price: 19,
    tier: 'starter',
    frequency: '3 articles/week',
    description: 'Perfect for small blogs and personal sites',
    features: [
      '12 AI articles/month',
      '1 website',
      'DALL-E 3 images',
      'SEO optimization',
      'Multi-CMS publishing',
      'Technical SEO automation',
    ],
    popular: false,
  },
  {
    name: 'Pro',
    price: 39,
    tier: 'pro',
    frequency: '1 article/day',
    description: 'Ideal for growing businesses and content creators',
    features: [
      '30 AI articles/month',
      '10 websites',
      'DALL-E 3 images',
      'SEO optimization',
      'Multi-CMS publishing',
      'Technical SEO automation',
      'Priority support',
    ],
    popular: true,
  },
  {
    name: 'Scale',
    price: 99,
    tier: 'scale',
    frequency: '3 articles/day',
    description: 'For high-volume content needs and agencies',
    features: [
      '90 AI articles/month',
      'Unlimited websites',
      'DALL-E 3 images',
      'SEO optimization',
      'Multi-CMS publishing',
      'Technical SEO automation',
      'Priority support',
      'Custom integrations',
    ],
    popular: false,
  },
];

export default function PricingPlans() {
  const { user } = useAuth();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [trial, setTrial] = useState(false);
  const calendlyUrl = 'https://calendly.com/alec-aleclindz/30min';

  const startCheckout = async (tier: string) => {
    if (!user?.token || !user?.email) return;
    try {
      setLoadingTier(tier);
      const resp = await fetch('/api/subscription/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, userToken: user.token, email: user.email, trial }),
      });
      if (!resp.ok) throw new Error('Failed to create checkout session');
      const data = await resp.json();
      if (data?.url) window.location.href = data.url;
    } catch (e) {
      console.error('Checkout error:', e);
      setLoadingTier(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Choose your plan</h1>
          <p className="text-gray-600 mt-2">Unlock automated content generation, SEO optimization, and multi-CMS publishing.</p>
        </div>

        {/* Trial Toggle */}
        <div className="flex items-center justify-center mb-6">
          <label className="inline-flex items-center gap-3 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm">
            <input
              type="checkbox"
              checked={trial}
              onChange={(e) => setTrial(e.target.checked)}
              className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">
              Start with a <span className="font-semibold">$1 7‑day trial</span> (then monthly pricing applies)
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div key={plan.tier} className={`relative rounded-2xl border shadow-sm bg-white ${plan.popular ? 'border-violet-500 ring-2 ring-violet-500 ring-opacity-50' : 'border-gray-200'}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="bg-violet-600 text-white text-xs px-3 py-1 rounded-full">Most Popular</div>
                </div>
              )}
              <div className="p-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-gray-500">/mo</span>
                  </div>
                  <div className="inline-flex mt-2 px-2 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-medium">{plan.frequency}</div>
                  <p className="text-gray-600 mt-3">{plan.description}</p>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center text-sm text-gray-700">
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-100 text-green-700 mr-2">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => startCheckout(plan.tier)}
                  disabled={!!loadingTier}
                  className={`w-full rounded-lg px-4 py-2 font-medium transition-colors ${
                    plan.popular
                      ? 'bg-violet-600 hover:bg-violet-700 text-white'
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
                  }`}
                >
                  {loadingTier === plan.tier ? 'Redirecting…' : (trial ? 'Start $1 trial' : 'Get started')}
                </button>
                {trial && (
                  <p className="mt-2 text-xs text-gray-500 text-center">
                    7‑day trial, then ${plan.price}/mo. Cancel anytime.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <button
            onClick={() => window.open(calendlyUrl, '_blank')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-800 hover:bg-gray-50"
          >
            Contact sales
          </button>
        </div>
      </div>
    </div>
  );
}
