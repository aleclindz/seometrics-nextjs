import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('[ADMIN] Fixing plan limits...');

    // Update all starter plans to allow 1 website instead of 2
    const { error: updateStarterError } = await supabase
      .from('user_plans')
      .update({ sites_allowed: 1 })
      .eq('tier', 'starter');

    if (updateStarterError) {
      console.error('[ADMIN] Failed to update starter plans:', updateStarterError);
      return NextResponse.json(
        { error: 'Failed to update starter plans', details: updateStarterError },
        { status: 500 }
      );
    }

    // Update all pro plans to allow 5 websites (in case any are wrong)
    const { error: updateProError } = await supabase
      .from('user_plans')
      .update({ sites_allowed: 5 })
      .eq('tier', 'pro');

    if (updateProError) {
      console.error('[ADMIN] Failed to update pro plans:', updateProError);
      return NextResponse.json(
        { error: 'Failed to update pro plans', details: updateProError },
        { status: 500 }
      );
    }

    // Update all free plans to allow 0 managed websites (view only)
    const { error: updateFreeError } = await supabase
      .from('user_plans')
      .update({ sites_allowed: 0 })
      .eq('tier', 'free');

    if (updateFreeError) {
      console.error('[ADMIN] Failed to update free plans:', updateFreeError);
      return NextResponse.json(
        { error: 'Failed to update free plans', details: updateFreeError },
        { status: 500 }
      );
    }

    // Get count of updated records
    const { count: starterCount } = await supabase
      .from('user_plans')
      .select('*', { count: 'exact' })
      .eq('tier', 'starter');

    const { count: proCount } = await supabase
      .from('user_plans')
      .select('*', { count: 'exact' })
      .eq('tier', 'pro');

    const { count: freeCount } = await supabase
      .from('user_plans')
      .select('*', { count: 'exact' })
      .eq('tier', 'free');

    console.log('[ADMIN] Plan limits updated successfully:', {
      starter: starterCount,
      pro: proCount,
      free: freeCount
    });

    return NextResponse.json({
      success: true,
      message: 'Plan limits updated successfully',
      updated: {
        starter: starterCount,
        pro: proCount,
        free: freeCount
      }
    });

  } catch (error) {
    console.error('[ADMIN] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}