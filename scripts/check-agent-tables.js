#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kfbuflsjbkncehtmykhj.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmYnVmbHNqYmtuY2VodG15a2hqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjA5MTI2MywiZXhwIjoyMDY3NjY3MjYzfQ.AvKa2kVOqQjg_q6oI_JMEw49hrYe9-1q0zmaN4qgXyY';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkTables() {
  console.log('🔍 Checking agent memory tables...\n');
  
  try {
    // Check agent_memory table
    console.log('1. Checking agent_memory table...');
    const { data: memoryData, error: memoryError } = await supabase
      .from('agent_memory')
      .select('*')
      .limit(1);
    
    if (memoryError) {
      if (memoryError.code === '42P01') {
        console.log('   ❌ agent_memory table does NOT exist');
      } else {
        console.log('   ❓ Error:', memoryError.message);
      }
    } else {
      console.log('   ✅ agent_memory table exists and accessible');
    }
    
    // Check agent_learning table
    console.log('2. Checking agent_learning table...');
    const { data: learningData, error: learningError } = await supabase
      .from('agent_learning')
      .select('*')
      .limit(1);
    
    if (learningError) {
      if (learningError.code === '42P01') {
        console.log('   ❌ agent_learning table does NOT exist');
      } else {
        console.log('   ❓ Error:', learningError.message);
      }
    } else {
      console.log('   ✅ agent_learning table exists and accessible');
    }
    
    // Show instructions if tables don't exist
    if ((memoryError && memoryError.code === '42P01') || (learningError && learningError.code === '42P01')) {
      console.log('\n📋 TABLES NEED TO BE CREATED:');
      console.log('');
      console.log('1. Go to: https://supabase.com/dashboard/project/kfbuflsjbkncehtmykhj/sql');
      console.log('2. Copy and paste this SQL:');
      console.log('');
      console.log('-- Agent Memory System Tables');
      console.log('CREATE TABLE IF NOT EXISTS agent_memory (');
      console.log('  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),');
      console.log('  website_token TEXT NOT NULL,');
      console.log('  user_token TEXT NOT NULL,');
      console.log('  memory_type TEXT NOT NULL CHECK (memory_type IN (\'context\', \'patterns\', \'preferences\', \'insights\', \'strategies\')),');
      console.log('  memory_key TEXT NOT NULL,');
      console.log('  memory_data JSONB NOT NULL,');
      console.log('  confidence_score FLOAT DEFAULT 0.8 CHECK (confidence_score >= 0 AND confidence_score <= 1),');
      console.log('  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
      console.log('  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
      console.log('  expires_at TIMESTAMP WITH TIME ZONE,');
      console.log('  metadata JSONB DEFAULT \'{}\'::jsonb,');
      console.log('  UNIQUE(website_token, user_token, memory_type, memory_key)');
      console.log(');');
      console.log('');
      console.log('CREATE TABLE IF NOT EXISTS agent_learning (');
      console.log('  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),');
      console.log('  website_token TEXT NOT NULL,');
      console.log('  user_token TEXT NOT NULL,');
      console.log('  action_type TEXT NOT NULL,');
      console.log('  action_context JSONB NOT NULL,');
      console.log('  outcome TEXT NOT NULL CHECK (outcome IN (\'success\', \'failure\', \'partial\')),');
      console.log('  success_metrics JSONB,');
      console.log('  error_details TEXT,');
      console.log('  execution_time_ms INTEGER,');
      console.log('  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
      console.log('  metadata JSONB DEFAULT \'{}\'::jsonb');
      console.log(');');
      console.log('');
      console.log('-- Indexes');
      console.log('CREATE INDEX IF NOT EXISTS idx_agent_memory_website_token ON agent_memory(website_token);');
      console.log('CREATE INDEX IF NOT EXISTS idx_agent_memory_user_token ON agent_memory(user_token);');
      console.log('CREATE INDEX IF NOT EXISTS idx_agent_memory_type ON agent_memory(memory_type);');
      console.log('CREATE INDEX IF NOT EXISTS idx_agent_learning_website_token ON agent_learning(website_token);');
      console.log('CREATE INDEX IF NOT EXISTS idx_agent_learning_action_type ON agent_learning(action_type);');
      console.log('');
      console.log('3. Click "Run"');
      console.log('4. Then run this script again to verify: npm run check-tables');
    } else {
      console.log('\n🎉 All agent memory tables are ready to use!');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkTables();