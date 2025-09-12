"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const stripe_1 = __importDefault(require("stripe"));
const supabase_js_1 = require("@supabase/supabase-js");
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-02-24.acacia',
});
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
async function POST(request) {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature');
    let event;
    try {
        event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    }
    catch (err) {
        console.error('Webhook signature verification failed:', err);
        return server_1.NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
    console.log(`Processing webhook event: ${event.type}`);
    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object);
                break;
            case 'customer.subscription.created':
                await handleSubscriptionCreated(event.data.object);
                break;
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object);
                break;
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;
            case 'invoice.payment_succeeded':
                await handlePaymentSucceeded(event.data.object);
                break;
            case 'invoice.payment_failed':
                await handlePaymentFailed(event.data.object);
                break;
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
        return server_1.NextResponse.json({ received: true });
    }
    catch (error) {
        console.error('Webhook handler error:', error);
        return server_1.NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }
}
async function handleCheckoutCompleted(session) {
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
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    // Update or create user plan
    const { error } = await supabase
        .from('user_plans')
        .upsert({
        user_token: userToken,
        tier: tier,
        sites_allowed: sitesAllowed,
        posts_allowed: postsAllowed,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        status: 'active',
    });
    if (error) {
        console.error('Error updating user plan:', error);
        throw error;
    }
    console.log(`Updated user plan for ${userToken} to ${tier}`);
}
async function handleSubscriptionCreated(subscription) {
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
async function handleSubscriptionUpdated(subscription) {
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
async function handleSubscriptionDeleted(subscription) {
    console.log('Processing subscription deleted:', subscription.id);
    // Set user back to starter plan
    const { error } = await supabase
        .from('user_plans')
        .update({
        tier: 'starter',
        sites_allowed: 2,
        posts_allowed: 4,
        status: 'cancelled',
        stripe_subscription_id: null,
        updated_at: new Date().toISOString(),
    })
        .eq('stripe_subscription_id', subscription.id);
    if (error) {
        console.error('Error handling subscription deletion:', error);
        throw error;
    }
}
async function handlePaymentSucceeded(invoice) {
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
async function handlePaymentFailed(invoice) {
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
function getTierLimits(tier) {
    const limits = {
        starter: { sites: 2, posts: 4 },
        pro: { sites: 5, posts: 10 },
        enterprise: { sites: -1, posts: -1 }, // Unlimited
    };
    return limits[tier] || limits.starter;
}
