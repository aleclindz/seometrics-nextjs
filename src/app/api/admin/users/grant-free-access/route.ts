import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Grant free Pro access to a user for specified months
 * POST /api/admin/users/grant-free-access
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userToken, months, grantedBy, reason } = body;

    // Validate input
    if (!userToken || !months || !grantedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: userToken, months, grantedBy' },
        { status: 400 }
      );
    }

    if (months < 1 || months > 24) {
      return NextResponse.json(
        { error: 'Months must be between 1 and 24' },
        { status: 400 }
      );
    }

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('login_users')
      .select('email')
      .eq('token', userToken)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Call the grant_free_months function
    const { data, error } = await supabase.rpc('grant_free_months', {
      p_user_token: userToken,
      p_months: months,
      p_granted_by: grantedBy,
      p_reason: reason || null
    });

    if (error) {
      console.error('[ADMIN] Error granting free access:', error);
      return NextResponse.json(
        { error: 'Failed to grant free access', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Granted ${months} months of free Pro access to ${user.email}`,
      user_email: user.email,
      details: data
    });

  } catch (error) {
    console.error('[ADMIN] Unexpected error granting free access:', error);
    return NextResponse.json(
      { error: 'Failed to grant free access' },
      { status: 500 }
    );
  }
}

/**
 * Revoke free access from a user
 * DELETE /api/admin/users/grant-free-access
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const revokedBy = searchParams.get('revokedBy');
    const reason = searchParams.get('reason');

    if (!userToken || !revokedBy) {
      return NextResponse.json(
        { error: 'Missing required parameters: userToken, revokedBy' },
        { status: 400 }
      );
    }

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('login_users')
      .select('email')
      .eq('token', userToken)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Call the revoke_free_access function
    const { data, error } = await supabase.rpc('revoke_free_access', {
      p_user_token: userToken,
      p_revoked_by: revokedBy,
      p_reason: reason || null
    });

    if (error) {
      console.error('[ADMIN] Error revoking free access:', error);
      return NextResponse.json(
        { error: 'Failed to revoke free access', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Revoked free access from ${user.email}`,
      user_email: user.email,
      details: data
    });

  } catch (error) {
    console.error('[ADMIN] Unexpected error revoking free access:', error);
    return NextResponse.json(
      { error: 'Failed to revoke free access' },
      { status: 500 }
    );
  }
}

/**
 * Get free access history for a user
 * GET /api/admin/users/grant-free-access?userToken=xxx
 */
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

    // Get current free access status
    const { data: userPlan } = await supabase
      .from('user_plans')
      .select('free_until, free_granted_by, free_granted_at, free_reason')
      .eq('user_token', userToken)
      .single();

    // Get grant history
    const { data: history, error: historyError } = await supabase
      .from('free_access_grants')
      .select('*')
      .eq('user_token', userToken)
      .order('created_at', { ascending: false });

    if (historyError) {
      console.error('[ADMIN] Error fetching free access history:', historyError);
    }

    // Calculate if currently active
    const isActive = userPlan?.free_until && new Date(userPlan.free_until) > new Date();
    const daysRemaining = isActive
      ? Math.ceil((new Date(userPlan.free_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0;

    return NextResponse.json({
      success: true,
      current_status: {
        has_free_access: isActive,
        free_until: userPlan?.free_until || null,
        days_remaining: daysRemaining,
        granted_by: userPlan?.free_granted_by || null,
        granted_at: userPlan?.free_granted_at || null,
        reason: userPlan?.free_reason || null
      },
      history: history || []
    });

  } catch (error) {
    console.error('[ADMIN] Unexpected error fetching free access data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch free access data' },
      { status: 500 }
    );
  }
}
