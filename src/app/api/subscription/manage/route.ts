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

    if (!userToken) {
      return NextResponse.json(
        { error: 'Missing userToken parameter' },
        { status: 400 }
      );
    }

    // Get user plan from database
    const { data: userPlan, error } = await supabase
      .from('user_plans')
      .select('*')
      .eq('user_token', userToken)
      .single();

    if (error || !userPlan) {
      return NextResponse.json(
        { error: 'User plan not found' },
        { status: 404 }
      );
    }

    // Get current usage
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('resource_type, count')
      .eq('user_token', userToken)
      .eq('month_year', currentMonth);

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
    const { data: userPlan, error } = await supabase
      .from('user_plans')
      .select('*')
      .eq('user_token', userToken)
      .single();

    if (error || !userPlan) {
      return NextResponse.json(
        { error: 'User plan not found' },
        { status: 404 }
      );
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