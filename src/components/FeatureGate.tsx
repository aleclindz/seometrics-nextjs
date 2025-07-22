'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useFeatures } from '@/hooks/useFeatures';

interface FeatureGateProps {
  feature: 'articleGeneration' | 'keywordsTool' | 'seoDebug' | 'analytics';
  children: ReactNode;
  fallback?: ReactNode;
}

export default function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { hasFeature, getUpgradeMessage, userPlan, loading } = useFeatures();
  const router = useRouter();

  if (loading) {
    return (
      <div className="font-inter antialiased bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
        <div className="flex h-screen overflow-hidden">
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!hasFeature(feature)) {
    const featureNames = {
      articleGeneration: 'Article Writer',
      keywordsTool: 'Keywords Tool',
      seoDebug: 'SEO Debug Tool',
      analytics: 'Analytics Dashboard'
    };

    const requiredPlans = {
      articleGeneration: 'Starter',
      keywordsTool: 'Starter', 
      seoDebug: 'Pro',
      analytics: 'Pro'
    };

    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="font-inter antialiased bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
        <div className="flex h-screen overflow-hidden">
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-md text-center">
              <div className="w-20 h-20 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {featureNames[feature]} - {requiredPlans[feature]} Feature
              </h1>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                {getUpgradeMessage(featureNames[feature])} to access this powerful tool and unlock advanced SEO capabilities.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => router.push('/account')}
                  className="w-full btn bg-violet-600 hover:bg-violet-700 text-white py-3"
                >
                  ⚡ Upgrade Now
                </button>
                
                <button
                  onClick={() => router.push('/')}
                  className="w-full btn border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300"
                >
                  ← Back to Dashboard
                </button>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Current plan: <span className="font-medium">{userPlan?.tier || 'Free'}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}