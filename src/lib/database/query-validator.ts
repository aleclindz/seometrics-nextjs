/**
 * Database Query Validator
 *
 * Provides security validation for read-only database queries.
 * Ensures queries are safe, scoped to user data, and cannot access sensitive information.
 */

export interface QueryValidationResult {
  valid: boolean;
  error?: string;
  sanitizedQuery?: string;
}

export interface QueryParams {
  table_name: string;
  columns?: string[];
  where_clause?: string;
  order_by?: string;
  limit?: number;
  user_token: string;
  conversation_id?: string;
}

// Whitelisted tables that agents can query
const ALLOWED_TABLES = [
  'gsc_performance_data',
  'url_inspections',
  'article_queue',
  'websites',
  'agent_actions',
  'agent_ideas',
  'agent_conversations',
  'agent_runs',
  'topic_clusters',
  'article_roles'
] as const;

// Sensitive tables that should never be accessible
const BLOCKED_TABLES = [
  'login_users',
  'gsc_connections',
  'cms_connections',
  'user_plans',
  'auth'
] as const;

// Safe columns for websites table (limit exposure)
const WEBSITES_ALLOWED_COLUMNS = [
  'id',
  'website_token',
  'domain',
  'cleaned_domain',
  'language',
  'is_managed',
  'gsc_status',
  'seoagentjs_status',
  'cms_status',
  'created_at',
  'updated_at'
];

/**
 * Validate that a table name is allowed for querying
 */
export function validateTableName(tableName: string): boolean {
  // Check if table is explicitly blocked
  if (BLOCKED_TABLES.includes(tableName as any)) {
    return false;
  }

  // Check if table is in whitelist
  return ALLOWED_TABLES.includes(tableName as any);
}

/**
 * Validate column names for a specific table
 */
export function validateColumns(tableName: string, columns: string[]): QueryValidationResult {
  // Special handling for websites table
  if (tableName === 'websites') {
    const invalidColumns = columns.filter(col => !WEBSITES_ALLOWED_COLUMNS.includes(col));
    if (invalidColumns.length > 0) {
      return {
        valid: false,
        error: `Columns not allowed for websites table: ${invalidColumns.join(', ')}`
      };
    }
  }

  // Basic validation for all columns
  for (const column of columns) {
    // Check for dangerous patterns
    if (column.includes(';') || column.includes('--') || column.includes('/*')) {
      return {
        valid: false,
        error: `Invalid column name: ${column}`
      };
    }

    // Check for SQL injection attempts
    if (/\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|EXEC|EXECUTE)\b/i.test(column)) {
      return {
        valid: false,
        error: `SQL keywords not allowed in column names: ${column}`
      };
    }
  }

  return { valid: true };
}

/**
 * Validate WHERE clause for SQL injection and dangerous patterns
 */
export function validateWhereClause(whereClause: string): QueryValidationResult {
  if (!whereClause) {
    return { valid: true };
  }

  // Check for dangerous SQL keywords
  const dangerousKeywords = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'EXEC', 'EXECUTE', 'UNION', 'JOIN'];
  for (const keyword of dangerousKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(whereClause)) {
      return {
        valid: false,
        error: `Dangerous SQL keyword not allowed: ${keyword}`
      };
    }
  }

  // Check for comment attempts
  if (whereClause.includes('--') || whereClause.includes('/*') || whereClause.includes('*/')) {
    return {
      valid: false,
      error: 'SQL comments not allowed in WHERE clause'
    };
  }

  // Check for semicolons (query chaining)
  if (whereClause.includes(';')) {
    return {
      valid: false,
      error: 'Multiple statements not allowed (semicolon found)'
    };
  }

  // Check for subqueries
  if (whereClause.includes('(SELECT') || whereClause.includes('( SELECT')) {
    return {
      valid: false,
      error: 'Subqueries not allowed'
    };
  }

  return { valid: true };
}

/**
 * Validate ORDER BY clause
 */
export function validateOrderBy(orderBy: string): QueryValidationResult {
  if (!orderBy) {
    return { valid: true };
  }

  // Allow only column names, ASC, DESC, and commas
  if (!/^[a-zA-Z0-9_,\s]+(ASC|DESC)?$/i.test(orderBy)) {
    return {
      valid: false,
      error: 'Invalid ORDER BY clause. Only column names, ASC, and DESC allowed.'
    };
  }

  return { valid: true };
}

/**
 * Build a secure query with user scoping
 */
export function buildSecureQuery(params: QueryParams): QueryValidationResult {
  const { table_name, columns, where_clause, order_by, limit, user_token, conversation_id } = params;

  // Validate table name
  if (!validateTableName(table_name)) {
    return {
      valid: false,
      error: `Table '${table_name}' is not allowed for querying`
    };
  }

  // Validate columns
  const columnList = columns && columns.length > 0 ? columns : ['*'];
  if (columns && columns.length > 0) {
    const columnValidation = validateColumns(table_name, columns);
    if (!columnValidation.valid) {
      return columnValidation;
    }
  }

  // Validate WHERE clause
  if (where_clause) {
    const whereValidation = validateWhereClause(where_clause);
    if (!whereValidation.valid) {
      return whereValidation;
    }
  }

  // Validate ORDER BY
  if (order_by) {
    const orderValidation = validateOrderBy(order_by);
    if (!orderValidation.valid) {
      return orderValidation;
    }
  }

  // Enforce limit (max 1000 rows)
  const safeLimit = Math.min(limit || 100, 1000);

  // Build query with automatic user scoping
  let query = `SELECT ${columnList.join(', ')} FROM ${table_name}`;

  // Add user token scoping (automatically added to all queries)
  const userScopeClause = `user_token = '${user_token}'`;

  // Special handling for agent_conversations - scope to current conversation
  if (table_name === 'agent_conversations' && conversation_id) {
    const conversationScope = `conversation_id = '${conversation_id}'`;
    const combinedScope = `${userScopeClause} AND ${conversationScope}`;

    if (where_clause) {
      query += ` WHERE ${combinedScope} AND (${where_clause})`;
    } else {
      query += ` WHERE ${combinedScope}`;
    }
  } else {
    // Standard user scoping
    if (where_clause) {
      query += ` WHERE ${userScopeClause} AND (${where_clause})`;
    } else {
      query += ` WHERE ${userScopeClause}`;
    }
  }

  // Add ORDER BY if specified
  if (order_by) {
    query += ` ORDER BY ${order_by}`;
  }

  // Always add LIMIT
  query += ` LIMIT ${safeLimit}`;

  return {
    valid: true,
    sanitizedQuery: query
  };
}

/**
 * Validate a pre-built query string (for pre-built query functions)
 */
export function validatePreBuiltQuery(query: string): QueryValidationResult {
  // Must start with SELECT
  if (!query.trim().toUpperCase().startsWith('SELECT')) {
    return {
      valid: false,
      error: 'Query must start with SELECT'
    };
  }

  // No dangerous keywords
  const dangerousKeywords = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'EXEC', 'EXECUTE'];
  for (const keyword of dangerousKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(query)) {
      return {
        valid: false,
        error: `Dangerous SQL keyword not allowed: ${keyword}`
      };
    }
  }

  // Must have a LIMIT clause
  if (!query.toUpperCase().includes('LIMIT')) {
    return {
      valid: false,
      error: 'All queries must include a LIMIT clause'
    };
  }

  return { valid: true };
}

/**
 * Get list of allowed tables for agent reference
 */
export function getAllowedTables(): string[] {
  return [...ALLOWED_TABLES];
}
