import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing userId or email' },
        { status: 400 }
      );
    }

    console.log(`[ADMIN] Fixing user record for ${email} with ID ${userId}`);

    // First, check if user already exists
    const { data: existingUser } = await supabase
      .from('login_users')
      .select('token')
      .eq('auth_user_id', userId)
      .single();

    if (existingUser) {
      console.log(`[ADMIN] User already exists with token: ${existingUser.token}`);
      return NextResponse.json({ 
        success: true, 
        message: 'User already exists',
        token: existingUser.token 
      });
    }

    // Create the user record
    const newToken = crypto.randomUUID();
    const { data: newUser, error: insertError } = await supabase
      .from('login_users')
      .insert({
        email,
        auth_user_id: userId,
        token: newToken
      })
      .select('token')
      .single();

    if (insertError) {
      console.error('[ADMIN] Error creating user record:', insertError);
      return NextResponse.json(
        { error: 'Failed to create user record', details: insertError },
        { status: 500 }
      );
    }

    console.log(`[ADMIN] Created user record with token: ${newUser.token}`);

    // Create default user plan
    const { error: planError } = await supabase
      .from('user_plans')
      .insert({
        user_token: newUser.token,
        tier: 'free',
        sites_allowed: 1,
        posts_allowed: 0,
        status: 'active'
      });

    if (planError) {
      console.error('[ADMIN] Error creating user plan:', planError);
      // Don't fail the request if plan creation fails
    } else {
      console.log(`[ADMIN] Created default user plan for token: ${newUser.token}`);
    }

    return NextResponse.json({
      success: true,
      message: 'User record created successfully',
      token: newUser.token
    });

  } catch (error) {
    console.error('[ADMIN] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}