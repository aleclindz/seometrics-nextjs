"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasQuota = hasQuota;
exports.incrementUsage = incrementUsage;
exports.getUserUsage = getUserUsage;
exports.quotaGuard = quotaGuard;
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
/**
 * Check if user has quota for a specific resource
 */
async function hasQuota(userToken, resourceType, siteId) {
    try {
        // Get user plan
        const { data: userPlan, error: planError } = await supabase
            .from('user_plans')
            .select('*')
            .eq('user_token', userToken)
            .single();
        if (planError || !userPlan) {
            throw new Error('User plan not found');
        }
        // Check if subscription is active
        if (userPlan.status !== 'active') {
            return {
                allowed: false,
                currentUsage: 0,
                limit: 0,
                remaining: 0,
                resetDate: getNextResetDate(),
                tier: userPlan.tier,
            };
        }
        // Get current usage for this month
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
        const { data: usage, error: usageError } = await supabase
            .from('usage_tracking')
            .select('count')
            .eq('user_token', userToken)
            .eq('resource_type', resourceType)
            .eq('month_year', currentMonth);
        if (usageError) {
            throw new Error('Error fetching usage data');
        }
        // Calculate current usage
        const currentUsage = usage?.reduce((sum, item) => sum + item.count, 0) || 0;
        // Get limit based on tier and resource type
        const limit = getResourceLimit(userPlan, resourceType);
        // Check if usage is within limit (-1 means unlimited)
        const allowed = limit === -1 || currentUsage < limit;
        const remaining = limit === -1 ? Infinity : Math.max(0, limit - currentUsage);
        return {
            allowed,
            currentUsage,
            limit,
            remaining,
            resetDate: getNextResetDate(),
            tier: userPlan.tier,
        };
    }
    catch (error) {
        console.error('Error checking quota:', error);
        throw error;
    }
}
/**
 * Increment usage for a specific resource
 */
async function incrementUsage(userToken, resourceType, siteId, amount = 1) {
    try {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
        // Upsert usage tracking record
        const { error } = await supabase
            .from('usage_tracking')
            .upsert({
            user_token: userToken,
            site_id: siteId || null,
            resource_type: resourceType,
            month_year: currentMonth,
            count: amount,
        }, {
            onConflict: 'user_token,site_id,resource_type,month_year',
        });
        if (error) {
            // If upsert fails, get the existing record and update it
            const { data: existingRecord, error: fetchError } = await supabase
                .from('usage_tracking')
                .select('count')
                .eq('user_token', userToken)
                .eq('resource_type', resourceType)
                .eq('month_year', currentMonth)
                .single();
            if (fetchError) {
                throw fetchError;
            }
            const { error: updateError } = await supabase
                .from('usage_tracking')
                .update({
                count: existingRecord.count + amount,
            })
                .eq('user_token', userToken)
                .eq('resource_type', resourceType)
                .eq('month_year', currentMonth);
            if (updateError) {
                throw updateError;
            }
        }
    }
    catch (error) {
        console.error('Error incrementing usage:', error);
        throw error;
    }
}
/**
 * Get usage statistics for a user
 */
async function getUserUsage(userToken) {
    try {
        const currentMonth = new Date().toISOString().slice(0, 7);
        // Get user plan
        const { data: userPlan, error: planError } = await supabase
            .from('user_plans')
            .select('*')
            .eq('user_token', userToken)
            .single();
        if (planError || !userPlan) {
            throw new Error('User plan not found');
        }
        // Get current usage
        const { data: usage, error: usageError } = await supabase
            .from('usage_tracking')
            .select('resource_type, count')
            .eq('user_token', userToken)
            .eq('month_year', currentMonth);
        if (usageError) {
            throw new Error('Error fetching usage data');
        }
        // Calculate usage by resource type
        const usageByType = usage?.reduce((acc, item) => {
            acc[item.resource_type] = (acc[item.resource_type] || 0) + item.count;
            return acc;
        }, {}) || {};
        return {
            currentMonth,
            sites: usageByType.site || 0,
            articles: usageByType.article || 0,
            plan: userPlan,
        };
    }
    catch (error) {
        console.error('Error getting user usage:', error);
        throw error;
    }
}
/**
 * Get resource limit based on user plan and resource type
 */
function getResourceLimit(userPlan, resourceType) {
    if (resourceType === 'article') {
        return userPlan.posts_allowed;
    }
    else if (resourceType === 'site') {
        return userPlan.sites_allowed;
    }
    return 0;
}
/**
 * Get next reset date (first day of next month)
 */
function getNextResetDate() {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString();
}
/**
 * Quota guard middleware for API routes
 */
async function quotaGuard(userToken, resourceType, siteId) {
    const quotaResult = await hasQuota(userToken, resourceType, siteId);
    if (!quotaResult.allowed) {
        throw new Error(`Quota exceeded for ${resourceType}. Current usage: ${quotaResult.currentUsage}/${quotaResult.limit}`);
    }
    return quotaResult;
}
