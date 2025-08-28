import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('[ADMIN] Adding connection status columns to websites table...');

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
      // Add connection status columns to websites table
      const addColumnsSQL = `
        ALTER TABLE websites 
        ADD COLUMN IF NOT EXISTS gsc_status VARCHAR(20) DEFAULT 'none' CHECK (gsc_status IN ('none', 'connected', 'error')),
        ADD COLUMN IF NOT EXISTS seoagentjs_status VARCHAR(20) DEFAULT 'inactive' CHECK (seoagentjs_status IN ('inactive', 'active', 'error')), 
        ADD COLUMN IF NOT EXISTS cms_status VARCHAR(20) DEFAULT 'none' CHECK (cms_status IN ('none', 'connected', 'error')),
        ADD COLUMN IF NOT EXISTS hosting_status VARCHAR(20) DEFAULT 'none' CHECK (hosting_status IN ('none', 'connected', 'error')),
        ADD COLUMN IF NOT EXISTS last_status_check TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      `;

      const { error: addColumnsError } = await supabase.rpc('exec', {
        sql: addColumnsSQL
      });

      if (addColumnsError) {
        console.error('[ADMIN] Error adding columns:', addColumnsError);
        results.push({
          step: 'add_columns',
          success: false,
          error: addColumnsError
        });
      } else {
        console.log('[ADMIN] Successfully added connection status columns');
        results.push({
          step: 'add_columns',
          success: true
        });
      }
    } catch (error) {
      console.error('[ADMIN] Error in add columns step:', error);
      results.push({
        step: 'add_columns',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    try {
      // Create index for efficient status queries
      const createIndexSQL = `
        CREATE INDEX IF NOT EXISTS idx_websites_connection_status 
        ON websites(user_token, gsc_status, seoagentjs_status);
      `;

      const { error: indexError } = await supabase.rpc('exec', {
        sql: createIndexSQL
      });

      if (indexError) {
        console.error('[ADMIN] Error creating index:', indexError);
        results.push({
          step: 'create_index',
          success: false,
          error: indexError
        });
      } else {
        console.log('[ADMIN] Successfully created connection status index');
        results.push({
          step: 'create_index',
          success: true
        });
      }
    } catch (error) {
      console.error('[ADMIN] Error in create index step:', error);
      results.push({
        step: 'create_index',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    try {
      // Update existing websites to have accurate GSC status based on gsc_connections
      const updateGSCStatusSQL = `
        UPDATE websites 
        SET gsc_status = CASE 
          WHEN EXISTS (
            SELECT 1 FROM gsc_connections gc 
            WHERE gc.user_token = websites.user_token 
            AND gc.is_active = true
          ) THEN 'connected'
          ELSE 'none'
        END,
        last_status_check = NOW()
        WHERE gsc_status IS NULL OR gsc_status = 'none';
      `;

      const { error: updateError } = await supabase.rpc('exec', {
        sql: updateGSCStatusSQL
      });

      if (updateError) {
        console.error('[ADMIN] Error updating GSC status:', updateError);
        results.push({
          step: 'update_gsc_status',
          success: false,
          error: updateError
        });
      } else {
        console.log('[ADMIN] Successfully updated GSC status for existing websites');
        results.push({
          step: 'update_gsc_status',
          success: true
        });
      }
    } catch (error) {
      console.error('[ADMIN] Error in update GSC status step:', error);
      results.push({
        step: 'update_gsc_status',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    const successCount = results.filter(r => r.success).length;
    const totalSteps = results.length;

    return NextResponse.json({
      success: successCount === totalSteps,
      message: `Migration completed: ${successCount}/${totalSteps} steps successful`,
      results
    });

  } catch (error) {
    console.error('[ADMIN] Unexpected error during migration:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}