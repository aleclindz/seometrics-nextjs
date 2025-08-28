import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('[ADMIN] Adding cleaned_domain column to websites table...');

    // Simple auth check - we'll execute this manually for now
    const results = [];

    try {
      // Step 1: Add cleaned_domain column
      console.log('[ADMIN] Step 1: Adding cleaned_domain column...');
      const { data: existingWebsites, error: selectError } = await supabase
        .from('websites')
        .select('id, domain, cleaned_domain')
        .limit(1);

      if (selectError && selectError.message?.includes('column "cleaned_domain" does not exist')) {
        console.log('[ADMIN] cleaned_domain column does not exist, needs to be added via SQL');
        results.push({
          step: 'check_column',
          success: false,
          error: 'cleaned_domain column missing - requires direct database access',
          solution: 'Execute: ALTER TABLE websites ADD COLUMN cleaned_domain VARCHAR(255);'
        });
      } else if (selectError) {
        console.error('[ADMIN] Error checking column:', selectError);
        results.push({
          step: 'check_column',
          success: false,
          error: selectError
        });
      } else {
        console.log('[ADMIN] cleaned_domain column already exists');
        results.push({
          step: 'check_column',
          success: true,
          message: 'Column already exists'
        });
      }
    } catch (error) {
      results.push({
        step: 'check_column',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    try {
      // Step 2: Populate cleaned_domain for existing records
      console.log('[ADMIN] Step 2: Populating cleaned_domain values...');
      
      // Get all websites that need cleaning
      const { data: websites, error: websitesError } = await supabase
        .from('websites')
        .select('id, domain, cleaned_domain');

      if (websitesError) {
        results.push({
          step: 'populate_cleaned_domains',
          success: false,
          error: websitesError
        });
      } else {
        // Clean domains manually and update
        let updatedCount = 0;
        const websitesToUpdate = websites?.filter(w => !w.cleaned_domain || w.cleaned_domain.includes('sc-domain:')) || [];

        for (const website of websitesToUpdate) {
          const cleanedDomain = website.domain
            .replace(/^sc-domain:/, '')
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '');

          const { error: updateError } = await supabase
            .from('websites')
            .update({ cleaned_domain: cleanedDomain })
            .eq('id', website.id);

          if (!updateError) {
            updatedCount++;
          }
        }

        results.push({
          step: 'populate_cleaned_domains',
          success: true,
          message: `Updated ${updatedCount} websites with cleaned domains`,
          totalWebsites: websites?.length || 0,
          updatedCount
        });
      }
    } catch (error) {
      results.push({
        step: 'populate_cleaned_domains',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    const successCount = results.filter(r => r.success).length;
    const totalSteps = results.length;

    return NextResponse.json({
      success: successCount > 0,
      message: `cleaned_domain column setup: ${successCount}/${totalSteps} steps successful`,
      results,
      instructions: {
        manual_sql_needed: 'If column creation failed, execute via Supabase SQL Editor:',
        sql_commands: [
          'ALTER TABLE websites ADD COLUMN IF NOT EXISTS cleaned_domain VARCHAR(255);',
          `CREATE OR REPLACE FUNCTION update_cleaned_domain()
           RETURNS TRIGGER AS $$
           BEGIN
             NEW.cleaned_domain = REGEXP_REPLACE(
               REGEXP_REPLACE(
                 REGEXP_REPLACE(NEW.domain, '^sc-domain:', '', 'g'),
                 '^https?://', '', 'g'
               ),
               '^www\\.', '', 'g'
             );
             RETURN NEW;
           END;
           $$ LANGUAGE plpgsql;`,
          `CREATE TRIGGER trigger_update_cleaned_domain
           BEFORE INSERT OR UPDATE ON websites
           FOR EACH ROW EXECUTE FUNCTION update_cleaned_domain();`
        ]
      }
    });

  } catch (error) {
    console.error('[ADMIN] Unexpected error during cleaned_domain setup:', error);
    return NextResponse.json(
      { error: 'Setup failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}