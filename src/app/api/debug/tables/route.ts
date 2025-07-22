import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');

    if (!userToken) {
      return NextResponse.json(
        { error: 'Missing userToken parameter' },
        { status: 400 }
      );
    }

    console.log('[DEBUG TABLES] Checking table existence for user:', userToken);

    const results: Record<string, any> = {};
    const tables = ['cms_connections', 'websites', 'login_users'];

    for (const table of tables) {
      try {
        console.log(`[DEBUG TABLES] Testing table: ${table}`);
        
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .limit(1);
        
        if (error) {
          results[table] = {
            exists: false,
            error: error.message,
            code: error.code
          };
        } else {
          results[table] = {
            exists: true,
            count: count || 0
          };
        }
      } catch (tableError: any) {
        results[table] = {
          exists: false,
          error: tableError.message,
          type: 'exception'
        };
      }
    }

    // Also test a specific query for the user
    try {
      const userCheck = await supabase
        .from('login_users')
        .select('token')
        .eq('token', userToken)
        .single();
      
      results['user_exists'] = {
        found: !userCheck.error,
        error: userCheck.error?.message
      };
    } catch (err: any) {
      results['user_exists'] = {
        found: false,
        error: err.message
      };
    }

    return NextResponse.json({
      success: true,
      tables: results,
      userToken,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[DEBUG TABLES] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}