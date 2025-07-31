# API Reference

## Overview

SEOAgent.com uses a RESTful API architecture with Next.js API routes. All endpoints require authentication unless otherwise specified.

## Authentication

### Get User Token
**Endpoint**: `GET /api/auth/get-token`

**Description**: Retrieves the current user's authentication token for API requests.

**Response**:
```json
{
  "token": "uuid-v4-token",
  "email": "user@example.com",
  "id": "user-uuid"
}
```

**Related Components**: [AuthProvider](architecture.md#auth-provider), [useAuth hook](architecture.md#use-auth-hook)

---

## Google Search Console

### Get Connection Status
**Endpoint**: `GET /api/gsc/connection`

**Description**: Retrieves the current GSC connection status for the authenticated user.

**Parameters**:
- `userToken` (query, required): User authentication token

**Response**:
```json
{
  "connected": true,
  "email": "user@gmail.com",
  "properties": ["https://example.com/", "sc-domain:example.com"],
  "lastSync": "2025-01-31T10:00:00Z"
}
```

**Related Components**: [GSCConnection](architecture.md#gsc-connection), [Dashboard](user-guide.md#dashboard)

### Start OAuth Flow
**Endpoint**: `GET /api/gsc/oauth/start`

**Description**: Initiates Google OAuth flow for Search Console access.

**Response**: Redirects to Google OAuth consent screen

**Related Components**: [GSCConnection OAuth](architecture.md#gsc-oauth)

### OAuth Callback
**Endpoint**: `GET /api/gsc/oauth/callback`

**Description**: Handles Google OAuth callback and stores access tokens.

**Parameters**:
- `code` (query, required): OAuth authorization code
- `state` (query, required): OAuth state parameter

**Database Operations**: 
- Creates/updates record in [`gsc_connections`](database-schema.md#gsc-connections) table
- Links to user via [`login_users`](database-schema.md#login-users) table

### Refresh Access Token
**Endpoint**: `POST /api/gsc/oauth/refresh`

**Description**: Refreshes expired GSC access token using refresh token.

**Request Body**:
```json
{
  "userToken": "user-uuid"
}
```

### Get Properties
**Endpoint**: `GET /api/gsc/properties`

**Description**: Fetches available Search Console properties for the connected user.

**Parameters**:
- `userToken` (query, required): User authentication token

**Response**:
```json
{
  "properties": [
    {
      "siteUrl": "https://example.com/",
      "permissionLevel": "siteOwner"
    }
  ]
}
```

### Sync Properties
**Endpoint**: `POST /api/gsc/sync`

**Description**: Syncs GSC properties to the user's website list.

**Request Body**:
```json
{
  "userToken": "user-uuid"
}
```

**Database Operations**:
- Inserts new websites into [`websites`](database-schema.md#websites) table
- Respects `is_excluded_from_sync` flag for previously removed sites

### Get Performance Data
**Endpoint**: `GET /api/gsc/performance`

**Description**: Retrieves search performance data from Google Search Console.

**Parameters**:
- `userToken` (query, required): User authentication token
- `siteUrl` (query, required): GSC property URL
- `startDate` (query, optional): Start date (YYYY-MM-DD format)
- `endDate` (query, optional): End date (YYYY-MM-DD format)

**Response**:
```json
{
  "rows": [
    {
      "keys": ["query-keyword"],
      "clicks": 150,
      "impressions": 2000,
      "ctr": 0.075,
      "position": 8.5
    }
  ]
}
```

**Related Components**: [Dashboard GSC Data](user-guide.md#dashboard)

---

## Website Management

### Get Websites
**Endpoint**: `GET /api/websites`

**Description**: Retrieves all websites for the authenticated user.

**Parameters**:
- `userToken` (query, required): User authentication token

**Response**:
```json
{
  "success": true,
  "websites": [
    {
      "id": "website-uuid",
      "domain": "example.com",
      "website_token": "website-token-uuid",
      "is_managed": true,
      "is_excluded_from_sync": false,
      "created_at": "2025-01-31T10:00:00Z"
    }
  ]
}
```

**Database Operations**: Queries [`websites`](database-schema.md#websites) table with user token filter

**Related Components**: [WebsiteManagement](architecture.md#website-management), [Website Management UI](user-guide.md#website-management)

### Update Website Management Status
**Endpoint**: `PUT /api/websites`

**Description**: Updates whether a website is actively managed by SEOAgent.

**Parameters**:
- `userToken` (query, required): User authentication token

**Request Body**:
```json
{
  "websiteId": "website-token-uuid",
  "is_managed": true
}
```

**Plan Enforcement**: 
- Checks current plan limits via [`user_plans`](database-schema.md#user-plans) table
- Prevents exceeding plan's `sites_allowed` limit
- Shows upgrade prompts when limits reached

**Response**:
```json
{
  "success": true,
  "message": "Website added to managed websites",
  "website": {
    "id": "website-token-uuid",
    "domain": "example.com",
    "is_managed": true
  }
}
```

### Remove Website
**Endpoint**: `DELETE /api/websites`

**Description**: Soft-deletes a website (excludes from future GSC syncs).

**Parameters**:
- `userToken` (query, required): User authentication token
- `websiteId` (query, required): Website token to remove

**Database Operations**:
- Sets `is_excluded_from_sync: true` and `is_managed: false`
- Preserves website record for data integrity

**Response**:
```json
{
  "success": true,
  "message": "Website \"example.com\" removed from SEOAgent. It will not be re-imported from GSC."
}
```

---

## Content Generation

### Generate Article
**Endpoint**: `POST /api/articles/generate`

**Description**: Generates SEO-optimized articles using AI.

**Request Body**:
```json
{
  "title": "How to Optimize Website Speed",
  "websiteToken": "website-uuid",
  "keywords": "website speed, page optimization, core web vitals",
  "userToken": "user-uuid"
}
```

**Response**:
```json
{
  "success": true,
  "article": {
    "id": "article-uuid",
    "title": "How to Optimize Website Speed",
    "content": "# How to Optimize Website Speed\n\n...",
    "meta_description": "Learn proven techniques to optimize...",
    "slug": "how-to-optimize-website-speed",
    "status": "generated"
  }
}
```

**Database Operations**: 
- Creates record in [`articles`](database-schema.md#articles) table
- Links to website via `website_token`
- Tracks usage in [`usage_tracking`](database-schema.md#usage-tracking) table

**Related Components**: [Content Writer](user-guide.md#content-writer), [AI Content Generation](architecture.md#content-generation)

### Publish Article
**Endpoint**: `POST /api/articles/publish`

**Description**: Publishes a generated article to a connected CMS.

**Request Body**:
```json
{
  "articleId": "article-uuid",
  "cmsConnectionId": "cms-connection-uuid",
  "userToken": "user-uuid"
}
```

**Response**:
```json
{
  "success": true,
  "publishedUrl": "https://example.com/blog/how-to-optimize-website-speed",
  "cmsId": "strapi-article-id-123"
}
```

**Database Operations**:
- Updates [`articles`](database-schema.md#articles) table with publication status
- Stores `published_url` and `cms_id` for reference

### Get Articles
**Endpoint**: `GET /api/articles`

**Description**: Retrieves articles for the authenticated user.

**Parameters**:
- `userToken` (query, required): User authentication token
- `websiteToken` (query, optional): Filter by specific website
- `status` (query, optional): Filter by status (generated, published, failed)
- `limit` (query, optional): Number of articles to return (default: 10)
- `offset` (query, optional): Pagination offset (default: 0)

**Response**:
```json
{
  "success": true,
  "articles": [
    {
      "id": "article-uuid",
      "title": "Article Title",
      "status": "published",
      "published_url": "https://example.com/blog/article-slug",
      "created_at": "2025-01-31T10:00:00Z",
      "website": {
        "domain": "example.com"
      }
    }
  ],
  "total": 25,
  "hasMore": true
}
```

### Update Article
**Endpoint**: `PUT /api/articles/:id`

**Description**: Updates an existing article.

**Parameters**:
- `id` (path, required): Article UUID

**Request Body**:
```json
{
  "title": "Updated Article Title",
  "content": "Updated article content...",
  "userToken": "user-uuid"
}
```

### Delete Article
**Endpoint**: `DELETE /api/articles/:id`

**Description**: Deletes an article from the system.

**Parameters**:
- `id` (path, required): Article UUID
- `userToken` (query, required): User authentication token

---

## CMS Integration

### Get Connections
**Endpoint**: `GET /api/cms/connections`

**Description**: Retrieves all CMS connections for the authenticated user.

**Parameters**:
- `userToken` (query, required): User authentication token

**Response**:
```json
{
  "success": true,
  "connections": [
    {
      "id": "connection-uuid",
      "name": "My Strapi Blog",
      "type": "strapi",
      "status": "active",
      "site_url": "https://cms.example.com",
      "created_at": "2025-01-31T10:00:00Z"
    }
  ]
}
```

**Database Operations**: Queries [`cms_connections`](database-schema.md#cms-connections) table

**Related Components**: [CMS Connections](user-guide.md#cms-connections), [CMSConnectionsList](architecture.md#cms-connections-list)

### Create Connection
**Endpoint**: `POST /api/cms/connections`

**Description**: Creates a new CMS connection.

**Request Body**:
```json
{
  "name": "My WordPress Site",
  "type": "wordpress",
  "site_url": "https://myblog.com",
  "username": "admin",
  "password": "app-password",
  "userToken": "user-uuid"
}
```

**Response**:
```json
{
  "success": true,
  "connection": {
    "id": "connection-uuid",
    "name": "My WordPress Site",
    "type": "wordpress",
    "status": "active"
  }
}
```

### Test Connection
**Endpoint**: `POST /api/cms/test-connection`

**Description**: Tests connectivity and permissions for a CMS connection.

**Request Body**:
```json
{
  "connectionId": "connection-uuid",
  "userToken": "user-uuid"
}
```

**Response**:
```json
{
  "success": true,
  "status": "connected",
  "capabilities": [
    "create_posts",
    "upload_media"
  ],
  "contentTypes": [
    {
      "id": "blog-post",
      "name": "Blog Post",
      "fields": ["title", "content", "slug"]
    }
  ]
}
```

### Delete Connection
**Endpoint**: `DELETE /api/cms/connections/:id`

**Description**: Removes a CMS connection.

**Parameters**:
- `id` (path, required): Connection UUID
- `userToken` (query, required): User authentication token

### Start OAuth
**Endpoint**: `GET /api/cms/oauth/start`

**Description**: Initiates OAuth flow for supported CMS platforms.

**Parameters**:
- `type` (query, required): CMS type (webflow, shopify)
- `userToken` (query, required): User authentication token

### OAuth Callback
**Endpoint**: `GET /api/cms/oauth/callback/:type`

**Description**: Handles OAuth callback for CMS platforms.

**Parameters**:
- `type` (path, required): CMS type
- `code` (query, required): OAuth authorization code
- `state` (query, required): OAuth state parameter

---

## Subscription Management

### Get Subscription Status
**Endpoint**: `GET /api/subscription/manage`

**Description**: Retrieves current subscription plan and usage information.

**Parameters**:
- `userToken` (query, required): User authentication token

**Response**:
```json
{
  "success": true,
  "plan": {
    "id": 123,
    "tier": "starter",
    "sites_allowed": 1,
    "posts_allowed": -1,
    "status": "active",
    "stripe_subscription_id": "sub_1234567890"
  },
  "usage": {
    "sites": 1,
    "articles": 15,
    "month": "2025-01"
  },
  "subscription": {
    "id": "sub_1234567890",
    "status": "active",
    "current_period_end": 1738332000,
    "cancel_at_period_end": false
  }
}
```

**Database Operations**: 
- Queries [`user_plans`](database-schema.md#user-plans) table
- Aggregates data from [`usage_tracking`](database-schema.md#usage-tracking) table
- Integrates with Stripe API for subscription details

**Related Components**: [SubscriptionManager](architecture.md#subscription-manager), [Account Management](user-guide.md#account-management)

### Create Checkout Session
**Endpoint**: `POST /api/subscription/create-checkout-session`

**Description**: Creates a Stripe checkout session for plan upgrades.

**Request Body**:
```json
{
  "tier": "pro",
  "userToken": "user-uuid",
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "url": "https://checkout.stripe.com/pay/cs_1234567890"
}
```

### Manage Subscription
**Endpoint**: `POST /api/subscription/manage`

**Description**: Handles subscription management actions (cancel, reactivate, portal).

**Request Body**:
```json
{
  "action": "cancel",
  "userToken": "user-uuid"
}
```

**Actions**:
- `cancel`: Cancel subscription at period end
- `reactivate`: Reactivate cancelled subscription
- `create-portal-session`: Generate Stripe customer portal link

### Webhook Handler
**Endpoint**: `POST /api/subscription/webhook`

**Description**: Handles Stripe webhook events for subscription changes.

**Headers**:
- `stripe-signature`: Stripe webhook signature for verification

**Events Handled**:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

**Database Operations**: Updates [`user_plans`](database-schema.md#user-plans) table based on webhook data

---

## Usage Tracking

### Get Usage Statistics
**Endpoint**: `GET /api/usage`

**Description**: Retrieves detailed usage statistics for the authenticated user.

**Parameters**:
- `userToken` (query, required): User authentication token
- `month` (query, optional): Specific month (YYYY-MM format)

**Response**:
```json
{
  "success": true,
  "usage": {
    "current_month": "2025-01",
    "articles_generated": 15,
    "websites_managed": 1,
    "api_calls": 145,
    "storage_used": "2.5MB"
  },
  "history": [
    {
      "month": "2024-12",
      "articles": 22,
      "api_calls": 198
    }
  ]
}
```

**Database Operations**: Aggregates data from [`usage_tracking`](database-schema.md#usage-tracking) table

---

## SEO Debug

### Run Website Audit
**Endpoint**: `POST /api/debug/audit`

**Description**: Performs comprehensive SEO audit of a website.

**Request Body**:
```json
{
  "url": "https://example.com",
  "websiteToken": "website-uuid",
  "userToken": "user-uuid"
}
```

**Response**:
```json
{
  "success": true,
  "audit": {
    "id": "audit-uuid",
    "url": "https://example.com",
    "score": 85,
    "issues": [
      {
        "type": "meta_description",
        "severity": "warning",
        "message": "Meta description is too short",
        "recommendation": "Expand to 150-160 characters"
      }
    ],
    "created_at": "2025-01-31T10:00:00Z"
  }
}
```

### Get Audit Results
**Endpoint**: `GET /api/debug/audit/:auditId`

**Description**: Retrieves results from a previous SEO audit.

**Parameters**:
- `auditId` (path, required): Audit UUID
- `userToken` (query, required): User authentication token

---

## AI Chat

### Get Chat Threads
**Endpoint**: `GET /api/chat/threads`

**Description**: Retrieves chat conversation threads for the user.

**Parameters**:
- `userToken` (query, required): User authentication token

**Response**:
```json
{
  "success": true,
  "threads": [
    {
      "id": "thread-uuid",
      "title": "SEO Strategy for E-commerce",
      "last_message": "Consider focusing on long-tail keywords...",
      "updated_at": "2025-01-31T10:00:00Z"
    }
  ]
}
```

### Get Chat Messages
**Endpoint**: `GET /api/chat/messages`

**Description**: Retrieves messages for a specific chat thread.

**Parameters**:
- `threadId` (query, required): Chat thread UUID
- `userToken` (query, required): User authentication token

### Send Chat Message
**Endpoint**: `POST /api/chat/messages`

**Description**: Sends a message to the AI chat assistant.

**Request Body**:
```json
{
  "threadId": "thread-uuid",
  "message": "How can I improve my website's Core Web Vitals?",
  "userToken": "user-uuid"
}
```

---

## Error Handling

All API endpoints follow consistent error response patterns:

### Standard Error Response
```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error context"
  }
}
```

### Common HTTP Status Codes
- `200 OK`: Request successful
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required or invalid
- `403 Forbidden`: Insufficient permissions or plan limits exceeded
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server-side error

### Plan Limit Errors
When plan limits are exceeded, APIs return specific error messages with upgrade prompts:

```json
{
  "success": false,
  "error": "You have reached your website limit (1 site). Upgrade to Pro plan ($79/month) to manage up to 5 websites",
  "code": "PLAN_LIMIT_EXCEEDED",
  "currentPlan": "starter",
  "maxAllowed": 1,
  "currentCount": 1
}
```

---

## Rate Limiting

- **Authentication endpoints**: 10 requests per minute
- **Content generation**: 5 requests per minute  
- **GSC data fetching**: 100 requests per hour
- **General API calls**: 1000 requests per hour

Rate limits are enforced per user token and reset on a rolling window basis.

---

## Webhook Security

All webhook endpoints verify authenticity:

### Stripe Webhooks
- Verify `stripe-signature` header using webhook secret
- Reject requests without valid signatures
- Process events idempotently to handle duplicates

### GSC Webhooks (planned)
- Validate Google-signed JWT tokens
- Verify domain ownership before processing
- Rate limit webhook processing per domain

---

This API reference covers all current endpoints and their integration with the frontend components and database schema. Each endpoint includes relevant cross-references to help developers understand the complete data flow.