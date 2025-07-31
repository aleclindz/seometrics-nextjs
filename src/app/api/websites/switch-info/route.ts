import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    console.log('[SWITCH INFO API] Getting switch info for user:', userToken);

    // Get the user's account creation date
    const { data: user, error: userError } = await supabase
      .from('login_users')
      .select('created_at')
      .eq('token', userToken)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get the most recent website switch
    const { data: lastSwitch, error: switchError } = await supabase
      .from('website_switches')
      .select('switched_at, reason')
      .eq('user_token', userToken)
      .order('switched_at', { ascending: false })
      .limit(1)
      .single();

    // Calculate cooldown information
    const now = new Date();
    const accountCreated = new Date(user.created_at);
    const accountAge = (now.getTime() - accountCreated.getTime()) / (1000 * 60 * 60 * 24); // days

    let canSwitch = true;
    let cooldownEndsAt = null;
    let reason = 'allowed';

    // New users (first 7 days) can switch freely
    if (accountAge <= 7) {
      reason = 'new_user_grace_period';
    } else if (lastSwitch && !switchError) {
      // Check if it's been 30 days since last switch
      const lastSwitchDate = new Date(lastSwitch.switched_at);
      const daysSinceSwitch = (now.getTime() - lastSwitchDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceSwitch < 30) {
        canSwitch = false;
        cooldownEndsAt = new Date(lastSwitchDate.getTime() + (30 * 24 * 60 * 60 * 1000));
        reason = 'cooldown_active';
      } else {
        reason = 'cooldown_expired';
      }
    } else {
      // No previous switches found
      reason = 'no_previous_switches';
    }

    console.log('[SWITCH INFO API] Switch info calculated:', {
      canSwitch,
      cooldownEndsAt,
      reason,
      accountAge: Math.round(accountAge * 10) / 10
    });

    return NextResponse.json({
      success: true,
      canSwitch,
      cooldownEndsAt,
      reason,
      accountAge: Math.round(accountAge * 10) / 10,
      lastSwitch: lastSwitch ? {
        date: lastSwitch.switched_at,
        reason: lastSwitch.reason
      } : null
    });

  } catch (error) {
    console.error('[SWITCH INFO API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}