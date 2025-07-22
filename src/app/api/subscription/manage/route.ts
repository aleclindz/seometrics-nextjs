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

    // Get user plan from database
    console.log('[SUBSCRIPTION API] Querying user_plans for userToken:', userToken);
    let { data: userPlan, error } = await supabase
      .from('user_plans')
      .select('*')
      .eq('user_token', userToken)
      .single();
    
    console.log('[SUBSCRIPTION API] user_plans query result:', { userPlan, error });

    // If user plan doesn't exist, create a default starter plan
    if (error && error.code === 'PGRST116') { // No rows returned
      console.log('Creating default starter plan for user:', userToken)
      
      const { data: newPlan, error: insertError } = await supabase
        .from('user_plans')
        .insert({
          user_token: userToken,
          tier: 'free',
          sites_allowed: 1,
          posts_allowed: 0,
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

    // Get current usage
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    console.log('[SUBSCRIPTION API] Querying usage_tracking for userToken:', userToken, 'month:', currentMonth);
    const { data: usage, error: usageError } = await supabase
      .from('usage_tracking')
      .select('resource_type, count')
      .eq('user_token', userToken)
      .eq('month_year', currentMonth);
    
    console.log('[SUBSCRIPTION API] usage_tracking query result:', { usage, usageError });

    // Calculate usage by resource type
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
      plan: userPlan,
      usage: {
        sites: usageByType.site || 0,
        articles: usageByType.article || 0,
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

    // Get user plan
    let { data: userPlan, error } = await supabase
      .from('user_plans')
      .select('*')
      .eq('user_token', userToken)
      .single();

    // If user plan doesn't exist, create a default starter plan
    if (error && error.code === 'PGRST116') { // No rows returned
      console.log('Creating default starter plan for user:', userToken)
      
      const { data: newPlan, error: insertError } = await supabase
        .from('user_plans')
        .insert({
          user_token: userToken,
          tier: 'free',
          sites_allowed: 1,
          posts_allowed: 0,
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
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/account`,
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