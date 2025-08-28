# SEOAgent Database Schema Documentation

> **⚠️ CRITICAL: ALWAYS CHECK THIS FILE BEFORE WRITING DATABASE QUERIES**
> 
> This file contains the complete, current database schema. Use it to verify table names, column names, data types, and constraints before writing any API code that interacts with the database.

## Overview
This document provides a complete overview of the SEOAgent PostgreSQL database schema. The database uses Supabase with Row Level Security (RLS) policies for data protection.

**Last Updated:** August 27, 2025  
**Migration Version:** Current (Verified from Live Database)  
**Agent Operating System:** ✅ Active (Primary SEO System)  
**Agent Memory System:** ✅ Active (`agent_memory` + `agent_learning` tables)

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
    gsc_status VARCHAR(20) DEFAULT 'none' CHECK (gsc_status IN ('none', 'connected', 'error')),
    seoagentjs_status VARCHAR(20) DEFAULT 'inactive' CHECK (seoagentjs_status IN ('inactive', 'active', 'error')),
    cms_status VARCHAR(20) DEFAULT 'none' CHECK (cms_status IN ('none', 'connected', 'error')),
    hosting_status VARCHAR(20) DEFAULT 'none' CHECK (hosting_status IN ('none', 'connected', 'error')),
    last_status_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cleaned_domain VARCHAR(255), -- Added in Migration 042
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
**Key Points**:
- `is_managed` - for selective website management
- `is_excluded_from_sync` - exclude from GSC sync
- **Connection Status Columns (Migration 041)**:
  - `gsc_status` - Google Search Console connection status (none/connected/error)
  - `seoagentjs_status` - SEOAgent.js script installation status (inactive/active/error)
  - `cms_status` - CMS connection status (none/connected/error)
  - `hosting_status` - Hosting provider connection status (none/connected/error)
  - `last_status_check` - Last time connection statuses were verified
- **Domain Handling (Migration 042)**:
  - `domain` - Original domain (may include sc-domain: prefix for GSC compatibility)
  - `cleaned_domain` - Clean domain without prefixes (sc-domain:, https://, www.) for URL construction
  - **Auto-populated**: `cleaned_domain` is automatically maintained via database trigger
  - **Indexed**: Optimized for queries on both user_token and cleaned_domain

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

## 🤖 Agent Operating System (Primary SEO System)

### `agent_ideas`
**Purpose**: Evidence-based SEO improvement backlog
```sql
CREATE TABLE agent_ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_token VARCHAR(255) NOT NULL REFERENCES login_users(token) ON DELETE CASCADE,
    site_url TEXT NOT NULL,
    title TEXT NOT NULL,
    hypothesis TEXT,
    evidence JSONB DEFAULT '{}',
    ice_score INTEGER, -- Impact/Confidence/Ease scoring (1-100)
    status agent_idea_status DEFAULT 'open',
    
    -- Lifecycle tracking
    adopted_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    priority INTEGER DEFAULT 50,
    estimated_effort VARCHAR(20), -- 'easy', 'medium', 'hard'
    tags TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
**Key Points**:
- Transform insights into actionable SEO improvements
- Evidence-based approach with ICE scoring
- Full lifecycle tracking from idea to completion

### `agent_actions`
**Purpose**: Executable SEO work units derived from ideas
```sql
CREATE TABLE agent_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID REFERENCES agent_ideas(id) ON DELETE CASCADE,
    user_token VARCHAR(255) NOT NULL REFERENCES login_users(token) ON DELETE CASCADE,
    site_url TEXT NOT NULL,
    
    -- Action definition
    action_type VARCHAR(100) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    payload JSONB DEFAULT '{}',
    policy JSONB DEFAULT '{}',
    
    -- State management
    status agent_action_status DEFAULT 'proposed',
    priority_score INTEGER DEFAULT 50,
    
    -- Scheduling
    scheduled_for TIMESTAMP WITH TIME ZONE,
    recurring_pattern VARCHAR(100),
    next_occurrence TIMESTAMP WITH TIME ZONE,
    
    -- Lifecycle tracking
    queued_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### `agent_runs`
**Purpose**: Bounded execution contexts for actions
```sql
CREATE TABLE agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_id UUID NOT NULL REFERENCES agent_actions(id) ON DELETE CASCADE,
    user_token VARCHAR(255) NOT NULL REFERENCES login_users(token) ON DELETE CASCADE,
    
    -- Idempotency and safety
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    policy JSONB NOT NULL,
    
    -- Execution tracking
    status agent_run_status DEFAULT 'queued',
    stats JSONB DEFAULT '{}',
    
    -- Budget consumption
    budget_consumed JSONB DEFAULT '{}',
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    
    -- Results
    output_data JSONB DEFAULT '{}',
    error_details TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### `agent_patches`
**Purpose**: Atomic, reversible website changes
```sql
CREATE TABLE agent_patches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    user_token VARCHAR(255) NOT NULL REFERENCES login_users(token) ON DELETE CASCADE,
    
    -- Target specification
    target_url TEXT NOT NULL,
    selector TEXT,
    element_type VARCHAR(50),
    
    -- Change specification
    change_type VARCHAR(50) NOT NULL,
    before_value TEXT,
    after_value TEXT,
    
    -- Context and reasoning
    rationale TEXT NOT NULL,
    risk_level risk_level DEFAULT 'low',
    
    -- State management
    status agent_patch_status DEFAULT 'suggested',
    
    -- Application tracking
    applied_at TIMESTAMP WITH TIME ZONE,
    reverted_at TIMESTAMP WITH TIME ZONE,
    
    -- Verification
    verification_status VARCHAR(20),
    verification_details JSONB DEFAULT '{}',
    
    -- Revert capability
    revert_patch_id UUID REFERENCES agent_patches(id),
    is_revert BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### `agent_capabilities`
**Purpose**: Dynamic registry of what the agent system can do
```sql
CREATE TABLE agent_capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capability_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    parameters_schema JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Site-specific availability
    available_for_sites TEXT[],
    required_integrations TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(capability_name)
);
```

### `agent_memory`
**Purpose**: Persistent context and learning for website-specific AI agents
```sql
CREATE TABLE agent_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_token TEXT NOT NULL,
    user_token TEXT NOT NULL,
    memory_type TEXT NOT NULL, -- 'context', 'patterns', 'preferences', 'insights', 'strategies'
    memory_key TEXT NOT NULL,
    memory_data JSONB NOT NULL,
    confidence_score DOUBLE PRECISION DEFAULT 0.8,
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(website_token, user_token, memory_type, memory_key)
);
```
**Key Points**:
- Stores persistent context for each website's AI agent
- Memory types: context, patterns, preferences, insights, strategies
- Automatic expiration support for temporary memories
- Confidence scoring for memory reliability

### `agent_learning`
**Purpose**: Action execution tracking for agent learning and improvement
```sql
CREATE TABLE agent_learning (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_token TEXT NOT NULL,
    user_token TEXT NOT NULL,
    action_type TEXT NOT NULL,
    action_context JSONB NOT NULL,
    outcome TEXT NOT NULL, -- 'success', 'failure', 'partial'
    success_metrics JSONB,
    error_details TEXT,
    execution_time_ms INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
**Key Points**:
- Records every agent action execution and outcome
- Enables success rate analysis by action type
- Powers agent recommendations and pattern learning
- Supports performance optimization over time

### `agent_events`
**Purpose**: Complete immutable audit trail of all agent activity
```sql
CREATE TABLE agent_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_token VARCHAR(255) NOT NULL REFERENCES login_users(token) ON DELETE CASCADE,
    
    -- Event identification
    event_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(20) NOT NULL,
    entity_id UUID NOT NULL,
    
    -- Event data
    event_data JSONB DEFAULT '{}',
    previous_state VARCHAR(50),
    new_state VARCHAR(50),
    
    -- Context
    triggered_by VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
**Key Points**:
- Immutable ledger of all agent operations
- Includes archived legacy data from migration 040
- Provides complete audit trail for compliance

### `agent_conversations`
**Purpose**: Persistent chat conversation history for each website's SEO agent
```sql
CREATE TABLE agent_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_token TEXT NOT NULL,
    website_token TEXT NOT NULL,
    conversation_id UUID NOT NULL, -- Groups messages in a conversation thread
    message_role TEXT NOT NULL CHECK (message_role IN ('user', 'assistant', 'system')),
    message_content TEXT NOT NULL,
    function_call JSONB, -- Store OpenAI function calls
    action_card JSONB, -- Store action cards from responses
    message_order INTEGER NOT NULL, -- Order within conversation (1, 2, 3...)
    session_id TEXT, -- Browser session identifier for grouping
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique message ordering within conversations
    UNIQUE(conversation_id, message_order)
);
```
**Key Points**:
- Groups related messages into conversation threads via `conversation_id`
- Stores complete chat transcripts with function calls and UI action cards
- Sequential message ordering within conversations (`message_order`)
- Full conversation persistence and history retrieval
- Supports session-based grouping for analytics
- Enables conversation resume across browser sessions

---

## 📊 Analytics & Performance Data

## 🗑️ Legacy Tables (Migration 040)

**The following tables have been removed and replaced by the Agent Operating System:**

- `seo_action_items` → `agent_ideas` + `agent_actions`
- `robots_analyses` → Agent technical SEO capabilities
- `sitemap_submissions` → Agent sitemap management
- `technical_seo_fixes` → `agent_patches`
- `schema_generations` → Agent schema capabilities
- `seo_audits` + `audit_issues` + `audit_pages` → Agent workflow system
- `activity_summaries` → Agent `summarize_activity` tool
- `api_usage` → Consolidated with `usage_tracking`
- `website_analysis` → Agent intelligence system

**Historical data preserved in `agent_events` table with `event_type: 'legacy_data_archived'`**

---

## 📈 Current Database Statistics

**Active Tables**: 16 core tables  
**Legacy Tables Removed**: 11 tables (Migration 040)  
**Agent System Tables**: 6 tables  
**Core Features**: Authentication, Subscriptions, Content, CMS, GSC, Agent System

## 📊 Agent System Indexes

```sql
-- Agent Ideas
CREATE INDEX IF NOT EXISTS idx_agent_ideas_user_token ON agent_ideas(user_token);
CREATE INDEX IF NOT EXISTS idx_agent_ideas_status ON agent_ideas(status);
CREATE INDEX IF NOT EXISTS idx_agent_ideas_site_url ON agent_ideas(site_url);
CREATE INDEX IF NOT EXISTS idx_agent_ideas_priority ON agent_ideas(priority DESC);

-- Agent Actions  
CREATE INDEX IF NOT EXISTS idx_agent_actions_user_token ON agent_actions(user_token);
CREATE INDEX IF NOT EXISTS idx_agent_actions_status ON agent_actions(status);
CREATE INDEX IF NOT EXISTS idx_agent_actions_idea_id ON agent_actions(idea_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_scheduled_for ON agent_actions(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_agent_actions_priority ON agent_actions(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_agent_actions_type ON agent_actions(action_type);
-- Agent Memory
CREATE INDEX IF NOT EXISTS idx_agent_memory_user_token ON agent_memory(user_token);
CREATE INDEX IF NOT EXISTS idx_agent_memory_website_token ON agent_memory(website_token);
CREATE INDEX IF NOT EXISTS idx_agent_memory_type_key ON agent_memory(memory_type, memory_key);
CREATE INDEX IF NOT EXISTS idx_agent_memory_expires_at ON agent_memory(expires_at);
-- Agent Learning
CREATE INDEX IF NOT EXISTS idx_agent_learning_user_token ON agent_learning(user_token);
CREATE INDEX IF NOT EXISTS idx_agent_learning_website_token ON agent_learning(website_token);
CREATE INDEX IF NOT EXISTS idx_agent_learning_action_type ON agent_learning(action_type);
CREATE INDEX IF NOT EXISTS idx_agent_learning_outcome ON agent_learning(outcome);
CREATE INDEX IF NOT EXISTS idx_agent_learning_created_at ON agent_learning(created_at DESC);
-- Agent Conversations
CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_token ON agent_conversations(user_token);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_website_token ON agent_conversations(website_token);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_conversation_id ON agent_conversations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_created_at ON agent_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_website ON agent_conversations(user_token, website_token);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_role ON agent_conversations(message_role);
-- Agent Events
CREATE INDEX IF NOT EXISTS idx_agent_events_user_token ON agent_events(user_token);
CREATE INDEX IF NOT EXISTS idx_agent_events_entity_type_id ON agent_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_agent_events_event_type ON agent_events(event_type);
CREATE INDEX IF NOT EXISTS idx_agent_events_created_at ON agent_events(created_at DESC);
```

---

## ⚠️ Important Notes

1. **Agent System Active**: All SEO operations now use the Agent Operating System
2. **Legacy APIs Deprecated**: Update all code to use `/api/agent/*` endpoints
3. **Data Integrity**: Historical data preserved in `agent_events` audit trail
4. **RLS Policies**: All agent tables use Row Level Security tied to `user_token`
5. **Migration 040**: Clean schema removes 11 legacy tables, keeps 16 core tables

---

## 🔄 Recent Schema Changes

- **2025-08-26 (Migration 040)**: 🚀 **MAJOR CLEANUP** - Removed 11 legacy SEO tables, Agent Operating System is now primary
- **2025-08-22**: Added Agent Operating System (6 new tables with state machines)
- **2025-08-13**: Added `seo_action_items` table (now removed in favor of agent system)
- **Website Management**: Added `is_managed` and `is_excluded_from_sync` columns
- **Subscription System**: Complete billing and quota management

---

**📝 Last Updated**: August 27, 2025 (Added Memory & Learning Tables)  
**📋 Migration Version**: Current (Verified from Live Database)  
**🤖 Agent System**: Active and Primary with Memory System
