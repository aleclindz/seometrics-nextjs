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

    // Get all inspections to count by site manually
    const { data: allInspections, error: allInspectionsError } = await supabase
      .from('url_inspections')
      .select('site_url')
      .eq('user_token', userToken);

    // Count by site manually
    const siteCount = allInspections ? 
      Object.entries(
        allInspections.reduce((acc: Record<string, number>, item) => {
          acc[item.site_url] = (acc[item.site_url] || 0) + 1;
          return acc;
        }, {})
      ).map(([site_url, count]) => ({ site_url, count })) : [];

    return NextResponse.json({
      success: true,
      data: {
        inspections: inspections || [],
        siteCount: siteCount || [],
        totalInspections: inspections?.length || 0,
        errors: {
          inspectionsError: inspectionsError?.message,
          allInspectionsError: allInspectionsError?.message
        }
      }
    });

  } catch (error) {
    console.error('[DEBUG URL INSPECTIONS] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch URL inspections debug data' }, { status: 500 });
  }
}