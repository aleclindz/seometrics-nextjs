"use strict";
/**
 * Main Prompts Export
 *
 * Central entry point for the prompt management system
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
exports.registerTechnicalSeoPrompts = exports.registerContentPrompts = exports.registerAgentPrompts = exports.PromptManager = void 0;
exports.createPromptManager = createPromptManager;
exports.getPromptManager = getPromptManager;
var PromptManager_1 = require("./PromptManager");
Object.defineProperty(exports, "PromptManager", { enumerable: true, get: function () { return PromptManager_1.PromptManager; } });
__exportStar(require("./types"), exports);
__exportStar(require("./utils/variables"), exports);
__exportStar(require("./utils/formatters"), exports);
// Category exports
var agent_1 = require("./categories/agent");
Object.defineProperty(exports, "registerAgentPrompts", { enumerable: true, get: function () { return agent_1.registerAgentPrompts; } });
var content_1 = require("./categories/content");
Object.defineProperty(exports, "registerContentPrompts", { enumerable: true, get: function () { return content_1.registerContentPrompts; } });
var technical_seo_1 = require("./categories/technical-seo");
Object.defineProperty(exports, "registerTechnicalSeoPrompts", { enumerable: true, get: function () { return technical_seo_1.registerTechnicalSeoPrompts; } });
const PromptManager_2 = require("./PromptManager");
const agent_2 = require("./categories/agent");
const content_2 = require("./categories/content");
const technical_seo_2 = require("./categories/technical-seo");
/**
 * Create a fully initialized prompt manager with all prompts registered
 */
function createPromptManager(environment) {
    const manager = new PromptManager_2.PromptManager(environment);
    // Register all prompt categories
    (0, agent_2.registerAgentPrompts)(manager);
    (0, content_2.registerContentPrompts)(manager);
    (0, technical_seo_2.registerTechnicalSeoPrompts)(manager);
    return manager;
}
/**
 * Global prompt manager instance
 * Lazy-loaded to ensure proper initialization
 */
let globalPromptManager = null;
function getPromptManager() {
    if (!globalPromptManager) {
        globalPromptManager = createPromptManager();
    }
    return globalPromptManager;
}
