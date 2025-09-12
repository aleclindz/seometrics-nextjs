"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CMSManager = void 0;
const wordpress_1 = require("./providers/wordpress");
const webflow_1 = require("./providers/webflow");
const shopify_1 = require("./providers/shopify");
const strapi_1 = require("./providers/strapi");
const supabase_js_1 = require("@supabase/supabase-js");
class CMSManager {
    providers = new Map();
    supabase;
    constructor() {
        this.supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        // Initialize providers
        this.providers.set('wordpress', new wordpress_1.WordPressProvider());
        // Always initialize Strapi for internal use
        this.providers.set('strapi', new strapi_1.StrapiProvider(process.env.STRAPI_URL || 'http://localhost:1337'));
        if (process.env.WEBFLOW_CLIENT_ID && process.env.WEBFLOW_CLIENT_SECRET) {
            this.providers.set('webflow', new webflow_1.WebflowProvider(process.env.WEBFLOW_CLIENT_ID, process.env.WEBFLOW_CLIENT_SECRET));
        }
        if (process.env.SHOPIFY_CLIENT_ID && process.env.SHOPIFY_CLIENT_SECRET) {
            this.providers.set('shopify', new shopify_1.ShopifyProvider(process.env.SHOPIFY_CLIENT_ID, process.env.SHOPIFY_CLIENT_SECRET));
        }
    }
    getProvider(type) {
        const provider = this.providers.get(type);
        if (!provider) {
            throw new Error(`CMS provider ${type} is not configured or supported`);
        }
        return provider;
    }
    getSupportedProviders() {
        return Array.from(this.providers.keys());
    }
    /**
     * Start OAuth flow for a CMS provider
     */
    async startOAuthFlow(type, userId, redirectUri, siteUrl) {
        const provider = this.getProvider(type);
        const state = this.generateState();
        // Store state temporarily for validation
        await this.storeOAuthState(userId, type, state, redirectUri, siteUrl);
        let authUrl;
        if (type === 'wordpress' && siteUrl) {
            authUrl = provider.getAuthUrl(redirectUri, state, siteUrl);
        }
        else if (type === 'shopify' && siteUrl) {
            authUrl = provider.getAuthUrl(redirectUri, state, siteUrl);
        }
        else {
            authUrl = provider.getAuthUrl(redirectUri, state);
        }
        return { authUrl, state };
    }
    /**
     * Complete OAuth flow and create connection
     */
    async completeOAuthFlow(type, code, state, userId, connectionName) {
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
            const connection = await this.createConnection(userId, type, connectionName || `${provider.name} Connection`, credentials);
            // Clean up OAuth state
            await this.cleanupOAuthState(userId, type, state);
            return { success: true, connection };
        }
        catch (error) {
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
    async getUserConnections(userId) {
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
    async getConnection(connectionId, userId) {
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
    async testConnection(connectionId, userId) {
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
        }
        catch (error) {
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
    async deleteConnection(connectionId, userId) {
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
        }
        catch (error) {
            console.error(`[CMS MANAGER] Failed to delete connection:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete connection'
            };
        }
    }
    // Private helper methods
    generateState() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
    async storeOAuthState(userId, type, state, redirectUri, siteUrl) {
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
    async validateOAuthState(userId, type, state) {
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
    async cleanupOAuthState(userId, type, state) {
        await this.supabase
            .from('oauth_states')
            .delete()
            .eq('user_id', userId)
            .eq('cms_type', type)
            .eq('state', state);
    }
    async createConnection(userId, type, name, credentials) {
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
    async deactivateConnection(connectionId) {
        await this.supabase
            .from('cms_connections')
            .update({
            status: 'inactive',
            updated_at: new Date().toISOString(),
        })
            .eq('id', connectionId);
    }
    async updateConnectionSyncTime(connectionId) {
        await this.supabase
            .from('cms_connections')
            .update({
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
            .eq('id', connectionId);
    }
    dbRecordToConnection(record) {
        return {
            id: record.id.toString(),
            userId: record.user_token,
            type: record.cms_type,
            name: record.connection_name,
            credentials: {
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
exports.CMSManager = CMSManager;
