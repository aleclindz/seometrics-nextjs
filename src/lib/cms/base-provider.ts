import { CMSProvider, CMSCredentials, CMSBlog, CMSArticle, CMSPublishOptions, CMSType } from './types';

export abstract class BaseCMSProvider implements CMSProvider {
  abstract type: CMSType;
  abstract name: string;

  // OAuth configuration
  protected clientId: string;
  protected clientSecret: string;
  protected baseUrl: string;

  constructor(clientId: string, clientSecret: string, baseUrl: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.baseUrl = baseUrl;
  }

  // Abstract methods that each provider must implement
  abstract getAuthUrl(redirectUri: string, state: string, ...args: any[]): string;
  abstract exchangeCodeForToken(code: string, redirectUri: string): Promise<CMSCredentials>;
  abstract validateToken(credentials: CMSCredentials): Promise<boolean>;
  abstract getBlogs(credentials: CMSCredentials): Promise<CMSBlog[]>;
  abstract getArticles(credentials: CMSCredentials, blogId?: string): Promise<CMSArticle[]>;
  abstract publishArticle(credentials: CMSCredentials, article: Partial<CMSArticle>, options?: CMSPublishOptions): Promise<CMSArticle>;
  abstract updateArticle(credentials: CMSCredentials, articleId: string, article: Partial<CMSArticle>): Promise<CMSArticle>;
  abstract deleteArticle(credentials: CMSCredentials, articleId: string): Promise<void>;

  // Optional refresh token method
  refreshToken?(refreshToken: string): Promise<CMSCredentials>;

  // Common utility methods
  protected async makeRequest(url: string, options: RequestInit = {}): Promise<any> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SEOAgent/1.0',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      console.error(`[${this.type.toUpperCase()}] API Request failed:`, error);
      throw error;
    }
  }

  protected generateState(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  protected validateState(receivedState: string, expectedState: string): boolean {
    return receivedState === expectedState;
  }

  // Helper to format content for the specific CMS
  protected formatContent(content: string): string {
    // Base implementation - providers can override
    return content;
  }

  // Helper to extract text from HTML
  protected stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  // Helper to generate slug from title
  protected generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}