import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, type = 'signup' } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    console.log('[EMAIL DEBUG] Testing email sending for:', email, 'Type:', type);

    let result;
    let debugInfo: any = {
      email,
      type,
      timestamp: new Date().toISOString(),
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
    };

    if (type === 'signup') {
      // Test signup verification email
      console.log('[EMAIL DEBUG] Testing signup verification email');

      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/confirm-email`
        }
      });

      debugInfo.result = data;
      debugInfo.error = error;

      if (error) {
        console.error('[EMAIL DEBUG] Error sending signup email:', error);
        return NextResponse.json({
          success: false,
          message: 'Failed to send verification email',
          debug: debugInfo,
          errorDetails: {
            message: error.message,
            status: error.status,
          }
        }, { status: 500 });
      }

      console.log('[EMAIL DEBUG] Signup email sent successfully:', data);

      return NextResponse.json({
        success: true,
        message: 'Verification email sent successfully',
        debug: debugInfo
      });

    } else if (type === 'reset') {
      // Test password reset email
      console.log('[EMAIL DEBUG] Testing password reset email');

      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
      });

      debugInfo.result = data;
      debugInfo.error = error;

      if (error) {
        console.error('[EMAIL DEBUG] Error sending reset email:', error);
        return NextResponse.json({
          success: false,
          message: 'Failed to send reset email',
          debug: debugInfo,
          errorDetails: {
            message: error.message,
            status: error.status,
          }
        }, { status: 500 });
      }

      console.log('[EMAIL DEBUG] Reset email sent successfully:', data);

      return NextResponse.json({
        success: true,
        message: 'Reset email sent successfully',
        debug: debugInfo
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid email type. Use "signup" or "reset"' },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('[EMAIL DEBUG] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        debug: {
          message: error?.message,
          stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
        }
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Check email configuration
  const configCheck = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
    environment: process.env.NODE_ENV,
  };

  console.log('[EMAIL DEBUG] Configuration check:', configCheck);

  return NextResponse.json({
    message: 'Email configuration check',
    config: configCheck,
    note: 'POST to this endpoint with { "email": "test@example.com", "type": "signup" or "reset" } to test email sending'
  });
}
