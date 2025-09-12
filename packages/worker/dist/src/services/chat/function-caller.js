"use strict";
/**
 * Function Caller - Executes OpenAI function calls
 *
 * This class handles the execution of all function calls from the LLM,
 * routing them to the appropriate abilities for execution.
 *
 * REFACTORED: Now uses the modular ability system for better organization.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunctionCaller = void 0;
const abilities_1 = require("../agent/abilities");
class FunctionCaller {
    userToken;
    abilityRegistry;
    constructor(userToken) {
        this.userToken = userToken;
        this.abilityRegistry = new abilities_1.AbilityRegistry(userToken);
    }
    async executeFunction(name, args) {
        try {
            // Use the new ability system
            if (this.abilityRegistry.canExecuteFunction(name)) {
                return await this.abilityRegistry.executeFunction(name, args);
            }
            // Fallback for legacy functions that haven't been migrated yet
            return await this.executeLegacyFunction(name, args);
        }
        catch (error) {
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
    getAvailableFunctions() {
        return this.abilityRegistry.getAllFunctionNames();
    }
    /**
     * Get abilities info for debugging
     */
    getAbilitiesInfo() {
        return this.abilityRegistry.getAbilitiesInfo();
    }
    /**
     * Fallback method for legacy functions that haven't been migrated yet
     */
    async executeLegacyFunction(name, args) {
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
    isBrowser() {
        return typeof window !== 'undefined';
    }
    /**
     * Make API calls with consistent error handling
     */
    async fetchAPI(url, options) {
        try {
            const isAbsolute = /^(https?:)\/\//i.test(url);
            const baseUrl = this.isBrowser() ? '' : getServerBaseUrl();
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
        }
        catch (error) {
            console.error(`API call failed for ${url}:`, error);
            throw error;
        }
    }
    /**
     * Legacy function: List integrations (not yet moved to an ability)
     */
    async listIntegrations(args) {
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
        }
        catch (error) {
            return { success: false, error: 'Failed to list integrations' };
        }
    }
}
exports.FunctionCaller = FunctionCaller;
function getServerBaseUrl() {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.SITE_URL;
    if (appUrl && typeof appUrl === 'string') {
        return appUrl.startsWith('http') ? appUrl : `https://${appUrl}`;
    }
    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl && typeof vercelUrl === 'string') {
        return `https://${vercelUrl}`;
    }
    return 'http://localhost:3000';
}
