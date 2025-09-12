"use strict";
/**
 * Base Ability Class
 *
 * Abstract base class that provides common functionality for all agent abilities.
 * Each ability inherits from this class to get consistent error handling,
 * API calling capabilities, and user token management.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAbility = void 0;
// Browser environment helper
function isBrowser() {
    return typeof window !== 'undefined';
}
class BaseAbility {
    userToken;
    constructor(userToken) {
        this.userToken = userToken;
    }
    /**
     * Make API calls with consistent error handling
     */
    async fetchAPI(url, options) {
        try {
            // Determine correct base URL in server environments (Vercel, local, etc.)
            const isAbsolute = /^(https?:)\/\//i.test(url);
            const baseUrl = isBrowser() ? '' : getServerBaseUrl();
            const finalUrl = isAbsolute ? url : `${baseUrl}${url}`;
            const response = await fetch(finalUrl, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(options?.headers || {}),
                },
                ...options,
            });
            const data = await response.json();
            return data;
        }
        catch (error) {
            console.error(`API call failed for ${url}:`, error);
            throw error;
        }
    }
    /**
     * Standardized success response
     */
    success(data) {
        return { success: true, data };
    }
    /**
     * Standardized error response
     */
    error(message, error) {
        if (error) {
            console.error(message, error);
        }
        return { success: false, error: message };
    }
}
exports.BaseAbility = BaseAbility;
// Helper to determine base URL on the server
function getServerBaseUrl() {
    // Prefer explicitly configured app URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.SITE_URL;
    if (appUrl && typeof appUrl === 'string') {
        return appUrl.startsWith('http') ? appUrl : `https://${appUrl}`;
    }
    // Vercel provides VERCEL_URL without protocol
    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl && typeof vercelUrl === 'string') {
        return `https://${vercelUrl}`;
    }
    // Local development fallback
    return 'http://localhost:3000';
}
