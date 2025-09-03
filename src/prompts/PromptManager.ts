/**
 * Prompt Management System
 * 
 * Centralizes all OpenAI system prompts with:
 * - Variable injection
 * - Version management
 * - Environment-specific modifications
 * - Validation
 */

import { PromptVariables, PromptTemplate, ValidationResult, PromptConfig } from './types';
import { injectVariables, validateVariables, extractVariables } from './utils/variables';
import { cleanPromptText, applyEnvironmentModifications } from './utils/formatters';

export class PromptManager {
  private prompts: Map<string, PromptTemplate> = new Map();
  private config: PromptConfig | null = null;
  private environment: string;

  constructor(environment: string = process.env.NODE_ENV || 'production') {
    this.environment = environment;
    this.loadPrompts();
  }

  /**
   * Load prompts from configuration
   * In the future, this could load from JSON files or database
   */
  private loadPrompts(): void {
    // For now, prompts will be loaded from TypeScript files
    // This will be replaced with JSON loading in the next phase
  }

  /**
   * Register a prompt template
   */
  registerPrompt(prompt: PromptTemplate): void {
    const key = `${prompt.category}.${prompt.name}`;
    this.prompts.set(key, prompt);
  }

  /**
   * Get a prompt with variable injection
   */
  getPrompt(
    category: string, 
    name: string, 
    variables: PromptVariables = {}
  ): string {
    const key = `${category}.${name}`;
    const template = this.prompts.get(key);
    
    if (!template) {
      console.warn(`Prompt not found: ${key}. Available prompts:`, this.listAllPrompts());
      throw new Error(`Prompt not found: ${key}`);
    }

    let prompt = template.template;
    
    // Inject variables
    prompt = injectVariables(prompt, variables);
    
    // Clean up formatting
    prompt = cleanPromptText(prompt);
    
    // Apply environment-specific modifications
    prompt = applyEnvironmentModifications(prompt, this.environment);
    
    return prompt;
  }

  /**
   * List all available categories
   */
  listCategories(): string[] {
    const categories = new Set<string>();
    this.prompts.forEach(prompt => categories.add(prompt.category));
    return Array.from(categories).sort();
  }

  /**
   * List prompts in a category
   */
  listPrompts(category: string): string[] {
    const prompts: string[] = [];
    this.prompts.forEach(prompt => {
      if (prompt.category === category) {
        prompts.push(prompt.name);
      }
    });
    return prompts.sort();
  }

  /**
   * List all prompts
   */
  listAllPrompts(): string[] {
    return Array.from(this.prompts.keys()).sort();
  }

  /**
   * Get prompt template information
   */
  getPromptInfo(category: string, name: string): PromptTemplate | null {
    const key = `${category}.${name}`;
    return this.prompts.get(key) || null;
  }

  /**
   * Validate a prompt template
   */
  validatePrompt(
    category: string, 
    name: string, 
    variables: PromptVariables = {}
  ): ValidationResult {
    const key = `${category}.${name}`;
    const template = this.prompts.get(key);
    
    if (!template) {
      return {
        isValid: false,
        errors: [`Prompt not found: ${key}`],
        warnings: [],
        missingVariables: []
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check for variable validation
    const variableCheck = validateVariables(template.template, variables);
    
    if (!variableCheck.isValid) {
      warnings.push(`Missing variables: ${variableCheck.missingVariables.join(', ')}`);
    }

    // Check template syntax
    try {
      injectVariables(template.template, variables);
    } catch (error) {
      errors.push(`Template syntax error: ${error}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      missingVariables: variableCheck.missingVariables
    };
  }

  /**
   * Get required variables for a prompt
   */
  getRequiredVariables(category: string, name: string): string[] {
    const template = this.getPromptInfo(category, name);
    if (!template) return [];
    
    return extractVariables(template.template);
  }

  /**
   * Update environment
   */
  setEnvironment(environment: string): void {
    this.environment = environment;
  }

  /**
   * Get current environment
   */
  getEnvironment(): string {
    return this.environment;
  }

  /**
   * Check if a prompt exists
   */
  hasPrompt(category: string, name: string): boolean {
    const key = `${category}.${name}`;
    return this.prompts.has(key);
  }
}