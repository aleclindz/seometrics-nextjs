/**
 * Error Parser Service
 *
 * Intelligently parses validation errors (especially Zod errors) and converts them
 * into user-friendly explanations and actionable suggestions for the AI agent.
 */

export interface ParsedError {
  type: 'missing_required_field' | 'constraint_violation' | 'type_mismatch' | 'unknown';
  field: string;
  message: string;
  userFriendlyMessage: string;
  suggestion: string | null;
  constraint?: {
    type: 'min' | 'max' | 'enum' | 'format' | 'custom';
    value?: any;
  };
}

export interface ValidationErrorContext {
  functionName: string;
  providedArgs: any;
  userMessage?: string;
}

/**
 * Parse a validation error string into structured format
 */
export function parseValidationError(
  errorString: string,
  context: ValidationErrorContext
): ParsedError[] {
  const errors: ParsedError[] = [];

  // Split by comma to handle multiple validation errors
  const errorParts = errorString.replace('Validation failed: ', '').split(', ');

  for (const part of errorParts) {
    const [fieldPath, ...messageParts] = part.split(': ');
    const message = messageParts.join(': ');

    const parsed = parseErrorMessage(fieldPath.trim(), message.trim(), context);
    errors.push(parsed);
  }

  return errors;
}

/**
 * Parse individual error message
 */
function parseErrorMessage(
  field: string,
  message: string,
  context: ValidationErrorContext
): ParsedError {
  // Check for "Required" errors
  if (message === 'Required') {
    return {
      type: 'missing_required_field',
      field,
      message,
      userFriendlyMessage: generateMissingFieldMessage(field, context),
      suggestion: generateMissingFieldSuggestion(field, context)
    };
  }

  // Check for min/max constraint violations
  const minMatch = message.match(/Number must be greater than or equal to (\d+)/);
  if (minMatch) {
    const minValue = parseInt(minMatch[1], 10);
    return {
      type: 'constraint_violation',
      field,
      message,
      userFriendlyMessage: generateConstraintMessage(field, 'min', minValue, context),
      suggestion: generateConstraintSuggestion(field, 'min', minValue, context),
      constraint: { type: 'min', value: minValue }
    };
  }

  const maxMatch = message.match(/Number must be less than or equal to (\d+)/);
  if (maxMatch) {
    const maxValue = parseInt(maxMatch[1], 10);
    return {
      type: 'constraint_violation',
      field,
      message,
      userFriendlyMessage: generateConstraintMessage(field, 'max', maxValue, context),
      suggestion: generateConstraintSuggestion(field, 'max', maxValue, context),
      constraint: { type: 'max', value: maxValue }
    };
  }

  // Check for string length constraints
  const strMinMatch = message.match(/String must contain at least (\d+) character/);
  if (strMinMatch) {
    const minLength = parseInt(strMinMatch[1], 10);
    return {
      type: 'constraint_violation',
      field,
      message,
      userFriendlyMessage: `The ${field} must be at least ${minLength} character${minLength > 1 ? 's' : ''} long`,
      suggestion: `Please provide a more detailed ${field}`,
      constraint: { type: 'min', value: minLength }
    };
  }

  // Check for enum/invalid type errors
  if (message.includes('Invalid enum value') || message.includes('Expected')) {
    return {
      type: 'type_mismatch',
      field,
      message,
      userFriendlyMessage: `The value provided for ${field} is not valid`,
      suggestion: `Please check the valid options for ${field}`,
      constraint: { type: 'enum' }
    };
  }

  // Generic fallback
  return {
    type: 'unknown',
    field,
    message,
    userFriendlyMessage: `There's an issue with ${field}: ${message}`,
    suggestion: null
  };
}

/**
 * Generate user-friendly message for missing required fields
 */
function generateMissingFieldMessage(field: string, context: ValidationErrorContext): string {
  const fieldMessages: Record<string, string> = {
    'keyword_strategy': 'I need your keyword strategy data to organize keywords into clusters',
    'user_token': 'Authentication is required for this operation',
    'site_url': 'I need to know which website to work with',
    'title': 'I need a title for this content',
    'topic': 'I need a topic or title for the article',
    'target_keywords': 'I need target keywords for SEO optimization',
    'cluster_count': 'I need to know how many topic clusters to create'
  };

  return fieldMessages[field] || `The field "${field}" is required but was not provided`;
}

/**
 * Generate actionable suggestion for missing required fields
 */
function generateMissingFieldSuggestion(field: string, context: ValidationErrorContext): string | null {
  const { functionName } = context;

  // Function-specific suggestions
  if (functionName === 'TOPICS_create_clusters') {
    if (field === 'keyword_strategy') {
      return 'Let me fetch your current keyword strategy first using KEYWORDS_get_strategy';
    }
    if (field === 'cluster_count') {
      return 'I will use the default of 8 clusters, or you can specify a different number (3-15 works best)';
    }
  }

  if (functionName === 'KEYWORDS_add_keywords' && field === 'keywords') {
    return 'Please provide the keywords you want to add to your strategy';
  }

  if (functionName === 'CONTENT_generate_article' && field === 'topic') {
    return 'Please specify what topic you would like me to write about, or I can suggest topics based on your keyword opportunities';
  }

  return null;
}

/**
 * Generate user-friendly message for constraint violations
 */
function generateConstraintMessage(
  field: string,
  constraintType: 'min' | 'max',
  value: number,
  context: ValidationErrorContext
): string {
  const { functionName, providedArgs } = context;

  // Special handling for topic cluster count
  if (field === 'cluster_count' && constraintType === 'min') {
    return `To create effective topic clusters, I need at least ${value} keywords. Topic clusters work by creating semantic relationships that search engines recognize - a single keyword is not enough to establish this pattern`;
  }

  if (field === 'count' || field === 'generate_count') {
    if (constraintType === 'min') {
      return `I can generate at least ${value} keyword${value > 1 ? 's' : ''}`;
    } else {
      return `I can generate up to ${value} keyword${value > 1 ? 's' : ''} at a time`;
    }
  }

  // Generic constraint message
  const operator = constraintType === 'min' ? 'at least' : 'at most';
  return `The ${field} must be ${operator} ${value}`;
}

/**
 * Generate actionable suggestion for constraint violations
 */
function generateConstraintSuggestion(
  field: string,
  constraintType: 'min' | 'max',
  value: number,
  context: ValidationErrorContext
): string | null {
  const { functionName, providedArgs, userMessage } = context;

  // Handle cluster_count minimum violation
  if (field === 'cluster_count' && constraintType === 'min') {
    const keywords = extractKeywordsFromMessage(userMessage || '', providedArgs);
    const keywordCount = keywords.length;

    if (keywordCount === 1) {
      return `You provided "${keywords[0]}" - that is 1 keyword. I need at least ${value} related keywords to create a topic cluster. Would you like me to brainstorm ${value - 1} more keywords related to "${keywords[0]}"? This will help establish topical authority for this subject.`;
    } else if (keywordCount > 1 && keywordCount < value) {
      return `You provided ${keywordCount} keywords: ${keywords.slice(0, 3).join(', ')}${keywordCount > 3 ? '...' : ''}. I need ${value - keywordCount} more to reach the minimum of ${value} keywords for an effective topic cluster. Should I brainstorm additional related keywords?`;
    }
  }

  // Handle generate_count constraints
  if ((field === 'count' || field === 'generate_count') && constraintType === 'max') {
    return `I will generate ${value} keywords for you (the maximum per request). If you need more, I can run multiple rounds`;
  }

  return null;
}

/**
 * Extract keywords mentioned in user message or provided args
 */
function extractKeywordsFromMessage(userMessage: string, providedArgs: any): string[] {
  const keywords: string[] = [];

  // Check provided args first
  if (providedArgs?.keywords && Array.isArray(providedArgs.keywords)) {
    return providedArgs.keywords.map((k: any) => typeof k === 'string' ? k : k.keyword || '').filter(Boolean);
  }

  if (providedArgs?.base_keywords && Array.isArray(providedArgs.base_keywords)) {
    return providedArgs.base_keywords;
  }

  if (providedArgs?.topic_focus) {
    keywords.push(providedArgs.topic_focus);
  }

  // Extract from user message if available
  if (userMessage) {
    // Look for quoted strings
    const quoted = userMessage.match(/['"]([^'"]+)['"]/g);
    if (quoted) {
      keywords.push(...quoted.map(q => q.replace(/['"]/g, '')));
    }

    // Look for keywords after "for", "about", "related to"
    const patterns = [
      /(?:for|about|related to)\s+['"]?([^'",.]+)['"]?/gi,
      /(?:keyword|topic|cluster):\s*['"]?([^'",.]+)['"]?/gi
    ];

    for (const pattern of patterns) {
      const matches = Array.from(userMessage.matchAll(pattern));
      for (const match of matches) {
        if (match[1] && !keywords.includes(match[1].trim())) {
          keywords.push(match[1].trim());
        }
      }
    }
  }

  return keywords.filter(Boolean);
}

/**
 * Build a comprehensive error summary for the LLM
 */
export function buildErrorSummaryForLLM(
  errors: ParsedError[],
  context: ValidationErrorContext
): string {
  if (errors.length === 0) {
    return 'An unknown error occurred';
  }

  const parts: string[] = ['⚠️ I encountered some issues with that request:\n'];

  for (let i = 0; i < errors.length; i++) {
    const error = errors[i];
    const num = errors.length > 1 ? `${i + 1}. ` : '';

    parts.push(`${num}${error.userFriendlyMessage}`);

    if (error.suggestion) {
      parts.push(`   💡 ${error.suggestion}\n`);
    }
  }

  return parts.join('\n');
}

/**
 * Determine if the agent should automatically retry with corrected params
 */
export function shouldAutoRetry(errors: ParsedError[], context: ValidationErrorContext): boolean {
  // Don't auto-retry if there are multiple errors or complex issues
  if (errors.length > 1) return false;

  const error = errors[0];
  const { functionName } = context;

  // Auto-retry for TOPICS_create_clusters if keyword_strategy is missing - we can fetch it
  if (
    functionName === 'TOPICS_create_clusters' &&
    error.field === 'keyword_strategy' &&
    error.type === 'missing_required_field'
  ) {
    return true;
  }

  // Don't auto-retry for user input requirements
  if (error.type === 'missing_required_field' && [
    'title', 'topic', 'keywords', 'base_keywords', 'topic_focus'
  ].includes(error.field)) {
    return false;
  }

  return false;
}

/**
 * Generate next action for auto-retry
 */
export function getAutoRetryAction(errors: ParsedError[], context: ValidationErrorContext): {
  functionName: string;
  args: any;
} | null {
  if (!shouldAutoRetry(errors, context)) return null;

  const error = errors[0];
  const { functionName, providedArgs } = context;

  // Fetch keyword strategy before creating clusters
  if (
    functionName === 'TOPICS_create_clusters' &&
    error.field === 'keyword_strategy'
  ) {
    return {
      functionName: 'KEYWORDS_get_strategy',
      args: {
        site_url: providedArgs.site_url
      }
    };
  }

  return null;
}
