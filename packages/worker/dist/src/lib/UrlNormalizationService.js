"use strict";
/**
 * URL Normalization Service for GSC Domain Property Matching
 *
 * Handles the complex URL format mismatches between:
 * - GSC API responses (e.g., "https://seoagent.com/sitemap.xml")
 * - Database records (e.g., "sc-domain:seoagent.com")
 * - User input variations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UrlNormalizationService = void 0;
class UrlNormalizationService {
    /**
     * Generate all possible URL variations for a given site URL
     */
    static generateUrlVariations(siteUrl) {
        // Clean the base URL
        const cleanUrl = this.cleanSiteUrl(siteUrl);
        const domain = this.extractDomain(cleanUrl);
        return {
            gscFormat: `https://${domain}`,
            domainProperty: `sc-domain:${domain}`,
            httpsUrl: `https://${domain}`,
            httpUrl: `http://${domain}`,
            wwwHttpsUrl: `https://www.${domain.replace('www.', '')}`,
            wwwHttpUrl: `http://www.${domain.replace('www.', '')}`,
            sitemapUrl: `https://${domain}/sitemap.xml`
        };
    }
    /**
     * Check if two URLs represent the same site
     */
    static isSameSite(url1, url2) {
        const variations1 = this.generateUrlVariations(url1);
        const variations2 = this.generateUrlVariations(url2);
        // Check if any variation of url1 matches any variation of url2
        const allVariations1 = Object.values(variations1);
        const allVariations2 = Object.values(variations2);
        return allVariations1.some(v1 => allVariations2.some(v2 => this.normalizeForComparison(v1) === this.normalizeForComparison(v2)));
    }
    /**
     * Find the best matching sitemap record from a list
     */
    static findMatchingSitemap(gscSitemapUrl, localSitemaps) {
        const gscDomain = this.extractDomain(gscSitemapUrl);
        const gscVariations = this.generateUrlVariations(gscDomain);
        console.log(`[URL NORMALIZATION] Looking for matches for GSC sitemap: ${gscSitemapUrl}`);
        console.log(`[URL NORMALIZATION] GSC domain extracted: ${gscDomain}`);
        console.log(`[URL NORMALIZATION] Generated variations:`, gscVariations);
        // Try exact sitemap URL match first
        let match = localSitemaps.find(sitemap => this.normalizeForComparison(sitemap.sitemap_url) === this.normalizeForComparison(gscSitemapUrl));
        if (match) {
            console.log(`[URL NORMALIZATION] Found exact sitemap URL match:`, match);
            return match;
        }
        // Try site URL matches with all variations
        const allGscVariations = Object.values(gscVariations);
        for (const sitemap of localSitemaps) {
            console.log(`[URL NORMALIZATION] Checking sitemap record:`, {
                site_url: sitemap.site_url,
                sitemap_url: sitemap.sitemap_url
            });
            const localVariations = this.generateUrlVariations(sitemap.site_url);
            const allLocalVariations = Object.values(localVariations);
            console.log(`[URL NORMALIZATION] Local variations:`, allLocalVariations);
            // Check if any GSC variation matches any local variation
            const hasMatch = allGscVariations.some(gscVar => allLocalVariations.some(localVar => this.normalizeForComparison(gscVar) === this.normalizeForComparison(localVar)));
            if (hasMatch) {
                console.log(`[URL NORMALIZATION] Found site URL match:`, sitemap);
                return sitemap;
            }
        }
        console.log(`[URL NORMALIZATION] No match found for ${gscSitemapUrl}`);
        return null;
    }
    /**
     * Clean and extract domain from various URL formats
     */
    static extractDomain(url) {
        if (url.startsWith('sc-domain:')) {
            return url.replace('sc-domain:', '');
        }
        if (url.startsWith('http://') || url.startsWith('https://')) {
            try {
                const urlObj = new URL(url);
                return urlObj.hostname;
            }
            catch {
                // Fallback for malformed URLs
                return url.replace(/https?:\/\//, '').split('/')[0];
            }
        }
        // Already a domain
        return url.replace(/\/$/, '');
    }
    /**
     * Clean site URL for processing
     */
    static cleanSiteUrl(siteUrl) {
        return siteUrl
            .replace(/\/$/, '') // Remove trailing slash
            .toLowerCase(); // Normalize case
    }
    /**
     * Normalize URL for comparison (removes protocol, www, trailing slashes)
     */
    static normalizeForComparison(url) {
        return url
            .toLowerCase()
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .replace(/^sc-domain:/, '')
            .replace(/\/sitemap\.xml$/, '')
            .replace(/\/$/, '');
    }
    /**
     * Convert domain property format to standard HTTPS URL
     */
    static domainPropertyToHttps(domainProperty) {
        if (domainProperty.startsWith('sc-domain:')) {
            const domain = domainProperty.replace('sc-domain:', '');
            return `https://${domain}`;
        }
        return domainProperty;
    }
    /**
     * Convert standard URL to domain property format
     */
    static urlToDomainProperty(url) {
        const domain = this.extractDomain(url);
        return `sc-domain:${domain}`;
    }
}
exports.UrlNormalizationService = UrlNormalizationService;
