/**
 * Function Caller - Executes OpenAI function calls
 * 
 * This class handles the execution of all function calls from the LLM,
 * routing them to the appropriate abilities for execution.
 * 
 * REFACTORED: Now uses the modular ability system for better organization.
 */

import { AbilityRegistry } from '../agent/abilities';
import type { FunctionCallResult } from '../agent/abilities';

export type { FunctionCallResult };

export class FunctionCaller {
  private userToken?: string;
  private abilityRegistry: AbilityRegistry;
  
  constructor(userToken?: string) {
    this.userToken = userToken;
    this.abilityRegistry = new AbilityRegistry(userToken);
  }
  
  async executeFunction(name: string, args: any): Promise<FunctionCallResult> {
    try {
      // Use the new ability system
      if (this.abilityRegistry.canExecuteFunction(name)) {
        return await this.abilityRegistry.executeFunction(name, args);
      }

      // Fallback for legacy functions that haven't been migrated yet
      return await this.executeLegacyFunction(name, args);
    } catch (error) {
      console.error(`Error executing function ${name}:`, error);
      return { 
        success: false, 
        error: `Function execution failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Get all available function names
   */
  getAvailableFunctions(): string[] {
    return this.abilityRegistry.getAllFunctionNames();
  }

  /**
   * Get abilities info for debugging
   */
  getAbilitiesInfo(): Record<string, string[]> {
    return this.abilityRegistry.getAbilitiesInfo();
  }

  /**
   * Fallback method for legacy functions that haven't been migrated yet
   */
  private async executeLegacyFunction(name: string, args: any): Promise<FunctionCallResult> {
    // Handle any legacy integrations functions that might still exist
    switch (name) {
      case 'list_integrations':
        return await this.listIntegrations(args);
      default:
        return {
          success: false,
          error: `Unknown function: ${name}. This function may not be implemented yet or has been deprecated.`
        };
    }
  }

  // Browser environment helper
  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  /**
   * Make API calls with consistent error handling
   */
  private async fetchAPI(url: string, options?: RequestInit): Promise<any> {
    try {
      const baseUrl = this.isBrowser() ? '' : 'http://localhost:3000';
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
   * Legacy function: List integrations (not yet moved to an ability)
   */
  private async listIntegrations(args: any): Promise<FunctionCallResult> {
    try {
      const params = new URLSearchParams();
      if (this.userToken) {
        params.append('userToken', this.userToken);
      }

      const response = await this.fetchAPI(`/api/integrations?${params}`, {
        method: 'GET'
      });

      return response.success ? 
        { success: true, data: response } :
        { success: false, error: response.error || 'Failed to list integrations' };
    } catch (error) {
      return { success: false, error: 'Failed to list integrations' };
    }
  }
}