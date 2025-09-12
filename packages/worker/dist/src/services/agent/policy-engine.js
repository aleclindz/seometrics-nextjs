"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyEngine = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
class PolicyEngine {
    // Default policies by action type
    static DEFAULT_POLICIES = {
        'technical_seo_crawl': {
            environment: 'PRODUCTION',
            maxPages: 100,
            timeoutMs: 300000,
            respectRobots: true,
            requiresApproval: false,
            blastRadius: {
                scope: 'site_wide',
                maxAffectedPages: 0, // Read-only
                riskLevel: 'low',
                rollbackRequired: false
            }
        },
        'content_generation': {
            environment: 'DRY_RUN',
            maxPages: 1,
            requiresApproval: false,
            blastRadius: {
                scope: 'single_page',
                maxAffectedPages: 1,
                riskLevel: 'low',
                rollbackRequired: true
            }
        },
        'technical_seo_fix': {
            environment: 'DRY_RUN',
            maxPages: 20,
            maxPatches: 50,
            timeoutMs: 600000,
            requiresApproval: true,
            blastRadius: {
                scope: 'site_wide',
                maxAffectedPages: 50,
                riskLevel: 'medium',
                rollbackRequired: true
            }
        },
        'cms_publishing': {
            environment: 'DRY_RUN',
            maxPages: 1,
            requiresApproval: true,
            blastRadius: {
                scope: 'single_page',
                maxAffectedPages: 1,
                riskLevel: 'medium',
                rollbackRequired: true
            }
        },
        'schema_injection': {
            environment: 'DRY_RUN',
            maxPages: 10,
            maxPatches: 20,
            requiresApproval: true,
            blastRadius: {
                scope: 'section',
                maxAffectedPages: 20,
                riskLevel: 'high',
                rollbackRequired: true
            }
        }
    };
    // Site-specific policy overrides (loaded from database)
    static SITE_POLICIES = {};
    /**
     * Validate if an action can be executed under the given policy
     */
    static async validatePolicy(context, requestedPolicy) {
        try {
            // Get base policy for action type
            const basePolicy = this.getBasePolicyForAction(context.actionType);
            // Merge with user's site-specific policies
            const sitePolicy = await this.getSitePolicyOverrides(context.userToken, context.siteUrl);
            // Create final policy
            const finalPolicy = {
                ...basePolicy,
                ...sitePolicy,
                ...requestedPolicy
            };
            // Validate against safety constraints
            const validation = await this.performSafetyValidation(context, finalPolicy);
            if (!validation.allowed) {
                return validation;
            }
            // Check if approval is required
            const approvalRequired = await this.checkApprovalRequirements(context, finalPolicy);
            // Calculate risk level
            const estimatedRisk = this.calculateRiskLevel(context, finalPolicy);
            return {
                allowed: true,
                adjustedPolicy: finalPolicy,
                approvalRequired,
                estimatedRisk
            };
        }
        catch (error) {
            console.error('[POLICY ENGINE] Validation error:', error);
            return {
                allowed: false,
                reason: 'Policy validation failed',
                approvalRequired: true,
                estimatedRisk: 'high'
            };
        }
    }
    /**
     * Check if user has appropriate permissions for the action
     */
    static async checkUserPermissions(userToken, siteUrl, actionType) {
        try {
            // Check if user owns the website
            const { data: website, error } = await supabase
                .from('websites')
                .select('id, is_managed')
                .eq('user_token', userToken)
                .ilike('domain', `%${siteUrl.replace(/^https?:\/\//, '')}%`)
                .single();
            if (error || !website) {
                console.log('[POLICY ENGINE] Website not found or not owned by user');
                return false;
            }
            // Check if website is managed (for active SEO operations)
            if (['technical_seo_fix', 'cms_publishing', 'schema_injection'].includes(actionType)) {
                if (!website.is_managed) {
                    console.log('[POLICY ENGINE] Website not managed - high-risk actions not allowed');
                    return false;
                }
            }
            // Check subscription limits
            const hasValidSubscription = await this.checkSubscriptionLimits(userToken, actionType);
            if (!hasValidSubscription) {
                console.log('[POLICY ENGINE] Subscription limits exceeded');
                return false;
            }
            return true;
        }
        catch (error) {
            console.error('[POLICY ENGINE] Permission check error:', error);
            return false;
        }
    }
    /**
     * Enforce runtime limits during execution
     */
    static enforceRuntimeLimits(policy, currentStats) {
        // Check page limit
        if (policy.maxPages && currentStats.pagesProcessed >= policy.maxPages) {
            return {
                withinLimits: false,
                shouldStop: true,
                reason: `Page limit reached: ${currentStats.pagesProcessed}/${policy.maxPages}`
            };
        }
        // Check patch limit
        if (policy.maxPatches && currentStats.patchesApplied >= policy.maxPatches) {
            return {
                withinLimits: false,
                shouldStop: true,
                reason: `Patch limit reached: ${currentStats.patchesApplied}/${policy.maxPatches}`
            };
        }
        // Check timeout
        if (policy.timeoutMs && currentStats.executionTimeMs >= policy.timeoutMs) {
            return {
                withinLimits: false,
                shouldStop: true,
                reason: `Timeout reached: ${currentStats.executionTimeMs}ms >= ${policy.timeoutMs}ms`
            };
        }
        return { withinLimits: true, shouldStop: false };
    }
    /**
     * Get safe default policy for new sites
     */
    static getNewSitePolicy() {
        return {
            environment: 'DRY_RUN',
            maxPages: 5,
            maxPatches: 10,
            timeoutMs: 60000, // 1 minute
            requiresApproval: true,
            respectRobots: true,
            blastRadius: {
                scope: 'single_page',
                maxAffectedPages: 5,
                riskLevel: 'low',
                rollbackRequired: true
            }
        };
    }
    /**
     * Generate approval request for high-risk actions
     */
    static async createApprovalRequest(context, policy) {
        try {
            const approvalData = {
                action_id: context.actionId,
                user_token: context.userToken,
                site_url: context.siteUrl,
                action_type: context.actionType,
                policy_summary: {
                    environment: policy.environment,
                    blast_radius: policy.blastRadius,
                    max_pages: policy.maxPages,
                    max_patches: policy.maxPatches
                },
                risk_assessment: {
                    level: policy.blastRadius.riskLevel,
                    affected_pages: policy.blastRadius.maxAffectedPages,
                    rollback_available: policy.blastRadius.rollbackRequired
                },
                requested_at: new Date().toISOString(),
                status: 'pending'
            };
            // In a real implementation, this would create an approval workflow
            // For now, we'll log it and return a placeholder
            console.log('[POLICY ENGINE] Approval request created:', approvalData);
            return `approval_${context.actionId}_${Date.now()}`;
        }
        catch (error) {
            console.error('[POLICY ENGINE] Approval request error:', error);
            throw new Error('Failed to create approval request');
        }
    }
    // Private helper methods
    static getBasePolicyForAction(actionType) {
        const defaultPolicy = this.DEFAULT_POLICIES[actionType] || this.DEFAULT_POLICIES['content_generation'];
        return {
            environment: 'DRY_RUN',
            maxPages: 10,
            maxPatches: 20,
            timeoutMs: 300000,
            requiresApproval: false,
            respectRobots: true,
            blastRadius: {
                scope: 'single_page',
                maxAffectedPages: 1,
                riskLevel: 'low',
                rollbackRequired: true
            },
            ...defaultPolicy
        };
    }
    static async getSitePolicyOverrides(userToken, siteUrl) {
        try {
            // Check if user has site-specific policy preferences
            const { data: website } = await supabase
                .from('websites')
                .select('id, is_managed')
                .eq('user_token', userToken)
                .ilike('domain', `%${siteUrl.replace(/^https?:\/\//, '')}%`)
                .single();
            if (!website) {
                return {};
            }
            // If site is managed and user has been successful, allow production
            if (website.is_managed) {
                return {
                    environment: 'PRODUCTION',
                    requiresApproval: false,
                    maxPages: 50,
                    maxPatches: 100
                };
            }
            return {};
        }
        catch (error) {
            console.error('[POLICY ENGINE] Site policy error:', error);
            return {};
        }
    }
    static async performSafetyValidation(context, policy) {
        // Check user permissions
        const hasPermission = await this.checkUserPermissions(context.userToken, context.siteUrl, context.actionType);
        if (!hasPermission) {
            return {
                allowed: false,
                reason: 'Insufficient permissions for this action',
                approvalRequired: true,
                estimatedRisk: 'high'
            };
        }
        // Validate against domain restrictions
        if (policy.allowedDomains && policy.allowedDomains.length > 0) {
            const domain = context.siteUrl.replace(/^https?:\/\//, '');
            const isAllowed = policy.allowedDomains.some(allowed => domain.includes(allowed));
            if (!isAllowed) {
                return {
                    allowed: false,
                    reason: 'Domain not in allowed list',
                    approvalRequired: true,
                    estimatedRisk: 'high'
                };
            }
        }
        // Check if action type is compatible with environment
        if (policy.environment === 'PRODUCTION' && this.isHighRiskAction(context.actionType)) {
            if (!policy.requiresApproval) {
                return {
                    allowed: false,
                    reason: 'High-risk actions in production require approval',
                    approvalRequired: true,
                    estimatedRisk: 'high'
                };
            }
        }
        return {
            allowed: true,
            approvalRequired: false,
            estimatedRisk: 'low'
        };
    }
    static async checkApprovalRequirements(context, policy) {
        // Always require approval for high-risk actions in production
        if (policy.environment === 'PRODUCTION' && this.isHighRiskAction(context.actionType)) {
            return true;
        }
        // Require approval for large-scale changes
        if (policy.blastRadius.maxAffectedPages > 20) {
            return true;
        }
        // Require approval for high-risk changes
        if (policy.blastRadius.riskLevel === 'high') {
            return true;
        }
        // Check explicit policy requirement
        return policy.requiresApproval || false;
    }
    static calculateRiskLevel(context, policy) {
        let riskScore = 0;
        // Base risk by action type
        if (this.isHighRiskAction(context.actionType))
            riskScore += 3;
        else if (this.isMediumRiskAction(context.actionType))
            riskScore += 2;
        else
            riskScore += 1;
        // Environment risk
        if (policy.environment === 'PRODUCTION')
            riskScore += 2;
        else if (policy.environment === 'STAGING')
            riskScore += 1;
        // Blast radius risk
        if (policy.blastRadius.maxAffectedPages > 50)
            riskScore += 3;
        else if (policy.blastRadius.maxAffectedPages > 10)
            riskScore += 2;
        else
            riskScore += 1;
        // Rollback capability reduces risk
        if (policy.blastRadius.rollbackRequired)
            riskScore -= 1;
        if (riskScore >= 7)
            return 'high';
        if (riskScore >= 4)
            return 'medium';
        return 'low';
    }
    static async checkSubscriptionLimits(userToken, actionType) {
        try {
            // Check user's plan limits
            const { data: plan } = await supabase
                .from('user_plans')
                .select('tier, posts_allowed, sites_allowed')
                .eq('user_token', userToken)
                .single();
            if (!plan) {
                return false; // No plan found
            }
            // Check if action type has usage limits
            if (actionType === 'content_generation') {
                const { data: usage } = await supabase
                    .from('usage_tracking')
                    .select('count')
                    .eq('user_token', userToken)
                    .eq('resource_type', 'article')
                    .eq('month_year', new Date().toISOString().slice(0, 7))
                    .single();
                const currentUsage = usage?.count || 0;
                return currentUsage < plan.posts_allowed;
            }
            return true; // No specific limits for this action type
        }
        catch (error) {
            console.error('[POLICY ENGINE] Subscription check error:', error);
            return false;
        }
    }
    static isHighRiskAction(actionType) {
        return [
            'schema_injection',
            'technical_seo_fix',
            'cms_publishing',
            'robots_modification',
            'canonical_changes'
        ].includes(actionType);
    }
    static isMediumRiskAction(actionType) {
        return [
            'content_optimization',
            'meta_tag_updates',
            'alt_text_updates',
            'sitemap_generation'
        ].includes(actionType);
    }
}
exports.PolicyEngine = PolicyEngine;
