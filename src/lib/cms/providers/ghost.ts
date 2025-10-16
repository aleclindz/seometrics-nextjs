import { BaseCMSProvider } from '../base-provider';
import { CMSCredentials, CMSBlog, CMSArticle, CMSPublishOptions, CMSType } from '../types';

export class GhostProvider extends BaseCMSProvider {
  type: CMSType = 'ghost';
  name = 'Ghost CMS';

  constructor() {
    // Ghost doesn't need OAuth for API key authentication
    super('', '', '');
  }

  getAuthUrl(redirectUri: string, state: string): string {
    // Ghost uses Admin API Keys, not OAuth
    throw new Error('Ghost uses Admin API Key authentication, not OAuth');
  }

  async exchangeCodeForToken(code: string, redirectUri: string): Promise<CMSCredentials> {
    // Ghost uses Admin API Keys directly
    throw new Error('Ghost uses Admin API Key authentication, not OAuth');
  }

  async validateToken(credentials: CMSCredentials): Promise<boolean> {
    try {
      // Validate Admin API Key format (should be id:secret)
      if (!credentials.accessToken || !credentials.accessToken.includes(':')) {
        console.error('[GHOST] Invalid Admin API Key format. Expected format: id:secret');
        return false;
      }

      if (!credentials.siteUrl) {
        console.error('[GHOST] Missing siteUrl in credentials');
        return false;
      }

      // Dynamically import Ghost Admin API
      const GhostAdminAPI = (await import('@tryghost/admin-api')).default;

      const api = new GhostAdminAPI({
        url: credentials.siteUrl,
        key: credentials.accessToken,
        version: 'v5.0'
      });

      // Test the connection by reading site info
      await api.site.read();
      return true;
    } catch (error) {
      console.error('[GHOST] Token validation failed:', error);
      return false;
    }
  }

  async getBlogs(credentials: CMSCredentials): Promise<CMSBlog[]> {
    try {
      const GhostAdminAPI = (await import('@tryghost/admin-api')).default;

      const api = new GhostAdminAPI({
        url: credentials.siteUrl!,
        key: credentials.accessToken,
        version: 'v5.0'
      });

      const siteInfo = await api.site.read();

      // Ghost has a single blog per installation
      return [{
        id: 'default',
        name: siteInfo.title || 'Ghost Blog',
        url: credentials.siteUrl,
        description: siteInfo.description || ''
      }];
    } catch (error) {
      console.error('[GHOST] Failed to fetch blogs:', error);
      return [];
    }
  }

  async getArticles(credentials: CMSCredentials, blogId?: string): Promise<CMSArticle[]> {
    try {
      const GhostAdminAPI = (await import('@tryghost/admin-api')).default;

      const api = new GhostAdminAPI({
        url: credentials.siteUrl!,
        key: credentials.accessToken,
        version: 'v5.0'
      });

      // Fetch all posts (using large limit since 'all' is not supported by TypeScript types)
      const posts = await api.posts.browse({
        limit: 1000 // Large number to get most posts
      });

      return posts.map((post: any) => this.transformGhostPost(post, credentials.siteUrl!));
    } catch (error) {
      console.error('[GHOST] Failed to fetch articles:', error);
      return [];
    }
  }

  async publishArticle(credentials: CMSCredentials, article: Partial<CMSArticle>, options?: CMSPublishOptions): Promise<CMSArticle> {
    try {
      const GhostAdminAPI = (await import('@tryghost/admin-api')).default;

      const api = new GhostAdminAPI({
        url: credentials.siteUrl!,
        key: credentials.accessToken,
        version: 'v5.0'
      });

      // Convert HTML content to Lexical format for Ghost 5.0+
      const lexicalContent = this.convertHTMLToLexical(article.content || '');

      // Prepare post data
      const postData: any = {
        title: article.title,
        lexical: lexicalContent,
        status: options?.status === 'published' ? 'published' : 'draft',
        slug: article.slug || this.generateSlug(article.title || ''),
        custom_excerpt: article.excerpt,
        meta_title: article.seo?.title,
        meta_description: article.seo?.description,
        tags: (article.tags || []).map((tag: string) => ({ name: tag }))
      };

      // Add featured image if available
      if (article.featuredImage?.url) {
        postData.feature_image = article.featuredImage.url;
      }

      // Publish the post
      const createdPost = await api.posts.add(postData, { source: 'html' });

      return this.transformGhostPost(createdPost, credentials.siteUrl!);
    } catch (error) {
      console.error('[GHOST] Failed to publish article:', error);
      throw error;
    }
  }

  async updateArticle(credentials: CMSCredentials, articleId: string, article: Partial<CMSArticle>): Promise<CMSArticle> {
    // Note: Ghost Admin API v1.14.0 TypeScript types don't expose the edit method
    // This functionality may need to be implemented using raw API calls
    // For now, throw an error indicating this feature is not yet implemented
    throw new Error('[GHOST] Article updating is not yet implemented. Ghost Admin API types do not expose the edit method. Please delete and recreate the post instead.');
  }

  async deleteArticle(credentials: CMSCredentials, articleId: string): Promise<void> {
    try {
      const GhostAdminAPI = (await import('@tryghost/admin-api')).default;

      const api = new GhostAdminAPI({
        url: credentials.siteUrl!,
        key: credentials.accessToken,
        version: 'v5.0'
      });

      await api.posts.delete({ id: articleId });
    } catch (error) {
      console.error('[GHOST] Failed to delete article:', error);
      throw error;
    }
  }

  /**
   * Transform Ghost post to CMSArticle format
   */
  private transformGhostPost(post: any, siteUrl: string): CMSArticle {
    return {
      id: post.id,
      title: post.title,
      content: post.html || '',
      slug: post.slug,
      status: post.status === 'published' ? 'published' : 'draft',
      publishedAt: post.published_at ? new Date(post.published_at) : undefined,
      createdAt: post.created_at ? new Date(post.created_at) : undefined,
      updatedAt: post.updated_at ? new Date(post.updated_at) : undefined,
      excerpt: post.custom_excerpt || post.excerpt || '',
      tags: post.tags?.map((tag: any) => tag.name) || [],
      categories: [],
      author: post.primary_author?.name || 'Unknown',
      featuredImage: post.feature_image ? {
        url: post.feature_image,
        alt: post.feature_image_alt || ''
      } : undefined,
      seo: {
        title: post.meta_title || post.title,
        description: post.meta_description || post.custom_excerpt || '',
        keywords: []
      },
      url: post.url || `${siteUrl}/${post.slug}`,
      customFields: {
        ghostId: post.id,
        uuid: post.uuid,
        visibility: post.visibility,
        featured: post.featured
      }
    };
  }

  /**
   * Convert HTML content to Lexical format for Ghost 5.0+
   * This is a simplified version - Ghost's actual conversion is more complex
   */
  private convertHTMLToLexical(html: string): string {
    // Basic Lexical format structure
    const lexical = {
      root: {
        children: [
          {
            type: 'html',
            version: 1,
            html: html
          }
        ],
        direction: null,
        format: '',
        indent: 0,
        type: 'root',
        version: 1
      }
    };

    return JSON.stringify(lexical);
  }
}
