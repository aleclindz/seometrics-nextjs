import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('[DEBUG] Creating missing database tables...');

    const results = [];

    // Step 1: Create agent_conversations table if it doesn't exist
    try {
      const { data: tableCheck, error: checkError } = await supabase
        .from('agent_conversations')
        .select('id')
        .limit(1);

      if (checkError && checkError.code === '42P01') {
        // Table doesn't exist, create it
        console.log('[DEBUG] agent_conversations table missing, creating...');
        
        // Insert via direct INSERT to create table structure (using existing table as template)
        const { error: createError } = await supabase
          .from('information_schema.tables') // This will fail but we'll create via raw SQL
          .select('*');
          
        // Try to create using system tables approach
        const { data, error } = await supabase.rpc('exec_sql', {
          query: `
            CREATE TABLE IF NOT EXISTS agent_conversations (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              user_token TEXT NOT NULL,
              website_token TEXT NOT NULL,
              conversation_id UUID NOT NULL,
              message_role TEXT NOT NULL CHECK (message_role IN ('user', 'assistant', 'system')),
              message_content TEXT NOT NULL,
              function_call JSONB,
              action_card JSONB,
              message_order INTEGER NOT NULL,
              session_id TEXT,
              metadata JSONB DEFAULT '{}',
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              
              UNIQUE(conversation_id, message_order)
            );
            
            CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_token ON agent_conversations(user_token);
            CREATE INDEX IF NOT EXISTS idx_agent_conversations_website_token ON agent_conversations(website_token);
            CREATE INDEX IF NOT EXISTS idx_agent_conversations_conversation_id ON agent_conversations(conversation_id);
            CREATE INDEX IF NOT EXISTS idx_agent_conversations_created_at ON agent_conversations(created_at DESC);
          `
        });
        
        if (error) {
          console.log('[DEBUG] Direct SQL creation failed, trying alternative approach...');
          
          // Alternative: Create the table by doing manual operations
          // We'll create a minimal working implementation for testing
          results.push({
            step: 'create_agent_conversations',
            success: false,
            error: 'Table creation requires direct database access',
            solution: 'Use SQL interface or migration tools'
          });
        } else {
          results.push({
            step: 'create_agent_conversations',
            success: true
          });
        }
      } else if (checkError) {
        results.push({
          step: 'check_agent_conversations',
          success: false,
          error: checkError
        });
      } else {
        console.log('[DEBUG] agent_conversations table already exists');
        results.push({
          step: 'check_agent_conversations',
          success: true,
          message: 'Table already exists'
        });
      }
    } catch (error) {
      results.push({
        step: 'create_agent_conversations',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Step 2: Add connection status columns to websites table if missing
    try {
      // Check if connection status columns exist by trying to select them
      const { data: columnCheck, error: columnError } = await supabase
        .from('websites')
        .select('gsc_status')
        .limit(1);

      if (columnError && columnError.message?.includes('does not exist')) {
        console.log('[DEBUG] Connection status columns missing on websites table...');
        
        // Try to add columns (this will likely fail without direct DB access)
        results.push({
          step: 'add_connection_columns',
          success: false,
          error: 'Column addition requires direct database access',
          solution: 'Use SQL interface to add: gsc_status, seoagentjs_status, cms_status, hosting_status, last_status_check'
        });
      } else if (columnError) {
        results.push({
          step: 'check_connection_columns',
          success: false,
          error: columnError
        });
      } else {
        console.log('[DEBUG] Connection status columns already exist');
        results.push({
          step: 'check_connection_columns',
          success: true,
          message: 'Columns already exist'
        });
      }
    } catch (error) {
      results.push({
        step: 'add_connection_columns',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return NextResponse.json({
      success: results.some(r => r.success),
      message: 'Database table analysis complete',
      results,
      instructions: {
        agent_conversations: 'Create via Supabase SQL Editor if missing',
        connection_columns: 'Add via ALTER TABLE if missing',
        sql_commands: [
          `CREATE TABLE agent_conversations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_token TEXT NOT NULL,
            website_token TEXT NOT NULL,
            conversation_id UUID NOT NULL,
            message_role TEXT NOT NULL CHECK (message_role IN ('user', 'assistant', 'system')),
            message_content TEXT NOT NULL,
            function_call JSONB,
            action_card JSONB,
            message_order INTEGER NOT NULL,
            session_id TEXT,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(conversation_id, message_order)
          );`,
          `ALTER TABLE websites ADD COLUMN IF NOT EXISTS gsc_status VARCHAR(20) DEFAULT 'none';`,
          `ALTER TABLE websites ADD COLUMN IF NOT EXISTS seoagentjs_status VARCHAR(20) DEFAULT 'inactive';`,
          `ALTER TABLE websites ADD COLUMN IF NOT EXISTS cms_status VARCHAR(20) DEFAULT 'none';`,
          `ALTER TABLE websites ADD COLUMN IF NOT EXISTS hosting_status VARCHAR(20) DEFAULT 'none';`,
          `ALTER TABLE websites ADD COLUMN IF NOT EXISTS last_status_check TIMESTAMP WITH TIME ZONE DEFAULT NOW();`
        ]
      }
    });

  } catch (error) {
    console.error('[DEBUG] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Database analysis failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        action_required: 'Manual database schema updates needed'
      },
      { status: 500 }
    );
  }
}