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
      const baseUrl = isBrowser() ? '' : 'http://localhost:3000';
      const response = await fetch(`${baseUrl}${url}`, {
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