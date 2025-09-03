/**
 * Prompt formatting utilities
 */

import { PromptVariables } from '../types';

/**
 * Format arrays for use in prompts
 */
export function formatArray(arr: any[], separator = ', '): string {
  if (!Array.isArray(arr)) return '';
  return arr.filter(item => item != null).join(separator);
}

/**
 * Format keywords for prompts
 */
export function formatKeywords(keywords?: string[]): string {
  if (!keywords || keywords.length === 0) return 'general SEO optimization';
  return formatArray(keywords);
}

/**
 * Format website context for prompts
 */
export function formatWebsiteContext(variables: PromptVariables): string {
  const parts: string[] = [];
  
  if (variables.websiteDomain) {
    parts.push(`Website: ${variables.websiteDomain}`);
  }
  
  if (variables.websiteDescription) {
    parts.push(`Description: ${variables.websiteDescription}`);
  }
  
  if (variables.selectedSite && variables.selectedSite !== variables.websiteDomain) {
    parts.push(`Selected site: ${variables.selectedSite}`);
  }
  
  return parts.length > 0 ? parts.join('\n') : 'General website context';
}

/**
 * Format content specifications for prompts
 */
export function formatContentSpecs(variables: PromptVariables): string {
  const specs: string[] = [];
  
  if (variables.articleType) {
    specs.push(`Article Type: ${variables.articleType}`);
  }
  
  if (variables.tone) {
    specs.push(`Tone: ${variables.tone}`);
  }
  
  if (variables.contentLength) {
    specs.push(`Length: ${variables.contentLength}`);
  }
  
  if (variables.keywords && variables.keywords.length > 0) {
    specs.push(`Keywords: ${formatKeywords(variables.keywords)}`);
  }
  
  return specs.length > 0 ? specs.join('\n') : '';
}

/**
 * Clean up prompt text (remove extra whitespace, normalize line breaks)
 */
export function cleanPromptText(text: string): string {
  return text
    .trim()
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Replace multiple line breaks with double
    .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with single space
    .replace(/\n /g, '\n'); // Remove spaces at beginning of lines
}

/**
 * Add environment-specific modifications
 */
export function applyEnvironmentModifications(
  prompt: string, 
  environment: string = process.env.NODE_ENV || 'production'
): string {
  let result = prompt;
  
  if (environment === 'development') {
    result += '\n\n[DEBUG MODE: Provide detailed explanations of your reasoning.]';
  }
  
  if (environment === 'test') {
    result += '\n\n[TEST MODE: Generate consistent, predictable responses.]';
  }
  
  return result;
}