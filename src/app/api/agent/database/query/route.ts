import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  buildSecureQuery,
  validatePreBuiltQuery,
  getAllowedTables,
  type QueryParams
} from '@/lib/database/query-validator';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const {
      query_type, // 'flexible' or 'prebuilt'
      prebuilt_query,
      table_name,
      columns,
      where_clause,
      order_by,
      limit,
      user_token,
      conversation_id
    } = body;

    // Validate required parameters
    if (!user_token) {
      return NextResponse.json(
        { success: false, error: 'user_token is required' },
        { status: 400 }
      );
    }

    if (!query_type || !['flexible', 'prebuilt'].includes(query_type)) {
      return NextResponse.json(
        { success: false, error: 'query_type must be "flexible" or "prebuilt"' },
        { status: 400 }
      );
    }

    let finalQuery: string;
    let queryValidation;

    // Handle pre-built queries
    if (query_type === 'prebuilt') {
      if (!prebuilt_query) {
        return NextResponse.json(
          { success: false, error: 'prebuilt_query is required for prebuilt query type' },
          { status: 400 }
        );
      }

      // Validate pre-built query
      queryValidation = validatePreBuiltQuery(prebuilt_query);
      if (!queryValidation.valid) {
        return NextResponse.json(
          { success: false, error: queryValidation.error },
          { status: 400 }
        );
      }

      finalQuery = prebuilt_query;
    }
    // Handle flexible queries
    else {
      if (!table_name) {
        return NextResponse.json(
          { success: false, error: 'table_name is required for flexible queries' },
          { status: 400 }
        );
      }

      // Build and validate query
      const queryParams: QueryParams = {
        table_name,
        columns,
        where_clause,
        order_by,
        limit,
        user_token,
        conversation_id
      };

      queryValidation = buildSecureQuery(queryParams);
      if (!queryValidation.valid) {
        return NextResponse.json(
          { success: false, error: queryValidation.error },
          { status: 400 }
        );
      }

      finalQuery = queryValidation.sanitizedQuery!;
    }

    console.log('[DATABASE QUERY] Executing query');

    // For flexible queries, we'll use Supabase query builder
    // For prebuilt queries, we'll parse and execute them
    let data: any, error: any;

    try {
      if (query_type === 'flexible') {
        // Use Supabase query builder for flexible queries
        let query = supabase.from(table_name).select(columns && columns.length > 0 ? columns.join(',') : '*');

        // Add user token filter
        query = query.eq('user_token', user_token);

        // Add conversation_id filter for agent_conversations
        if (table_name === 'agent_conversations' && conversation_id) {
          query = query.eq('conversation_id', conversation_id);
        }

        // Parse and add WHERE clause conditions
        if (where_clause) {
          // Simple parsing for common patterns: "column=value", "column>value", etc.
          const conditions = where_clause.split(' AND ');
          for (const condition of conditions) {
            const trimmed = condition.trim();

            // Match patterns like "status='published'" or "created_at>'2024-01-01'"
            const eqMatch = trimmed.match(/(\w+)\s*=\s*'([^']+)'/);
            const gtMatch = trimmed.match(/(\w+)\s*>\s*'([^']+)'/);
            const ltMatch = trimmed.match(/(\w+)\s*<\s*'([^']+)'/);
            const gteMatch = trimmed.match(/(\w+)\s*>=\s*'([^']+)'/);
            const lteMatch = trimmed.match(/(\w+)\s*<=\s*'([^']+)'/);
            const neMatch = trimmed.match(/(\w+)\s*!=\s*'([^']+)'/);

            if (eqMatch) {
              query = query.eq(eqMatch[1], eqMatch[2]);
            } else if (gtMatch) {
              query = query.gt(gtMatch[1], gtMatch[2]);
            } else if (ltMatch) {
              query = query.lt(ltMatch[1], ltMatch[2]);
            } else if (gteMatch) {
              query = query.gte(gteMatch[1], gteMatch[2]);
            } else if (lteMatch) {
              query = query.lte(lteMatch[1], lteMatch[2]);
            } else if (neMatch) {
              query = query.neq(neMatch[1], neMatch[2]);
            }
          }
        }

        // Add ORDER BY
        if (order_by) {
          const parts = order_by.trim().split(' ');
          const column = parts[0];
          const ascending = !parts[1] || parts[1].toUpperCase() === 'ASC';
          query = query.order(column, { ascending });
        }

        // Add LIMIT
        const safeLimit = Math.min(limit || 100, 1000);
        query = query.limit(safeLimit);

        // Execute query with timeout
        const result = await Promise.race([
          query,
          new Promise<{ data: null, error: any }>((_, reject) =>
            setTimeout(() => reject(new Error('Query timeout')), 5000)
          )
        ]);

        data = result.data;
        error = result.error;

      } else {
        // For prebuilt queries, we need to execute raw SQL
        // This requires a database function - return error for now and implement via separate function
        return NextResponse.json(
          {
            success: false,
            error: 'Prebuilt queries are not yet supported. Please use flexible queries or specific pre-built ability functions.'
          },
          { status: 501 }
        );
      }
    } catch (timeoutError: any) {
      console.error('[DATABASE QUERY] Query timeout:', timeoutError);
      return NextResponse.json(
        { success: false, error: 'Query execution timeout (5 seconds)' },
        { status: 408 }
      );
    }

    if (error) {
      console.error('[DATABASE QUERY] Query execution error:', error);
      return NextResponse.json(
        { success: false, error: `Query execution failed: ${error.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    const executionTime = Date.now() - startTime;

    console.log('[DATABASE QUERY] Query succeeded:', {
      rowsReturned: Array.isArray(data) ? data.length : 'N/A',
      executionTime: `${executionTime}ms`
    });

    return NextResponse.json({
      success: true,
      data: data || [],
      metadata: {
        rowsReturned: Array.isArray(data) ? data.length : 0,
        executionTime,
        query: process.env.NODE_ENV === 'development' ? finalQuery : undefined
      }
    });

  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    console.error('[DATABASE QUERY] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        metadata: { executionTime }
      },
      { status: 500 }
    );
  }
}

// GET endpoint to list allowed tables
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'allowed_tables') {
      return NextResponse.json({
        success: true,
        tables: getAllowedTables(),
        description: 'List of tables that can be safely queried by the agent'
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use ?action=allowed_tables to list allowed tables.'
    }, { status: 400 });

  } catch (error) {
    console.error('[DATABASE QUERY] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
