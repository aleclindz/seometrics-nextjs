import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Running website setup status migration...');
    
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'migrations/027_website_setup_status.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split into individual statements
    const statements = migrationSQL
      .split(/;\s*\n/)
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    const results = [];
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim() && !statement.startsWith('--')) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        console.log(`Statement preview: ${statement.substring(0, 100)}...`);
        
        try {
          // Use raw SQL execution
          const { data, error } = await supabase
            .from('_temp')
            .select('*')
            .limit(0); // This will fail but we're using it to test connection
          
          // Instead, try using rpc if available
          let result;
          try {
            result = await supabase.rpc('exec_sql', { sql: statement });
          } catch (rpcError) {
            // If exec_sql RPC doesn't exist, try direct query
            console.log('No exec_sql RPC found, trying direct execution');
            
            // For CREATE TABLE and similar statements, we need to use the SQL editor approach
            const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!
              },
              body: JSON.stringify({ sql: statement })
            });
            
            if (response.ok) {
              result = { data: await response.json(), error: null };
            } else {
              result = { data: null, error: await response.text() };
            }
          }
          
          if (result.error) {
            console.error(`Error in statement ${i + 1}:`, result.error);
            results.push({
              statement: i + 1,
              success: false,
              error: result.error,
              preview: statement.substring(0, 100)
            });
          } else {
            console.log(`✅ Statement ${i + 1} completed successfully`);
            results.push({
              statement: i + 1,
              success: true,
              preview: statement.substring(0, 100)
            });
          }
        } catch (err) {
          console.error(`Error executing statement ${i + 1}:`, err);
          results.push({
            statement: i + 1,
            success: false,
            error: err,
            preview: statement.substring(0, 100)
          });
        }
      }
    }
    
    // Test the new functions
    console.log('\n🔍 Testing new functions...');
    
    try {
      const { data: testData, error: testError } = await supabase.rpc('get_website_setup_status', {
        p_user_token: 'test-token',
        p_domain: 'test.com'
      });
      
      if (testError) {
        console.error('Error testing get_website_setup_status function:', testError);
        results.push({
          test: 'get_website_setup_status',
          success: false,
          error: testError
        });
      } else {
        console.log('✅ get_website_setup_status function is accessible');
        results.push({
          test: 'get_website_setup_status',
          success: true
        });
      }
    } catch (err) {
      console.error('Error testing functions:', err);
      results.push({
        test: 'get_website_setup_status',
        success: false,
        error: err
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Migration completed',
      results: results,
      totalStatements: statements.length,
      successCount: results.filter(r => r.success).length
    });
    
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Migration failed',
        details: error
      },
      { status: 500 }
    );
  }
}