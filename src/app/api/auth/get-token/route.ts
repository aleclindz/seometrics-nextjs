import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authUserId = searchParams.get('authUserId');

    console.log('[GET-TOKEN API] Request for authUserId:', authUserId);

    if (!authUserId) {
      return NextResponse.json(
        { error: 'Missing authUserId parameter' },
        { status: 400 }
      );
    }

    // Query using service role to bypass RLS
    const { data: user, error } = await supabase
      .from('login_users')
      .select('token, email')
      .eq('auth_user_id', authUserId)
      .single();

    if (error) {
      console.error('[GET-TOKEN API] Database error:', error);
      return NextResponse.json(
        { error: 'User not found', details: error },
        { status: 404 }
      );
    }

    console.log('[GET-TOKEN API] Found user:', user.email, 'with token');

    return NextResponse.json({
      success: true,
      token: user.token,
      email: user.email
    });

  } catch (error) {
    console.error('[GET-TOKEN API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}