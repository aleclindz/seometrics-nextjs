/**
 * Ideas Ability
 * 
 * Handles all ideas and actions management functions including:
 * - Creating ideas
 * - Managing action plans
 * - Executing actions
 * - Tracking idea adoption
 */

import { BaseAbility, FunctionCallResult } from './base-ability';

export class IdeasAbility extends BaseAbility {
  getFunctionNames(): string[] {
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

  async executeFunction(name: string, args: any): Promise<FunctionCallResult> {
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
  private async createIdea(args: { 
    site_url: string; 
    title: string; 
    hypothesis: string; 
    evidence?: any; 
    ice_score?: number 
  }): Promise<FunctionCallResult> {
    try {
      const response = await this.fetchAPI('/api/agent/ideas', {
        method: 'POST',
        body: JSON.stringify({
          ...args,
          userToken: this.userToken
        })
      });

      return response.success ? 
        this.success(response) :
        this.error(response.error || 'Idea creation failed');
    } catch (error) {
      return this.error('Failed to create idea', error);
    }
  }

  /**
   * Adopt an idea and create action plan
   */
  private async adoptIdea(args: { 
    idea_id: string; 
    strategy: string; 
    actions: any[] 
  }): Promise<FunctionCallResult> {
    try {
      const response = await this.fetchAPI('/api/agent/adopt-idea', {
        method: 'POST',
        body: JSON.stringify({
          ...args,
          userToken: this.userToken
        })
      });

      return response.success ? 
        this.success(response) :
        this.error(response.error || 'Idea adoption failed');
    } catch (error) {
      return this.error('Failed to adopt idea', error);
    }
  }

  /**
   * Execute an action
   */
  private async runAction(args: { 
    action_id: string; 
    parameters?: any 
  }): Promise<FunctionCallResult> {
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
    } catch (error) {
      return this.error('Failed to run action', error);
    }
  }

  /**
   * Get ideas for a site
   */
  private async getIdeas(args: { 
    site_url?: string; 
    status?: string; 
    limit?: number 
  }): Promise<FunctionCallResult> {
    try {
      const params = new URLSearchParams();
      
      if (args.site_url) params.append('site_url', args.site_url);
      if (args.status) params.append('status', args.status);
      if (args.limit) params.append('limit', args.limit.toString());
      if (this.userToken) params.append('userToken', this.userToken);

      const response = await this.fetchAPI(`/api/agent/ideas?${params}`, {
        method: 'GET'
      });

      return response.success ? 
        this.success(response) :
        this.error(response.error || 'Failed to get ideas');
    } catch (error) {
      return this.error('Failed to get ideas', error);
    }
  }

  /**
   * Update an existing idea
   */
  private async updateIdea(args: { 
    idea_id: string; 
    updates: any 
  }): Promise<FunctionCallResult> {
    try {
      const response = await this.fetchAPI(`/api/agent/ideas/${args.idea_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...args.updates,
          userToken: this.userToken
        })
      });

      return response.success ? 
        this.success(response) :
        this.error(response.error || 'Idea update failed');
    } catch (error) {
      return this.error('Failed to update idea', error);
    }
  }

  /**
   * Delete an idea
   */
  private async deleteIdea(args: { idea_id: string }): Promise<FunctionCallResult> {
    try {
      const response = await this.fetchAPI(`/api/agent/ideas/${args.idea_id}?userToken=${this.userToken}`, {
        method: 'DELETE'
      });

      return response.success ? 
        this.success(response) :
        this.error(response.error || 'Idea deletion failed');
    } catch (error) {
      return this.error('Failed to delete idea', error);
    }
  }

  /**
   * Track progress of an idea implementation
   */
  private async trackIdeaProgress(args: { 
    idea_id: string; 
    include_actions?: boolean 
  }): Promise<FunctionCallResult> {
    try {
      const params = new URLSearchParams({
        idea_id: args.idea_id
      });

      if (args.include_actions) params.append('include_actions', 'true');
      if (this.userToken) params.append('userToken', this.userToken);

      const response = await this.fetchAPI(`/api/agent/ideas/progress?${params}`, {
        method: 'GET'
      });

      return response.success ? 
        this.success(response) :
        this.error(response.error || 'Failed to track idea progress');
    } catch (error) {
      return this.error('Failed to track idea progress', error);
    }
  }
}