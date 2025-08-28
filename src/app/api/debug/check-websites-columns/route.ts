import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log('[COLUMN DEBUG] Checking websites table columns...');
    
    // Get table column information from information_schema
    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, column_default')
      .eq('table_name', 'websites')
      .eq('table_schema', 'public')
      .order('ordinal_position');
    
    if (error) {
      console.error('[COLUMN DEBUG] Error fetching column info:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch column information',
        details: error
      });
    }
    
    // Check for duplicate hosting columns
    const hostingColumns = columns?.filter(col => 
      col.column_name.includes('host') || col.column_name.includes('hosting')
    ) || [];
    
    // Get a sample row to see actual data
    const { data: sampleRow, error: sampleError } = await supabase
      .from('websites')
      .select('*')
      .limit(1)
      .single();
    
    return NextResponse.json({
      success: true,
      totalColumns: columns?.length || 0,
      allColumns: columns?.map(col => ({
        name: col.column_name,
        type: col.data_type,
        default: col.column_default
      })) || [],
      hostingColumns: hostingColumns?.map(col => ({
        name: col.column_name,
        type: col.data_type,
        default: col.column_default
      })) || [],
      duplicateHostingColumns: hostingColumns.length > 1,
      sampleRowKeys: sampleRow ? Object.keys(sampleRow) : [],
      sampleError: sampleError
    });
    
  } catch (error) {
    console.error('[COLUMN DEBUG] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze table columns',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}