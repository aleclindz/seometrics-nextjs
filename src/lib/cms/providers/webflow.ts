import { BaseCMSProvider } from '../base-provider';
import { CMSCredentials, CMSBlog, CMSArticle, CMSPublishOptions, CMSType } from '../types';

export class WebflowProvider extends BaseCMSProvider {
  type: CMSType = 'webflow';
  name = 'Webflow';

  constructor(clientId: string, clientSecret: string) {
    super(clientId, clientSecret, 'https://api.webflow.com');
  }

  getAuthUrl(redirectUri: string, state: string, ...args: any[]): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      state: state,
      scope: 'cms:read cms:write sites:read',
    });

    return `https://webflow.com/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, redirectUri: string): Promise<CMSCredentials> {
    const tokenData = await this.makeRequest('https://api.webflow.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : undefined,
      scopes: tokenData.scope?.split(' ') || [],
    };
  }

  async refreshToken(refreshToken: string): Promise<CMSCredentials> {
    const tokenData = await this.makeRequest('https://api.webflow.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || refreshToken,
      expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : undefined,
      scopes: tokenData.scope?.split(' ') || [],
    };
  }

  async validateToken(credentials: CMSCredentials): Promise<boolean> {
    try {
      await this.makeAuthenticatedRequest('/v2/sites', 'GET', credentials);
      return true;
    } catch (error) {
      console.error('[WEBFLOW] Token validation failed:', error);
      return false;
    }
  }

  async getBlogs(credentials: CMSCredentials): Promise<CMSBlog[]> {
    const sitesResponse = await this.makeAuthenticatedRequest('/v2/sites', 'GET', credentials);
    const sites = sitesResponse.sites || [];

    const blogs: CMSBlog[] = [];

    for (const site of sites) {
      // Get collections for this site
      const collectionsResponse = await this.makeAuthenticatedRequest(
        `/v2/sites/${site.id}/collections`,
        'GET',
        credentials
      );

      const collections = collectionsResponse.collections || [];
      
      // Find blog-like collections (usually contain "blog", "post", "article" in name)
      const blogCollections = collections.filter((collection: any) =>
        /blog|post|article|news/i.test(collection.displayName || collection.singularName)
      );

      for (const collection of blogCollections) {
        blogs.push({
          id: `${site.id}:${collection.id}`,
          name: `${site.displayName} - ${collection.displayName}`,
          url: site.publishedUrl,
          description: `${collection.displayName} collection in ${site.displayName}`,
        });
      }
    }

    return blogs;
  }

  async getArticles(credentials: CMSCredentials, blogId?: string): Promise<CMSArticle[]> {
    if (!blogId) {
      throw new Error('Blog ID is required for Webflow');
    }

    const [siteId, collectionId] = blogId.split(':');
    
    const itemsResponse = await this.makeAuthenticatedRequest(
      `/v2/collections/${collectionId}/items`,
      'GET',
      credentials
    );

    const items = itemsResponse.items || [];

    return items.map((item: any) => ({
      id: item.id,
      title: item.fieldData.name || item.fieldData.title || 'Untitled',
      content: item.fieldData.content || item.fieldData.body || item.fieldData['rich-text'] || '',
      slug: item.fieldData.slug,
      status: item.isArchived || item.isDraft ? 'draft' : 'published',
      publishedAt: item.lastPublished ? new Date(item.lastPublished) : undefined,
      tags: this.extractTags(item.fieldData),
      author: item.fieldData.author || '',
      excerpt: item.fieldData.excerpt || item.fieldData.summary || '',
      featuredImage: item.fieldData.image?.url || item.fieldData['featured-image']?.url,
      meta: {
        title: item.fieldData['meta-title'] || item.fieldData.name,
        description: item.fieldData['meta-description'] || item.fieldData.excerpt,
      },
    }));
  }

  async publishArticle(credentials: CMSCredentials, article: Partial<CMSArticle>, options?: CMSPublishOptions): Promise<CMSArticle> {
    if (!options?.collectionId) {
      throw new Error('Collection ID is required for Webflow publishing');
    }

    const [siteId, collectionId] = options.collectionId.split(':');

    // Get collection schema to understand field structure
    const collectionResponse = await this.makeAuthenticatedRequest(
      `/v2/collections/${collectionId}`,
      'GET',
      credentials
    );

    const collection = collectionResponse;
    const fieldData = this.mapArticleToWebflowFields(article, collection, options);

    const itemData = {
      isArchived: false,
      isDraft: options?.status === 'draft',
      fieldData: fieldData,
    };

    const createdItem = await this.makeAuthenticatedRequest(
      `/v2/collections/${collectionId}/items`,
      'POST',
      credentials,
      itemData
    );

    // If not a draft, publish the site to make changes live
    if (options?.status !== 'draft') {
      try {
        await this.makeAuthenticatedRequest(
          `/v2/sites/${siteId}/publish`,
          'POST',
          credentials
        );
      } catch (error) {
        console.warn('[WEBFLOW] Failed to publish site after creating item:', error);
      }
    }

    return {
      id: createdItem.id,
      title: article.title || 'Untitled',
      content: article.content || '',
      slug: article.slug || this.generateSlug(article.title || ''),
      status: options?.status || 'published',
      publishedAt: options?.status !== 'draft' ? new Date() : undefined,
      tags: options?.tags || [],
      author: options?.author || '',
      excerpt: article.excerpt || '',
    };
  }

  async updateArticle(credentials: CMSCredentials, articleId: string, article: Partial<CMSArticle>): Promise<CMSArticle> {
    // First get the current item to understand its collection
    const currentItem = await this.makeAuthenticatedRequest(
      `/v2/collections/items/${articleId}`,
      'GET',
      credentials
    );

    // Get collection schema
    const collectionResponse = await this.makeAuthenticatedRequest(
      `/v2/collections/${currentItem.collectionId}`,
      'GET',
      credentials
    );

    const fieldData = this.mapArticleToWebflowFields(article, collectionResponse);

    const updateData = {
      fieldData: {
        ...currentItem.fieldData,
        ...fieldData,
      },
    };

    const updatedItem = await this.makeAuthenticatedRequest(
      `/v2/collections/items/${articleId}`,
      'PATCH',
      credentials,
      updateData
    );

    return {
      id: updatedItem.id,
      title: updatedItem.fieldData.name || 'Untitled',
      content: updatedItem.fieldData.content || '',
      slug: updatedItem.fieldData.slug,
      status: updatedItem.isDraft ? 'draft' : 'published',
      publishedAt: updatedItem.lastPublished ? new Date(updatedItem.lastPublished) : undefined,
    };
  }

  async deleteArticle(credentials: CMSCredentials, articleId: string): Promise<void> {
    await this.makeAuthenticatedRequest(
      `/v2/collections/items/${articleId}`,
      'DELETE',
      credentials
    );
  }

  // Webflow-specific helper methods
  private async makeAuthenticatedRequest(
    endpoint: string,
    method: string,
    credentials: CMSCredentials,
    body?: any
  ): Promise<any> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
        'accept-version': '1.0.0',
      },
    };

    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    return this.makeRequest(url, options);
  }

  private mapArticleToWebflowFields(
    article: Partial<CMSArticle>,
    collection: any,
    options?: CMSPublishOptions
  ): any {
    const fieldData: any = {};

    // Map common fields based on Webflow field types
    if (article.title) {
      fieldData.name = article.title; // 'name' is usually the main title field
    }

    if (article.content) {
      // Try to find a rich text field
      const richTextField = collection.fields?.find((f: any) => f.type === 'RichText');
      if (richTextField) {
        fieldData[richTextField.slug] = article.content;
      } else {
        fieldData.content = article.content;
      }
    }

    if (article.slug) {
      fieldData.slug = article.slug;
    }

    if (article.excerpt) {
      fieldData.excerpt = article.excerpt;
    }

    if (options?.author) {
      fieldData.author = options.author;
    }

    if (options?.tags?.length) {
      // Tags might be stored as a multi-reference or plain text
      fieldData.tags = options.tags.join(', ');
    }

    // SEO fields
    if (article.seo?.title) {
      fieldData['meta-title'] = article.seo.title;
    }

    if (article.seo?.description) {
      fieldData['meta-description'] = article.seo.description;
    }

    return fieldData;
  }

  private extractTags(fieldData: any): string[] {
    // Try different common tag field names
    const tagFields = ['tags', 'categories', 'keywords'];
    
    for (const field of tagFields) {
      if (fieldData[field]) {
        const tags = fieldData[field];
        if (Array.isArray(tags)) {
          return tags.map((tag: any) => typeof tag === 'string' ? tag : tag.name);
        } else if (typeof tags === 'string') {
          return tags.split(',').map((tag: string) => tag.trim());
        }
      }
    }

    return [];
  }
}