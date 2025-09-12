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
// Helper function to get the correct base URL
function getBaseUrl() {
    // Force seoagent.com in production, ignore VERCEL_URL to avoid seometrics.ai redirects
    return process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'production' ? 'https://seoagent.com' : 'http://localhost:3000');
}
// Subscription tier configuration
const SUBSCRIPTION_TIERS = {
    starter: {
        priceId: process.env.STRIPE_STARTER_PRICE_ID,
        name: 'Starter Plan',
        sitesAllowed: 2,
        postsAllowed: 4,
    },
    pro: {
        priceId: process.env.STRIPE_PRO_PRICE_ID,
        name: 'Pro Plan',
        sitesAllowed: 5,
        postsAllowed: 10,
    },
    enterprise: {
        priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
        name: 'Enterprise Plan',
        sitesAllowed: -1, // Unlimited
        postsAllowed: -1, // Unlimited
    },
};
async function POST(request) {
    try {
        const { tier, userToken, email } = await request.json();
        // Validate required fields
        if (!tier || !userToken || !email) {
            return server_1.NextResponse.json({ error: 'Missing required fields: tier, userToken, email' }, { status: 400 });
        }
        // Validate tier
        if (!SUBSCRIPTION_TIERS[tier]) {
            return server_1.NextResponse.json({ error: 'Invalid subscription tier' }, { status: 400 });
        }
        const selectedTier = SUBSCRIPTION_TIERS[tier];
        // Check if user exists
        const { data: user, error: userError } = await supabase
            .from('login_users')
            .select('id, email, token')
            .eq('token', userToken)
            .single();
        if (userError || !user) {
            return server_1.NextResponse.json({ error: 'User not found' }, { status: 404 });
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
        return server_1.NextResponse.json({
            sessionId: session.id,
            url: session.url,
        });
    }
    catch (error) {
        console.error('Stripe checkout error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
