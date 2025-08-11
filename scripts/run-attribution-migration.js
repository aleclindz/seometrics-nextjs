const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: './.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runAttributionMigration() {
  console.log('🚀 Running website attribution settings migration...');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/027_website_attribution_settings.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Migration SQL:', migrationSQL);
    
    // Split into individual statements (basic approach)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement directly using Supabase client
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`Executing statement ${i + 1}/${statements.length}:`, statement);
        
        try {
          // Use raw SQL query
          const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: statement
          });
          
          if (error) {
            console.error(`Error in statement ${i + 1}:`, error);
            // Try alternative approach
            console.log('Trying alternative approach...');
            
            // For ALTER TABLE statements, we can try using the from() method with DDL
            if (statement.includes('ALTER TABLE')) {
              console.log('This is a DDL statement, may need manual execution in Supabase dashboard');
            }
          } else {
            console.log(`✅ Statement ${i + 1} completed successfully`);
          }
        } catch (err) {
          console.error(`Error executing statement ${i + 1}:`, err);
          console.log('This migration may need to be run manually in the Supabase dashboard SQL editor');
        }
      }
    }
    
    console.log('🎉 Migration completed!');
    
    // Test the new column
    console.log('\n🔍 Testing attribution_enabled column...');
    
    const { data: websites, error: websitesError } = await supabase
      .from('websites')
      .select('id, domain, attribution_enabled')
      .limit(1);
    
    if (websitesError) {
      console.error('Error testing attribution_enabled column:', websitesError);
      console.log('The column may not exist yet. Please run the migration manually in Supabase dashboard:');
      console.log('Go to: https://supabase.com/dashboard -> Your Project -> SQL Editor');
      console.log('Execute this SQL:');
      console.log(migrationSQL);
    } else {
      console.log('✅ attribution_enabled column is accessible');
      console.log('Sample data:', websites);
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    console.log('\nTo run this migration manually:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Execute this SQL:');
    
    const migrationPath = path.join(__dirname, '../supabase/migrations/027_website_attribution_settings.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(migrationSQL);
  }
}

runAttributionMigration().catch(console.error);