"use strict";
/**
 * Agent Memory System
 * Manages persistent context and learning for website-specific AI agents
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentMemory = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
class AgentMemory {
    websiteToken;
    userToken;
    constructor(websiteToken, userToken) {
        this.websiteToken = websiteToken;
        this.userToken = userToken;
    }
    /**
     * Store memory data for the website agent
     */
    async storeMemory(type, key, data, options) {
        try {
            const expiresAt = options?.expiresIn
                ? new Date(Date.now() + options.expiresIn).toISOString()
                : null;
            const { error } = await supabase
                .from('agent_memory')
                .upsert({
                website_token: this.websiteToken,
                user_token: this.userToken,
                memory_type: type,
                memory_key: key,
                memory_data: data,
                confidence_score: options?.confidenceScore || 0.8,
                expires_at: expiresAt,
                metadata: options?.metadata || {},
                last_updated: new Date().toISOString()
            }, {
                onConflict: 'website_token,user_token,memory_type,memory_key'
            });
            if (error) {
                console.error('[AGENT MEMORY] Error storing memory:', error);
                return false;
            }
            return true;
        }
        catch (error) {
            console.error('[AGENT MEMORY] Unexpected error storing memory:', error);
            return false;
        }
    }
    /**
     * Retrieve specific memory entry
     */
    async getMemory(type, key) {
        try {
            const { data, error } = await supabase
                .from('agent_memory')
                .select('*')
                .eq('website_token', this.websiteToken)
                .eq('user_token', this.userToken)
                .eq('memory_type', type)
                .eq('memory_key', key)
                .maybeSingle();
            if (error) {
                console.error('[AGENT MEMORY] Error fetching memory:', error);
                return null;
            }
            return data;
        }
        catch (error) {
            console.error('[AGENT MEMORY] Unexpected error fetching memory:', error);
            return null;
        }
    }
    /**
     * Get all memories of a specific type
     */
    async getMemoriesByType(type) {
        try {
            const { data, error } = await supabase
                .from('agent_memory')
                .select('*')
                .eq('website_token', this.websiteToken)
                .eq('user_token', this.userToken)
                .eq('memory_type', type)
                .order('last_updated', { ascending: false });
            if (error) {
                console.error('[AGENT MEMORY] Error fetching memories by type:', error);
                return [];
            }
            return data || [];
        }
        catch (error) {
            console.error('[AGENT MEMORY] Unexpected error fetching memories:', error);
            return [];
        }
    }
    /**
     * Get comprehensive website context for the agent
     */
    async getWebsiteContext() {
        try {
            const contextMemories = await this.getMemoriesByType('context');
            const patternMemories = await this.getMemoriesByType('patterns');
            const preferenceMemories = await this.getMemoriesByType('preferences');
            // Merge all context data
            const context = {};
            [...contextMemories, ...patternMemories, ...preferenceMemories].forEach(memory => {
                Object.assign(context, memory.memory_data);
            });
            return context;
        }
        catch (error) {
            console.error('[AGENT MEMORY] Error building website context:', error);
            return {};
        }
    }
    /**
     * Record action execution and outcome for learning
     */
    async recordAction(actionType, actionContext, outcome, options) {
        try {
            const { error } = await supabase
                .from('agent_learning')
                .insert({
                website_token: this.websiteToken,
                user_token: this.userToken,
                action_type: actionType,
                action_context: actionContext,
                outcome,
                success_metrics: options?.successMetrics,
                error_details: options?.errorDetails,
                execution_time_ms: options?.executionTimeMs,
                metadata: options?.metadata || {}
            });
            if (error) {
                console.error('[AGENT LEARNING] Error recording action:', error);
                return false;
            }
            // Update patterns in memory based on the outcome
            if (outcome === 'success') {
                await this.updateSuccessPatterns(actionType, actionContext, options?.successMetrics);
            }
            else if (outcome === 'failure') {
                await this.updateFailurePatterns(actionType, actionContext, options?.errorDetails);
            }
            return true;
        }
        catch (error) {
            console.error('[AGENT LEARNING] Unexpected error recording action:', error);
            return false;
        }
    }
    /**
     * Get success rate for a specific action type
     */
    async getActionSuccessRate(actionType, contextFilter) {
        try {
            let query = supabase
                .from('agent_learning')
                .select('outcome')
                .eq('website_token', this.websiteToken)
                .eq('user_token', this.userToken)
                .eq('action_type', actionType);
            const { data, error } = await query;
            if (error || !data) {
                console.error('[AGENT LEARNING] Error fetching success rate:', error);
                return 0.5; // Default neutral success rate
            }
            if (data.length === 0)
                return 0.5;
            const successCount = data.filter(entry => entry.outcome === 'success').length;
            return successCount / data.length;
        }
        catch (error) {
            console.error('[AGENT LEARNING] Unexpected error calculating success rate:', error);
            return 0.5;
        }
    }
    /**
     * Update success patterns in memory
     */
    async updateSuccessPatterns(actionType, context, metrics) {
        try {
            const existingPatterns = await this.getMemory('patterns', `${actionType}_success`);
            const currentPatterns = existingPatterns?.memory_data || { successful_contexts: [], metrics: [] };
            // Add new successful context (limit to last 10)
            currentPatterns.successful_contexts.unshift(context);
            currentPatterns.successful_contexts = currentPatterns.successful_contexts.slice(0, 10);
            if (metrics) {
                currentPatterns.metrics.unshift(metrics);
                currentPatterns.metrics = currentPatterns.metrics.slice(0, 10);
            }
            await this.storeMemory('patterns', `${actionType}_success`, currentPatterns, {
                confidenceScore: 0.9
            });
        }
        catch (error) {
            console.error('[AGENT MEMORY] Error updating success patterns:', error);
        }
    }
    /**
     * Update failure patterns in memory
     */
    async updateFailurePatterns(actionType, context, errorDetails) {
        try {
            const existingPatterns = await this.getMemory('patterns', `${actionType}_failure`);
            const currentPatterns = existingPatterns?.memory_data || { failed_contexts: [], errors: [] };
            // Add new failed context (limit to last 10)
            currentPatterns.failed_contexts.unshift(context);
            currentPatterns.failed_contexts = currentPatterns.failed_contexts.slice(0, 10);
            if (errorDetails) {
                currentPatterns.errors.unshift(errorDetails);
                currentPatterns.errors = currentPatterns.errors.slice(0, 10);
            }
            await this.storeMemory('patterns', `${actionType}_failure`, currentPatterns, {
                confidenceScore: 0.9
            });
        }
        catch (error) {
            console.error('[AGENT MEMORY] Error updating failure patterns:', error);
        }
    }
    /**
     * Get recommendations based on learned patterns
     */
    async getRecommendations(actionType) {
        try {
            const successPatterns = await this.getMemory('patterns', `${actionType}_success`);
            const failurePatterns = await this.getMemory('patterns', `${actionType}_failure`);
            const successRate = await this.getActionSuccessRate(actionType);
            const recommendations = [];
            if (successRate < 0.3) {
                recommendations.push(`Consider avoiding ${actionType} - low success rate (${(successRate * 100).toFixed(1)}%)`);
            }
            else if (successRate > 0.8) {
                recommendations.push(`${actionType} has high success rate (${(successRate * 100).toFixed(1)}%) - recommended approach`);
            }
            // Add pattern-based recommendations
            if (successPatterns?.memory_data.successful_contexts?.length > 0) {
                recommendations.push(`Previous successful ${actionType} contexts available in memory`);
            }
            if (failurePatterns?.memory_data.failed_contexts?.length > 0) {
                recommendations.push(`Avoid patterns that previously failed for ${actionType}`);
            }
            return recommendations;
        }
        catch (error) {
            console.error('[AGENT MEMORY] Error generating recommendations:', error);
            return [];
        }
    }
    /**
     * Clean up old or expired memories
     */
    async cleanup() {
        try {
            // Remove expired memories
            const { count: expiredCount, error: expiredError } = await supabase
                .from('agent_memory')
                .delete()
                .eq('website_token', this.websiteToken)
                .lt('expires_at', new Date().toISOString());
            if (expiredError) {
                console.error('[AGENT MEMORY] Error cleaning expired memories:', expiredError);
            }
            // Keep only last 100 learning entries per website
            const { data: oldLearning, error: oldError } = await supabase
                .from('agent_learning')
                .select('id')
                .eq('website_token', this.websiteToken)
                .order('created_at', { ascending: false })
                .range(100, 1000);
            if (!oldError && oldLearning && oldLearning.length > 0) {
                const { error: deleteError } = await supabase
                    .from('agent_learning')
                    .delete()
                    .in('id', oldLearning.map(entry => entry.id));
                if (deleteError) {
                    console.error('[AGENT MEMORY] Error cleaning old learning entries:', deleteError);
                }
            }
            return expiredCount || 0;
        }
        catch (error) {
            console.error('[AGENT MEMORY] Unexpected error during cleanup:', error);
            return 0;
        }
    }
}
exports.AgentMemory = AgentMemory;
