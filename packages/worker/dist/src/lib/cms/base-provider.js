"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseCMSProvider = void 0;
class BaseCMSProvider {
    // OAuth configuration
    clientId;
    clientSecret;
    baseUrl;
    constructor(clientId, clientSecret, baseUrl) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.baseUrl = baseUrl;
    }
    // Common utility methods
    async makeRequest(url, options = {}) {
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
        }
        catch (error) {
            console.error(`[${this.type.toUpperCase()}] API Request failed:`, error);
            throw error;
        }
    }
    generateState() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
    validateState(receivedState, expectedState) {
        return receivedState === expectedState;
    }
    // Helper to format content for the specific CMS
    formatContent(content) {
        // Base implementation - providers can override
        return content;
    }
    // Helper to extract text from HTML
    stripHtml(html) {
        return html.replace(/<[^>]*>/g, '').trim();
    }
    // Helper to generate slug from title
    generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }
}
exports.BaseCMSProvider = BaseCMSProvider;
