'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useFeatures = useFeatures;
const react_1 = require("react");
const auth_1 = require("@/contexts/auth");
function useFeatures() {
    const { user } = (0, auth_1.useAuth)();
    const [userPlan, setUserPlan] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        if (user?.token) {
            fetchUserPlan();
        }
        else {
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
        }
        catch (error) {
            console.error('Error fetching user plan:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const getFeatureAccess = () => {
        if (!userPlan || loading) {
            // Don't show any restrictions while loading to prevent badge flash
            return {
                altTags: true,
                metaTags: true,
                articleGeneration: true, // Allow while loading to prevent badge flash
                keywordsTool: true, // Allow while loading to prevent badge flash
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
    const hasFeature = (feature) => {
        return Boolean(features[feature]);
    };
    const canUpgrade = () => {
        return userPlan?.tier === 'free' || userPlan?.tier === 'starter';
    };
    const getUpgradeMessage = (feature) => {
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
