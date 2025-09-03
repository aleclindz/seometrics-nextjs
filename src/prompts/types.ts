/**
 * Types for the Prompt Management System
 */

export interface PromptVariables {
  // User context
  userToken?: string;
  selectedSite?: string;
  websiteDomain?: string;
  websiteDescription?: string;
  
  // Content context
  title?: string;
  keywords?: string[];
  articleType?: string;
  tone?: string;
  contentLength?: string;
  
  // Technical context
  technicalData?: any;
  analysisType?: string;
  
  // Dynamic context
  [key: string]: any;
}

export interface PromptTemplate {
  id: string;
  category: string;
  name: string;
  description: string;
  template: string;
  variables: string[];
  version: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromptCategory {
  id: string;
  name: string;
  description: string;
  prompts: Record<string, PromptTemplate>;
}

export interface PromptConfig {
  version: string;
  categories: Record<string, PromptCategory>;
  globalVariables: Record<string, string>;
  environments: Record<string, Record<string, any>>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingVariables: string[];
}