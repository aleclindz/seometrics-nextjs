/**
 * Agent Abilities Registry
 * 
 * Central registry for all agent abilities. This provides a unified interface
 * for discovering and executing functions across all abilities.
 */

import { BaseAbility, FunctionCallResult } from './base-ability';
import { GSCAbility } from './gsc-ability';
import { ContentAbility } from './content-ability';
import { PerformanceAbility } from './performance-ability';
import { TechnicalSEOAbility } from './technical-seo-ability';
import { IdeasAbility } from './ideas-ability';
import { SVSAbility } from './svs-ability';
import { KeywordStrategyAbility } from './keyword-strategy-ability';
import { IntelligentAgentAbility } from './intelligent-agent-ability';

export class AbilityRegistry {
  private abilities: BaseAbility[] = [];
  private functionToAbilityMap: Map<string, BaseAbility> = new Map();

  constructor(userToken?: string) {
    // Initialize all abilities
    this.abilities = [
      new GSCAbility(userToken),
      new ContentAbility(userToken),
      new PerformanceAbility(userToken),
      new TechnicalSEOAbility(userToken),
      new IdeasAbility(userToken),
      new KeywordStrategyAbility(userToken),
      new IntelligentAgentAbility(userToken),
    ];

    // Build function-to-ability mapping
    this.buildFunctionMap();
  }

  private buildFunctionMap(): void {
    this.functionToAbilityMap.clear();
    
    for (const ability of this.abilities) {
      const functionNames = ability.getFunctionNames();
      for (const functionName of functionNames) {
        this.functionToAbilityMap.set(functionName, ability);
      }
    }
  }

  /**
   * Get all available function names across all abilities
   */
  getAllFunctionNames(): string[] {
    return Array.from(this.functionToAbilityMap.keys());
  }

  /**
   * Check if a function is supported
   */
  canExecuteFunction(functionName: string): boolean {
    return this.functionToAbilityMap.has(functionName);
  }

  /**
   * Execute a function using the appropriate ability
   */
  async executeFunction(functionName: string, args: any): Promise<FunctionCallResult> {
    const ability = this.functionToAbilityMap.get(functionName);
    
    if (!ability) {
      return {
        success: false,
        error: `Unknown function: ${functionName}`
      };
    }

    try {
      return await ability.executeFunction(functionName, args);
    } catch (error) {
      console.error(`Error executing function ${functionName}:`, error);
      return {
        success: false,
        error: `Function execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get abilities organized by category for debugging
   */
  getAbilitiesInfo(): Record<string, string[]> {
    const info: Record<string, string[]> = {};
    
    for (const ability of this.abilities) {
      const className = ability.constructor.name;
      info[className] = ability.getFunctionNames();
    }
    
    return info;
  }
}

// Export the ability classes for direct use if needed
export { BaseAbility } from './base-ability';
export type { FunctionCallResult } from './base-ability';
export * from './gsc-ability';
export * from './content-ability';
export * from './performance-ability';
export * from './technical-seo-ability';
export * from './ideas-ability';
export * from './keyword-strategy-ability';
export * from './intelligent-agent-ability';