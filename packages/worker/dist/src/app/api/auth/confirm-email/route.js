"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
// Use service role for admin operations
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');
        const type = searchParams.get('type');
        const redirectTo = searchParams.get('redirect_to') || '/onboarding';
        console.log('[AUTH CONFIRM] Handling email confirmation:', { token: token?.substring(0, 10), type });
        if (!token || type !== 'signup') {
            return server_1.NextResponse.redirect(new URL('/login?error=invalid_confirmation_link', request.url));
        }
        // Verify the token with Supabase Auth
        const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'signup'
        });
        if (error) {
            console.error('[AUTH CONFIRM] Email confirmation failed:', error);
            return server_1.NextResponse.redirect(new URL('/login?error=confirmation_failed', request.url));
        }
        if (!data.user) {
            console.error('[AUTH CONFIRM] No user data returned');
            return server_1.NextResponse.redirect(new URL('/login?error=confirmation_failed', request.url));
        }
        console.log('[AUTH CONFIRM] Email confirmed for user:', data.user.id);
        // Check if user already exists in login_users table
        const { data: existingUser, error: userCheckError } = await supabase
            .from('login_users')
            .select('token')
            .eq('auth_user_id', data.user.id)
            .single();
        if (userCheckError && userCheckError.code !== 'PGRST116') { // PGRST116 = not found
            console.error('[AUTH CONFIRM] Error checking existing user:', userCheckError);
            return server_1.NextResponse.redirect(new URL('/login?error=database_error', request.url));
        }
        let userToken = existingUser?.token;
        // Create login_users record if it doesn't exist
        if (!existingUser) {
            console.log('[AUTH CONFIRM] Creating new login_users record');
            const { data: newUser, error: createError } = await supabase
                .from('login_users')
                .insert({
                email: data.user.email,
                auth_user_id: data.user.id,
                plan: 0 // Start with free plan
            })
                .select('token')
                .single();
            if (createError) {
                console.error('[AUTH CONFIRM] Error creating login_users record:', createError);
                return server_1.NextResponse.redirect(new URL('/login?error=user_creation_failed', request.url));
            }
            userToken = newUser.token;
            console.log('[AUTH CONFIRM] New user created with token:', userToken);
            // Create default user plan
            const { error: planError } = await supabase
                .from('user_plans')
                .insert({
                user_token: userToken,
                tier: 'starter',
                sites_allowed: 1,
                posts_allowed: 4,
                status: 'active'
            });
            if (planError) {
                console.warn('[AUTH CONFIRM] Error creating default plan:', planError);
                // Don't fail the confirmation for this
            }
        }
        else {
            console.log('[AUTH CONFIRM] User already exists, using existing token:', userToken);
        }
        // Redirect to onboarding page with success indicator
        const redirectUrl = new URL(redirectTo, request.url);
        redirectUrl.searchParams.set('verified', 'true');
        redirectUrl.searchParams.set('new_user', existingUser ? 'false' : 'true');
        console.log('[AUTH CONFIRM] Redirecting to:', redirectUrl.toString());
        return server_1.NextResponse.redirect(redirectUrl);
    }
    catch (error) {
        console.error('[AUTH CONFIRM] Unexpected error:', error);
        return server_1.NextResponse.redirect(new URL('/login?error=unexpected_error', request.url));
    }
}
async function POST(request) {
    try {
        const body = await request.json();
        const { email } = body;
        if (!email) {
            return server_1.NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }
        console.log('[AUTH CONFIRM] Resending confirmation email to:', email);
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email,
            options: {
                emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/confirm-email`
            }
        });
        if (error) {
            console.error('[AUTH CONFIRM] Error resending confirmation email:', error);
            return server_1.NextResponse.json({ error: 'Failed to resend confirmation email' }, { status: 500 });
        }
        return server_1.NextResponse.json({
            success: true,
            message: 'Confirmation email resent successfully'
        });
    }
    catch (error) {
        console.error('[AUTH CONFIRM] Unexpected error in resend:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
