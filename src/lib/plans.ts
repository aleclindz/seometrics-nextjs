// Subscription plan configurations
export interface PlanConfig {
  id: string;
  name: string;
  price: number;
  features: {
    maxSites: number;
    maxArticlesPerMonth: number;
    articleGeneration: boolean;
    keywordsTool: boolean;
    seoDebug: boolean;
    analytics: boolean;
    prioritySupport: boolean;
  };
}

export const PLANS: Record<string, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    features: {
      maxSites: 1,
      maxArticlesPerMonth: 0,
      articleGeneration: false,
      keywordsTool: false,
      seoDebug: false,
      analytics: false,
      prioritySupport: false,
    },
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 49,
    features: {
      maxSites: 1,
      maxArticlesPerMonth: -1, // Unlimited articles
      articleGeneration: true,
      keywordsTool: true,
      seoDebug: false,
      analytics: false,
      prioritySupport: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 149,
    features: {
      maxSites: -1, // Unlimited
      maxArticlesPerMonth: -1, // Unlimited articles
      articleGeneration: true,
      keywordsTool: true,
      seoDebug: true,
      analytics: true,
      prioritySupport: true,
    },
  },
  scale: {
    id: 'scale',
    name: 'Scale',
    price: 399,
    features: {
      maxSites: -1, // Unlimited
      maxArticlesPerMonth: -1, // Unlimited articles
      articleGeneration: true,
      keywordsTool: true,
      seoDebug: true,
      analytics: true,
      prioritySupport: true,
    },
  },
};

export function getPlanConfig(planId: string): PlanConfig {
  return PLANS[planId] || PLANS.free;
}

export function canAddWebsite(currentCount: number, planId: string): boolean {
  const plan = getPlanConfig(planId);
  if (plan.features.maxSites === -1) return true; // Unlimited
  return currentCount < plan.features.maxSites;
}

export function canGenerateArticle(currentCount: number, planId: string): boolean {
  const plan = getPlanConfig(planId);
  if (!plan.features.articleGeneration) return false;
  if (plan.features.maxArticlesPerMonth === -1) return true; // Unlimited
  return currentCount < plan.features.maxArticlesPerMonth;
}

export function getUpgradeMessage(currentPlan: string, targetFeature: string): string {
  switch (currentPlan) {
    case 'free':
      return `Upgrade to Starter plan to access ${targetFeature}`;
    case 'starter':
      return `Upgrade to Pro plan to access ${targetFeature}`;
    default:
      return `Upgrade required to access ${targetFeature}`;
  }
}