const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTables() {
  console.log('🚀 Creating subscription system tables...');
  
  try {
    // Check if tables exist first
    console.log('🔍 Checking if tables already exist...');
    
    const { data: existingUserPlans, error: userPlansError } = await supabase
      .from('user_plans')
      .select('*')
      .limit(1);
    
    if (!userPlansError) {
      console.log('✅ user_plans table already exists');
    } else {
      console.log('📋 user_plans table needs to be created');
    }
    
    const { data: existingUsageTracking, error: usageError } = await supabase
      .from('usage_tracking')
      .select('*')
      .limit(1);
    
    if (!usageError) {
      console.log('✅ usage_tracking table already exists');
    } else {
      console.log('📋 usage_tracking table needs to be created');
    }
    
    // If tables don't exist, we need to create them through the Supabase dashboard
    if (userPlansError || usageError) {
      console.log('\n⚠️  Tables need to be created manually through the Supabase dashboard.');
      console.log('Here are the SQL commands to run:');
      console.log('\n=== USER_PLANS TABLE ===');
      console.log(`
CREATE TABLE user_plans (
    id SERIAL PRIMARY KEY,
    user_token VARCHAR(255) NOT NULL,
    tier VARCHAR(50) NOT NULL DEFAULT 'starter',
    sites_allowed INTEGER NOT NULL DEFAULT 2,
    posts_allowed INTEGER NOT NULL DEFAULT 4,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_token),
    FOREIGN KEY (user_token) REFERENCES login_users(token) ON DELETE CASCADE
);
      `);
      
      console.log('\n=== USAGE_TRACKING TABLE ===');
      console.log(`
CREATE TABLE usage_tracking (
    id SERIAL PRIMARY KEY,
    user_token VARCHAR(255) NOT NULL,
    site_id INTEGER,
    resource_type VARCHAR(50) NOT NULL,
    month_year VARCHAR(7) NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_token, site_id, resource_type, month_year),
    FOREIGN KEY (user_token) REFERENCES login_users(token) ON DELETE CASCADE,
    FOREIGN KEY (site_id) REFERENCES websites(id) ON DELETE CASCADE
);
      `);
      
      console.log('\n=== INDEXES ===');
      console.log(`
CREATE INDEX idx_user_plans_user_token ON user_plans(user_token);
CREATE INDEX idx_user_plans_status ON user_plans(status);
CREATE INDEX idx_user_plans_stripe_customer ON user_plans(stripe_customer_id);
CREATE INDEX idx_usage_tracking_user_token ON usage_tracking(user_token);
CREATE INDEX idx_usage_tracking_month_year ON usage_tracking(month_year);
CREATE INDEX idx_usage_tracking_resource_type ON usage_tracking(resource_type);
      `);
      
      console.log('\n=== ARTICLE TABLE UPDATES ===');
      console.log(`
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES websites(id),
ADD COLUMN IF NOT EXISTS slug VARCHAR(255),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS cms_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS eeat_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS metrics_json JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS readability_score DECIMAL(3,1);
      `);
      
      console.log('\n📋 Steps to complete setup:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Run the SQL commands above');
      console.log('4. Come back and run: npm run test-subscription');
      
      return;
    }
    
    // If tables exist, check if we need to create default plans for existing users
    console.log('\n🔍 Checking for existing user plans...');
    
    const { data: users, error: usersError } = await supabase
      .from('login_users')
      .select('token, email');
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }
    
    console.log(`Found ${users.length} users in the system`);
    
    for (const user of users) {
      const { data: existingPlan, error: planError } = await supabase
        .from('user_plans')
        .select('*')
        .eq('user_token', user.token)
        .single();
      
      if (planError && planError.code === 'PGRST116') {
        // User doesn't have a plan, create default starter plan
        console.log(`Creating default plan for user: ${user.email}`);
        
        const { error: insertError } = await supabase
          .from('user_plans')
          .insert({
            user_token: user.token,
            tier: 'starter',
            sites_allowed: 2,
            posts_allowed: 4,
            status: 'active'
          });
        
        if (insertError) {
          console.error(`Error creating plan for ${user.email}:`, insertError);
        } else {
          console.log(`✅ Created starter plan for ${user.email}`);
        }
      } else if (!planError) {
        console.log(`✅ User ${user.email} already has a ${existingPlan.tier} plan`);
      }
    }
    
    console.log('\n🎉 Subscription system setup complete!');
    console.log('You can now test the subscription features at http://localhost:3000/account');
    
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

createTables().catch(console.error);