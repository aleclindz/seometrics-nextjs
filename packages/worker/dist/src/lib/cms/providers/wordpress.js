"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WordPressProvider = void 0;
const base_provider_1 = require("../base-provider");
class WordPressProvider extends base_provider_1.BaseCMSProvider {
    type = 'wordpress';
    name = 'WordPress';
    constructor() {
        // WordPress doesn't use OAuth2 in the traditional sense
        // It uses Application Passwords with a custom flow
        super('', '', '');
    }
    /**
     * WordPress uses Application Password flow
     * Redirects to the site's authorize-application.php page
     */
    getAuthUrl(redirectUri, state, siteUrl) {
        const appName = encodeURIComponent('SEOAgent.com');
        const successUrl = encodeURIComponent(`${redirectUri}?state=${state}`);
        const rejectUrl = encodeURIComponent(`${redirectUri}?error=access_denied&state=${state}`);
        // Generate unique app ID for this connection attempt
        const appId = crypto.randomUUID();
        return `${siteUrl}/wp-admin/authorize-application.php?app_name=${appName}&success_url=${successUrl}&reject_url=${rejectUrl}&app_id=${appId}`;
    }
    /**
     * WordPress doesn't use a code exchange like OAuth2
     * Instead, it redirects back with site_url, user_login, and password in query params
     */
    async exchangeCodeForToken(code, redirectUri) {
        // This method is called with the query parameters from WordPress callback
        // Parse the URL to extract credentials
        const url = new URL(redirectUri);
        const siteUrl = url.searchParams.get('site_url');
        const userLogin = url.searchParams.get('user_login');
        const password = url.searchParams.get('password');
        if (!siteUrl || !userLogin || !password) {
            throw new Error('Invalid WordPress authorization response');
        }
        // Test the credentials by making a request to the WordPress REST API
        await this.testCredentials(siteUrl, userLogin, password);
        return {
            accessToken: password,
            siteUrl: siteUrl,
            username: userLogin,
            scopes: ['read', 'write'],
        };
    }
    async validateToken(credentials) {
        try {
            if (!credentials.siteUrl || !credentials.username || !credentials.accessToken) {
                return false;
            }
            await this.testCredentials(credentials.siteUrl, credentials.username, credentials.accessToken);
            return true;
        }
        catch (error) {
            console.error('[WORDPRESS] Token validation failed:', error);
            return false;
        }
    }
    async getBlogs(credentials) {
        // WordPress sites typically have one main blog
        // But we can get site info to provide a meaningful blog object
        const siteInfo = await this.makeAuthenticatedRequest(`${credentials.siteUrl}/wp-json/wp/v2/`, 'GET', credentials);
        return [{
                id: 'main',
                name: siteInfo.name || 'WordPress Blog',
                url: credentials.siteUrl,
                description: siteInfo.description || '',
            }];
    }
    async getArticles(credentials, blogId) {
        const posts = await this.makeAuthenticatedRequest(`${credentials.siteUrl}/wp-json/wp/v2/posts?per_page=20&_embed`, 'GET', credentials);
        return posts.map((post) => ({
            id: post.id.toString(),
            title: post.title.rendered,
            content: post.content.rendered,
            slug: post.slug,
            status: post.status === 'publish' ? 'published' : 'draft',
            publishedAt: post.status === 'publish' ? new Date(post.date) : undefined,
            tags: post._embedded?.['wp:term']?.[1]?.map((tag) => tag.name) || [],
            author: post._embedded?.author?.[0]?.name || '',
            excerpt: post.excerpt.rendered ? this.stripHtml(post.excerpt.rendered) : '',
            featuredImage: post._embedded?.['wp:featuredmedia']?.[0]?.source_url,
            meta: {
                title: post.yoast_head_json?.title || post.title.rendered,
                description: post.yoast_head_json?.description || this.stripHtml(post.excerpt.rendered || '').substring(0, 160),
            },
        }));
    }
    async publishArticle(credentials, article, options) {
        const postData = {
            title: article.title,
            content: article.content,
            slug: article.slug || this.generateSlug(article.title || ''),
            status: options?.status || 'publish',
            date: options?.publishedAt?.toISOString() || new Date().toISOString(),
            excerpt: article.excerpt || '',
            meta: {
                _yoast_wpseo_title: article.seo?.title || article.title,
                _yoast_wpseo_metadesc: article.seo?.description || article.excerpt,
            },
        };
        // Handle tags if provided
        if (options?.tags?.length) {
            // First, get or create tags
            const tagIds = await this.getOrCreateTags(credentials, options.tags);
            postData.tags = tagIds;
        }
        const createdPost = await this.makeAuthenticatedRequest(`${credentials.siteUrl}/wp-json/wp/v2/posts`, 'POST', credentials, postData);
        return {
            id: createdPost.id.toString(),
            title: createdPost.title.rendered,
            content: createdPost.content.rendered,
            slug: createdPost.slug,
            status: createdPost.status === 'publish' ? 'published' : 'draft',
            publishedAt: createdPost.status === 'publish' ? new Date(createdPost.date) : undefined,
            tags: options?.tags || [],
            author: options?.author || '',
            excerpt: createdPost.excerpt.rendered ? this.stripHtml(createdPost.excerpt.rendered) : '',
        };
    }
    async updateArticle(credentials, articleId, article) {
        const updateData = {};
        if (article.title)
            updateData.title = article.title;
        if (article.content)
            updateData.content = article.content;
        if (article.slug)
            updateData.slug = article.slug;
        if (article.status)
            updateData.status = article.status === 'published' ? 'publish' : 'draft';
        if (article.excerpt)
            updateData.excerpt = article.excerpt;
        const updatedPost = await this.makeAuthenticatedRequest(`${credentials.siteUrl}/wp-json/wp/v2/posts/${articleId}`, 'PUT', credentials, updateData);
        return {
            id: updatedPost.id.toString(),
            title: updatedPost.title.rendered,
            content: updatedPost.content.rendered,
            slug: updatedPost.slug,
            status: updatedPost.status === 'publish' ? 'published' : 'draft',
            publishedAt: updatedPost.status === 'publish' ? new Date(updatedPost.date) : undefined,
        };
    }
    async deleteArticle(credentials, articleId) {
        await this.makeAuthenticatedRequest(`${credentials.siteUrl}/wp-json/wp/v2/posts/${articleId}?force=true`, 'DELETE', credentials);
    }
    // WordPress-specific helper methods
    async testCredentials(siteUrl, username, password) {
        const auth = btoa(`${username}:${password}`);
        const response = await fetch(`${siteUrl}/wp-json/wp/v2/users/me`, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            throw new Error(`WordPress authentication failed: ${response.status}`);
        }
    }
    async makeAuthenticatedRequest(url, method, credentials, body) {
        const auth = btoa(`${credentials.username}:${credentials.accessToken}`);
        const options = {
            method,
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
            },
        };
        if (body && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(body);
        }
        return this.makeRequest(url, options);
    }
    async getOrCreateTags(credentials, tagNames) {
        const tagIds = [];
        for (const tagName of tagNames) {
            // First try to find existing tag
            const existingTags = await this.makeAuthenticatedRequest(`${credentials.siteUrl}/wp-json/wp/v2/tags?search=${encodeURIComponent(tagName)}`, 'GET', credentials);
            if (existingTags.length > 0) {
                tagIds.push(existingTags[0].id);
            }
            else {
                // Create new tag
                const newTag = await this.makeAuthenticatedRequest(`${credentials.siteUrl}/wp-json/wp/v2/tags`, 'POST', credentials, { name: tagName });
                tagIds.push(newTag.id);
            }
        }
        return tagIds;
    }
}
exports.WordPressProvider = WordPressProvider;
