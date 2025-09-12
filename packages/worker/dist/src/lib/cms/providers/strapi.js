"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StrapiProvider = void 0;
const base_provider_1 = require("../base-provider");
class StrapiProvider extends base_provider_1.BaseCMSProvider {
    type = 'strapi';
    name = 'Strapi CMS';
    constructor(baseUrl = 'http://localhost:1337') {
        // Strapi doesn't need OAuth for internal use, but we maintain the interface
        super('', '', baseUrl);
    }
    getAuthUrl(redirectUri, state) {
        // For Strapi, we'll use direct API token authentication
        // This is a simplified flow for internal use
        return `${this.baseUrl}/admin/auth/login?redirect=${encodeURIComponent(redirectUri)}&state=${state}`;
    }
    async exchangeCodeForToken(code, redirectUri) {
        // In a real implementation, this would exchange a code for a JWT token
        // For now, we'll assume the code is actually an API token
        return {
            accessToken: code,
            refreshToken: '',
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            scope: 'full-access',
            tokenType: 'Bearer'
        };
    }
    async validateToken(credentials) {
        try {
            const response = await this.makeRequest(`${this.baseUrl}/api/articles?pagination[limit]=1`, {
                headers: {
                    'Authorization': `Bearer ${credentials.accessToken}`
                }
            });
            return !!response;
        }
        catch (error) {
            return false;
        }
    }
    async getBlogs(credentials) {
        // Strapi doesn't have the concept of separate blogs, so we return a default one
        return [{
                id: 'default',
                name: 'SEOAgent Blog',
                url: `${this.baseUrl}`,
                description: 'Main blog for SEOAgent articles'
            }];
    }
    async getArticles(credentials, blogId) {
        try {
            const response = await this.makeRequest(`${this.baseUrl}/api/articles?populate=*`, {
                headers: {
                    'Authorization': `Bearer ${credentials.accessToken}`
                }
            });
            return response.data.map((item) => this.transformStrapiArticle(item));
        }
        catch (error) {
            console.error('Failed to fetch Strapi articles:', error);
            return [];
        }
    }
    async publishArticle(credentials, article, options) {
        try {
            const strapiData = this.transformToStrapiFormat(article);
            const response = await this.makeRequest(`${this.baseUrl}/api/articles`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${credentials.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ data: strapiData })
            });
            return this.transformStrapiArticle(response.data);
        }
        catch (error) {
            console.error('Failed to publish article to Strapi:', error);
            throw error;
        }
    }
    async updateArticle(credentials, articleId, article) {
        try {
            const strapiData = this.transformToStrapiFormat(article);
            const response = await this.makeRequest(`${this.baseUrl}/api/articles/${articleId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${credentials.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ data: strapiData })
            });
            return this.transformStrapiArticle(response.data);
        }
        catch (error) {
            console.error('Failed to update article in Strapi:', error);
            throw error;
        }
    }
    async deleteArticle(credentials, articleId) {
        try {
            await this.makeRequest(`${this.baseUrl}/api/articles/${articleId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${credentials.accessToken}`
                }
            });
        }
        catch (error) {
            console.error('Failed to delete article from Strapi:', error);
            throw error;
        }
    }
    transformStrapiArticle(strapiArticle) {
        const attributes = strapiArticle.attributes;
        return {
            id: strapiArticle.id.toString(),
            title: attributes.title,
            content: attributes.content,
            excerpt: attributes.excerpt || '',
            slug: attributes.slug,
            status: attributes.publishedAt ? 'published' : 'draft',
            publishedAt: attributes.publishedAt ? new Date(attributes.publishedAt) : undefined,
            createdAt: new Date(attributes.createdAt),
            updatedAt: new Date(attributes.updatedAt),
            author: attributes.author || 'SEOAgent',
            tags: attributes.tags?.data?.map((tag) => tag.attributes.name) || [],
            categories: attributes.category?.data ? [attributes.category.data.attributes.name] : [],
            featuredImage: attributes.featuredImage?.data ? {
                url: `${this.baseUrl}${attributes.featuredImage.data.attributes.url}`,
                alt: attributes.featuredImage.data.attributes.alternativeText || ''
            } : undefined,
            seo: {
                title: attributes.metaTitle || attributes.title,
                description: attributes.metaDescription || attributes.excerpt,
                keywords: attributes.keywords || []
            },
            url: attributes.publicUrl || `${this.baseUrl}/articles/${attributes.slug}`,
            customFields: {
                primaryKeyword: attributes.primaryKeyword,
                wordCount: attributes.wordCount,
                readingTime: attributes.readingTime,
                seoScore: attributes.seoScore,
                seoAgentData: attributes.seoAgentData,
                externalId: attributes.externalId
            }
        };
    }
    transformToStrapiFormat(article) {
        const strapiData = {
            title: article.title,
            content: article.content,
            excerpt: article.excerpt,
            slug: article.slug || this.generateSlug(article.title || ''),
            metaTitle: article.seo?.title,
            metaDescription: article.seo?.description,
            keywords: article.seo?.keywords,
            author: article.author || 'SEOAgent',
            publicUrl: article.url,
            publishedAt: article.status === 'published' ? new Date().toISOString() : null
        };
        // Add custom fields if present
        if (article.customFields) {
            strapiData.primaryKeyword = article.customFields.primaryKeyword;
            strapiData.wordCount = article.customFields.wordCount;
            strapiData.readingTime = article.customFields.readingTime;
            strapiData.seoScore = article.customFields.seoScore;
            strapiData.seoAgentData = article.customFields.seoAgentData;
            strapiData.externalId = article.customFields.externalId;
        }
        return strapiData;
    }
    // Helper method to create API token (for setup)
    async createApiToken(adminCredentials) {
        try {
            // First login to get admin JWT
            const loginResponse = await this.makeRequest(`${this.baseUrl}/admin/login`, {
                method: 'POST',
                body: JSON.stringify({
                    email: adminCredentials.email,
                    password: adminCredentials.password
                })
            });
            // Create API token
            const tokenResponse = await this.makeRequest(`${this.baseUrl}/admin/api-tokens`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${loginResponse.data.token}`
                },
                body: JSON.stringify({
                    name: 'SEOAgent Integration',
                    description: 'API token for SEOAgent article publishing',
                    type: 'full-access',
                    lifespan: null // Never expires
                })
            });
            return tokenResponse.data.accessKey;
        }
        catch (error) {
            console.error('Failed to create Strapi API token:', error);
            throw error;
        }
    }
}
exports.StrapiProvider = StrapiProvider;
