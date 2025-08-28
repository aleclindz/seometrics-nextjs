import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('[ADMIN] Creating agent_conversations table...');

    // Check admin authorization
    const adminSecret = request.headers.get('x-admin-secret');
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const results = [];

    try {
      // Create agent_conversations table
      const createTableSQL = `
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
      `;

      const { error: createTableError } = await supabase.rpc('exec', {
        sql: createTableSQL
      });

      if (createTableError) {
        console.error('[ADMIN] Error creating agent_conversations table:', createTableError);
        results.push({
          step: 'create_table',
          success: false,
          error: createTableError
        });
      } else {
        console.log('[ADMIN] Successfully created agent_conversations table');
        results.push({
          step: 'create_table',
          success: true
        });
      }
    } catch (error) {
      console.error('[ADMIN] Error in create table step:', error);
      results.push({
        step: 'create_table',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    try {
      // Create indexes for efficient queries
      const createIndexesSQL = `
        CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_token ON agent_conversations(user_token);
        CREATE INDEX IF NOT EXISTS idx_agent_conversations_website_token ON agent_conversations(website_token);
        CREATE INDEX IF NOT EXISTS idx_agent_conversations_conversation_id ON agent_conversations(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_agent_conversations_created_at ON agent_conversations(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_website ON agent_conversations(user_token, website_token);
        CREATE INDEX IF NOT EXISTS idx_agent_conversations_role ON agent_conversations(message_role);
      `;

      const { error: indexError } = await supabase.rpc('exec', {
        sql: createIndexesSQL
      });

      if (indexError) {
        console.error('[ADMIN] Error creating indexes:', indexError);
        results.push({
          step: 'create_indexes',
          success: false,
          error: indexError
        });
      } else {
        console.log('[ADMIN] Successfully created agent_conversations indexes');
        results.push({
          step: 'create_indexes',
          success: true
        });
      }
    } catch (error) {
      console.error('[ADMIN] Error in create indexes step:', error);
      results.push({
        step: 'create_indexes',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    try {
      // Enable RLS and create security policies
      const rlsAndPoliciesSQL = `
        ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "Users can access their own conversations"
        ON agent_conversations
        FOR ALL
        USING (user_token = auth.jwt() ->> 'user_token');
        
        CREATE POLICY IF NOT EXISTS "Service role can access all conversations"
        ON agent_conversations
        FOR ALL
        TO service_role
        USING (true);
      `;

      const { error: rlsError } = await supabase.rpc('exec', {
        sql: rlsAndPoliciesSQL
      });

      if (rlsError) {
        console.error('[ADMIN] Error setting up RLS:', rlsError);
        results.push({
          step: 'setup_rls',
          success: false,
          error: rlsError
        });
      } else {
        console.log('[ADMIN] Successfully set up RLS and policies');
        results.push({
          step: 'setup_rls',
          success: true
        });
      }
    } catch (error) {
      console.error('[ADMIN] Error in RLS setup step:', error);
      results.push({
        step: 'setup_rls',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    const successCount = results.filter(r => r.success).length;
    const totalSteps = results.length;

    return NextResponse.json({
      success: successCount === totalSteps,
      message: `agent_conversations table creation: ${successCount}/${totalSteps} steps successful`,
      results
    });

  } catch (error) {
    console.error('[ADMIN] Unexpected error creating table:', error);
    return NextResponse.json(
      { error: 'Table creation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}