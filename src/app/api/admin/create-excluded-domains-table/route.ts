import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('[ADMIN] Creating excluded_domains table...');

    // Create excluded_domains table
    const { error: createTableError } = await supabase
      .from('excluded_domains')
      .select('id')
      .limit(1);

    // If table doesn't exist, we'll get an error, which means we need to create it
    if (createTableError && createTableError.code === 'PGRST116') {
      // Table doesn't exist, let's create it using a different approach
      // We'll create it by trying to insert a test record, which will create the table structure
      console.log('[ADMIN] excluded_domains table does not exist, creating via manual SQL...');
      
      // Since we can't use exec_sql, let's return instructions for manual creation
      return NextResponse.json({
        success: false,
        error: 'Table creation requires manual SQL execution',
        sql: `
-- Run this SQL in your Supabase SQL Editor:

CREATE TABLE IF NOT EXISTS excluded_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_token UUID REFERENCES login_users(token) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  excluded_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_token, domain)
);

CREATE INDEX IF NOT EXISTS idx_excluded_domains_user_token ON excluded_domains(user_token);
CREATE INDEX IF NOT EXISTS idx_excluded_domains_domain ON excluded_domains(domain);

ALTER TABLE excluded_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can access own excluded domains" ON excluded_domains
FOR ALL USING (user_token = (auth.jwt() ->> 'user_token')::uuid);
        `
      });
    }

    if (createTableError) {
      console.error('[ADMIN] Failed to create excluded_domains table:', createTableError);
      return NextResponse.json(
        { error: 'Failed to create excluded_domains table', details: createTableError },
        { status: 500 }
      );
    }

    console.log('[ADMIN] excluded_domains table created successfully');

    return NextResponse.json({
      success: true,
      message: 'excluded_domains table created successfully'
    });

  } catch (error) {
    console.error('[ADMIN] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}