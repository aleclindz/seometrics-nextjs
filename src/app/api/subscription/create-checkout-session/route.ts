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

// NEW: Article-focused subscription tier configuration
// No free tier - all users must have paid subscription for article generation
const SUBSCRIPTION_TIERS = {
  starter: {
    priceId: process.env.STRIPE_STARTER_PRICE_ID!, // $19/month
    name: 'Starter Plan',
    price: '$19/month',
    sitesAllowed: 1,
    postsAllowed: 12, // 3 articles/week
    description: 'Perfect for small blogs',
    features: ['12 AI articles/month', '1 website', 'DALL-E 3 images', 'SEO optimization', 'Multi-CMS publishing']
  },
  pro: {
    priceId: process.env.STRIPE_PRO_PRICE_ID!, // $39/month
    name: 'Pro Plan',
    price: '$39/month',
    sitesAllowed: 10,
    postsAllowed: 30, // 1 article/day
    description: 'Ideal for growing businesses',
    features: ['30 AI articles/month', '10 websites', 'DALL-E 3 images', 'SEO optimization', 'Multi-CMS publishing', 'Priority support']
  },
  scale: {
    priceId: process.env.STRIPE_SCALE_PRICE_ID!, // $99/month (renamed from enterprise)
    name: 'Scale Plan',
    price: '$99/month',
    sitesAllowed: -1, // Unlimited
    postsAllowed: 90, // 3 articles/day
    description: 'For high-volume content needs',
    features: ['90 AI articles/month', 'Unlimited websites', 'DALL-E 3 images', 'SEO optimization', 'Multi-CMS publishing', 'Priority support', 'Custom integrations']
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
      success_url: `${getBaseUrl()}/account?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getBaseUrl()}/account?canceled=true`,
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