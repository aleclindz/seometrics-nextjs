import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Check the structure of login_users table
    const { data: loginUsersColumns, error: loginUsersError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'login_users')
      .eq('table_schema', 'public');

    // Check the structure of websites table  
    const { data: websitesColumns, error: websitesError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'websites')
      .eq('table_schema', 'public');

    // Check user_plans table
    const { data: userPlansColumns, error: userPlansError } = await supabase  
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'user_plans')
      .eq('table_schema', 'public');

    return NextResponse.json({
      success: true,
      login_users: loginUsersColumns,
      websites: websitesColumns,
      user_plans: userPlansColumns,
      errors: {
        loginUsersError,
        websitesError,
        userPlansError
      }
    });

  } catch (error) {
    console.error('[SCHEMA CHECK] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}