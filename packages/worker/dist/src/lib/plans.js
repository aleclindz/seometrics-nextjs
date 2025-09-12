"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLANS = void 0;
exports.getPlanConfig = getPlanConfig;
exports.canAddWebsite = canAddWebsite;
exports.canGenerateArticle = canGenerateArticle;
exports.getUpgradeMessage = getUpgradeMessage;
exports.PLANS = {
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
        price: 29,
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
        price: 79,
        features: {
            maxSites: 5,
            maxArticlesPerMonth: -1, // Unlimited articles
            articleGeneration: true,
            keywordsTool: true,
            seoDebug: true,
            analytics: true,
            prioritySupport: true,
        },
    },
    enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        price: -1, // Custom pricing
        features: {
            maxSites: -1, // Unlimited
            maxArticlesPerMonth: -1, // Unlimited
            articleGeneration: true,
            keywordsTool: true,
            seoDebug: true,
            analytics: true,
            prioritySupport: true,
        },
    },
};
function getPlanConfig(planId) {
    return exports.PLANS[planId] || exports.PLANS.free;
}
function canAddWebsite(currentCount, planId) {
    const plan = getPlanConfig(planId);
    if (plan.features.maxSites === -1)
        return true; // Unlimited
    return currentCount < plan.features.maxSites;
}
function canGenerateArticle(currentCount, planId) {
    const plan = getPlanConfig(planId);
    if (!plan.features.articleGeneration)
        return false;
    if (plan.features.maxArticlesPerMonth === -1)
        return true; // Unlimited
    return currentCount < plan.features.maxArticlesPerMonth;
}
function getUpgradeMessage(currentPlan, targetFeature) {
    switch (currentPlan) {
        case 'free':
            return `Upgrade to Starter plan to access ${targetFeature}`;
        case 'starter':
            return `Upgrade to Pro plan to access ${targetFeature}`;
        default:
            return `Upgrade required to access ${targetFeature}`;
    }
}
