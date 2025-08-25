import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to get the correct base URL
function getBaseUrl(): string {
  // Force seoagent.com in production, ignore VERCEL_URL to avoid seometrics.ai redirects
  return process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'production' ? 'https://seoagent.com' : 'http://localhost:3000');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');

    console.log('[SUBSCRIPTION API] GET request received with userToken:', userToken);

    if (!userToken) {
      console.log('[SUBSCRIPTION API] Missing userToken parameter');
      return NextResponse.json(
        { error: 'Missing userToken parameter' },
        { status: 400 }
      );
    }

    // First check login_users.plan to determine if user should be on free tier
    console.log('[SUBSCRIPTION API] Checking login_users.plan for userToken:', userToken);
    const { data: loginUser, error: loginUserError } = await supabase
      .from('login_users')
      .select('plan')
      .eq('token', userToken)
      .single()
    
    console.log('[SUBSCRIPTION API] login_users query result:', { loginUser, error: loginUserError });

    // Get user plan from database
    console.log('[SUBSCRIPTION API] Querying user_plans for userToken:', userToken);
    let { data: userPlan, error } = await supabase
      .from('user_plans')
      .select('*')
      .eq('user_token', userToken)
      .single();
    
    console.log('[SUBSCRIPTION API] user_plans query result:', { userPlan, error });

    // If user plan doesn't exist, check the user's plan status from login_users table
    if (error && error.code === 'PGRST116') { // No rows returned
      console.log('No user_plans record found, checking login_users plan status for:', userToken)
      
      // Get user's plan from login_users table
      const { data: loginUser, error: loginUserError } = await supabase
        .from('login_users')
        .select('plan')
        .eq('token', userToken)
        .single()
      
      if (loginUserError) {
        console.error('Error fetching login user:', loginUserError)
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
      
      // Create appropriate plan based on login_users.plan value
      const isFreePlan = loginUser.plan === 0
      console.log(`Creating ${isFreePlan ? 'free' : 'starter'} plan for user:`, userToken)
      
      const { data: newPlan, error: insertError } = await supabase
        .from('user_plans')
        .insert({
          user_token: userToken,
          tier: isFreePlan ? 'free' : 'starter',
          sites_allowed: 1,
          posts_allowed: isFreePlan ? 0 : -1, // Free: 0 articles, Starter: unlimited
          status: 'active'
        })
        .select('*')
        .single()
        
      if (insertError) {
        console.error('Error creating user plan:', insertError)
        return NextResponse.json(
          { error: 'Failed to create user plan' },
          { status: 500 }
        )
      }
      
      userPlan = newPlan
    } else if (error) {
      console.error('Error fetching user plan:', error)
      return NextResponse.json(
        { error: 'User plan not found' },
        { status: 404 }
      )
    }

    // Override user_plans.tier if login_users.plan = 0 (Free tier priority)
    if (loginUser && loginUser.plan === 0 && userPlan) {
      console.log('[SUBSCRIPTION API] login_users.plan is 0, overriding to free tier');
      
      // Update the existing user_plans record to free tier if it's not already
      if (userPlan.tier !== 'free') {
        const { error: updateError } = await supabase
          .from('user_plans')
          .update({
            tier: 'free',
            sites_allowed: 1,
            posts_allowed: 0,
            updated_at: new Date().toISOString()
          })
          .eq('user_token', userToken);

        if (updateError) {
          console.error('[SUBSCRIPTION API] Error updating user plan to free:', updateError);
        } else {
          // Update local userPlan object to reflect the change
          userPlan.tier = 'free';
          userPlan.sites_allowed = 1;
          userPlan.posts_allowed = 0;
          console.log('[SUBSCRIPTION API] Successfully updated user plan to free tier');
        }
      }
    }

    // Get actual website count from websites table
    console.log('[SUBSCRIPTION API] Querying websites for userToken:', userToken);
    const { data: websites, error: websitesError } = await supabase
      .from('websites')
      .select('id')
      .eq('user_token', userToken);
    
    console.log('[SUBSCRIPTION API] websites query result:', { count: websites?.length || 0, error: websitesError });

    // Get current monthly usage from usage_tracking table
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    console.log('[SUBSCRIPTION API] Querying usage_tracking for userToken:', userToken, 'month:', currentMonth);
    const { data: usage, error: usageError } = await supabase
      .from('usage_tracking')
      .select('resource_type, count')
      .eq('user_token', userToken)
      .eq('month_year', currentMonth);
    
    console.log('[SUBSCRIPTION API] usage_tracking query result:', { usage, usageError });

    // Calculate monthly usage by resource type (articles generated this month)
    const usageByType = usage?.reduce((acc, item) => {
      acc[item.resource_type] = (acc[item.resource_type] || 0) + item.count;
      return acc;
    }, {} as Record<string, number>) || {};

    // Get Stripe subscription details if exists
    let stripeSubscription = null;
    if (userPlan.stripe_subscription_id) {
      try {
        stripeSubscription = await stripe.subscriptions.retrieve(userPlan.stripe_subscription_id);
      } catch (stripeError) {
        console.error('Error retrieving Stripe subscription:', stripeError);
      }
    }

    return NextResponse.json({
      success: true,
      plan: userPlan,
      usage: {
        sites: websites?.length || 0, // Actual count of connected websites
        articles: usageByType.article || 0, // Monthly article generation count
        month: currentMonth,
      },
      subscription: stripeSubscription ? {
        id: stripeSubscription.id,
        status: stripeSubscription.status,
        current_period_start: stripeSubscription.current_period_start,
        current_period_end: stripeSubscription.current_period_end,
        cancel_at_period_end: stripeSubscription.cancel_at_period_end,
      } : null,
    });

  } catch (error) {
    console.error('Subscription management error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, userToken } = await request.json();

    if (!action || !userToken) {
      return NextResponse.json(
        { error: 'Missing required fields: action, userToken' },
        { status: 400 }
      );
    }

    // First check login_users.plan to determine if user should be on free tier
    const { data: loginUser, error: loginUserError } = await supabase
      .from('login_users')
      .select('plan')
      .eq('token', userToken)
      .single()

    // Get user plan
    let { data: userPlan, error } = await supabase
      .from('user_plans')
      .select('*')
      .eq('user_token', userToken)
      .single();

    // If user plan doesn't exist, check the user's plan status from login_users table
    if (error && error.code === 'PGRST116') { // No rows returned
      console.log('No user_plans record found, checking login_users plan status for:', userToken)
      
      // Get user's plan from login_users table
      const { data: loginUser, error: loginUserError } = await supabase
        .from('login_users')
        .select('plan')
        .eq('token', userToken)
        .single()
      
      if (loginUserError) {
        console.error('Error fetching login user:', loginUserError)
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
      
      // Create appropriate plan based on login_users.plan value
      const isFreePlan = loginUser.plan === 0
      console.log(`Creating ${isFreePlan ? 'free' : 'starter'} plan for user:`, userToken)
      
      const { data: newPlan, error: insertError } = await supabase
        .from('user_plans')
        .insert({
          user_token: userToken,
          tier: isFreePlan ? 'free' : 'starter',
          sites_allowed: 1,
          posts_allowed: isFreePlan ? 0 : -1, // Free: 0 articles, Starter: unlimited
          status: 'active'
        })
        .select('*')
        .single()
        
      if (insertError) {
        console.error('Error creating user plan:', insertError)
        return NextResponse.json(
          { error: 'Failed to create user plan' },
          { status: 500 }
        )
      }
      
      userPlan = newPlan
    } else if (error) {
      console.error('Error fetching user plan:', error)
      return NextResponse.json(
        { error: 'User plan not found' },
        { status: 404 }
      )
    }

    // Override user_plans.tier if login_users.plan = 0 (Free tier priority) - POST method
    if (loginUser && loginUser.plan === 0 && userPlan) {
      console.log('[SUBSCRIPTION API POST] login_users.plan is 0, overriding to free tier');
      
      // Update the existing user_plans record to free tier if it's not already
      if (userPlan.tier !== 'free') {
        const { error: updateError } = await supabase
          .from('user_plans')
          .update({
            tier: 'free',
            sites_allowed: 1,
            posts_allowed: 0,
            updated_at: new Date().toISOString()
          })
          .eq('user_token', userToken);

        if (updateError) {
          console.error('[SUBSCRIPTION API POST] Error updating user plan to free:', updateError);
        } else {
          // Update local userPlan object to reflect the change
          userPlan.tier = 'free';
          userPlan.sites_allowed = 1;
          userPlan.posts_allowed = 0;
          console.log('[SUBSCRIPTION API POST] Successfully updated user plan to free tier');
        }
      }
    }

    switch (action) {
      case 'cancel':
        return await handleCancelSubscription(userPlan);
      
      case 'reactivate':
        return await handleReactivateSubscription(userPlan);
      
      case 'create-portal-session':
        return await handleCreatePortalSession(userPlan);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Subscription action error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleCancelSubscription(userPlan: any) {
  if (!userPlan.stripe_subscription_id) {
    return NextResponse.json(
      { error: 'No active subscription to cancel' },
      { status: 400 }
    );
  }

  try {
    // Cancel subscription at period end
    const subscription = await stripe.subscriptions.update(
      userPlan.stripe_subscription_id,
      {
        cancel_at_period_end: true,
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Subscription will be cancelled at the end of the current period',
      subscription: {
        id: subscription.id,
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_end: subscription.current_period_end,
      },
    });

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}

async function handleReactivateSubscription(userPlan: any) {
  if (!userPlan.stripe_subscription_id) {
    return NextResponse.json(
      { error: 'No subscription to reactivate' },
      { status: 400 }
    );
  }

  try {
    // Reactivate subscription
    const subscription = await stripe.subscriptions.update(
      userPlan.stripe_subscription_id,
      {
        cancel_at_period_end: false,
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Subscription reactivated successfully',
      subscription: {
        id: subscription.id,
        cancel_at_period_end: subscription.cancel_at_period_end,
        status: subscription.status,
      },
    });

  } catch (error) {
    console.error('Error reactivating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to reactivate subscription' },
      { status: 500 }
    );
  }
}

async function handleCreatePortalSession(userPlan: any) {
  if (!userPlan.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No Stripe customer found' },
      { status: 400 }
    );
  }

  try {
    // Create customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: userPlan.stripe_customer_id,
      return_url: `${getBaseUrl()}/account`,
    });

    return NextResponse.json({
      success: true,
      url: session.url,
    });

  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}