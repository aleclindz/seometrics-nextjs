/**
 * DomainUtils - Centralized domain handling utility
 * 
 * Eliminates sc-domain: prefix issues and provides consistent domain processing
 * throughout the SEOAgent application.
 */

export class DomainUtils {
  /**
   * Clean domain by removing all common prefixes
   * @param domain - Domain with potential prefixes (sc-domain:, https://, www.)
   * @returns Clean domain suitable for URL construction
   */
  static cleanDomain(domain: string): string {
    if (!domain) return '';
    
    return domain
      .replace(/^sc-domain:/, '')     // Remove sc-domain: prefix
      .replace(/^https?:\/\//, '')    // Remove protocol
      .replace(/^www\./, '');         // Remove www prefix
  }

  /**
   * Build a complete URL from domain and optional path
   * @param domain - Domain (will be cleaned automatically)
   * @param path - Optional path (should start with /)
   * @returns Complete HTTPS URL
   */
  static buildUrl(domain: string, path: string = ''): string {
    const cleanDomain = this.cleanDomain(domain);
    if (!cleanDomain) return '';
    
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `https://${cleanDomain}${normalizedPath}`;
  }

  /**
   * Build URL for SEOAgent.js script detection
   * @param domain - Domain (will be cleaned automatically) 
   * @returns URL to seoagent.js file
   */
  static buildSEOAgentUrl(domain: string): string {
    return this.buildUrl(domain, '/seoagent.js');
  }

  /**
   * Check if domain has sc-domain: prefix
   * @param domain - Domain to check
   * @returns true if domain has sc-domain: prefix
   */
  static hasScDomainPrefix(domain: string): boolean {
    return domain?.startsWith('sc-domain:') || false;
  }

  /**
   * Add sc-domain: prefix if not present (for GSC compatibility)
   * @param domain - Clean domain
   * @returns Domain with sc-domain: prefix
   */
  static addScDomainPrefix(domain: string): string {
    if (this.hasScDomainPrefix(domain)) {
      return domain;
    }
    const cleanDomain = this.cleanDomain(domain);
    return `sc-domain:${cleanDomain}`;
  }

  /**
   * Normalize domain for database queries
   * Handles both clean domains and sc-domain: prefixed domains
   * @param domain - Input domain in any format
   * @returns Object with both clean and prefixed versions
   */
  static normalizeDomain(domain: string): {
    clean: string;
    prefixed: string;
    original: string;
  } {
    const clean = this.cleanDomain(domain);
    const prefixed = this.addScDomainPrefix(clean);
    
    return {
      clean,
      prefixed,
      original: domain
    };
  }

  /**
   * Extract domain from URL or return as-is if already a domain
   * @param urlOrDomain - URL or domain string
   * @returns Clean domain
   */
  static extractDomain(urlOrDomain: string): string {
    if (!urlOrDomain) return '';
    
    // If it's already a clean domain, return it
    if (!urlOrDomain.includes('://') && !urlOrDomain.startsWith('sc-domain:')) {
      return this.cleanDomain(urlOrDomain);
    }
    
    // If it's a URL, extract the hostname
    if (urlOrDomain.includes('://')) {
      try {
        const url = new URL(urlOrDomain);
        return this.cleanDomain(url.hostname);
      } catch (error) {
        // Fallback to string cleaning if URL parsing fails
        return this.cleanDomain(urlOrDomain);
      }
    }
    
    // Otherwise clean normally (handles sc-domain: prefix)
    return this.cleanDomain(urlOrDomain);
  }

  /**
   * Validate if a domain is valid for URL construction
   * @param domain - Domain to validate
   * @returns true if domain is valid
   */
  static isValidDomain(domain: string): boolean {
    const clean = this.cleanDomain(domain);
    if (!clean) return false;
    
    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(clean);
  }
}