"use strict";
/**
 * Variable management utilities for prompts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_VARIABLES = void 0;
exports.extractVariables = extractVariables;
exports.injectVariables = injectVariables;
exports.validateVariables = validateVariables;
exports.getVariableDescriptions = getVariableDescriptions;
/**
 * Default variables available in all prompts
 */
exports.DEFAULT_VARIABLES = {
    websiteDomain: 'your website',
    tone: 'professional',
    contentLength: 'medium',
    articleType: 'blog'
};
/**
 * Extract variables from a prompt template
 * Looks for patterns like {{variableName}} or {variableName}
 */
function extractVariables(template) {
    const variablePattern = /\{\{?(\w+)\}?\}/g;
    const variables = new Set();
    let match;
    while ((match = variablePattern.exec(template)) !== null) {
        variables.add(match[1]);
    }
    return Array.from(variables);
}
/**
 * Replace variables in a prompt template
 */
function injectVariables(template, variables = {}) {
    const mergedVariables = { ...exports.DEFAULT_VARIABLES, ...variables };
    let result = template;
    // Replace double curly braces first {{variable}}
    result = result.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        var _a;
        return ((_a = mergedVariables[varName]) === null || _a === void 0 ? void 0 : _a.toString()) || match;
    });
    // Replace single curly braces {variable}
    result = result.replace(/\{(\w+)\}/g, (match, varName) => {
        var _a;
        return ((_a = mergedVariables[varName]) === null || _a === void 0 ? void 0 : _a.toString()) || match;
    });
    return result;
}
/**
 * Validate that all required variables are provided
 */
function validateVariables(template, variables = {}) {
    const requiredVariables = extractVariables(template);
    const mergedVariables = { ...exports.DEFAULT_VARIABLES, ...variables };
    const missingVariables = requiredVariables.filter(varName => mergedVariables[varName] === undefined);
    return {
        isValid: missingVariables.length === 0,
        missingVariables
    };
}
/**
 * Get a description of available variables
 */
function getVariableDescriptions() {
    return {
        userToken: 'User authentication token',
        selectedSite: 'Currently selected website domain',
        websiteDomain: 'Target website domain',
        websiteDescription: 'Website description or context',
        title: 'Article or content title',
        keywords: 'Target keywords array (joined with commas)',
        articleType: 'Type of article (blog, guide, listicle, etc.)',
        tone: 'Content tone (professional, casual, technical)',
        contentLength: 'Content length (short, medium, long)',
        technicalData: 'Technical SEO analysis data',
        analysisType: 'Type of analysis being performed'
    };
}
