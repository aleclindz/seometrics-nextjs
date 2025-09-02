/**
 * Google Search Console Ability
 * 
 * Handles all Google Search Console related functions including:
 * - Connecting GSC accounts
 * - Syncing GSC data
 * - Managing GSC properties
 */

import { BaseAbility, FunctionCallResult } from './base-ability';

export class GSCAbility extends BaseAbility {
  getFunctionNames(): string[] {
    return [
      'connect_gsc',
      'sync_gsc_data',
      'get_gsc_properties',
      'disconnect_gsc'
    ];
  }

  async executeFunction(name: string, args: any): Promise<FunctionCallResult> {
    switch (name) {
      case 'connect_gsc':
        return await this.connectGSC(args);
      case 'sync_gsc_data':
        return await this.syncGSCData(args);
      case 'get_gsc_properties':
        return await this.getGSCProperties(args);
      case 'disconnect_gsc':
        return await this.disconnectGSC(args);
      default:
        return this.error(`Unknown GSC function: ${name}`);
    }
  }

  /**
   * Connect to Google Search Console
   */
  private async connectGSC(args: { site_url: string }): Promise<FunctionCallResult> {
    try {
      const response = await this.fetchAPI('/api/gsc/connect', {
        method: 'POST',
        body: JSON.stringify({
          siteUrl: args.site_url,
          userToken: this.userToken
        })
      });

      return response.success ? 
        this.success(response) :
        this.error(response.error || 'GSC connection failed');
    } catch (error) {
      return this.error('Failed to connect GSC', error);
    }
  }

  /**
   * Sync data from Google Search Console
   */
  private async syncGSCData(args: { site_url: string }): Promise<FunctionCallResult> {
    try {
      const response = await this.fetchAPI('/api/gsc/sync', {
        method: 'POST',
        body: JSON.stringify({
          siteUrl: args.site_url,
          userToken: this.userToken
        })
      });

      return response.success ? 
        this.success(response) :
        this.error(response.error || 'GSC sync failed');
    } catch (error) {
      return this.error('Failed to sync GSC data', error);
    }
  }

  /**
   * Get GSC properties for user
   */
  private async getGSCProperties(args: { user_token?: string }): Promise<FunctionCallResult> {
    try {
      const userToken = args.user_token || this.userToken;
      const response = await this.fetchAPI(`/api/gsc/properties?userToken=${userToken}`, {
        method: 'GET'
      });

      return response.success ? 
        this.success(response) :
        this.error(response.error || 'Failed to get GSC properties');
    } catch (error) {
      return this.error('Failed to get GSC properties', error);
    }
  }

  /**
   * Disconnect from Google Search Console
   */
  private async disconnectGSC(args: { site_url?: string }): Promise<FunctionCallResult> {
    try {
      const response = await this.fetchAPI('/api/gsc/disconnect', {
        method: 'POST',
        body: JSON.stringify({
          siteUrl: args.site_url,
          userToken: this.userToken
        })
      });

      return response.success ? 
        this.success(response) :
        this.error(response.error || 'GSC disconnect failed');
    } catch (error) {
      return this.error('Failed to disconnect GSC', error);
    }
  }
}