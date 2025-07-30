# Stripe Setup Guide for SEOAgent.com

## 🔧 Prerequisites

1. **Stripe Account**: Create a Stripe account at https://stripe.com
2. **Stripe CLI**: Install the Stripe CLI for webhook testing (optional for development)

## 📋 Setup Steps

### 1. Get Your Stripe API Keys

1. Log in to your Stripe Dashboard
2. Go to **Developers > API keys**
3. Copy your **Publishable key** and **Secret key**
4. Update your `.env.local` file:

```env
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

### 2. Create Stripe Products

Run the automated setup script:

```bash
npm run setup-stripe
```

This will create 3 products in your Stripe account:
- **Starter Plan**: $49/month
- **Pro Plan**: $139/month  
- **Enterprise Plan**: Custom pricing

The script will output the price IDs - add these to your `.env.local`:

```env
STRIPE_STARTER_PRICE_ID=price_starter_id_from_script
STRIPE_PRO_PRICE_ID=price_pro_id_from_script
STRIPE_ENTERPRISE_PRICE_ID=price_enterprise_id_from_script
```

### 3. Set Up Webhooks

1. Go to **Developers > Webhooks** in your Stripe Dashboard
2. Click **Add endpoint**
3. Set the endpoint URL to: `https://your-domain.com/api/subscription/webhook`
4. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing secret** and add it to `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 4. Database Migration

Run the database migration to create the subscription tables:

```bash
# Apply the migration through Supabase CLI or dashboard
supabase migration up
```

Or manually run the SQL from `supabase/migrations/005_subscription_system.sql`

### 5. Test the Integration

1. Start your development server: `npm run dev`
2. Go to `/account` in your app
3. Try upgrading to a paid plan
4. Use Stripe's test card numbers:
   - **Success**: `4242 4242 4242 4242`
   - **Decline**: `4000 0000 0000 0002`

## 🚀 Production Deployment

### 1. Switch to Live Mode

1. Toggle to **Live mode** in your Stripe Dashboard
2. Generate new live API keys
3. Update your production environment variables
4. Re-run the setup script for live products

### 2. Update Webhook URLs

1. Update webhook endpoints to use your production domain
2. Ensure your webhook secret is for the production endpoint

### 3. Security Checklist

- [ ] Use live API keys in production
- [ ] Verify webhook signatures are working
- [ ] Test all subscription flows
- [ ] Monitor failed payments
- [ ] Set up Stripe monitoring/alerts

## 🛠️ Development Tips

### Local Webhook Testing

Use Stripe CLI to forward webhooks to your local server:

```bash
stripe listen --forward-to localhost:3000/api/subscription/webhook
```

### Testing Scenarios

1. **Successful Subscription**: Use `4242 4242 4242 4242`
2. **Failed Payment**: Use `4000 0000 0000 0002`
3. **Subscription Cancellation**: Test cancel/reactivate flows
4. **Billing Portal**: Test the customer portal integration

### Common Issues

1. **Webhook Signature Errors**: Check your webhook secret
2. **Database Errors**: Ensure migration ran successfully
3. **CORS Issues**: Verify your domain is properly configured

## 📊 Features Implemented

- ✅ **3-Tier Subscription System**
- ✅ **Automated Billing**
- ✅ **Usage Tracking & Quotas**
- ✅ **Customer Portal**
- ✅ **Webhook Handling**
- ✅ **Subscription Management UI**
- ✅ **Usage Dashboard**

## 🔍 Monitoring

Monitor your subscription system through:
- Stripe Dashboard for payments/subscriptions
- Supabase Dashboard for user plans and usage
- Application logs for webhook events
- Usage dashboard in the app

## 🚨 Important Notes

1. **Never commit API keys** to version control
2. **Test thoroughly** before going live
3. **Monitor webhook endpoints** for failures
4. **Handle edge cases** like failed payments
5. **Keep Stripe libraries updated** for security

## 📞 Support

- **Stripe Documentation**: https://stripe.com/docs
- **Stripe Support**: Available through dashboard
- **Testing Guide**: https://stripe.com/docs/testing