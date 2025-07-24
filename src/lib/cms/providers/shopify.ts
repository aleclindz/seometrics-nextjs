import { BaseCMSProvider } from '../base-provider';
import { CMSCredentials, CMSBlog, CMSArticle, CMSPublishOptions, CMSType } from '../types';

export class ShopifyProvider extends BaseCMSProvider {
  type: CMSType = 'shopify';
  name = 'Shopify';
  private apiVersion = '2024-10';

  constructor(clientId: string, clientSecret: string) {
    super(clientId, clientSecret, '');
  }

  getAuthUrl(redirectUri: string, state: string, shopDomain: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      scope: 'read_content,write_content',
      redirect_uri: redirectUri,
      state: state,
    });

    const cleanShopDomain = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `https://${cleanShopDomain}/admin/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, redirectUri: string): Promise<CMSCredentials> {
    // Extract shop from the redirect URI or require it as a parameter
    const url = new URL(redirectUri);
    const shop = url.searchParams.get('shop');
    
    if (!shop) {
      throw new Error('Shop domain is required for Shopify token exchange');
    }

    const tokenData = await this.makeRequest(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code,
      }),
    });

    return {
      type: 'shopify',
      accessToken: tokenData.access_token,
      shopDomain: shop,
      scopes: tokenData.scope?.split(',') || [],
    };
  }

  async validateToken(credentials: CMSCredentials): Promise<boolean> {
    try {
      await this.makeAuthenticatedRequest('/admin/api/shop.json', 'GET', credentials);
      return true;
    } catch (error) {
      console.error('[SHOPIFY] Token validation failed:', error);
      return false;
    }
  }

  async getBlogs(credentials: CMSCredentials): Promise<CMSBlog[]> {
    const blogsResponse = await this.makeAuthenticatedRequest(
      `/admin/api/${this.apiVersion}/blogs.json`,
      'GET',
      credentials
    );

    const blogs = blogsResponse.blogs || [];

    return blogs.map((blog: any) => ({
      id: blog.id.toString(),
      name: blog.title,
      url: `https://${credentials.shopDomain}/blogs/${blog.handle}`,
      description: blog.commentable ? 'Comments enabled' : 'Comments disabled',
    }));
  }

  async getArticles(credentials: CMSCredentials, blogId?: string): Promise<CMSArticle[]> {
    if (!blogId) {
      // Get articles from all blogs
      const blogs = await this.getBlogs(credentials);
      const allArticles: CMSArticle[] = [];

      for (const blog of blogs) {
        const blogArticles = await this.getArticles(credentials, blog.id);
        allArticles.push(...blogArticles);
      }

      return allArticles;
    }

    const articlesResponse = await this.makeAuthenticatedRequest(
      `/admin/api/${this.apiVersion}/blogs/${blogId}/articles.json?limit=50`,
      'GET',
      credentials
    );

    const articles = articlesResponse.articles || [];

    return articles.map((article: any) => ({
      id: article.id.toString(),
      title: article.title,
      content: article.body_html,
      slug: article.handle,
      status: article.published_at ? 'published' : 'draft',
      publishedAt: article.published_at ? new Date(article.published_at) : undefined,
      tags: article.tags ? article.tags.split(', ').filter(Boolean) : [],
      author: article.author || '',
      excerpt: article.summary || this.stripHtml(article.body_html || '').substring(0, 160),
      meta: {
        title: article.title,
        description: article.summary || this.stripHtml(article.body_html || '').substring(0, 160),
      },
    }));
  }

  async publishArticle(credentials: CMSCredentials, article: Partial<CMSArticle>, options?: CMSPublishOptions): Promise<CMSArticle> {
    if (!options?.blogId) {
      // Get the first available blog
      const blogs = await this.getBlogs(credentials);
      if (blogs.length === 0) {
        throw new Error('No blogs found in Shopify store');
      }
      options = { ...options, blogId: blogs[0].id };
    }

    const articleData = {
      article: {
        title: article.title,
        body_html: article.content,
        handle: article.slug || this.generateSlug(article.title || ''),
        published_at: options?.status === 'draft' ? null : (options?.publishedAt?.toISOString() || new Date().toISOString()),
        author: options?.author || '',
        tags: options?.tags?.join(', ') || '',
        summary: article.excerpt || '',
      },
    };

    const createdArticle = await this.makeAuthenticatedRequest(
      `/admin/api/${this.apiVersion}/blogs/${options.blogId}/articles.json`,
      'POST',
      credentials,
      articleData
    );

    const article_data = createdArticle.article;

    return {
      id: article_data.id.toString(),
      title: article_data.title,
      content: article_data.body_html,
      slug: article_data.handle,
      status: article_data.published_at ? 'published' : 'draft',
      publishedAt: article_data.published_at ? new Date(article_data.published_at) : undefined,
      tags: article_data.tags ? article_data.tags.split(', ').filter(Boolean) : [],
      author: article_data.author || '',
      excerpt: article_data.summary || '',
    };
  }

  async updateArticle(credentials: CMSCredentials, articleId: string, article: Partial<CMSArticle>): Promise<CMSArticle> {
    // First, get the article to find its blog ID
    const currentArticle = await this.getArticleWithBlogId(credentials, articleId);
    
    const updateData = {
      article: {} as any,
    };

    if (article.title) updateData.article.title = article.title;
    if (article.content) updateData.article.body_html = article.content;
    if (article.slug) updateData.article.handle = article.slug;
    if (article.excerpt) updateData.article.summary = article.excerpt;
    if (article.status) {
      updateData.article.published_at = article.status === 'published' 
        ? new Date().toISOString() 
        : null;
    }

    const updatedArticle = await this.makeAuthenticatedRequest(
      `/admin/api/${this.apiVersion}/blogs/${currentArticle.blogId}/articles/${articleId}.json`,
      'PUT',
      credentials,
      updateData
    );

    const article_data = updatedArticle.article;

    return {
      id: article_data.id.toString(),
      title: article_data.title,
      content: article_data.body_html,
      slug: article_data.handle,
      status: article_data.published_at ? 'published' : 'draft',
      publishedAt: article_data.published_at ? new Date(article_data.published_at) : undefined,
      tags: article_data.tags ? article_data.tags.split(', ').filter(Boolean) : [],
      author: article_data.author || '',
      excerpt: article_data.summary || '',
    };
  }

  async deleteArticle(credentials: CMSCredentials, articleId: string): Promise<void> {
    // First, get the article to find its blog ID
    const currentArticle = await this.getArticleWithBlogId(credentials, articleId);
    
    await this.makeAuthenticatedRequest(
      `/admin/api/${this.apiVersion}/blogs/${currentArticle.blogId}/articles/${articleId}.json`,
      'DELETE',
      credentials
    );
  }

  // Shopify-specific helper methods
  private async makeAuthenticatedRequest(
    endpoint: string,
    method: string,
    credentials: CMSCredentials,
    body?: any
  ): Promise<any> {
    if (!credentials.shopDomain) {
      throw new Error('Shop domain is required for Shopify API calls');
    }

    const url = `https://${credentials.shopDomain}${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'X-Shopify-Access-Token': credentials.accessToken,
        'Content-Type': 'application/json',
      },
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    return this.makeRequest(url, options);
  }

  private async getArticleWithBlogId(credentials: CMSCredentials, articleId: string): Promise<{ blogId: string }> {
    // Since we need to know which blog an article belongs to for updates/deletes,
    // we'll search through all blogs to find it
    const blogs = await this.getBlogs(credentials);
    
    for (const blog of blogs) {
      try {
        await this.makeAuthenticatedRequest(
          `/admin/api/${this.apiVersion}/blogs/${blog.id}/articles/${articleId}.json`,
          'GET',
          credentials
        );
        return { blogId: blog.id };
      } catch (error) {
        // Article not in this blog, continue searching
        continue;
      }
    }

    throw new Error(`Article ${articleId} not found in any blog`);
  }

  // Utility method to verify webhook HMAC (for webhook handling)
  // Note: Edge Runtime compatible version - uses Web Crypto API
  async verifyWebhook(body: string, hmacHeader: string): Promise<boolean> {
    if (!this.clientSecret) {
      throw new Error('Client secret is required to verify webhooks');
    }

    try {
      // Use Web Crypto API for Edge Runtime compatibility
      const encoder = new TextEncoder();
      const keyData = encoder.encode(this.clientSecret);
      const bodyData = encoder.encode(body);

      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const signature = await crypto.subtle.sign('HMAC', cryptoKey, bodyData);
      const signatureArray = new Uint8Array(signature);
      const calculatedHmac = btoa(Array.from(signatureArray, byte => String.fromCharCode(byte)).join(''));

      // Simple string comparison for Edge Runtime
      return calculatedHmac === hmacHeader;
    } catch (error) {
      console.error('[SHOPIFY] Webhook verification failed:', error);
      return false;
    }
  }
}