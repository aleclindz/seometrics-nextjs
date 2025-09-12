"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedAgentMemory = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const agent_memory_1 = require("./agent-memory");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
class EnhancedAgentMemory extends agent_memory_1.AgentMemory {
    agentLearnings = new Map();
    workflowMemory = new Map();
    /**
     * Record agent action results for learning
     */
    async recordAgentLearning(websiteToken, userToken, actionType, outcome, details) {
        try {
            // Update existing memory system  
            await this.recordAction(actionType, { outcome, ...details }, outcome, {
                successMetrics: details.effectiveness_score ? { effectiveness_score: details.effectiveness_score } : undefined,
                errorDetails: outcome === 'failure' ? details.blockers_encountered?.join(', ') : undefined,
                executionTimeMs: details.execution_time_minutes ? details.execution_time_minutes * 60 * 1000 : undefined,
                metadata: details
            });
            // Enhanced learning for agent system
            await this.updateAgentLearnings(websiteToken, userToken, actionType, outcome, details);
            // Update workflow memory if applicable
            if (details.workflow_id) {
                await this.updateWorkflowMemory(details.workflow_id, outcome, details);
            }
            console.log(`[ENHANCED MEMORY] Recorded learning for ${actionType}: ${outcome}`);
        }
        catch (error) {
            console.error('[ENHANCED MEMORY] Error recording agent learning:', error);
        }
    }
    /**
     * Get personalized recommendations based on learning history
     */
    async getPersonalizedRecommendations(websiteToken, userToken, context) {
        try {
            const learnings = await this.getAgentLearnings(websiteToken, userToken);
            return {
                recommended_actions: this.getRecommendedActions(learnings, context),
                avoid_actions: learnings.failed_approaches.slice(0, 5),
                optimal_settings: this.getOptimalSettings(learnings, context),
                workflow_suggestions: this.getWorkflowSuggestions(learnings, context),
                risk_assessment: this.assessRiskTolerance(learnings, context)
            };
        }
        catch (error) {
            console.error('[ENHANCED MEMORY] Error getting recommendations:', error);
            return this.getDefaultRecommendations();
        }
    }
    /**
     * Learn from user interactions with the agent system
     */
    async learnFromUserInteraction(userToken, interaction) {
        try {
            // Store interaction patterns
            await supabase
                .from('agent_events')
                .insert({
                user_token: userToken,
                event_type: 'user_interaction',
                entity_type: 'learning',
                entity_id: `interaction_${Date.now()}`,
                event_data: {
                    interaction_type: interaction.type,
                    content: interaction.content,
                    sentiment: interaction.user_sentiment,
                    follow_up_actions: interaction.follow_up_actions
                },
                triggered_by: 'user'
            });
            // Update user preference learning
            await this.updateUserPreferences(userToken, interaction);
            console.log(`[ENHANCED MEMORY] Learned from user interaction: ${interaction.type}`);
        }
        catch (error) {
            console.error('[ENHANCED MEMORY] Error learning from interaction:', error);
        }
    }
    /**
     * Get workflow effectiveness insights
     */
    async getWorkflowInsights(workflowId) {
        try {
            const memory = this.workflowMemory.get(workflowId);
            if (!memory)
                return null;
            const improvement_suggestions = this.generateWorkflowImprovements(memory);
            return {
                effectiveness: memory.success_rate,
                completion_rate: memory.success_rate, // Simplified for now
                average_duration: memory.average_completion_time,
                common_issues: memory.common_blockers,
                user_satisfaction: memory.user_satisfaction,
                improvement_suggestions
            };
        }
        catch (error) {
            console.error('[ENHANCED MEMORY] Error getting workflow insights:', error);
            return null;
        }
    }
    /**
     * Private helper methods
     */
    async updateAgentLearnings(websiteToken, userToken, actionType, outcome, details) {
        let learnings = this.agentLearnings.get(websiteToken) || {
            successful_workflows: [],
            failed_approaches: [],
            user_preferences: {
                preferred_environments: [],
                risk_tolerance: 'medium',
                automation_level: 'supervised'
            },
            site_specific_learnings: {
                effective_strategies: [],
                avoided_actions: [],
                optimal_timing: {}
            }
        };
        // Update based on outcome
        if (outcome === 'success') {
            learnings.site_specific_learnings.effective_strategies.push(actionType);
            if (details.workflow_id) {
                learnings.successful_workflows.push(details.workflow_id);
            }
        }
        else if (outcome === 'failure') {
            learnings.failed_approaches.push(actionType);
            learnings.site_specific_learnings.avoided_actions.push(actionType);
        }
        // Update user preferences based on behavior
        if (details.user_feedback === 'positive' && details.effectiveness_score >= 8) {
            // User likes this approach
            if (!learnings.site_specific_learnings.effective_strategies.includes(actionType)) {
                learnings.site_specific_learnings.effective_strategies.push(actionType);
            }
        }
        // Remove duplicates and limit arrays
        learnings.successful_workflows = Array.from(new Set(learnings.successful_workflows)).slice(0, 10);
        learnings.failed_approaches = Array.from(new Set(learnings.failed_approaches)).slice(0, 10);
        learnings.site_specific_learnings.effective_strategies =
            Array.from(new Set(learnings.site_specific_learnings.effective_strategies)).slice(0, 15);
        this.agentLearnings.set(websiteToken, learnings);
        // Persist to database
        await this.persistLearnings(websiteToken, userToken, learnings);
    }
    async updateWorkflowMemory(workflowId, outcome, details) {
        let memory = this.workflowMemory.get(workflowId) || {
            workflow_id: workflowId,
            success_rate: 0.5,
            average_completion_time: 60,
            common_blockers: [],
            user_satisfaction: 5,
            last_executed: new Date().toISOString()
        };
        // Update success rate (simple moving average)
        const wasSuccess = outcome === 'success' ? 1 : 0;
        memory.success_rate = (memory.success_rate * 0.8) + (wasSuccess * 0.2);
        // Update completion time
        if (details.execution_time_minutes) {
            memory.average_completion_time =
                (memory.average_completion_time * 0.7) + (details.execution_time_minutes * 0.3);
        }
        // Add blockers
        if (details.blockers_encountered) {
            memory.common_blockers.push(...details.blockers_encountered);
            memory.common_blockers = Array.from(new Set(memory.common_blockers)).slice(0, 10);
        }
        // Update satisfaction
        if (details.user_feedback === 'positive') {
            memory.user_satisfaction = Math.min(10, memory.user_satisfaction + 0.5);
        }
        else if (details.user_feedback === 'negative') {
            memory.user_satisfaction = Math.max(1, memory.user_satisfaction - 0.5);
        }
        memory.last_executed = new Date().toISOString();
        this.workflowMemory.set(workflowId, memory);
    }
    getRecommendedActions(learnings, context) {
        const recommended = [...learnings.site_specific_learnings.effective_strategies];
        // Add context-based recommendations
        if (context.site_health === 'poor') {
            recommended.unshift('technical_seo_crawl', 'technical_seo_fix');
        }
        if (context.user_experience_level === 'beginner') {
            recommended.push('new_site_seo_setup');
        }
        return Array.from(new Set(recommended)).slice(0, 5);
    }
    getOptimalSettings(learnings, context) {
        const settings = {
            environment: 'DRY_RUN', // Safe default
            requiresApproval: true,
            maxPages: 10
        };
        // Adjust based on user preferences and experience
        if (learnings.user_preferences.risk_tolerance === 'high' &&
            context.user_experience_level === 'expert') {
            settings.environment = 'PRODUCTION';
            settings.requiresApproval = false;
            settings.maxPages = 50;
        }
        if (learnings.user_preferences.automation_level === 'autonomous') {
            settings.requiresApproval = false;
        }
        return settings;
    }
    getWorkflowSuggestions(learnings, context) {
        // Return successful workflows, prioritized by context
        return learnings.successful_workflows.slice(0, 3);
    }
    assessRiskTolerance(learnings, context) {
        const tolerance = learnings.user_preferences.risk_tolerance;
        const experience = context.user_experience_level;
        if (tolerance === 'high' && experience === 'expert') {
            return 'You have high risk tolerance and experience - automation can be more aggressive';
        }
        else if (tolerance === 'low' || experience === 'beginner') {
            return 'Recommend conservative approach with manual approvals and dry-run testing';
        }
        else {
            return 'Balanced approach with supervised automation and staged rollouts';
        }
    }
    async updateUserPreferences(userToken, interaction) {
        // Track user behavior patterns to infer preferences
        if (interaction.type === 'action_approved' && interaction.user_sentiment === 'positive') {
            // User approves actions quickly -> higher risk tolerance
        }
        else if (interaction.type === 'action_declined') {
            // User declines actions -> lower risk tolerance
        }
        // This would update the user preference model
    }
    async persistLearnings(websiteToken, userToken, learnings) {
        try {
            await supabase
                .from('agent_events')
                .insert({
                user_token: userToken,
                event_type: 'learning_updated',
                entity_type: 'website',
                entity_id: websiteToken,
                event_data: learnings,
                triggered_by: 'system'
            });
        }
        catch (error) {
            console.error('[ENHANCED MEMORY] Error persisting learnings:', error);
        }
    }
    async getAgentLearnings(websiteToken, userToken) {
        // Try to load from memory cache first
        let learnings = this.agentLearnings.get(websiteToken);
        if (!learnings) {
            // Load from database
            try {
                const { data: events } = await supabase
                    .from('agent_events')
                    .select('event_data')
                    .eq('user_token', userToken)
                    .eq('entity_id', websiteToken)
                    .eq('event_type', 'learning_updated')
                    .order('created_at', { ascending: false })
                    .limit(1);
                if (events && events.length > 0) {
                    learnings = events[0].event_data;
                }
            }
            catch (error) {
                console.error('[ENHANCED MEMORY] Error loading learnings:', error);
            }
        }
        return learnings || {
            successful_workflows: [],
            failed_approaches: [],
            user_preferences: {
                preferred_environments: ['DRY_RUN'],
                risk_tolerance: 'medium',
                automation_level: 'supervised'
            },
            site_specific_learnings: {
                effective_strategies: [],
                avoided_actions: [],
                optimal_timing: {}
            }
        };
    }
    generateWorkflowImprovements(memory) {
        const suggestions = [];
        if (memory.success_rate < 0.7) {
            suggestions.push('Consider adding dependency checks before execution');
        }
        if (memory.average_completion_time > 120) {
            suggestions.push('Break down workflow into smaller, parallel actions');
        }
        if (memory.common_blockers.length > 3) {
            suggestions.push('Add pre-flight checks for common blocking issues');
        }
        if (memory.user_satisfaction < 6) {
            suggestions.push('Improve user communication and progress updates');
        }
        return suggestions;
    }
    getDefaultRecommendations() {
        return {
            recommended_actions: ['technical_seo_crawl', 'seoagent_installation'],
            avoid_actions: [],
            optimal_settings: { environment: 'DRY_RUN', requiresApproval: true },
            workflow_suggestions: ['new_site_seo_setup'],
            risk_assessment: 'Using conservative defaults until more data is available'
        };
    }
}
exports.EnhancedAgentMemory = EnhancedAgentMemory;
