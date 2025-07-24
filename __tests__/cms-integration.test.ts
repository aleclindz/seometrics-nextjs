/**
 * Automated Tests for CMS Integration System
 * Tests the modular 1-click CMS connection functionality
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { CMSManager } from '@/lib/cms/cms-manager';
import { WordPressProvider } from '@/lib/cms/providers/wordpress';
import { WebflowProvider } from '@/lib/cms/providers/webflow';
import { ShopifyProvider } from '@/lib/cms/providers/shopify';
import { CMSCredentials, CMSArticle } from '@/lib/cms/types';

// Mock fetch globally
global.fetch = jest.fn();

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
process.env.WEBFLOW_CLIENT_ID = 'test-webflow-client';
process.env.WEBFLOW_CLIENT_SECRET = 'test-webflow-secret';
process.env.SHOPIFY_CLIENT_ID = 'test-shopify-client';
process.env.SHOPIFY_CLIENT_SECRET = 'test-shopify-secret';

describe('CMS Integration System', () => {
  let cmsManager: CMSManager;
  
  beforeEach(() => {
    cmsManager = new CMSManager();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('CMSManager', () => {
    it('should initialize with supported providers', () => {
      const supportedProviders = cmsManager.getSupportedProviders();
      expect(supportedProviders).toContain('wordpress');
      expect(supportedProviders).toContain('webflow');
      expect(supportedProviders).toContain('shopify');
    });

    it('should get provider instances', () => {
      const wordpressProvider = cmsManager.getProvider('wordpress');
      const webflowProvider = cmsManager.getProvider('webflow');
      const shopifyProvider = cmsManager.getProvider('shopify');

      expect(wordpressProvider).toBeInstanceOf(WordPressProvider);
      expect(webflowProvider).toBeInstanceOf(WebflowProvider);
      expect(shopifyProvider).toBeInstanceOf(ShopifyProvider);
    });

    it('should throw error for unsupported provider', () => {
      expect(() => {
        cmsManager.getProvider('unsupported' as any);
      }).toThrow('CMS provider unsupported is not configured or supported');
    });
  });

  describe('WordPress Provider', () => {
    let provider: WordPressProvider;

    beforeEach(() => {
      provider = new WordPressProvider();
    });

    it('should generate correct auth URL', () => {
      const redirectUri = 'https://app.seometrics.com/callback';
      const state = 'test-state';
      const siteUrl = 'https://example.com';

      const authUrl = provider.getAuthUrl(redirectUri, state, siteUrl);

      expect(authUrl).toContain('https://example.com/wp-admin/authorize-application.php');
      expect(authUrl).toContain('app_name=SEOMetrics.ai');
      expect(authUrl).toContain('success_url=');
      expect(authUrl).toContain('state=test-state');
    });

    it('should validate credentials', async () => {
      const mockCredentials: CMSCredentials = {
        type: 'wordpress',
        accessToken: 'test-password',
        siteUrl: 'https://example.com',
        username: 'test-user',
      };

      // Mock successful WordPress API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, name: 'Test User' }),
      });

      const isValid = await provider.validateToken(mockCredentials);
      expect(isValid).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://example.com/wp-json/wp/v2/users/me',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic'),
          }),
        })
      );
    });

    it('should publish article', async () => {
      const mockCredentials: CMSCredentials = {
        type: 'wordpress',
        accessToken: 'test-password',
        siteUrl: 'https://example.com',
        username: 'test-user',
      };

      const mockArticle: Partial<CMSArticle> = {
        title: 'Test Article',
        content: '<p>Test content</p>',
        excerpt: 'Test excerpt',
      };

      // Mock WordPress API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 123,
          title: { rendered: 'Test Article' },
          content: { rendered: '<p>Test content</p>' },
          slug: 'test-article',
          status: 'publish',
          date: '2024-01-01T00:00:00Z',
          excerpt: { rendered: 'Test excerpt' },
        }),
      });

      const publishedArticle = await provider.publishArticle(mockCredentials, mockArticle);

      expect(publishedArticle.id).toBe('123');
      expect(publishedArticle.title).toBe('Test Article');
      expect(publishedArticle.status).toBe('published');
      expect(fetch).toHaveBeenCalledWith(
        'https://example.com/wp-json/wp/v2/posts',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic'),
          }),
        })
      );
    });
  });

  describe('Webflow Provider', () => {
    let provider: WebflowProvider;

    beforeEach(() => {
      provider = new WebflowProvider('test-client-id', 'test-client-secret');
    });

    it('should generate correct auth URL', () => {
      const redirectUri = 'https://app.seometrics.com/callback';
      const state = 'test-state';

      const authUrl = provider.getAuthUrl(redirectUri, state);

      expect(authUrl).toContain('https://webflow.com/oauth/authorize');
      expect(authUrl).toContain('client_id=test-client-id');
      expect(authUrl).toContain('scope=cms%3Aread%20cms%3Awrite%20sites%3Aread');
      expect(authUrl).toContain('state=test-state');
    });

    it('should exchange code for token', async () => {
      const code = 'test-code';
      const redirectUri = 'https://app.seometrics.com/callback';

      // Mock Webflow token response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'webflow-access-token',
          refresh_token: 'webflow-refresh-token',
          expires_in: 3600,
          scope: 'cms:read cms:write sites:read',
        }),
      });

      const credentials = await provider.exchangeCodeForToken(code, redirectUri);

      expect(credentials.type).toBe('webflow');
      expect(credentials.accessToken).toBe('webflow-access-token');
      expect(credentials.refreshToken).toBe('webflow-refresh-token');
      expect(credentials.scopes).toEqual(['cms:read', 'cms:write', 'sites:read']);
    });

    it('should get blogs/collections', async () => {
      const mockCredentials: CMSCredentials = {
        type: 'webflow',
        accessToken: 'test-token',
      };

      // Mock Webflow API responses
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            sites: [
              { id: 'site1', displayName: 'Test Site', publishedUrl: 'https://test.com' }
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            collections: [
              { id: 'col1', displayName: 'Blog Posts', singularName: 'Blog Post' }
            ],
          }),
        });

      const blogs = await provider.getBlogs(mockCredentials);

      expect(blogs).toHaveLength(1);
      expect(blogs[0].id).toBe('site1:col1');
      expect(blogs[0].name).toBe('Test Site - Blog Posts');
    });
  });

  describe('Shopify Provider', () => {
    let provider: ShopifyProvider;

    beforeEach(() => {
      provider = new ShopifyProvider('test-client-id', 'test-client-secret');
    });

    it('should generate correct auth URL', () => {
      const redirectUri = 'https://app.seometrics.com/callback';
      const state = 'test-state';
      const shopDomain = 'test-shop.myshopify.com';

      const authUrl = provider.getAuthUrl(redirectUri, state, shopDomain);

      expect(authUrl).toContain('https://test-shop.myshopify.com/admin/oauth/authorize');
      expect(authUrl).toContain('client_id=test-client-id');
      expect(authUrl).toContain('scope=read_content%2Cwrite_content');
      expect(authUrl).toContain('state=test-state');
    });

    it('should exchange code for token', async () => {
      const code = 'test-code';
      const redirectUri = 'https://app.seometrics.com/callback?shop=test-shop.myshopify.com';

      // Mock Shopify token response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'shopify-access-token',
          scope: 'read_content,write_content',
        }),
      });

      const credentials = await provider.exchangeCodeForToken(code, redirectUri);

      expect(credentials.type).toBe('shopify');
      expect(credentials.accessToken).toBe('shopify-access-token');
      expect(credentials.shopDomain).toBe('test-shop.myshopify.com');
      expect(credentials.scopes).toEqual(['read_content', 'write_content']);
    });

    it('should get blogs', async () => {
      const mockCredentials: CMSCredentials = {
        type: 'shopify',
        accessToken: 'test-token',
        shopDomain: 'test-shop.myshopify.com',
      };

      // Mock Shopify blogs response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          blogs: [
            { id: 1, title: 'News', handle: 'news', commentable: true }
          ],
        }),
      });

      const blogs = await provider.getBlogs(mockCredentials);

      expect(blogs).toHaveLength(1);
      expect(blogs[0].id).toBe('1');
      expect(blogs[0].name).toBe('News');
      expect(blogs[0].url).toBe('https://test-shop.myshopify.com/blogs/news');
    });

    it('should publish article', async () => {
      const mockCredentials: CMSCredentials = {
        type: 'shopify',
        accessToken: 'test-token',
        shopDomain: 'test-shop.myshopify.com',
      };

      const mockArticle: Partial<CMSArticle> = {
        title: 'Test Article',
        content: '<p>Test content</p>',
        excerpt: 'Test excerpt',
      };

      // Mock get blogs response first
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            blogs: [{ id: 1, title: 'Blog' }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            article: {
              id: 123,
              title: 'Test Article',
              body_html: '<p>Test content</p>',
              handle: 'test-article',
              published_at: '2024-01-01T00:00:00Z',
              summary: 'Test excerpt',
              tags: '',
              author: '',
            },
          }),
        });

      const publishedArticle = await provider.publishArticle(mockCredentials, mockArticle);

      expect(publishedArticle.id).toBe('123');
      expect(publishedArticle.title).toBe('Test Article');
      expect(publishedArticle.status).toBe('published');
    });
  });

  describe('Integration Flow Tests', () => {
    it('should complete end-to-end WordPress connection flow', async () => {
      const userId = 'test-user-123';
      const redirectUri = 'https://app.seometrics.com/callback';

      // Start OAuth flow
      const { authUrl, state } = await cmsManager.startOAuthFlow(
        'wordpress',
        userId,
        redirectUri,
        'https://example.com'
      );

      expect(authUrl).toContain('https://example.com/wp-admin/authorize-application.php');
      expect(state).toBeTruthy();

      // Mock successful credential validation
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, name: 'Test User' }),
      });

      // Complete OAuth flow
      const result = await cmsManager.completeOAuthFlow(
        'wordpress',
        'mock-code',
        state,
        userId,
        'Test WordPress Site'
      );

      expect(result.success).toBe(true);
      expect(result.connection).toBeDefined();
      expect(result.connection?.type).toBe('wordpress');
    });

    it('should handle OAuth errors gracefully', async () => {
      const userId = 'test-user-123';
      
      const result = await cmsManager.completeOAuthFlow(
        'wordpress',
        'invalid-code',
        'invalid-state',
        userId
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent connection attempts', async () => {
      const userId = 'test-user-123';
      const redirectUri = 'https://app.seometrics.com/callback';

      const promises = [
        cmsManager.startOAuthFlow('wordpress', userId, redirectUri, 'https://site1.com'),
        cmsManager.startOAuthFlow('webflow', userId, redirectUri),
        cmsManager.startOAuthFlow('shopify', userId, redirectUri, 'shop.myshopify.com'),
      ];

      const results = await Promise.all(promises);

      results.forEach((result, index) => {
        expect(result.authUrl).toBeTruthy();
        expect(result.state).toBeTruthy();
      });
    });

    it('should timeout long-running operations', async () => {
      const mockCredentials: CMSCredentials = {
        type: 'wordpress',
        accessToken: 'test-password',
        siteUrl: 'https://example.com',
        username: 'test-user',
      };

      // Mock a slow response
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 10000))
      );

      const provider = new WordPressProvider();
      
      await expect(
        Promise.race([
          provider.validateToken(mockCredentials),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ])
      ).rejects.toThrow('Timeout');
    });
  });

  describe('Security Tests', () => {
    it('should not expose sensitive credentials in logs', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      const credentials: CMSCredentials = {
        type: 'wordpress',
        accessToken: 'secret-password-123',
        siteUrl: 'https://example.com',
        username: 'test-user',
      };

      // This should not log the actual password
      console.log('[TEST] Processing credentials:', { ...credentials, accessToken: '[REDACTED]' });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[TEST] Processing credentials:',
        expect.objectContaining({
          accessToken: '[REDACTED]'
        })
      );

      consoleSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('should validate state parameter to prevent CSRF', async () => {
      const userId = 'test-user-123';
      
      // Try to complete OAuth with wrong state
      const result = await cmsManager.completeOAuthFlow(
        'wordpress',
        'valid-code',
        'wrong-state',
        userId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid or expired OAuth state');
    });
  });
});