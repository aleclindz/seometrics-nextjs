"use strict";
/**
 * Agent Abilities Registry
 *
 * Central registry for all agent abilities. This provides a unified interface
 * for discovering and executing functions across all abilities.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAbility = exports.AbilityRegistry = void 0;
const gsc_ability_1 = require("./gsc-ability");
const content_ability_1 = require("./content-ability");
const performance_ability_1 = require("./performance-ability");
const technical_seo_ability_1 = require("./technical-seo-ability");
const ideas_ability_1 = require("./ideas-ability");
const keyword_strategy_ability_1 = require("./keyword-strategy-ability");
class AbilityRegistry {
    abilities = [];
    functionToAbilityMap = new Map();
    constructor(userToken) {
        // Initialize all abilities
        this.abilities = [
            new gsc_ability_1.GSCAbility(userToken),
            new content_ability_1.ContentAbility(userToken),
            new performance_ability_1.PerformanceAbility(userToken),
            new technical_seo_ability_1.TechnicalSEOAbility(userToken),
            new ideas_ability_1.IdeasAbility(userToken),
            new keyword_strategy_ability_1.KeywordStrategyAbility(userToken),
        ];
        // Build function-to-ability mapping
        this.buildFunctionMap();
    }
    buildFunctionMap() {
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
    getAllFunctionNames() {
        return Array.from(this.functionToAbilityMap.keys());
    }
    /**
     * Check if a function is supported
     */
    canExecuteFunction(functionName) {
        return this.functionToAbilityMap.has(functionName);
    }
    /**
     * Execute a function using the appropriate ability
     */
    async executeFunction(functionName, args) {
        const ability = this.functionToAbilityMap.get(functionName);
        if (!ability) {
            return {
                success: false,
                error: `Unknown function: ${functionName}`
            };
        }
        try {
            return await ability.executeFunction(functionName, args);
        }
        catch (error) {
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
    getAbilitiesInfo() {
        const info = {};
        for (const ability of this.abilities) {
            const className = ability.constructor.name;
            info[className] = ability.getFunctionNames();
        }
        return info;
    }
}
exports.AbilityRegistry = AbilityRegistry;
// Export the ability classes for direct use if needed
var base_ability_1 = require("./base-ability");
Object.defineProperty(exports, "BaseAbility", { enumerable: true, get: function () { return base_ability_1.BaseAbility; } });
__exportStar(require("./gsc-ability"), exports);
__exportStar(require("./content-ability"), exports);
__exportStar(require("./performance-ability"), exports);
__exportStar(require("./technical-seo-ability"), exports);
__exportStar(require("./ideas-ability"), exports);
__exportStar(require("./keyword-strategy-ability"), exports);
