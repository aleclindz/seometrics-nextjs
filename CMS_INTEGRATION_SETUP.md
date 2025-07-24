# 1-Click CMS Integration Setup Guide

This guide will help you set up the modular 1-click CMS integration system for WordPress, Webflow, and Shopify, enabling users to go from signup to published SEO-optimized articles in 60 seconds.

## 🚀 Quick Start

### 1. Database Migration

First, run the database migration to create the necessary tables:

```sql
-- Run this in your Supabase SQL editor
\i database/migrations/cms-integration-system.sql
```

### 2. Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Webflow Integration
WEBFLOW_CLIENT_ID=your_webflow_client_id
WEBFLOW_CLIENT_SECRET=your_webflow_client_secret

# Shopify Integration  
SHOPIFY_CLIENT_ID=your_shopify_client_id
SHOPIFY_CLIENT_SECRET=your_shopify_client_secret

# WordPress uses Application Passwords (no OAuth credentials needed)
```

### 3. Provider Setup

#### WordPress (Application Passwords)
- No additional setup required
- Uses WordPress's built-in Application Password system
- Users will authorize directly on their WordPress site

#### Webflow
1. Go to [Webflow Developer Portal](https://developers.webflow.com/)
2. Create a new "Data Client" app
3. Set OAuth callback URL: `https://yourdomain.com/api/cms/oauth/callback/webflow`
4. Request scopes: `cms:read`, `cms:write`, `sites:read`
5. Add client ID and secret to your environment variables

#### Shopify
1. Go to [Shopify Partners Dashboard](https://partners.shopify.com/)
2. Create a new public app
3. Set OAuth callback URL: `https://yourdomain.com/api/cms/oauth/callback/shopify`
4. Request scopes: `read_content`, `write_content`
5. Add client ID and secret to your environment variables

## 🏗️ Architecture Overview

The system is built with modularity in mind:

```
src/lib/cms/
├── types.ts              # TypeScript interfaces
├── base-provider.ts      # Abstract base class
├── cms-manager.ts        # Orchestrates all providers
└── providers/
    ├── wordpress.ts      # WordPress implementation
    ├── webflow.ts        # Webflow implementation
    └── shopify.ts        # Shopify implementation
```

### Key Components

1. **CMSManager**: Central orchestrator that manages all CMS providers
2. **BaseCMSProvider**: Abstract class that all providers extend
3. **Provider Classes**: Specific implementations for each CMS
4. **OneClickCMSConnection**: React component for the UI

## 🔧 Usage

### Backend (API Routes)

```typescript
import { CMSManager } from '@/lib/cms/cms-manager';

const cmsManager = new CMSManager();

// Start OAuth flow
const { authUrl, state } = await cmsManager.startOAuthFlow(
  'wordpress',
  userId,
  redirectUri,
  siteUrl
);

// Complete OAuth flow
const result = await cmsManager.completeOAuthFlow(
  'wordpress',
  code,
  state,
  userId
);
```

### Frontend (React Component)

```tsx
import OneClickCMSConnection from '@/components/OneClickCMSConnection';

function CMSPage() {
  return (
    <OneClickCMSConnection
      onConnectionComplete={(connection) => {
        console.log('Connected:', connection);
      }}
    />
  );
}
```

## 📝 Article Publishing Flow

### Enhanced Article Generation

The article generation now supports CMS connections:

```typescript
// When creating an article, specify the CMS connection
const article = {
  title: 'SEO-Optimized Article',
  cms_connection_id: 'uuid-of-connection',
  target_blog_id: 'blog-or-collection-id',
  auto_publish: true, // Automatically publish after generation
};
```

### Publishing Process

1. **Generate Article**: AI creates SEO-optimized content
2. **Format Content**: Content is formatted for the target CMS
3. **Publish**: Article is published via the appropriate CMS API
4. **Track**: Publication is tracked in the `cms_articles` table

## 🧪 Testing

Run the comprehensive test suite:

```bash
npm test __tests__/cms-integration.test.ts
```

The tests cover:
- ✅ OAuth flows for all providers
- ✅ Article publishing to each CMS
- ✅ Error handling and edge cases  
- ✅ Security (CSRF protection, credential safety)
- ✅ Performance (concurrent operations, timeouts)

## 🔒 Security Features

### OAuth State Validation
- CSRF protection through state parameter validation
- Temporary state storage with expiration
- Secure callback URL validation

### Credential Management
- Credentials stored encrypted in database
- No sensitive data in client-side code
- Token refresh handling for supported providers

### Rate Limiting
- Built-in respect for CMS API rate limits
- Exponential backoff for failed requests
- Request queuing for high-volume operations

## 🎯 60-Second User Journey

The system is optimized for maximum speed:

1. **Signup** (15 seconds)
   - User creates account
   - Selects CMS platform
   
2. **1-Click Connect** (15 seconds)
   - Click "Connect WordPress/Webflow/Shopify"
   - OAuth popup opens
   - User authorizes in CMS
   - Connection established automatically

3. **Generate Article** (25 seconds)
   - AI generates SEO-optimized content
   - Content formatted for target CMS
   - Quality scores calculated

4. **1-Click Publish** (5 seconds)
   - Single click publishes to CMS
   - Article goes live immediately
   - Success confirmation shown

**Total: ~60 seconds from signup to published article**

## 🚨 Troubleshooting

### Common Issues

#### WordPress Connection Fails
- Ensure WordPress site supports Application Passwords (WordPress 5.6+)
- Check that user has sufficient permissions (Author or above)
- Verify site URL is accessible and uses HTTPS

#### Webflow OAuth Issues  
- Verify client ID/secret are correct
- Check OAuth callback URL matches exactly
- Ensure app has required scopes: `cms:read cms:write sites:read`

#### Shopify Connection Problems
- Confirm shop domain format: `shop-name.myshopify.com`
- Verify app is installed on the correct store
- Check that scopes include: `read_content write_content`

### Database Issues

If you see "table does not exist" errors:
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'cms_%';

-- If missing, re-run the migration
\i database/migrations/cms-integration-system.sql
```

### Environment Variables

Verify all required environment variables are set:
```bash
# Check environment variables
echo $WEBFLOW_CLIENT_ID
echo $SHOPIFY_CLIENT_ID
# (Don't echo secrets in production!)
```

## 📊 Monitoring

### Success Metrics
- **Connection Success Rate**: Track successful OAuth completions
- **Publish Success Rate**: Monitor successful article publications  
- **Time to Publish**: Measure end-to-end publishing time
- **User Retention**: Track users who complete the full flow

### Logging
The system provides detailed logging with prefixes:
- `[CMS OAUTH]`: OAuth flow events
- `[WORDPRESS]`, `[WEBFLOW]`, `[SHOPIFY]`: Provider-specific events
- `[CMS MANAGER]`: Central coordination events

### Error Tracking
All errors include:
- User ID for debugging
- CMS type and operation
- Detailed error messages
- Stack traces in development

## 🔄 Extending the System

### Adding New CMS Providers

1. Create new provider class extending `BaseCMSProvider`
2. Implement required methods: `getAuthUrl`, `exchangeCodeForToken`, etc.
3. Add provider to `CMSManager` initialization
4. Update environment variables and documentation
5. Add tests for the new provider

### Custom Publishing Options

The system supports custom publishing options:
```typescript
await provider.publishArticle(credentials, article, {
  status: 'draft', // or 'published'
  tags: ['SEO', 'Marketing'],
  author: 'SEOMetrics AI',
  publishedAt: new Date(),
  blogId: 'specific-blog-id',
});
```

## 🎉 Success!

Your 1-click CMS integration system is now ready! Users can now:

- ✅ Connect WordPress, Webflow, or Shopify in seconds
- ✅ Generate AI-powered SEO articles
- ✅ Publish directly to their CMS with one click
- ✅ Go from signup to published article in under 60 seconds

The modular architecture ensures easy maintenance and future expansion to additional CMS platforms.