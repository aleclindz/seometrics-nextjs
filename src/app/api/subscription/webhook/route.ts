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

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig!, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log(`Processing webhook event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('Processing checkout completed:', session.id);

  const userToken = session.metadata?.userToken;
  const tier = session.metadata?.tier;
  const sitesAllowed = parseInt(session.metadata?.sitesAllowed || '2');
  const postsAllowed = parseInt(session.metadata?.postsAllowed || '4');

  if (!userToken || !tier) {
    console.error('Missing metadata in checkout session');
    return;
  }

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

  // Update or create user plan
  const { error } = await supabase
    .from('user_plans')
    .upsert({
      user_token: userToken,
      tier: tier,
      sites_allowed: sitesAllowed,
      posts_allowed: postsAllowed,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: session.subscription as string,
      status: 'active',
    });

  if (error) {
    console.error('Error updating user plan:', error);
    throw error;
  }

  console.log(`Updated user plan for ${userToken} to ${tier}`);
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Processing subscription created:', subscription.id);

  const userToken = subscription.metadata?.userToken;
  const tier = subscription.metadata?.tier;

  if (!userToken || !tier) {
    console.error('Missing metadata in subscription');
    return;
  }

  // Get tier limits
  const tierLimits = getTierLimits(tier);

  // Update subscription status
  const { error } = await supabase
    .from('user_plans')
    .update({
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      updated_at: new Date().toISOString(),
    })
    .eq('user_token', userToken);

  if (error) {
    console.error('Error updating subscription status:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Processing subscription updated:', subscription.id);

  const userToken = subscription.metadata?.userToken;

  if (!userToken) {
    console.error('Missing userToken in subscription metadata');
    return;
  }

  // Update subscription status
  const { error } = await supabase
    .from('user_plans')
    .update({
      status: subscription.status,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Processing subscription deleted:', subscription.id);

  // IMPORTANT: No fallback to free tier - set to cancelled starter plan
  const { error } = await supabase
    .from('user_plans')
    .update({
      tier: 'starter',
      sites_allowed: 1,
      posts_allowed: 12,
      status: 'cancelled', // User must reactivate to generate articles
      stripe_subscription_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error handling subscription deletion:', error);
    throw error;
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Processing payment succeeded:', invoice.id);

  if (invoice.subscription) {
    // Update subscription status to active
    const { error } = await supabase
      .from('user_plans')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', invoice.subscription);

    if (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Processing payment failed:', invoice.id);

  if (invoice.subscription) {
    // Update subscription status to past_due
    const { error } = await supabase
      .from('user_plans')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', invoice.subscription);

    if (error) {
      console.error('Error updating payment failure status:', error);
      throw error;
    }
  }
}

function getTierLimits(tier: string) {
  // NEW: Updated tier limits for article-focused pricing
  const limits = {
    starter: { sites: 1, posts: 12 },        // $19/month: 1 site, 12 articles (3/week)
    pro: { sites: 10, posts: 30 },           // $39/month: 10 sites, 30 articles (1/day)
    scale: { sites: -1, posts: 90 },         // $99/month: unlimited sites, 90 articles (3/day)
    // Legacy support for old 'enterprise' tier - migrate to 'scale'
    enterprise: { sites: -1, posts: 90 },
  };

  return limits[tier as keyof typeof limits] || limits.starter;
}