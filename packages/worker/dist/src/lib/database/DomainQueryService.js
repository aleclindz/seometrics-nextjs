"use strict";
/**
 * Universal Domain Query Service
 *
 * Eliminates sc-domain prefix issues by providing centralized domain lookup
 * functionality that handles all URL format variations automatically.
 *
 * This service replaces scattered `.eq('domain', ...)` queries throughout
 * the codebase with a single, reliable method that works regardless of
 * how domains are stored in the database.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainQueryService = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const UrlNormalizationService_1 = require("@/lib/UrlNormalizationService");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
class DomainQueryService {
    /**
     * Find a website by domain, trying all possible URL variations
     * This is the most commonly used method and replaces most direct domain queries
     */
    static async findWebsiteByDomain(userToken, domainInput, selectFields = '*') {
        try {
            if (!userToken || !domainInput) {
                return {
                    success: false,
                    data: null,
                    error: 'userToken and domainInput are required'
                };
            }
            // Generate all possible URL variations
            const variations = UrlNormalizationService_1.UrlNormalizationService.generateUrlVariations(domainInput);
            const searchTerms = [
                domainInput, // Direct input
                variations.domainProperty, // sc-domain:example.com
                variations.httpsUrl, // https://example.com  
                variations.httpUrl, // http://example.com
                variations.wwwHttpsUrl, // https://www.example.com
                variations.wwwHttpUrl, // http://www.example.com
                domainInput.replace(/^https?:\/\//, '').replace(/^www\./, ''), // Clean domain
                `sc-domain:${domainInput.replace(/^https?:\/\//, '').replace(/^www\./, '')}` // sc-domain clean
            ];
            // Remove duplicates
            const uniqueSearchTerms = Array.from(new Set(searchTerms));
            console.log(`[DOMAIN QUERY] Searching for website with domain variations:`, {
                input: domainInput,
                userToken: userToken.substring(0, 8) + '...',
                variations: uniqueSearchTerms.length
            });
            // Try each variation until we find a match
            for (const searchTerm of uniqueSearchTerms) {
                const { data, error } = await supabase
                    .from('websites')
                    .select(selectFields)
                    .eq('user_token', userToken)
                    .eq('domain', searchTerm)
                    .single();
                if (!error && data) {
                    console.log(`[DOMAIN QUERY] ✅ Found website with domain: ${searchTerm}`);
                    return {
                        success: true,
                        data: data,
                        matchedDomain: searchTerm
                    };
                }
            }
            console.log(`[DOMAIN QUERY] ❌ No website found for domain: ${domainInput}`);
            return {
                success: false,
                data: null,
                error: `No website found for domain: ${domainInput}`
            };
        }
        catch (error) {
            console.error('[DOMAIN QUERY] Error in findWebsiteByDomain:', error);
            return {
                success: false,
                data: null,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Find multiple websites by domains in a single operation
     * More efficient than multiple individual queries
     */
    static async findWebsitesByDomains(userToken, domainInputs, selectFields = '*') {
        try {
            if (!userToken || !domainInputs || domainInputs.length === 0) {
                return {
                    success: false,
                    results: [],
                    totalFound: 0,
                    error: 'userToken and domainInputs array are required'
                };
            }
            const results = [];
            let totalFound = 0;
            // Process each domain
            for (const domainInput of domainInputs) {
                const result = await this.findWebsiteByDomain(userToken, domainInput, selectFields);
                results.push({
                    inputDomain: domainInput,
                    data: result.data,
                    matchedDomain: result.matchedDomain
                });
                if (result.success) {
                    totalFound++;
                }
            }
            return {
                success: true,
                results,
                totalFound
            };
        }
        catch (error) {
            console.error('[DOMAIN QUERY] Error in findWebsitesByDomains:', error);
            return {
                success: false,
                results: [],
                totalFound: 0,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Generic domain query for any table with domain field
     * Use this for non-website tables that also need domain matching
     */
    static async queryTableByDomain(tableName, userToken, domainInput, selectFields = '*', additionalFilters) {
        try {
            if (!tableName || !userToken || !domainInput) {
                return {
                    success: false,
                    data: null,
                    error: 'tableName, userToken and domainInput are required'
                };
            }
            // Generate URL variations
            const variations = UrlNormalizationService_1.UrlNormalizationService.generateUrlVariations(domainInput);
            const searchTerms = [
                domainInput,
                variations.domainProperty,
                variations.httpsUrl,
                variations.httpUrl,
                variations.wwwHttpsUrl,
                variations.wwwHttpUrl
            ];
            const uniqueSearchTerms = Array.from(new Set(searchTerms));
            // Try each variation
            for (const searchTerm of uniqueSearchTerms) {
                let query = supabase
                    .from(tableName)
                    .select(selectFields)
                    .eq('user_token', userToken)
                    .eq('domain', searchTerm);
                // Apply additional filters if provided
                if (additionalFilters) {
                    Object.entries(additionalFilters).forEach(([key, value]) => {
                        query = query.eq(key, value);
                    });
                }
                const { data, error } = await query;
                if (!error && data && data.length > 0) {
                    return {
                        success: true,
                        data: data,
                        matchedDomain: searchTerm
                    };
                }
            }
            return {
                success: false,
                data: null,
                error: `No records found in ${tableName} for domain: ${domainInput}`
            };
        }
        catch (error) {
            console.error(`[DOMAIN QUERY] Error in queryTableByDomain for ${tableName}:`, error);
            return {
                success: false,
                data: null,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Check if a domain exists in the websites table
     * Lightweight version for existence checks
     */
    static async domainExists(userToken, domainInput) {
        try {
            const result = await this.findWebsiteByDomain(userToken, domainInput, 'id');
            return result.success && result.data !== null;
        }
        catch (error) {
            console.error('[DOMAIN QUERY] Error in domainExists:', error);
            return false;
        }
    }
    /**
     * Get all domain variations for debugging/logging
     */
    static getDomainVariations(domainInput) {
        const variations = UrlNormalizationService_1.UrlNormalizationService.generateUrlVariations(domainInput);
        return [
            domainInput,
            variations.domainProperty,
            variations.httpsUrl,
            variations.httpUrl,
            variations.wwwHttpsUrl,
            variations.wwwHttpUrl
        ];
    }
    /**
     * Update domain field using proper domain format
     * Helps when creating/updating records with domains
     */
    static async updateWebsiteDomain(userToken, websiteId, newDomain) {
        try {
            // Normalize the domain to sc-domain format for consistency
            const normalizedDomain = newDomain.startsWith('sc-domain:')
                ? newDomain
                : `sc-domain:${newDomain.replace(/^https?:\/\//, '').replace(/^www\./, '')}`;
            const { data, error } = await supabase
                .from('websites')
                .update({
                domain: normalizedDomain,
                updated_at: new Date().toISOString()
            })
                .eq('user_token', userToken)
                .eq(typeof websiteId === 'string' ? 'website_token' : 'id', websiteId)
                .select()
                .single();
            if (error) {
                return {
                    success: false,
                    data: null,
                    error: error.message
                };
            }
            return {
                success: true,
                data: data
            };
        }
        catch (error) {
            console.error('[DOMAIN QUERY] Error in updateWebsiteDomain:', error);
            return {
                success: false,
                data: null,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Create website with properly formatted domain
     */
    static async createWebsiteWithDomain(userToken, domainInput, additionalData) {
        try {
            // Normalize the domain to sc-domain format for consistency
            const normalizedDomain = domainInput.startsWith('sc-domain:')
                ? domainInput
                : `sc-domain:${domainInput.replace(/^https?:\/\//, '').replace(/^www\./, '')}`;
            const websiteData = {
                user_token: userToken,
                domain: normalizedDomain,
                ...additionalData
            };
            const { data, error } = await supabase
                .from('websites')
                .insert(websiteData)
                .select()
                .single();
            if (error) {
                return {
                    success: false,
                    data: null,
                    error: error.message
                };
            }
            return {
                success: true,
                data: data
            };
        }
        catch (error) {
            console.error('[DOMAIN QUERY] Error in createWebsiteWithDomain:', error);
            return {
                success: false,
                data: null,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Legacy compatibility wrapper
     * For gradual migration of existing code
     */
    static async legacyFindWebsite(userToken, domain) {
        const result = await this.findWebsiteByDomain(userToken, domain);
        return result.data;
    }
}
exports.DomainQueryService = DomainQueryService;
