# SEOAgent Database Schema Documentation

> **⚠️ CRITICAL: ALWAYS CHECK THIS FILE BEFORE WRITING DATABASE QUERIES**
> 
> This file contains the complete, current database schema. Use it to verify table names, column names, data types, and constraints before writing any API code that interacts with the database.

## Overview
This document provides a complete overview of the SEOAgent PostgreSQL database schema. The database uses Supabase with Row Level Security (RLS) policies for data protection.

---

## 🔐 Core Authentication & User Management

### `login_users`
**Purpose**: User authentication and profile management
```sql
CREATE TABLE login_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan INTEGER DEFAULT 0, -- 0: free, 1: paid
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
**Key Points**:
- Primary user table linked to Supabase auth
- `token` field is the main user identifier used throughout the app
- `auth_user_id` links to Supabase's auth.users table

---

## 🌐 Website Management

### `websites`
**Purpose**: Store user websites and their SEO settings
```sql
CREATE TABLE websites (
    id SERIAL PRIMARY KEY,
    website_token VARCHAR(255) UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    user_token VARCHAR(255) REFERENCES login_users(token) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    language VARCHAR(50) DEFAULT 'english',
    enable_meta_tags BOOLEAN DEFAULT true,
    enable_image_tags BOOLEAN DEFAULT true,
    meta_tags INTEGER DEFAULT 0,
    image_tags INTEGER DEFAULT 0,
    is_managed BOOLEAN DEFAULT false,
    is_excluded_from_sync BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
**Key Points**:
- `is_managed` - for selective website management
- `is_excluded_from_sync` - exclude from GSC sync

---

## 🏷️ SEO Tag Management

### `alt_tags`
**Purpose**: Generated alt-tags for images
```sql
CREATE TABLE alt_tags (
    id SERIAL PRIMARY KEY,
    website_token TEXT NOT NULL REFERENCES websites(website_token) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(website_token, image_url)
);
```

### `meta_tags`
**Purpose**: Generated meta titles and descriptions
```sql
CREATE TABLE meta_tags (
    id SERIAL PRIMARY KEY,
    website_token TEXT NOT NULL REFERENCES websites(website_token) ON DELETE CASCADE,
    page_url TEXT NOT NULL,
    meta_title TEXT,
    meta_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(website_token, page_url)
);
```

### `pages`
**Purpose**: Store page data for meta tag processing
```sql
CREATE TABLE pages (
    id SERIAL PRIMARY KEY,
    website_token VARCHAR(255) REFERENCES websites(website_token) ON DELETE CASCADE,
    url TEXT NOT NULL,
    meta_title TEXT,
    meta_description TEXT,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### `images`
**Purpose**: Store image data for alt-text processing
```sql
CREATE TABLE images (
    id SERIAL PRIMARY KEY,
    website_token VARCHAR(255) REFERENCES websites(website_token) ON DELETE CASCADE,
    url TEXT NOT NULL,
    alt_tag TEXT,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 💳 Subscription Management

### `user_plans`
**Purpose**: User subscription tiers and limits
```sql
CREATE TABLE user_plans (
    id SERIAL PRIMARY KEY,
    user_token VARCHAR(255) NOT NULL REFERENCES login_users(token) ON DELETE CASCADE,
    tier VARCHAR(50) NOT NULL DEFAULT 'starter', -- 'starter', 'pro', 'enterprise'
    sites_allowed INTEGER NOT NULL DEFAULT 2,
    posts_allowed INTEGER NOT NULL DEFAULT 4,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'past_due'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_token)
);
```

### `usage_tracking`
**Purpose**: Track quota usage for subscription enforcement
```sql
CREATE TABLE usage_tracking (
    id SERIAL PRIMARY KEY,
    user_token VARCHAR(255) NOT NULL REFERENCES login_users(token) ON DELETE CASCADE,
    site_id INTEGER REFERENCES websites(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL, -- 'article', 'site'
    month_year VARCHAR(7) NOT NULL, -- '2025-01' format
    count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_token, site_id, resource_type, month_year)
);
```

---

## ✍️ Article Generation System

### `articles`
**Purpose**: Store generated articles and their metadata
```sql
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    user_token VARCHAR(255) REFERENCES login_users(token) ON DELETE CASCADE,
    site_id INTEGER REFERENCES websites(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    slug VARCHAR(255),
    status VARCHAR(50) DEFAULT 'draft',
    cms_id VARCHAR(255),
    language VARCHAR(50) DEFAULT 'english',
    settings JSONB DEFAULT '{}',
    eeat_score INTEGER DEFAULT 0,
    metrics_json JSONB DEFAULT '{}',
    word_count INTEGER DEFAULT 0,
    readability_score DECIMAL(3,1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### `article_versions`
**Purpose**: Track article version history
```sql
CREATE TABLE article_versions (
    id SERIAL PRIMARY KEY,
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(article_id, version_number)
);
```

### `article_queue`
**Purpose**: Queue for AI-generated articles with granular status tracking
```sql
-- Custom ENUM for article status
CREATE TYPE article_status AS ENUM (
    'pending', 'generating', 'generated', 'publishing', 'published', 
    'generation_failed', 'publishing_failed'
);

CREATE TABLE article_queue (
    id SERIAL PRIMARY KEY,
    user_token VARCHAR(255) NOT NULL REFERENCES login_users(token) ON DELETE CASCADE,
    website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    cms_connection_id INTEGER REFERENCES cms_connections(id) ON DELETE SET NULL,
    title VARCHAR(500),
    slug VARCHAR(255),
    target_keywords JSONB DEFAULT '[]',
    secondary_keywords JSONB DEFAULT '[]',
    content_outline JSONB DEFAULT '{}',
    article_content TEXT,
    meta_title VARCHAR(255),
    meta_description VARCHAR(500),
    featured_image_url VARCHAR(500),
    internal_links JSONB DEFAULT '[]',
    status article_status DEFAULT 'pending',
    scheduled_for TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    cms_article_id VARCHAR(255),
    cms_admin_url TEXT,
    public_url TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    generation_time_seconds INTEGER,
    quality_score DECIMAL(3,1),
    word_count INTEGER,
    readability_score DECIMAL(3,1),
    seo_score DECIMAL(3,1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### `article_images`
**Purpose**: Generated article images (DALL-E integration)
```sql
CREATE TABLE article_images (
    id SERIAL PRIMARY KEY,
    article_queue_id INTEGER NOT NULL REFERENCES article_queue(id) ON DELETE CASCADE,
    image_type VARCHAR(50) NOT NULL, -- 'featured', 'inline', 'thumbnail'
    image_url VARCHAR(500),
    alt_text VARCHAR(255),
    caption TEXT,
    prompt_used TEXT,
    position_in_article INTEGER,
    cms_image_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### `article_generation_logs`
**Purpose**: Debug and monitor article generation process
```sql
CREATE TABLE article_generation_logs (
    id SERIAL PRIMARY KEY,
    article_queue_id INTEGER NOT NULL REFERENCES article_queue(id) ON DELETE CASCADE,
    step VARCHAR(100) NOT NULL, -- 'outline_generation', 'content_generation', 'image_generation', 'publishing'
    status VARCHAR(50) NOT NULL, -- 'started', 'completed', 'failed'
    duration_seconds INTEGER,
    input_data JSONB,
    output_data JSONB,
    error_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🔗 CMS Integration

### `cms_connections`
**Purpose**: Manage CMS integrations (Strapi, WordPress, etc.)
```sql
CREATE TABLE cms_connections (
    id SERIAL PRIMARY KEY,
    user_token VARCHAR(255) NOT NULL REFERENCES login_users(token) ON DELETE CASCADE,
    website_id INTEGER REFERENCES websites(id) ON DELETE CASCADE,
    cms_type VARCHAR(50) NOT NULL DEFAULT 'strapi',
    connection_name VARCHAR(255) NOT NULL,
    base_url VARCHAR(500) NOT NULL,
    api_token TEXT, -- encrypted
    content_type VARCHAR(100) DEFAULT 'api::article::article',
    auth_config JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'active',
    last_sync_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_token, website_id, connection_name)
);
```

### `cms_content_schemas`
**Purpose**: Store CMS field mappings for dynamic publishing
```sql
CREATE TABLE cms_content_schemas (
    id SERIAL PRIMARY KEY,
    connection_id INTEGER REFERENCES cms_connections(id) ON DELETE CASCADE,
    content_type_name TEXT NOT NULL,
    schema_data JSONB NOT NULL,
    fields_config JSONB NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    last_discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(connection_id, content_type_name)
);
```

---

## 🔍 Google Search Console Integration

### `gsc_connections`
**Purpose**: Store encrypted OAuth tokens for GSC integration
```sql
CREATE TABLE gsc_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_token VARCHAR(255) REFERENCES login_users(token) ON DELETE CASCADE,
    access_token TEXT NOT NULL, -- encrypted
    refresh_token TEXT NOT NULL, -- encrypted
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    email VARCHAR(255) NOT NULL,
    scope TEXT NOT NULL DEFAULT 'https://www.googleapis.com/auth/webmasters.readonly',
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_errors JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_token)
);
```
**Key Points**:
- RLS is **DISABLED** on this table - service role handles security
- Tokens are encrypted before storage

### `gsc_properties`
**Purpose**: Verified GSC properties for each connection
```sql
CREATE TABLE gsc_properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id UUID REFERENCES gsc_connections(id) ON DELETE CASCADE,
    user_token VARCHAR(255) REFERENCES login_users(token) ON DELETE CASCADE,
    site_url TEXT NOT NULL,
    permission_level VARCHAR(50) NOT NULL, -- 'siteOwner', 'siteFullUser', 'siteRestrictedUser'
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    performance_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(connection_id, site_url)
);
```

### `gsc_performance_data`
**Purpose**: Historical GSC performance data
```sql
CREATE TABLE gsc_performance_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES gsc_properties(id) ON DELETE CASCADE,
    user_token VARCHAR(255) REFERENCES login_users(token) ON DELETE CASCADE,
    date_start DATE NOT NULL,
    date_end DATE NOT NULL,
    total_clicks INTEGER DEFAULT 0,
    total_impressions INTEGER DEFAULT 0,
    avg_ctr DECIMAL(10,6) DEFAULT 0,
    avg_position DECIMAL(10,4) DEFAULT 0,
    queries JSONB DEFAULT '[]',
    pages JSONB DEFAULT '[]',
    countries JSONB DEFAULT '[]',
    devices JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(property_id, date_start, date_end)
);
```

---

## 🛠️ Technical SEO Monitoring

### `url_inspections`
**Purpose**: GSC URL Inspection API results for technical SEO monitoring
```sql
CREATE TABLE url_inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_token VARCHAR(255) REFERENCES login_users(token) ON DELETE CASCADE,
    site_url TEXT NOT NULL,
    inspected_url TEXT NOT NULL,
    index_status VARCHAR(50) NOT NULL, -- 'PASS', 'FAIL', 'PARTIAL'
    can_be_indexed BOOLEAN DEFAULT false,
    google_canonical TEXT,
    user_canonical TEXT,
    sitemap TEXT,
    fetch_status VARCHAR(50), -- 'SUCCESS', 'SOFT_404', 'ACCESS_DENIED'
    last_crawl_time TIMESTAMP WITH TIME ZONE,
    robots_txt_state VARCHAR(50), -- 'ALLOWED', 'DISALLOWED'
    mobile_usable BOOLEAN DEFAULT false,
    mobile_usability_issues INTEGER DEFAULT 0,
    rich_results_items INTEGER DEFAULT 0,
    rich_results_valid BOOLEAN DEFAULT false,
    amp_url TEXT,
    amp_status VARCHAR(50),
    inspection_data JSONB DEFAULT '{}',
    inspected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_token, site_url, inspected_url)
);
```

### `robots_analyses`
**Purpose**: robots.txt analysis results
```sql
CREATE TABLE robots_analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES login_users(id) ON DELETE CASCADE NOT NULL,
    user_token TEXT NOT NULL,
    site_url TEXT NOT NULL,
    exists BOOLEAN NOT NULL DEFAULT false,
    accessible BOOLEAN NOT NULL DEFAULT false,
    size INTEGER NOT NULL DEFAULT 0,
    content TEXT DEFAULT '',
    issues JSONB DEFAULT '[]',
    suggestions JSONB DEFAULT '[]',
    crawl_delay INTEGER,
    sitemap_urls JSONB DEFAULT '[]',
    user_agents JSONB DEFAULT '[]',
    allowed_paths JSONB DEFAULT '[]',
    disallowed_paths JSONB DEFAULT '[]',
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_token, site_url)
);
```

### `sitemap_submissions`
**Purpose**: Track sitemap submissions to GSC
```sql
CREATE TABLE sitemap_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_token VARCHAR(255) REFERENCES login_users(token) ON DELETE CASCADE,
    site_url TEXT NOT NULL,
    sitemap_url TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'submitted', -- 'submitted', 'processed', 'error', 'deleted'
    submission_method VARCHAR(20) DEFAULT 'api', -- 'api', 'manual'
    warnings INTEGER DEFAULT 0,
    errors INTEGER DEFAULT 0,
    last_downloaded TIMESTAMP WITH TIME ZONE,
    is_pending BOOLEAN DEFAULT true,
    is_sitemaps_index BOOLEAN DEFAULT false,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_token, site_url, sitemap_url)
);
```
**⚠️ IMPORTANT**: The `sitemap_submissions` table does **NOT** contain these columns that were referenced in code:
- `generated_at` - **DOES NOT EXIST**
- `sitemap_content` - **DOES NOT EXIST**
- `url_count` - **DOES NOT EXIST**
- `gsc_property` - **DOES NOT EXIST**

### `technical_seo_fixes`
**Purpose**: Track automated SEO fixes applied to websites
```sql
CREATE TABLE technical_seo_fixes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_token VARCHAR(255) REFERENCES login_users(token) ON DELETE CASCADE,
    site_url TEXT NOT NULL,
    fix_types TEXT[] NOT NULL, -- array of fix types
    results JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'completed', -- 'completed', 'partial', 'failed'
    fix_count INTEGER DEFAULT 0,
    duration_ms INTEGER,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### `schema_generations`
**Purpose**: Track schema markup generations by seoagent.js
```sql
CREATE TABLE schema_generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    website_token VARCHAR(255) NOT NULL,
    page_url TEXT NOT NULL,
    schemas_generated INTEGER DEFAULT 0,
    schema_types TEXT[] DEFAULT '{}',
    generation_method VARCHAR(50) DEFAULT 'smart_js', -- 'smart_js', 'api', 'manual'
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
**Note**: No RLS policies - uses service role access

---

## 📊 SEO Audit System

### `seo_audits`
**Purpose**: Store audit runs and results
```sql
CREATE TABLE seo_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_token VARCHAR(255) REFERENCES login_users(token) ON DELETE CASCADE,
    website_id UUID,
    website_url TEXT NOT NULL,
    audit_type VARCHAR(50) DEFAULT 'full', -- 'full', 'technical', 'content', 'performance'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    pages_crawled INTEGER DEFAULT 0,
    pages_total INTEGER DEFAULT 0,
    current_step VARCHAR(100),
    progress_percentage INTEGER DEFAULT 0,
    overall_score INTEGER, -- 0-100
    total_issues INTEGER DEFAULT 0,
    critical_issues INTEGER DEFAULT 0,
    warning_issues INTEGER DEFAULT 0,
    info_issues INTEGER DEFAULT 0,
    user_agent TEXT DEFAULT 'SEOAgent/1.0 (+https://seoagent.com)',
    crawl_depth INTEGER DEFAULT 3,
    max_pages INTEGER DEFAULT 100,
    error_message TEXT,
    error_details JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### `audit_issues`
**Purpose**: Individual problems found during audits
```sql
CREATE TABLE audit_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID REFERENCES seo_audits(id) ON DELETE CASCADE,
    user_token VARCHAR(255) REFERENCES login_users(token) ON DELETE CASCADE,
    page_url TEXT NOT NULL,
    issue_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL, -- 'critical', 'warning', 'info'
    category VARCHAR(50) NOT NULL, -- 'technical', 'content', 'performance', 'accessibility'
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    element_selector TEXT,
    element_content TEXT,
    expected_content TEXT,
    impact_score INTEGER DEFAULT 0, -- 1-10
    fix_difficulty VARCHAR(20) DEFAULT 'medium', -- 'easy', 'medium', 'hard'
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'fixed', 'ignored'
    fixed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### `audit_pages`
**Purpose**: Track crawled pages during audits
```sql
CREATE TABLE audit_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID REFERENCES seo_audits(id) ON DELETE CASCADE,
    user_token VARCHAR(255) REFERENCES login_users(token) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title TEXT,
    meta_description TEXT,
    status_code INTEGER,
    load_time_ms INTEGER,
    content_size_bytes INTEGER,
    word_count INTEGER,
    h1_count INTEGER DEFAULT 0,
    h2_count INTEGER DEFAULT 0,
    h3_count INTEGER DEFAULT 0,
    internal_links INTEGER DEFAULT 0,
    external_links INTEGER DEFAULT 0,
    images_count INTEGER DEFAULT 0,
    images_without_alt INTEGER DEFAULT 0,
    has_meta_title BOOLEAN DEFAULT false,
    has_meta_description BOOLEAN DEFAULT false,
    has_h1 BOOLEAN DEFAULT false,
    has_canonical BOOLEAN DEFAULT false,
    is_indexable BOOLEAN DEFAULT true,
    lighthouse_performance INTEGER, -- 0-100
    lighthouse_seo INTEGER, -- 0-100
    lighthouse_accessibility INTEGER, -- 0-100
    page_content TEXT, -- limited content for analysis
    response_headers JSONB DEFAULT '{}',
    lighthouse_data JSONB DEFAULT '{}',
    crawled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 📈 Activity Monitoring

### `activity_summaries`
**Purpose**: Cache AI-generated activity summaries
```sql
CREATE TABLE activity_summaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES login_users(id) ON DELETE CASCADE NOT NULL,
    user_token TEXT NOT NULL,
    site_url TEXT NOT NULL,
    summary_text TEXT NOT NULL,
    activity_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    activity_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    activity_hash TEXT NOT NULL, -- hash of activity data to detect changes
    activity_count INTEGER NOT NULL DEFAULT 0,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    last_user_visit TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_token, site_url)
);
```

### `api_usage`
**Purpose**: Track API endpoint usage
```sql
CREATE TABLE api_usage (
    id SERIAL PRIMARY KEY,
    user_token VARCHAR(255) REFERENCES login_users(token) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    count INTEGER DEFAULT 1,
    date DATE DEFAULT CURRENT_DATE
);
```

---

## 🗂️ Content Management Extensions

### `website_analysis`
**Purpose**: Website content analysis and topic discovery
```sql
CREATE TABLE website_analysis (
    id SERIAL PRIMARY KEY,
    website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    content_topics JSONB DEFAULT '[]',
    target_keywords JSONB DEFAULT '[]',
    secondary_keywords JSONB DEFAULT '[]',
    competitor_urls JSONB DEFAULT '[]',
    brand_voice JSONB DEFAULT '{}',
    content_gaps JSONB DEFAULT '[]',
    sitemap_urls JSONB DEFAULT '[]',
    analysis_status VARCHAR(50) DEFAULT 'pending',
    last_analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(website_id)
);
```

### `content_templates`
**Purpose**: Content templates for consistent article generation
```sql
CREATE TABLE content_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(255) NOT NULL,
    template_type VARCHAR(100) NOT NULL, -- 'article_outline', 'introduction', 'conclusion', 'cta'
    industry VARCHAR(100), -- 'technology', 'marketing', 'health', 'finance'
    content_template TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(template_name, template_type, industry)
);
```

---

## 🛡️ Row Level Security (RLS) Overview

**Enabled Tables**: Most tables except GSC-related tables (gsc_connections, gsc_properties, gsc_performance_data) which use token-based auth via service role.

**Policy Pattern**: Users can access records linked to their `user_token` through the `login_users` table relationship. Service role has full access to all tables for API operations.

**Authentication Integration**: Uses Supabase auth (`auth.uid()`) linked to custom token system via `login_users.auth_user_id`.

---

## 🔧 Database Extensions & Functions

### Extensions
- `uuid-ossp`: For UUID generation

### Key Functions
- `update_updated_at_column()`: Trigger function to update updated_at timestamps
- `handle_new_user()`: Creates login_users record when auth.users is created
- `validate_article_status_transition()`: Enforces valid article status transitions
- `cleanup_expired_activity_summaries()`: Removes expired activity summaries

### Custom Types
- `article_status` ENUM: 'pending', 'generating', 'generated', 'publishing', 'published', 'generation_failed', 'publishing_failed'

---

## 📋 Key Indexes for Performance

```sql
-- Website Management
CREATE INDEX idx_websites_user_token ON websites(user_token);
CREATE INDEX idx_websites_managed ON websites(user_token, is_managed);
CREATE INDEX idx_websites_excluded ON websites(user_token, is_excluded_from_sync);

-- Article System
CREATE INDEX idx_articles_user_token ON articles(user_token);
CREATE INDEX idx_article_queue_user_token ON article_queue(user_token);
CREATE INDEX idx_article_queue_status ON article_queue(status);
CREATE INDEX idx_article_queue_website_id ON article_queue(website_id);

-- Technical SEO
CREATE INDEX idx_url_inspections_user_token ON url_inspections(user_token);
CREATE INDEX idx_url_inspections_site_url ON url_inspections(site_url);
CREATE INDEX idx_sitemap_submissions_user_token ON sitemap_submissions(user_token);
CREATE INDEX idx_technical_seo_fixes_user_token ON technical_seo_fixes(user_token);

-- Subscription & Usage
CREATE INDEX idx_user_plans_user_token ON user_plans(user_token);
CREATE INDEX idx_usage_tracking_user_token ON usage_tracking(user_token);
CREATE INDEX idx_usage_tracking_month_year ON usage_tracking(month_year);
```

---

## ⚠️ Common Pitfalls to Avoid

1. **Missing Columns**: Always check this file before assuming a column exists
2. **RLS Policies**: Remember that GSC tables (gsc_*) don't use RLS - they use service role access
3. **Token vs ID**: Most tables use `user_token` (VARCHAR) not `user_id` (INTEGER)
4. **ENUM Types**: `article_status` is a custom ENUM type, not a VARCHAR
5. **Unique Constraints**: Many tables have composite unique constraints - check before inserting

---

## 🔄 Recent Schema Changes

- **2025-08-07**: Fixed sitemap_submissions table documentation - removed non-existent columns (generated_at, sitemap_content, url_count, gsc_property)
- **Website Management**: Added is_managed and is_excluded_from_sync columns to websites table
- **Article Queue**: Enhanced with granular status tracking and CMS integration fields
- **Activity Summaries**: Added caching system for AI-generated activity reports

---

**📝 Last Updated**: August 7, 2025
**📋 Migration Files Analyzed**: All files in `/supabase/migrations/` up to `032_fix_sitemap_submissions.sql`