// CMS Integration Types - Modular system for 1-click CMS connections

export type CMSType = 'wordpress' | 'wordpress_com' | 'webflow' | 'shopify' | 'strapi' | 'ghost';

export interface CMSCredentials {
  accessToken: string; // For Ghost: Admin API Key (format: id:secret)
  refreshToken?: string;
  siteUrl?: string; // For WordPress, Ghost
  siteId?: string; // For Webflow
  shopDomain?: string; // For Shopify
  strapiUrl?: string; // For Strapi
  username?: string; // For WordPress
  expiresAt?: Date;
  scope?: string;
  tokenType?: string;
  scopes?: string[];
}

export interface CMSConnection {
  id: string;
  userId: string;
  type: CMSType;
  name: string;
  credentials: CMSCredentials;
  isActive: boolean;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CMSArticle {
  id: string;
  title: string;
  content: string;
  slug?: string;
  status: 'draft' | 'published';
  publishedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  tags?: string[];
  categories?: string[];
  author?: string;
  excerpt?: string;
  featuredImage?: {
    url: string;
    alt?: string;
  };
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  url?: string;
  customFields?: {
    [key: string]: any;
  };
}

export interface CMSBlog {
  id: string;
  name: string;
  url?: string;
  description?: string;
}

export interface CMSPublishOptions {
  status?: 'draft' | 'published';
  publishedAt?: Date;
  tags?: string[];
  author?: string;
  blogId?: string; // For multi-blog platforms like Shopify
  collectionId?: string; // For Webflow
}

export interface CMSProvider {
  type: CMSType;
  name: string;
  
  // OAuth flow methods - flexible parameters for different providers
  getAuthUrl(redirectUri: string, state: string, ...args: any[]): string;
  exchangeCodeForToken(code: string, redirectUri: string): Promise<CMSCredentials>;
  refreshToken?(refreshToken: string): Promise<CMSCredentials>;
  
  // API methods
  validateToken(credentials: CMSCredentials): Promise<boolean>;
  getBlogs(credentials: CMSCredentials): Promise<CMSBlog[]>;
  getArticles(credentials: CMSCredentials, blogId?: string): Promise<CMSArticle[]>;
  publishArticle(credentials: CMSCredentials, article: Partial<CMSArticle>, options?: CMSPublishOptions): Promise<CMSArticle>;
  updateArticle(credentials: CMSCredentials, articleId: string, article: Partial<CMSArticle>): Promise<CMSArticle>;
  deleteArticle(credentials: CMSCredentials, articleId: string): Promise<void>;
}

export interface CMSIntegrationResult {
  success: boolean;
  data?: any;
  error?: string;
  connection?: CMSConnection;
}