"use strict";
/**
 * Prompt Management System
 *
 * Centralizes all OpenAI system prompts with:
 * - Variable injection
 * - Version management
 * - Environment-specific modifications
 * - Validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptManager = void 0;
const variables_1 = require("./utils/variables");
const formatters_1 = require("./utils/formatters");
class PromptManager {
    constructor(environment = process.env.NODE_ENV || 'production') {
        this.prompts = new Map();
        this.config = null;
        this.environment = environment;
        this.loadPrompts();
    }
    /**
     * Load prompts from configuration
     * In the future, this could load from JSON files or database
     */
    loadPrompts() {
        // For now, prompts will be loaded from TypeScript files
        // This will be replaced with JSON loading in the next phase
    }
    /**
     * Register a prompt template
     */
    registerPrompt(prompt) {
        const key = `${prompt.category}.${prompt.name}`;
        this.prompts.set(key, prompt);
    }
    /**
     * Get a prompt with variable injection
     */
    getPrompt(category, name, variables = {}) {
        const key = `${category}.${name}`;
        const template = this.prompts.get(key);
        if (!template) {
            console.warn(`Prompt not found: ${key}. Available prompts:`, this.listAllPrompts());
            throw new Error(`Prompt not found: ${key}`);
        }
        let prompt = template.template;
        // Inject variables
        prompt = (0, variables_1.injectVariables)(prompt, variables);
        // Clean up formatting
        prompt = (0, formatters_1.cleanPromptText)(prompt);
        // Apply environment-specific modifications
        prompt = (0, formatters_1.applyEnvironmentModifications)(prompt, this.environment);
        return prompt;
    }
    /**
     * List all available categories
     */
    listCategories() {
        const categories = new Set();
        this.prompts.forEach(prompt => categories.add(prompt.category));
        return Array.from(categories).sort();
    }
    /**
     * List prompts in a category
     */
    listPrompts(category) {
        const prompts = [];
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
    listAllPrompts() {
        return Array.from(this.prompts.keys()).sort();
    }
    /**
     * Get prompt template information
     */
    getPromptInfo(category, name) {
        const key = `${category}.${name}`;
        return this.prompts.get(key) || null;
    }
    /**
     * Validate a prompt template
     */
    validatePrompt(category, name, variables = {}) {
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
        const errors = [];
        const warnings = [];
        // Check for variable validation
        const variableCheck = (0, variables_1.validateVariables)(template.template, variables);
        if (!variableCheck.isValid) {
            warnings.push(`Missing variables: ${variableCheck.missingVariables.join(', ')}`);
        }
        // Check template syntax
        try {
            (0, variables_1.injectVariables)(template.template, variables);
        }
        catch (error) {
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
    getRequiredVariables(category, name) {
        const template = this.getPromptInfo(category, name);
        if (!template)
            return [];
        return (0, variables_1.extractVariables)(template.template);
    }
    /**
     * Update environment
     */
    setEnvironment(environment) {
        this.environment = environment;
    }
    /**
     * Get current environment
     */
    getEnvironment() {
        return this.environment;
    }
    /**
     * Check if a prompt exists
     */
    hasPrompt(category, name) {
        const key = `${category}.${name}`;
        return this.prompts.has(key);
    }
}
exports.PromptManager = PromptManager;
