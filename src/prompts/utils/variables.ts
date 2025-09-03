/**
 * Variable management utilities for prompts
 */

import { PromptVariables } from '../types';

/**
 * Default variables available in all prompts
 */
export const DEFAULT_VARIABLES: Partial<PromptVariables> = {
  websiteDomain: 'your website',
  tone: 'professional',
  contentLength: 'medium',
  articleType: 'blog'
};

/**
 * Extract variables from a prompt template
 * Looks for patterns like {{variableName}} or {variableName}
 */
export function extractVariables(template: string): string[] {
  const variablePattern = /\{\{?(\w+)\}?\}/g;
  const variables = new Set<string>();
  let match;
  
  while ((match = variablePattern.exec(template)) !== null) {
    variables.add(match[1]);
  }
  
  return Array.from(variables);
}

/**
 * Replace variables in a prompt template
 */
export function injectVariables(
  template: string, 
  variables: PromptVariables = {}
): string {
  const mergedVariables = { ...DEFAULT_VARIABLES, ...variables };
  
  let result = template;
  
  // Replace double curly braces first {{variable}}
  result = result.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return mergedVariables[varName]?.toString() || match;
  });
  
  // Replace single curly braces {variable}
  result = result.replace(/\{(\w+)\}/g, (match, varName) => {
    return mergedVariables[varName]?.toString() || match;
  });
  
  return result;
}

/**
 * Validate that all required variables are provided
 */
export function validateVariables(
  template: string, 
  variables: PromptVariables = {}
): { isValid: boolean; missingVariables: string[] } {
  const requiredVariables = extractVariables(template);
  const mergedVariables = { ...DEFAULT_VARIABLES, ...variables };
  
  const missingVariables = requiredVariables.filter(
    varName => mergedVariables[varName] === undefined
  );
  
  return {
    isValid: missingVariables.length === 0,
    missingVariables
  };
}

/**
 * Get a description of available variables
 */
export function getVariableDescriptions(): Record<string, string> {
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