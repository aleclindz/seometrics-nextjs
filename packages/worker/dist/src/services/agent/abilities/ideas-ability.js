"use strict";
/**
 * Ideas Ability
 *
 * Handles all ideas and actions management functions including:
 * - Creating ideas
 * - Managing action plans
 * - Executing actions
 * - Tracking idea adoption
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdeasAbility = void 0;
const base_ability_1 = require("./base-ability");
class IdeasAbility extends base_ability_1.BaseAbility {
    getFunctionNames() {
        return [
            'create_idea',
            'adopt_idea',
            'run_action',
            'get_ideas',
            'update_idea',
            'delete_idea',
            'track_idea_progress'
        ];
    }
    async executeFunction(name, args) {
        switch (name) {
            case 'create_idea':
                return await this.createIdea(args);
            case 'adopt_idea':
                return await this.adoptIdea(args);
            case 'run_action':
                return await this.runAction(args);
            case 'get_ideas':
                return await this.getIdeas(args);
            case 'update_idea':
                return await this.updateIdea(args);
            case 'delete_idea':
                return await this.deleteIdea(args);
            case 'track_idea_progress':
                return await this.trackIdeaProgress(args);
            default:
                return this.error(`Unknown ideas function: ${name}`);
        }
    }
    /**
     * Create a new idea
     */
    async createIdea(args) {
        try {
            const response = await this.fetchAPI('/api/agent/ideas', {
                method: 'POST',
                body: JSON.stringify({
                    userToken: this.userToken,
                    siteUrl: args.site_url,
                    title: args.title,
                    hypothesis: args.hypothesis,
                    evidence: args.evidence ?? {},
                    iceScore: args.ice_score
                })
            });
            return response.success ?
                this.success(response) :
                this.error(response.error || 'Idea creation failed');
        }
        catch (error) {
            return this.error('Failed to create idea', error);
        }
    }
    /**
     * Adopt an idea and create action plan
     */
    async adoptIdea(args) {
        try {
            if (!this.userToken) {
                return this.error('Authentication required');
            }
            // Fetch the idea to get site URL
            const ideaLookup = await this.fetchAPI(`/api/agent/ideas?userToken=${this.userToken}&ideaId=${args.idea_id}`, { method: 'GET' });
            if (!ideaLookup?.success || !ideaLookup?.ideas?.length) {
                return this.error('Idea not found');
            }
            const idea = ideaLookup.ideas[0];
            const siteUrl = idea.site_url;
            const createdActions = [];
            for (const actionSpec of args.actions || []) {
                const actionResp = await this.fetchAPI('/api/agent/actions', {
                    method: 'POST',
                    body: JSON.stringify({
                        userToken: this.userToken,
                        siteUrl,
                        ideaId: args.idea_id,
                        actionType: actionSpec.action_type,
                        title: actionSpec.title,
                        description: actionSpec.description,
                        payload: actionSpec.payload || {},
                        policy: actionSpec.policy || { environment: 'DRY_RUN' },
                        priorityScore: actionSpec.priority_score || 50
                    })
                });
                if (actionResp?.success && actionResp.action) {
                    createdActions.push(actionResp.action);
                }
            }
            return this.success({
                idea_id: args.idea_id,
                actions_created: createdActions.length,
                actions: createdActions
            });
        }
        catch (error) {
            return this.error('Failed to adopt idea', error);
        }
    }
    /**
     * Execute an action
     */
    async runAction(args) {
        try {
            const response = await this.fetchAPI('/api/agent/actions', {
                method: 'POST',
                body: JSON.stringify({
                    ...args,
                    userToken: this.userToken
                })
            });
            return response.success ?
                this.success(response) :
                this.error(response.error || 'Action execution failed');
        }
        catch (error) {
            return this.error('Failed to run action', error);
        }
    }
    /**
     * Get ideas for a site
     */
    async getIdeas(args) {
        try {
            const params = new URLSearchParams();
            if (args.site_url)
                params.append('siteUrl', args.site_url);
            if (args.status)
                params.append('status', args.status);
            if (args.limit)
                params.append('limit', args.limit.toString());
            if (this.userToken)
                params.append('userToken', this.userToken);
            const response = await this.fetchAPI(`/api/agent/ideas?${params}`, {
                method: 'GET'
            });
            return response.success ?
                this.success(response) :
                this.error(response.error || 'Failed to get ideas');
        }
        catch (error) {
            return this.error('Failed to get ideas', error);
        }
    }
    /**
     * Update an existing idea
     */
    async updateIdea(args) {
        try {
            const { status, ...restUpdates } = args.updates || {};
            const body = {
                ideaId: args.idea_id,
                userToken: this.userToken,
            };
            if (typeof status !== 'undefined')
                body.status = status;
            if (Object.keys(restUpdates).length)
                body.updates = restUpdates;
            const response = await this.fetchAPI('/api/agent/ideas', {
                method: 'PUT',
                body: JSON.stringify(body)
            });
            return response.success ?
                this.success(response) :
                this.error(response.error || 'Idea update failed');
        }
        catch (error) {
            return this.error('Failed to update idea', error);
        }
    }
    /**
     * Delete an idea
     */
    async deleteIdea(args) {
        try {
            // Soft-delete by marking as rejected (no DELETE endpoint implemented)
            const response = await this.fetchAPI('/api/agent/ideas', {
                method: 'PUT',
                body: JSON.stringify({
                    ideaId: args.idea_id,
                    userToken: this.userToken,
                    status: 'rejected'
                })
            });
            return response.success ?
                this.success(response) :
                this.error(response.error || 'Idea deletion failed');
        }
        catch (error) {
            return this.error('Failed to delete idea', error);
        }
    }
    /**
     * Track progress of an idea implementation
     */
    async trackIdeaProgress(args) {
        try {
            if (!this.userToken) {
                return this.error('User token is required to track idea progress');
            }
            // Use actions endpoint to summarize progress for this idea
            const params = new URLSearchParams();
            params.append('userToken', this.userToken);
            params.append('ideaId', args.idea_id);
            const response = await this.fetchAPI(`/api/agent/actions?${params.toString()}`, { method: 'GET' });
            if (!response?.success) {
                return this.error(response?.error || 'Failed to track idea progress');
            }
            // Build a simple progress summary
            const actions = Array.isArray(response.actions) ? response.actions : [];
            const statusCounts = actions.reduce((acc, a) => {
                acc[a.status] = (acc[a.status] || 0) + 1;
                return acc;
            }, {});
            return this.success({
                actions,
                stats: response.stats || statusCounts
            });
        }
        catch (error) {
            return this.error('Failed to track idea progress', error);
        }
    }
}
exports.IdeasAbility = IdeasAbility;
