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
