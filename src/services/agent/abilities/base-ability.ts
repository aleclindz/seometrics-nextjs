/**
 * Base Ability Class
 * 
 * Abstract base class that provides common functionality for all agent abilities.
 * Each ability inherits from this class to get consistent error handling,
 * API calling capabilities, and user token management.
 */

export interface FunctionCallResult {
  success: boolean;
  data?: any;
  error?: string;
}

// Browser environment helper
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export abstract class BaseAbility {
  protected userToken?: string;
  
  constructor(userToken?: string) {
    this.userToken = userToken;
  }

  /**
   * Make API calls with consistent error handling
   */
  protected async fetchAPI(url: string, options?: RequestInit): Promise<any> {
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
    } catch (error) {
      console.error(`API call failed for ${url}:`, error);
      throw error;
    }
  }

  /**
   * Standardized success response
   */
  protected success(data?: any): FunctionCallResult {
    return { success: true, data };
  }

  /**
   * Standardized error response
   */
  protected error(message: string, error?: any): FunctionCallResult {
    if (error) {
      console.error(message, error);
    }
    return { success: false, error: message };
  }

  /**
   * Resolve websiteToken from various sources with smart fallbacks
   * Priority: provided token > conversation context > site_url > first website
   */
  protected async resolveWebsiteToken(args: {
    website_token?: string;
    site_url?: string;
    conversation_id?: string;
  }): Promise<string | null> {
    // Priority 1: Use provided website_token
    if (args.website_token) {
      return args.website_token;
    }

    // Priority 2: Lookup from conversation context
    if (args.conversation_id) {
      try {
        const conversationLookup = await this.fetchAPI(
          `/api/agent/conversations/website?conversationId=${args.conversation_id}&userToken=${this.userToken}`
        );
        if (conversationLookup?.success && conversationLookup.websiteToken) {
          console.log('[BaseAbility] Resolved websiteToken from conversation context');
          return conversationLookup.websiteToken;
        }
      } catch (error) {
        console.log('[BaseAbility] Failed to resolve from conversation:', error);
      }
    }

    // Priority 3: Resolve from site_url
    if (args.site_url) {
      try {
        const sites = await this.fetchAPI(`/api/websites?userToken=${this.userToken}`);
        if (sites?.success && sites.websites?.length) {
          const cleanUrl = (url: string) =>
            url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
          const target = cleanUrl(args.site_url);
          const site = sites.websites.find((w: any) =>
            cleanUrl(w.domain) === target || w.cleaned_domain === target
          );
          if (site?.website_token) {
            console.log('[BaseAbility] Resolved websiteToken from site_url');
            return site.website_token;
          }
        }
      } catch (error) {
        console.log('[BaseAbility] Failed to resolve from site_url:', error);
      }
    }

    // Priority 4: Fallback to user's first website
    try {
      const sites = await this.fetchAPI(`/api/websites?userToken=${this.userToken}`);
      if (sites?.success && sites.websites?.length > 0) {
        console.log('[BaseAbility] Using fallback to first website');
        return sites.websites[0].website_token;
      }
    } catch (error) {
      console.log('[BaseAbility] Fallback failed:', error);
    }

    return null;
  }

  /**
   * Abstract method that each ability must implement
   * Returns the functions this ability can handle
   */
  abstract getFunctionNames(): string[];

  /**
   * Abstract method that each ability must implement
   * Executes a function call for this ability
   */
  abstract executeFunction(name: string, args: any): Promise<FunctionCallResult>;
}

// Helper to determine base URL on the server
function getServerBaseUrl(): string {
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
