import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { website_token } = body;

    if (!website_token) {
      return NextResponse.json(
        { error: 'Missing website_token parameter' },
        { status: 400 }
      );
    }

    console.log('[CHECK-ATTRIBUTION API] Checking attribution setting for website:', website_token);

    // Get website attribution setting
    const { data: website, error } = await supabase
      .from('websites')
      .select('attribution_enabled')
      .eq('website_token', website_token)
      .single();

    if (error) {
      console.error('[CHECK-ATTRIBUTION API] Database error:', error);
      // Return enabled by default if website not found or error
      return NextResponse.json({
        attribution_enabled: true,
        message: 'Default attribution enabled (website not found in database)'
      });
    }

    if (!website) {
      console.log('[CHECK-ATTRIBUTION API] Website not found, returning default enabled');
      return NextResponse.json({
        attribution_enabled: true,
        message: 'Default attribution enabled (website not found)'
      });
    }

    const attributionEnabled = website.attribution_enabled !== false; // Default to true if null/undefined

    console.log('[CHECK-ATTRIBUTION API] Attribution setting:', attributionEnabled);

    return NextResponse.json({
      attribution_enabled: attributionEnabled,
      message: attributionEnabled ? 'Attribution enabled' : 'Attribution disabled'
    });

  } catch (error) {
    console.error('[CHECK-ATTRIBUTION API] Unexpected error:', error);
    // Return enabled by default on error to ensure backlinks aren't lost due to API issues
    return NextResponse.json({
      attribution_enabled: true,
      message: 'Default attribution enabled (API error)'
    });
  }
}