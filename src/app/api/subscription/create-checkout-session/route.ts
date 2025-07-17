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

// Subscription tier configuration
const SUBSCRIPTION_TIERS = {
  starter: {
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    name: 'Starter Plan',
    sitesAllowed: 2,
    postsAllowed: 4,
  },
  pro: {
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    name: 'Pro Plan',
    sitesAllowed: 5,
    postsAllowed: 10,
  },
  enterprise: {
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
    name: 'Enterprise Plan',
    sitesAllowed: -1, // Unlimited
    postsAllowed: -1, // Unlimited
  },
};

export async function POST(request: NextRequest) {
  try {
    const { tier, userToken, email } = await request.json();

    // Validate required fields
    if (!tier || !userToken || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: tier, userToken, email' },
        { status: 400 }
      );
    }

    // Validate tier
    if (!SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS]) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
      );
    }

    const selectedTier = SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS];

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('login_users')
      .select('id, email, token')
      .eq('token', userToken)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user already has a Stripe customer
    const { data: existingPlan } = await supabase
      .from('user_plans')
      .select('stripe_customer_id')
      .eq('user_token', userToken)
      .single();

    let customerId = existingPlan?.stripe_customer_id;

    // Create Stripe customer if doesn&apos;t exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email,
        metadata: {
          userToken: userToken,
          userId: user.id.toString(),
        },
      });
      customerId = customer.id;
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: selectedTier.priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/account?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/account?canceled=true`,
      metadata: {
        userToken: userToken,
        tier: tier,
        sitesAllowed: selectedTier.sitesAllowed.toString(),
        postsAllowed: selectedTier.postsAllowed.toString(),
      },
      subscription_data: {
        metadata: {
          userToken: userToken,
          tier: tier,
        },
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });

  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}