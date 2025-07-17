const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: './.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('🚀 Running subscription system migration...');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/005_subscription_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split into individual statements (basic approach)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        
        try {
          const { data, error } = await supabase.rpc('exec_sql', {
            sql: statement
          });
          
          if (error) {
            console.error(`Error in statement ${i + 1}:`, error);
            console.error('Statement:', statement);
            // Continue with other statements
          } else {
            console.log(`✅ Statement ${i + 1} completed successfully`);
          }
        } catch (err) {
          console.error(`Error executing statement ${i + 1}:`, err);
          console.error('Statement:', statement);
          // Continue with other statements
        }
      }
    }
    
    console.log('🎉 Migration completed!');
    
    // Test the new tables
    console.log('\n🔍 Testing new tables...');
    
    const { data: userPlans, error: userPlansError } = await supabase
      .from('user_plans')
      .select('*')
      .limit(1);
    
    if (userPlansError) {
      console.error('Error testing user_plans table:', userPlansError);
    } else {
      console.log('✅ user_plans table is accessible');
    }
    
    const { data: usageTracking, error: usageError } = await supabase
      .from('usage_tracking')
      .select('*')
      .limit(1);
    
    if (usageError) {
      console.error('Error testing usage_tracking table:', usageError);
    } else {
      console.log('✅ usage_tracking table is accessible');
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration().catch(console.error);