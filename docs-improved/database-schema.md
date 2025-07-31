# Database Schema

## Overview

SEOAgent.com uses **Supabase** (PostgreSQL) with Row Level Security (RLS) policies. The database is designed around user-owned data with secure access patterns and efficient querying for the three-pillar architecture.

## Core Tables

### login_users
**Purpose**: Core user management and authentication integration

| Column | Type | Description |
|--------|------|-------------|
| `id` | `serial` | Primary key |
| `email` | `varchar(255)` | User email address (unique) |
| `auth_user_id` | `uuid` | References Supabase auth.users table |
| `token` | `uuid` | Internal user token for API access |
| `created_at` | `timestamp` | Account creation time |
| `updated_at` | `timestamp` | Last update time |

**Relationships**:
- One-to-Many with `websites`, `articles`, `user_plans`
- Links to Supabase auth system via `auth_user_id`

**RLS Policy**: Users can only access their own records

**API Integration**: [`/api/auth/get-token`](api-reference.md#authentication)

---

### websites
**Purpose**: Website management and GSC property tracking

| Column | Type | Description |
|--------|------|-------------|
| `id` | `serial` | Primary key |
| `user_token` | `uuid` | References login_users.token |
| `website_token` | `uuid` | Unique website identifier |
| `domain` | `varchar(255)` | Website domain name |
| `language` | `varchar(50)` | Content language (default: 'english') |
| `enable_meta_tags` | `boolean` | Whether to generate meta tags |
| `enable_image_tags` | `boolean` | Whether to generate image alt tags |
| `meta_tags` | `integer` | Count of generated meta tags |
| `image_tags` | `integer` | Count of generated image tags |
| `is_managed` | `boolean` | Whether SEOAgent actively manages this site |
| `is_excluded_from_sync` | `boolean` | Exclude from GSC sync (soft delete) |
| `created_at` | `timestamp` | Creation time |

**Indexes**:
- `idx_websites_user_token` on `user_token`
- `idx_websites_domain` on `domain`
- `idx_websites_managed` on `is_managed` WHERE `is_managed = true`

**RLS Policy**: User can only access websites where `user_token` matches their token

**API Integration**: [`/api/websites`](api-reference.md#website-management)

**Related Components**: [WebsiteManagement](user-guide.md#website-management)

---

### user_plans
**Purpose**: Subscription plan management and usage limits

| Column | Type | Description |
|--------|------|-------------|
| `id` | `serial` | Primary key |
| `user_token` | `uuid` | References login_users.token |
| `tier` | `varchar(50)` | Plan tier (free, starter, pro, enterprise) |
| `sites_allowed` | `integer` | Maximum managed websites (-1 = unlimited) |
| `posts_allowed` | `integer` | Maximum articles per month (-1 = unlimited) |
| `status` | `varchar(50)` | Plan status (active, cancelled, expired) |
| `stripe_customer_id` | `varchar(255)` | Stripe customer identifier |
| `stripe_subscription_id` | `varchar(255)` | Stripe subscription identifier |
| `created_at` | `timestamp` | Plan creation time |
| `updated_at` | `timestamp` | Last plan update |

**Plan Configurations**:
- **Free**: 1 site, 0 articles
- **Starter**: 1 site, unlimited articles ($29/month)
- **Pro**: 5 sites, unlimited articles ($79/month)
- **Enterprise**: Unlimited sites and articles (custom pricing)

**Indexes**:
- `idx_user_plans_user_token` on `user_token`
- `idx_user_plans_stripe_customer` on `stripe_customer_id`
- `idx_user_plans_status` on `status` WHERE `status = 'active'`

**API Integration**: [`/api/subscription/manage`](api-reference.md#subscription-management)

**Related Components**: [SubscriptionManager](user-guide.md#account-management)

---

### usage_tracking
**Purpose**: Track resource usage for billing and analytics

| Column | Type | Description |
|--------|------|-------------|
| `id` | `serial` | Primary key |
| `user_token` | `uuid` | References login_users.token |
| `resource_type` | `varchar(50)` | Type of resource (article, api_call, etc.) |
| `count` | `integer` | Usage count for the month |
| `month_year` | `varchar(7)` | Month in YYYY-MM format |
| `created_at` | `timestamp` | Record creation time |
| `updated_at` | `timestamp` | Last update time |

**Resource Types**:
- `article`: Generated articles
- `api_call`: API requests made
- `gsc_sync`: GSC data sync operations
- `seo_audit`: SEO audits performed

**Indexes**:
- `idx_usage_tracking_user_month` on `user_token, month_year`
- `idx_usage_tracking_resource` on `resource_type`

**API Integration**: [`/api/usage`](api-reference.md#usage-tracking)

---

### articles
**Purpose**: Generated content management and publication tracking

| Column | Type | Description |
|--------|------|-------------|
| `id` | `serial` | Primary key |
| `user_token` | `uuid` | References login_users.token |
| `website_token` | `uuid` | References websites.website_token |
| `title` | `varchar(255)` | Article title |
| `content` | `text` | Full article content (Markdown) |
| `meta_description` | `varchar(160)` | SEO meta description |
| `slug` | `varchar(255)` | URL-friendly slug |
| `target_keywords` | `text` | Target keywords for SEO |
| `status` | `varchar(50)` | Status (generated, published, failed) |
| `published_url` | `varchar(500)` | URL of published article |
| `cms_id` | `varchar(255)` | CMS-specific article ID |
| `cms_connection_id` | `uuid` | References cms_connections.id |
| `version` | `integer` | Article version number |
| `created_at` | `timestamp` | Generation time |
| `published_at` | `timestamp` | Publication time |

**Status Values**:
- `generated`: Created but not yet published
- `published`: Successfully published to CMS
- `failed`: Publication failed
- `draft`: Saved as draft in CMS

**Indexes**:
- `idx_articles_user_token` on `user_token`
- `idx_articles_website_token` on `website_token`
- `idx_articles_status` on `status`
- `idx_articles_published_url` on `published_url`

**API Integration**: [`/api/articles/*`](api-reference.md#content-generation)

**Related Components**: [Content Writer](user-guide.md#content-writer)

---

### cms_connections
**Purpose**: CMS platform integration configuration

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `user_token` | `uuid` | References login_users.token |
| `name` | `varchar(255)` | Connection display name |
| `type` | `varchar(50)` | CMS type (strapi, wordpress, webflow, etc.) |
| `site_url` | `varchar(500)` | CMS base URL |
| `username` | `varchar(255)` | Username for API access |
| `password` | `text` | Encrypted password/token |
| `api_key` | `text` | Encrypted API key |
| `oauth_token` | `text` | Encrypted OAuth access token |
| `oauth_refresh_token` | `text` | Encrypted OAuth refresh token |
| `oauth_expires_at` | `timestamp` | OAuth token expiration |
| `config` | `jsonb` | Platform-specific configuration |
| `status` | `varchar(50)` | Connection status (active, inactive, error) |
| `last_test_at` | `timestamp` | Last connectivity test time |
| `created_at` | `timestamp` | Connection creation time |
| `updated_at` | `timestamp` | Last update time |

**CMS Types Supported**:
- `strapi`: Strapi CMS with API token authentication
- `wordpress`: WordPress with application passwords
- `webflow`: Webflow CMS with OAuth
- `shopify`: Shopify blog with private app credentials
- `ghost`: Ghost CMS with admin API key

**Security**: All sensitive fields (`password`, `api_key`, OAuth tokens) are encrypted at rest

**Indexes**:
- `idx_cms_connections_user_token` on `user_token`
- `idx_cms_connections_type` on `type`
- `idx_cms_connections_status` on `status`

**API Integration**: [`/api/cms/connections`](api-reference.md#cms-integration)

**Related Components**: [CMS Connections](user-guide.md#cms-connections)

---

### gsc_connections
**Purpose**: Google Search Console OAuth integration

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `user_token` | `uuid` | References login_users.token |
| `email` | `varchar(255)` | Connected Google account email |
| `access_token` | `text` | Encrypted OAuth access token |
| `refresh_token` | `text` | Encrypted OAuth refresh token |
| `expires_at` | `timestamp` | Access token expiration |
| `scope` | `varchar(500)` | OAuth scopes granted |
| `status` | `varchar(50)` | Connection status |
| `last_sync_at` | `timestamp` | Last data sync time |
| `properties` | `jsonb` | Available GSC properties |
| `created_at` | `timestamp` | Connection creation time |
| `updated_at` | `timestamp` | Last update time |

**Security**: OAuth tokens are encrypted at rest using application-level encryption

**API Integration**: [`/api/gsc/*`](api-reference.md#google-search-console)

**Related Components**: [GSCConnection](user-guide.md#dashboard)

---

## Analytics Tables

### gsc_performance_data
**Purpose**: Cached Google Search Console performance metrics

| Column | Type | Description |
|--------|------|-------------|
| `id` | `serial` | Primary key |
| `user_token` | `uuid` | References login_users.token |
| `website_token` | `uuid` | References websites.website_token |
| `date` | `date` | Performance data date |
| `query` | `varchar(500)` | Search query |
| `page` | `varchar(1000)` | Landing page URL |
| `clicks` | `integer` | Number of clicks |
| `impressions` | `integer` | Number of impressions |
| `ctr` | `decimal(5,4)` | Click-through rate |
| `position` | `decimal(5,2)` | Average search position |
| `created_at` | `timestamp` | Cache creation time |

**Indexes**:
- `idx_gsc_performance_user_website_date` on `user_token, website_token, date`
- `idx_gsc_performance_query` on `query`
- `idx_gsc_performance_clicks` on `clicks DESC`

**Data Retention**: 90 days of performance data cached locally

---

### seo_audits
**Purpose**: SEO audit results and historical tracking

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `user_token` | `uuid` | References login_users.token |
| `website_token` | `uuid` | References websites.website_token |
| `url` | `varchar(1000)` | Audited URL |
| `score` | `integer` | Overall SEO score (0-100) |
| `issues` | `jsonb` | Detected issues and recommendations |
| `metrics` | `jsonb` | Performance metrics (Core Web Vitals, etc.) |
| `status` | `varchar(50)` | Audit status (completed, failed, in_progress) |
| `audit_type` | `varchar(50)` | Type of audit (full, technical, content) |
| `created_at` | `timestamp` | Audit start time |
| `completed_at` | `timestamp` | Audit completion time |

**API Integration**: [`/api/debug/audit`](api-reference.md#seo-debug)

---

## Chat Tables

### chat_threads
**Purpose**: AI chat conversation management

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `user_token` | `uuid` | References login_users.token |
| `title` | `varchar(255)` | Thread title (auto-generated) |
| `website_token` | `uuid` | Optional: associated website |
| `status` | `varchar(50)` | Thread status (active, archived) |
| `created_at` | `timestamp` | Thread creation time |
| `updated_at` | `timestamp` | Last message time |

### chat_messages
**Purpose**: Individual chat messages and AI responses

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `thread_id` | `uuid` | References chat_threads.id |
| `role` | `varchar(50)` | Message role (user, assistant) |
| `content` | `text` | Message content |
| `metadata` | `jsonb` | Additional message data |
| `created_at` | `timestamp` | Message timestamp |

**API Integration**: [`/api/chat/*`](api-reference.md#ai-chat)

---

## Relationships Summary

```
login_users (1) → (n) websites
login_users (1) → (n) articles  
login_users (1) → (1) user_plans
login_users (1) → (n) usage_tracking
login_users (1) → (n) cms_connections
login_users (1) → (1) gsc_connections

websites (1) → (n) articles
websites (1) → (n) gsc_performance_data
websites (1) → (n) seo_audits

cms_connections (1) → (n) articles (via cms_connection_id)

chat_threads (1) → (n) chat_messages
```

## Database Functions

### get_user_usage_stats(user_token UUID, month_year VARCHAR)
**Purpose**: Aggregate usage statistics for a specific user and month

**Returns**: JSON object with usage counts by resource type

**Usage**: Called by usage tracking API endpoints

### check_plan_limits(user_token UUID, resource_type VARCHAR)
**Purpose**: Validate if user can perform action based on plan limits

**Returns**: Boolean indicating if action is allowed

**Usage**: Called before creating articles or managing websites

### sync_gsc_properties(user_token UUID, properties JSONB)
**Purpose**: Sync GSC properties to websites table, respecting exclusion flags

**Returns**: Number of websites created/updated

**Usage**: Called by GSC sync API endpoint

## Row Level Security (RLS) Policies

All tables implement RLS policies ensuring users can only access their own data:

### Standard User Policy
```sql
CREATE POLICY "Users can access own data" ON table_name
FOR ALL USING (user_token = auth.jwt() ->> 'user_token');
```

### Admin Policy (for support)
```sql
CREATE POLICY "Admins can access all data" ON table_name
FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
```

## Performance Optimizations

### Partitioning
- `gsc_performance_data` partitioned by month for efficient querying
- `usage_tracking` partitioned by month_year for billing calculations

### Materialized Views
- `user_website_stats`: Pre-computed website counts per user
- `monthly_usage_summary`: Aggregated usage by user and month

### Connection Pooling
- Supabase handles connection pooling automatically
- Application uses connection pooling via `@supabase/supabase-js`

### Query Optimization
- Frequent queries use covering indexes
- Complex analytics queries use materialized views
- Real-time subscriptions only on critical tables

## Backup and Security

### Automated Backups
- Supabase provides automated daily backups with point-in-time recovery
- Critical data backed up to external storage weekly

### Encryption
- All sensitive data (passwords, API keys, OAuth tokens) encrypted at application level
- Database connections use SSL/TLS encryption
- Supabase provides encryption at rest

### Access Control
- Database access restricted to application service accounts
- Direct database access requires VPN and MFA
- All queries logged for security auditing

---

This schema supports the complete SEOAgent.com feature set with scalability and security in mind. The design enables efficient querying for real-time user interactions while maintaining data integrity and supporting the subscription-based business model.