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
      return NextResponse.json(
        { error: 'Missing userToken parameter' },
        { status: 400 }
      );
    }

    console.log('[WEBSITES API] Fetching websites for user:', userToken);

    // Get user's websites
    const { data: websites, error } = await supabase
      .from('websites')
      .select('id, domain, website_token, created_at')
      .eq('user_token', userToken)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[WEBSITES API] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch websites' },
        { status: 500 }
      );
    }

    console.log('[WEBSITES API] Found websites:', websites?.length || 0);

    return NextResponse.json({
      success: true,
      websites: websites || []
    });

  } catch (error) {
    console.error('[WEBSITES API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}