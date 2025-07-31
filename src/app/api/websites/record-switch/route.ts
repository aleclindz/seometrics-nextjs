import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userToken, fromWebsiteToken, toWebsiteToken, reason } = body;

    if (!userToken || !toWebsiteToken) {
      return NextResponse.json(
        { error: 'Missing required parameters: userToken, toWebsiteToken' },
        { status: 400 }
      );
    }

    console.log('[RECORD SWITCH API] Recording website switch:', {
      userToken,
      fromWebsiteToken,
      toWebsiteToken,
      reason: reason || 'user_switch'
    });

    // Record the switch
    const { error: insertError } = await supabase
      .from('website_switches')
      .insert({
        user_token: userToken,
        from_website_token: fromWebsiteToken,
        to_website_token: toWebsiteToken,
        reason: reason || 'user_switch',
        switched_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('[RECORD SWITCH API] Failed to record switch:', insertError);
      return NextResponse.json(
        { error: 'Failed to record website switch' },
        { status: 500 }
      );
    }

    console.log('[RECORD SWITCH API] Website switch recorded successfully');

    return NextResponse.json({
      success: true,
      message: 'Website switch recorded successfully'
    });

  } catch (error) {
    console.error('[RECORD SWITCH API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}