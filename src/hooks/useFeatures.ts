'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';

interface UserPlan {
  tier: string;
  sites_allowed: number;
  posts_allowed: number;
  status: string;
}

interface FeatureAccess {
  // Free tier features
  altTags: boolean;
  metaTags: boolean;
  
  // Paid features
  articleGeneration: boolean;
  keywordsTool: boolean;
  seoDebug: boolean;
  analytics: boolean;
  prioritySupport: boolean;
  
  // Limits
  maxSites: number;
  maxArticles: number;
}

export function useFeatures() {
  const { user } = useAuth();
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.token) {
      fetchUserPlan();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchUserPlan = async () => {
    try {
      const response = await fetch(`/api/subscription/manage?userToken=${user?.token}`);
      if (response.ok) {
        const data = await response.json();
        setUserPlan(data.plan);
      }
    } catch (error) {
      console.error('Error fetching user plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFeatureAccess = (): FeatureAccess => {
    if (!userPlan) {
      // Default to free tier if no plan
      return {
        altTags: true,
        metaTags: true,
        articleGeneration: false,
        keywordsTool: false,
        seoDebug: false,
        analytics: false,
        prioritySupport: false,
        maxSites: 1,
        maxArticles: 0,
      };
    }

    const { tier } = userPlan;

    const baseFeatures = {
      altTags: true,
      metaTags: true,
      maxSites: userPlan.sites_allowed,
      maxArticles: userPlan.posts_allowed,
    };

    if (tier === 'free') {
      return {
        ...baseFeatures,
        articleGeneration: false,
        keywordsTool: false,
        seoDebug: false,
        analytics: false,
        prioritySupport: false,
      };
    }

    if (tier === 'starter') {
      return {
        ...baseFeatures,
        articleGeneration: true,
        keywordsTool: true,
        seoDebug: false,
        analytics: false,
        prioritySupport: false,
      };
    }

    if (tier === 'pro') {
      return {
        ...baseFeatures,
        articleGeneration: true,
        keywordsTool: true,
        seoDebug: true,
        analytics: true,
        prioritySupport: true,
      };
    }

    if (tier === 'enterprise') {
      return {
        ...baseFeatures,
        articleGeneration: true,
        keywordsTool: true,
        seoDebug: true,
        analytics: true,
        prioritySupport: true,
        maxSites: -1, // Unlimited
        maxArticles: -1, // Unlimited
      };
    }

    // Fallback to free tier
    return getFeatureAccess();
  };

  const features = getFeatureAccess();

  const hasFeature = (feature: keyof FeatureAccess): boolean => {
    return Boolean(features[feature]);
  };

  const canUpgrade = (): boolean => {
    return userPlan?.tier === 'free' || userPlan?.tier === 'starter';
  };

  const getUpgradeMessage = (feature: string): string => {
    if (userPlan?.tier === 'free') {
      return `Upgrade to Starter plan to access ${feature}`;
    }
    if (userPlan?.tier === 'starter') {
      return `Upgrade to Pro plan to access ${feature}`;
    }
    return '';
  };

  return {
    userPlan,
    features,
    hasFeature,
    canUpgrade,
    getUpgradeMessage,
    loading,
  };
}