import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Try to get a sample user to see the token format
    const { data: sampleUser, error: userError } = await supabase
      .from('login_users')
      .select('token')
      .limit(1)
      .single();

    // Try to get a sample website to see the user_token format
    const { data: sampleWebsite, error: websiteError } = await supabase
      .from('websites')
      .select('user_token')
      .limit(1)
      .single();

    // Try to get a sample user plan to see the user_token format
    const { data: samplePlan, error: planError } = await supabase
      .from('user_plans')
      .select('user_token')
      .limit(1)
      .single();

    return NextResponse.json({
      success: true,
      sample_login_user_token: sampleUser?.token,
      sample_website_user_token: sampleWebsite?.user_token,
      sample_plan_user_token: samplePlan?.user_token,
      token_types: {
        login_user_token_type: typeof sampleUser?.token,
        website_user_token_type: typeof sampleWebsite?.user_token,
        plan_user_token_type: typeof samplePlan?.user_token
      },
      errors: {
        userError: userError?.message,
        websiteError: websiteError?.message,
        planError: planError?.message
      }
    });

  } catch (error) {
    console.error('[TOKEN TYPE CHECK] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}