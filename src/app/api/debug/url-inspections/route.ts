import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    
    if (!userToken) {
      return NextResponse.json({ error: 'userToken required' }, { status: 400 });
    }

    // Check URL inspections data
    const { data: inspections, error: inspectionsError } = await supabase
      .from('url_inspections')
      .select('*')
      .eq('user_token', userToken)
      .order('inspected_at', { ascending: false })
      .limit(10);

    // Get count by site
    const { data: siteCount, error: siteCountError } = await supabase
      .from('url_inspections')
      .select('site_url, count(*)')
      .eq('user_token', userToken)
      .group('site_url');

    return NextResponse.json({
      success: true,
      data: {
        inspections: inspections || [],
        siteCount: siteCount || [],
        totalInspections: inspections?.length || 0,
        errors: {
          inspectionsError: inspectionsError?.message,
          siteCountError: siteCountError?.message
        }
      }
    });

  } catch (error) {
    console.error('[DEBUG URL INSPECTIONS] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch URL inspections debug data' }, { status: 500 });
  }
}