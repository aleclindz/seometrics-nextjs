/**
 * Main Prompts Export
 * 
 * Central entry point for the prompt management system
 */

export { PromptManager } from './PromptManager';
export * from './types';
export * from './utils/variables';
export * from './utils/formatters';

// Category exports
export { registerAgentPrompts } from './categories/agent';
export { registerContentPrompts } from './categories/content';
export { registerTechnicalSeoPrompts } from './categories/technical-seo';

import { PromptManager } from './PromptManager';
import { registerAgentPrompts } from './categories/agent';
import { registerContentPrompts } from './categories/content';
import { registerTechnicalSeoPrompts } from './categories/technical-seo';

/**
 * Create a fully initialized prompt manager with all prompts registered
 */
export function createPromptManager(environment?: string): PromptManager {
  const manager = new PromptManager(environment);
  
  // Register all prompt categories
  registerAgentPrompts(manager);
  registerContentPrompts(manager);
  registerTechnicalSeoPrompts(manager);
  
  return manager;
}

/**
 * Global prompt manager instance
 * Lazy-loaded to ensure proper initialization
 */
let globalPromptManager: PromptManager | null = null;

export function getPromptManager(): PromptManager {
  if (!globalPromptManager) {
    globalPromptManager = createPromptManager();
  }
  return globalPromptManager;
}