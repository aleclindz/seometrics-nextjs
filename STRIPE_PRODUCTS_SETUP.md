# Stripe Products Setup for New Article Generation Pricing

## 🎯 **Required Stripe Products**

You need to create these 3 products in your Stripe Dashboard:

### 1. **Starter Plan - $19/month**
- **Product Name**: "SEOAgent Starter Plan"
- **Price**: $19.00 USD/month (recurring)
- **Features**: 12 AI articles/month, 1 website, DALL-E 3 images, SEO optimization, Multi-CMS publishing
- **Environment Variable**: `STRIPE_STARTER_PRICE_ID`

### 2. **Pro Plan - $39/month**
- **Product Name**: "SEOAgent Pro Plan"
- **Price**: $39.00 USD/month (recurring)
- **Features**: 30 AI articles/month, 10 websites, DALL-E 3 images, SEO optimization, Multi-CMS publishing, Priority support
- **Environment Variable**: `STRIPE_PRO_PRICE_ID`

### 3. **Scale Plan - $99/month**
- **Product Name**: "SEOAgent Scale Plan"
- **Price**: $99.00 USD/month (recurring)
- **Features**: 90 AI articles/month, Unlimited websites, DALL-E 3 images, SEO optimization, Multi-CMS publishing, Priority support, Custom integrations
- **Environment Variable**: `STRIPE_SCALE_PRICE_ID`

## ⚙️ **Environment Variables to Update**

Add these to your `.env` file:

```bash
# NEW: Article-focused pricing tiers
STRIPE_STARTER_PRICE_ID=price_xxxxxxxxxx  # $19/month starter plan
STRIPE_PRO_PRICE_ID=price_xxxxxxxxxx      # $39/month pro plan
STRIPE_SCALE_PRICE_ID=price_xxxxxxxxxx    # $99/month scale plan

# Legacy (can be removed after migration)
# STRIPE_ENTERPRISE_PRICE_ID=price_xxxxxxxxxx
```

## 🚀 **Next Steps After Stripe Setup**

1. **Create the products in Stripe Dashboard**
2. **Copy the Price IDs and update environment variables**
3. **Test checkout flow with each plan**
4. **Run the database migration**: `update_user_plans_article_tiers.sql`
5. **Deploy the updated API changes**

## 💰 **Economics Summary**

**Cost per article**: ~$0.16-0.19 (DALL-E 3 + GPT-4o-mini + infrastructure)

**Margins by tier**:
- Starter ($19): 89% gross margin
- Pro ($39): 85% gross margin
- Scale ($99): 83% gross margin

**Competitive positioning**: Significantly undercut SurferSEO ($89/month) while offering full automation vs their manual optimization.