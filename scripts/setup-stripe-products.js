const Stripe = require('stripe');
require('dotenv').config({ path: './.env.local' });

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const SUBSCRIPTION_TIERS = [
  {
    id: 'starter',
    name: 'Starter Plan',
    description: 'Perfect for small blogs and personal sites',
    amount: 4900, // $49.00 in cents
    currency: 'usd',
    interval: 'month',
    features: [
      '12 AI articles/month',
      '1 website',
      'DALL-E 3 images',
      'SEO optimization',
      'Multi-CMS publishing',
      'Technical SEO automation'
    ],
    metadata: {
      tier: 'starter',
      sites_allowed: '1',
      posts_allowed: '12'
    }
  },
  {
    id: 'pro',
    name: 'Pro Plan',
    description: 'Ideal for growing businesses and content creators',
    amount: 14900, // $149.00 in cents
    currency: 'usd',
    interval: 'month',
    features: [
      '30 AI articles/month',
      'Unlimited websites',
      'DALL-E 3 images',
      'SEO optimization',
      'Multi-CMS publishing',
      'Technical SEO automation',
      'Priority support'
    ],
    metadata: {
      tier: 'pro',
      sites_allowed: 'unlimited',
      posts_allowed: '30'
    }
  },
  {
    id: 'scale',
    name: 'Scale Plan',
    description: 'For high-volume content needs and agencies',
    amount: 39900, // $399.00 in cents
    currency: 'usd',
    interval: 'month',
    features: [
      '90 AI articles/month',
      'Unlimited websites',
      'DALL-E 3 images',
      'SEO optimization',
      'Multi-CMS publishing',
      'Technical SEO automation',
      'Priority support',
      'Custom integrations'
    ],
    metadata: {
      tier: 'scale',
      sites_allowed: 'unlimited',
      posts_allowed: '90'
    }
  }
];

async function createStripeProducts() {
  console.log('🚀 Setting up Stripe products for SEOAgent.com...\n');

  try {
    for (const tier of SUBSCRIPTION_TIERS) {
      console.log(`Creating product: ${tier.name}`);

      // Create product
      const product = await stripe.products.create({
        id: `seoagent-${tier.id}`,
        name: tier.name,
        description: tier.description,
        metadata: tier.metadata
      });

      console.log(`✅ Product created: ${product.id}`);

      // Create price for non-enterprise tiers
      if (tier.amount !== null) {
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: tier.amount,
          currency: tier.currency,
          recurring: {
            interval: tier.interval
          },
          metadata: tier.metadata
        });

        console.log(`✅ Price created: ${price.id} ($${tier.amount / 100}/${tier.interval})`);
      } else {
        console.log(`⚠️  Enterprise tier - no price created (custom pricing)`);
      }

      console.log('');
    }

    console.log('🎉 All Stripe products created successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Add these product IDs to your .env.local file');
    console.log('2. Set up webhook endpoints in Stripe Dashboard');
    console.log('3. Configure webhook signing secret');
    console.log('4. Test the subscription flow');

  } catch (error) {
    console.error('❌ Error creating Stripe products:', error);
    process.exit(1);
  }
}

async function listExistingProducts() {
  console.log('📋 Checking existing Stripe products...\n');

  try {
    const products = await stripe.products.list({ limit: 10 });
    
    if (products.data.length === 0) {
      console.log('No existing products found.');
      return false;
    }

    console.log('Existing products:');
    products.data.forEach(product => {
      console.log(`- ${product.name} (${product.id})`);
    });

    return true;
  } catch (error) {
    console.error('❌ Error listing products:', error);
    return false;
  }
}

async function main() {
  // Check if Stripe key is configured
  console.log('🔍 Checking environment variables...');
  console.log('STRIPE_SECRET_KEY present:', !!process.env.STRIPE_SECRET_KEY);
  console.log('STRIPE_SECRET_KEY starts with:', process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 7) : 'undefined');
  
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY not found in environment variables');
    console.log('Please add your Stripe secret key to .env.local');
    console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('STRIPE')));
    process.exit(1);
  }

  // List existing products first
  const hasExisting = await listExistingProducts();
  
  if (hasExisting) {
    console.log('\n⚠️  Found existing products. Do you want to continue and create new ones?');
    console.log('This might create duplicates. Consider cleaning up existing products first.');
    console.log('Proceeding in 5 seconds... (Ctrl+C to cancel)');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Create new products
  await createStripeProducts();
}

// Run the script
main().catch(console.error);