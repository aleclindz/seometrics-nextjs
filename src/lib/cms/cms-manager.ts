import { CMSProvider, CMSType, CMSCredentials, CMSConnection, CMSIntegrationResult } from './types';
import { WordPressProvider } from './providers/wordpress';
import { WebflowProvider } from './providers/webflow';
import { ShopifyProvider } from './providers/shopify';
import { StrapiProvider } from './providers/strapi';
import { createClient } from '@supabase/supabase-js';

export class CMSManager {
  private providers: Map<CMSType, CMSProvider> = new Map();
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Initialize providers
    this.providers.set('wordpress', new WordPressProvider());
    
    // Always initialize Strapi for internal use
    this.providers.set('strapi', new StrapiProvider(
      process.env.STRAPI_URL || 'http://localhost:1337'
    ));
    
    if (process.env.WEBFLOW_CLIENT_ID && process.env.WEBFLOW_CLIENT_SECRET) {
      this.providers.set('webflow', new WebflowProvider(
        process.env.WEBFLOW_CLIENT_ID,
        process.env.WEBFLOW_CLIENT_SECRET
      ));
    }

    if (process.env.SHOPIFY_CLIENT_ID && process.env.SHOPIFY_CLIENT_SECRET) {
      this.providers.set('shopify', new ShopifyProvider(
        process.env.SHOPIFY_CLIENT_ID,
        process.env.SHOPIFY_CLIENT_SECRET
      ));
    }
  }

  getProvider(type: CMSType): CMSProvider {
    const provider = this.providers.get(type);
    if (!provider) {
      throw new Error(`CMS provider ${type} is not configured or supported`);
    }
    return provider;
  }

  getSupportedProviders(): CMSType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Start OAuth flow for a CMS provider
   */
  async startOAuthFlow(type: CMSType, userId: string, redirectUri: string, siteUrl?: string): Promise<{ authUrl: string; state: string }> {
    const provider = this.getProvider(type);
    const state = this.generateState();

    // Store state temporarily for validation
    await this.storeOAuthState(userId, type, state, redirectUri, siteUrl);

    let authUrl: string;
    if (type === 'wordpress' && siteUrl) {
      authUrl = (provider as WordPressProvider).getAuthUrl(redirectUri, state, siteUrl);
    } else if (type === 'shopify' && siteUrl) {
      authUrl = (provider as ShopifyProvider).getAuthUrl(redirectUri, state, siteUrl);
    } else {
      authUrl = provider.getAuthUrl(redirectUri, state);
    }

    return { authUrl, state };
  }

  /**
   * Complete OAuth flow and create connection
   */
  async completeOAuthFlow(
    type: CMSType,
    code: string,
    state: string,
    userId: string,
    connectionName?: string
  ): Promise<CMSIntegrationResult> {
    try {
      // Validate state
      const storedState = await this.validateOAuthState(userId, type, state);
      if (!storedState) {
        return { success: false, error: 'Invalid or expired OAuth state' };
      }

      const provider = this.getProvider(type);
      
      // Exchange code for credentials
      const credentials = await provider.exchangeCodeForToken(code, storedState.redirectUri);
      
      // Validate the credentials work
      const isValid = await provider.validateToken(credentials);
      if (!isValid) {
        return { success: false, error: 'Failed to validate credentials' };
      }

      // Create connection record
      const connection = await this.createConnection(
        userId,
        type,
        connectionName || `${provider.name} Connection`,
        credentials
      );

      // Clean up OAuth state
      await this.cleanupOAuthState(userId, type, state);

      return { success: true, connection };
    } catch (error) {
      console.error(`[CMS MANAGER] OAuth completion failed for ${type}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'OAuth flow failed' 
      };
    }
  }

  /**
   * Get all connections for a user
   */
  async getUserConnections(userId: string): Promise<CMSConnection[]> {
    const { data, error } = await this.supabase
      .from('cms_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[CMS MANAGER] Failed to fetch user connections:', error);
      return [];
    }

    return data.map(this.dbRecordToConnection);
  }

  /**
   * Get a specific connection
   */
  async getConnection(connectionId: string, userId: string): Promise<CMSConnection | null> {
    const { data, error } = await this.supabase
      .from('cms_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_token', userId)
      .eq('status', 'active')
      .single();

    if (error || !data) {
      return null;
    }

    return this.dbRecordToConnection(data);
  }

  /**
   * Test a connection
   */
  async testConnection(connectionId: string, userId: string): Promise<CMSIntegrationResult> {
    try {
      const connection = await this.getConnection(connectionId, userId);
      if (!connection) {
        return { success: false, error: 'Connection not found' };
      }

      const provider = this.getProvider(connection.type);
      const isValid = await provider.validateToken(connection.credentials);

      if (!isValid) {
        // Mark connection as inactive
        await this.deactivateConnection(connectionId);
        return { success: false, error: 'Connection is no longer valid' };
      }

      // Update last sync time
      await this.updateConnectionSyncTime(connectionId);

      return { success: true, data: { connectionId, type: connection.type, isValid } };
    } catch (error) {
      console.error(`[CMS MANAGER] Connection test failed:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Connection test failed' 
      };
    }
  }

  /**
   * Delete a connection
   */
  async deleteConnection(connectionId: string, userId: string): Promise<CMSIntegrationResult> {
    try {
      const { error } = await this.supabase
        .from('cms_connections')
        .update({ is_active: false })
        .eq('id', connectionId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error(`[CMS MANAGER] Failed to delete connection:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete connection' 
      };
    }
  }

  // Private helper methods
  private generateState(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private async storeOAuthState(
    userId: string,
    type: CMSType,
    state: string,
    redirectUri: string,
    siteUrl?: string
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.supabase
      .from('oauth_states')
      .insert({
        user_id: userId,
        cms_type: type,
        state: state,
        redirect_uri: redirectUri,
        site_url: siteUrl,
        expires_at: expiresAt.toISOString(),
      });
  }

  private async validateOAuthState(
    userId: string,
    type: CMSType,
    state: string
  ): Promise<{ redirectUri: string; siteUrl?: string } | null> {
    const { data, error } = await this.supabase
      .from('oauth_states')
      .select('*')
      .eq('user_id', userId)
      .eq('cms_type', type)
      .eq('state', state)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return null;
    }

    return {
      redirectUri: data.redirect_uri,
      siteUrl: data.site_url,
    };
  }

  private async cleanupOAuthState(userId: string, type: CMSType, state: string): Promise<void> {
    await this.supabase
      .from('oauth_states')
      .delete()
      .eq('user_id', userId)
      .eq('cms_type', type)
      .eq('state', state);
  }

  private async createConnection(
    userId: string,
    type: CMSType,
    name: string,
    credentials: CMSCredentials
  ): Promise<CMSConnection> {
    const connectionId = crypto.randomUUID();
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('cms_connections')
      .insert({
        id: connectionId,
        user_id: userId,
        type: type,
        name: name,
        credentials: credentials,
        is_active: true,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create connection: ${error.message}`);
    }

    return this.dbRecordToConnection(data);
  }

  private async deactivateConnection(connectionId: string): Promise<void> {
    await this.supabase
      .from('cms_connections')
      .update({ 
        status: 'inactive',
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);
  }

  private async updateConnectionSyncTime(connectionId: string): Promise<void> {
    await this.supabase
      .from('cms_connections')
      .update({ 
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);
  }

  private dbRecordToConnection(record: any): CMSConnection {
    return {
      id: record.id.toString(),
      userId: record.user_token,
      type: record.cms_type as CMSType,
      name: record.connection_name,
      credentials: {
        type: record.cms_type,
        accessToken: record.api_token,
        siteUrl: record.base_url
      },
      isActive: record.status === 'active',
      lastSyncAt: record.last_sync_at ? new Date(record.last_sync_at) : undefined,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}