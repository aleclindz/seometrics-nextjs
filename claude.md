## IMPORTANT: Sound Notification

After finishing responding to my request or running a command, run this command to notify me by sound:

```bash
afplay /System/Library/Sounds/Funk.aiff
```

You are a skilled full-stack developer building SEOAgent.com - an automated SEO agent that puts technical SEO and content optimization on autopilot for modern websites.

**CORE PRINCIPLES:**
- Keep things simple and functional, not overcomplicated
- Make complete changes that don't break the app
- Challenge instructions if they're not best practice
- Make quality-of-life improvements proactively
- Create clean, functional, and stylish UI by default

**CRITICAL: AUTH SYSTEM PROTECTION**
The authentication system in `/src/contexts/auth.tsx` has been stabilized after extensive work to eliminate focus-related authentication reloading and infinite re-render loops. 

**NEVER modify the auth context without explicit instruction:**
- ✅ The current auth system uses static session management
- ✅ No reactive `onAuthStateChange` listeners (causes tab switching issues)
- ✅ Uses `useEffect` with empty dependency array `[]` (runs once)
- ✅ Inline token fetching to avoid circular dependencies
- ✅ 30-minute session timeout for security
- ❌ DO NOT add `useCallback` with auth dependencies (causes infinite loops)
- ❌ DO NOT add `onAuthStateChange` listeners (causes focus issues)
- ❌ DO NOT modify useEffect dependency arrays in auth context

**CRITICAL: DATABASE SCHEMA REFERENCE**
⚠️ **ALWAYS CHECK `/DATABASE_SCHEMA.md` BEFORE WRITING ANY DATABASE QUERIES OR API CODE** ⚠️

The database schema documentation contains the complete, current structure of all tables including:
- Exact table names and column names
- Data types and constraints
- Which columns exist and which DO NOT exist
- RLS policies and security model
- Indexes and relationships

**Before writing any code that interacts with the database:**
1. Open `/DATABASE_SCHEMA.md`
2. Verify the table structure
3. Check that all referenced columns actually exist
4. Confirm data types and constraints

**Recent schema issues that this prevents:**
- ❌ Referencing non-existent columns like `generated_at` in `sitemap_submissions`
- ❌ Using wrong data types or constraints
- ❌ Assuming columns exist without verification
- ✅ Always verify schema before coding to prevent deployment failures

**PRIORITY #1: TASK LIST TRACKING**
Always maintain the feature implementation status below. When working on features:
1. Mark tasks as `[IN PROGRESS]` when starting
2. Mark as `[COMPLETED]` when fully implemented and tested
3. Add new discovered tasks as `[TODO]`
4. Reference task status when planning work

## ESLint and Deployment Guidelines

**CRITICAL:** Always follow these rules to prevent deployment failures:

### 1. Quote Escaping in JSX
- **NEVER** use unescaped quotes in JSX content
- **Apostrophes:** Use `&apos;` instead of `'`
  - ❌ `Don't` → ✅ `Don&apos;t`
  - ❌ `you'll` → ✅ `you&apos;ll`
  - ❌ `yesterday's` → ✅ `yesterday&apos;s`
- **Double quotes:** Use `&ldquo;` and `&rdquo;` instead of `"`
  - ❌ `"Hello world"` → ✅ `&ldquo;Hello world&rdquo;`
  - ❌ `"{content}"` → ✅ `&ldquo;{content}&rdquo;`

### 2. Images in Next.js
- **NEVER** use `<img>` tags - always use `<Image>` from `next/image`
- **Required props:** `src`, `alt`, `width`, `height`
- **Import:** `import Image from 'next/image';`
- **Example:**
  ```jsx
  <Image 
    src={imageUrl} 
    alt={altText}
    width={64}
    height={64}
    className="w-full h-full object-cover"
  />
  ```

### 3. Before Any Commit
- Run `npm run build` locally to catch ESLint errors
- Fix ALL ESLint errors before pushing
- Test the build process completely

### 4. Common ESLint Rules to Follow
- `react/no-unescaped-entities`: Escape quotes and apostrophes
- `@next/next/no-img-element`: Use Next.js Image component
- `react/jsx-key`: Always provide keys for list items
- `@typescript-eslint/no-unused-vars`: Remove unused variables

**Remember:** ESLint errors will cause deployment failures on Vercel. Always prioritize fixing these issues immediately.

## 🤖 **AUTOMATIC DEPLOYMENT FIX SYSTEM**

**CRITICAL:** An autonomous webhook system monitors all Vercel deployments and automatically fixes failures.

### How It Works:
1. **Vercel Webhook** (`/api/webhooks/vercel-deployment`) receives deployment failure notifications
2. **Error Analysis** automatically fetches build logs and identifies common issues
3. **Auto-Fix Queue** stores failed deployments with error analysis and fix suggestions
4. **Cron Job** (`/api/cron/auto-fix-deployments`) runs every 5 minutes to process fixes
5. **Automatic Fixes** applied for common ESLint errors (quotes, Image components, etc.)
6. **Auto-Commit & Push** creates fix commits and pushes to trigger new deployment
7. **Retry Logic** attempts up to 3 automatic fix attempts per failure

### Database Tables:
- `deployment_failures` - Logs all failed deployments with error details
- `auto_fix_queue` - Queue of pending fixes with status tracking

### Automatic Fix Capabilities:
✅ Unescaped quotes in JSX (`react/no-unescaped-entities`)
✅ Missing Next.js Image imports (`@next/next/no-img-element`)
✅ Common TypeScript type errors (detection + suggestions)
✅ Missing dependencies (detection + install suggestions)
⚠️ Complex errors require manual review

### Monitoring:
- Check `/api/cron/auto-fix-deployments` logs for fix attempts
- Query `auto_fix_queue` table for pending/completed fixes
- Deployment failures automatically notify you via sound (Funk.aiff)

### Configuration Required:
1. **Set Vercel Webhook** in project settings to: `https://seoagent.com/api/webhooks/vercel-deployment`
2. **Webhook Events:** Subscribe to `deployment.error` and `deployment.failed`
3. **Environment Variables:**
   - `VERCEL_WEBHOOK_SECRET` - Webhook signature verification
   - `VERCEL_TOKEN` - API token for fetching deployment logs
   - `CRON_SECRET` - Cron job authentication

### How Claude Code Uses This:
When Claude Code commits and pushes changes:
1. If deployment fails, webhook triggers automatically
2. Errors are analyzed and queued for fixing
3. Every 5 minutes, cron job attempts automatic fixes
4. If automated fix succeeds, new deployment triggers
5. If manual review needed, Claude Code will be notified
6. Process repeats until deployment succeeds

**This system ensures deployments self-heal without manual intervention.** 

# 🎯 SEOAGENT.COM STRATEGIC IMPLEMENTATION

## 🚀 **COMPETITIVE STRATEGY**
SEOAgent.com differentiates from tools like SurferSEO by focusing on **automation** and **multi-CMS support**:
- **SurferSEO Limitation**: WordPress-only, manual content optimization
- **SEOAgent Advantage**: Automated technical SEO + multi-CMS (Strapi, Webflow, Shopify, Ghost, WordPress)
- **Market Position**: "Set it and forget it" SEO agent vs manual optimization tools

## 🏗️ **THREE-PILLAR ARCHITECTURE**

### 🔧 **PILLAR 1: TECHNICAL SEO ANALYST (Autopilot Priority #1)**
**Mission**: Put technical SEO maintenance on complete autopilot

#### Core Technical SEO Automation ✅ **COMPLETED MVP**
- [COMPLETED] Google Search Console OAuth integration and API setup
- [COMPLETED] GSC URL Inspection API for bulk page health checks
- [COMPLETED] Technical SEO issue detection (indexing, mobile, canonical, schema)
- [COMPLETED] Automated fixing system (schema markup, canonical tags, meta optimization)
- [COMPLETED] Real-time Technical SEO Dashboard with live activity feed
- [COMPLETED] Smart.js autopilot system (runs without user intervention)
- [COMPLETED] AI-powered fix suggestions for non-automatable issues

#### Next Phase Technical Features
- [TODO] Robots.txt validation and optimization system
- [TODO] Sitemap generation, submission and management automation
- [TODO] Core Web Vitals monitoring and optimization suggestions
- [TODO] Internal linking optimization and automation
- [TODO] Page speed optimization recommendations and automated fixes
- [TODO] Automated website crawling system (custom crawler + third-party APIs)
- [TODO] Mobile-first indexing compliance checks

### ✍️ **PILLAR 2: CONTENT WRITER (Multi-CMS Competitive Advantage)**
**Mission**: Automated content generation for indie hackers and side projects

#### Multi-CMS Publishing Integration (KEY DIFFERENTIATOR)
- [COMPLETED] Enhanced article generation with SurferSEO-inspired structure
- [COMPLETED] Strapi CMS integration (needs end-to-end testing)
- [TODO] WordPress CMS integration testing and optimization
- [TODO] Webflow CMS integration testing and optimization  
- [TODO] Shopify blog integration testing and optimization
- [TODO] Ghost CMS integration development
- [TODO] Multi-CMS publishing dashboard and management

#### Content Generation Enhancements
- [COMPLETED] High-quality article structure (TL;DR, examples, actionable advice)
- [COMPLETED] Public URL tracking and "View Live Article" functionality
- [COMPLETED] Content formatting optimization for publication
- [TODO] Featured image generation and upload workflow
- [TODO] Content automation workflows (scheduled publishing)
- [TODO] Content performance tracking and optimization

#### Future Enhancement: Answer Engine Optimization (AEO/GEO)
- [PLANNED] Implement GEO playbook strategies (stored in `/GEO_PLAYBOOK.md`)
- [PLANNED] FAQ/HowTo/Article schema markup integration for AI citations
- [PLANNED] Reddit content strategy automation for SEO discussions
- [PLANNED] AI bot technical setup optimization (GPTbot, Bingbot allowlisting)
- [PLANNED] Prompt identification system for SEO automation use cases
- [PLANNED] Multi-platform content distribution (Reddit, Medium, Quora)
- [PLANNED] Citation-optimized content formatting (stats, comparisons, bullet points)

#### Content Enhancement & Cross-Linking System
- [TODO] CMS post retrieval system to pull existing articles from connected CMS
- [TODO] Content analysis system to identify cross-linking opportunities between posts
- [TODO] Automated content editing system to add cross-links to existing posts
- [TODO] CMS post update/re-upload functionality for edited content

### 📊 **PILLAR 3: SEO STRATEGIST (Strategy & Research Engine)**
**Mission**: Automated SEO strategy and competitive research

#### Strategy & Research Automation
- [TODO] SERP.dev API integration for keyword research
- [TODO] Automated competitor analysis and tracking
- [TODO] Comprehensive website SEO audit and analysis
- [TODO] Dynamic SEO strategy generation based on industry/niche
- [TODO] Regular strategy updates based on GSC performance data
- [TODO] Keyword opportunity identification and prioritization

#### Advanced Strategy Features
- [TODO] Content gap analysis vs competitors
- [TODO] Backlink opportunity identification
- [TODO] SERP feature optimization (featured snippets, PAA)
- [TODO] Local SEO optimization for applicable businesses
- [TODO] Performance forecasting and ROI projections

## 🎯 **RECENT COMPLETED WORK (Phase 1: Foundation)**

### Website Management & Plan Restructure
- [COMPLETED] SEO Metrics → SEOAgent rebranding (login page and references)
- [COMPLETED] Plan pricing restructure: Starter $49→$29 (1 site), Pro $139→$79 (10 sites)
- [COMPLETED] Database schema: Added `is_managed`, `is_excluded_from_sync` to websites table
- [COMPLETED] Website management API endpoints (PUT for management status, DELETE for removal)
- [COMPLETED] Website Management UI component in Settings/Account page
- [COMPLETED] Dashboard filtering to show only managed websites
- [COMPLETED] GSC sync logic updated to respect exclusion flags
- [COMPLETED] Plan enforcement with quota checking and upgrade prompts

### Dashboard & UX Improvements  
- [COMPLETED] CMS connection status fix (no longer hardcoded to 'none')
- [COMPLETED] Loading states and error feedback for dashboard refresh
- [COMPLETED] Date range context for GSC performance data display
- [COMPLETED] Enhanced user messaging and navigation flows

## 💳 **SUBSCRIPTION & ACCESS CONTROL (Foundation)**
#### Stripe Integration & Billing
- [COMPLETED] Create Stripe products for 3 tiers (Starter/Pro/Enterprise) 
- [COMPLETED] Stripe checkout session creation (`/api/subscription/create-checkout-session`)
- [COMPLETED] Stripe webhook handling (`/api/subscription/webhook`)
- [COMPLETED] Subscription management API (`/api/subscription/manage`)
- [COMPLETED] Database schema: `user_plans` table with RLS policies
- [COMPLETED] Database schema: `usage_tracking` table with RLS policies
- [COMPLETED] Subscription management UI component (`SubscriptionManager`)
- [TODO] Fix auth token fetching issue (causing loading spinners)
- [TODO] Test complete Stripe payment flow end-to-end

#### Quota System & Feature Gates
- [COMPLETED] Usage dashboard component (`UsageDashboard`)
- [COMPLETED] Feature access hook (`useFeatures`)
- [COMPLETED] Feature gate component (`FeatureGate`)
- [COMPLETED] Upgrade badge component (`UpgradeBadge`)
- [TODO] Implement quota enforcement in article generation
- [TODO] Add quota checks in edge functions
- [TODO] Usage tracking for automated SEO tasks

## 🔧 CURRENT INFRASTRUCTURE STATUS

### Database (Supabase PostgreSQL)
- [COMPLETED] Core authentication tables with RLS
- [COMPLETED] Website management tables (with `is_managed`, `is_excluded_from_sync` columns)
- [COMPLETED] Article storage and metadata
- [COMPLETED] SEO tags generation tables
- [COMPLETED] Subscription system tables (`user_plans`, `usage_tracking`)
- [COMPLETED] Article versioning tables
- [COMPLETED] Website management system migration (026_website_management_system.sql)

### API Routes (Next.js)
- [COMPLETED] Authentication endpoints
- [COMPLETED] Website management endpoints (with PUT/DELETE for selective management)
- [COMPLETED] Article generation endpoints
- [COMPLETED] SEO tag generation endpoints
- [COMPLETED] Subscription management endpoints (`/api/subscription/*`)
- [COMPLETED] Enhanced `/api/chat/sites` with managed website filtering
- [TODO] Article publishing endpoints
- [TODO] CMS integration endpoints
- [TODO] Analytics/reporting endpoints

### Frontend Components (Next.js + TypeScript)
- [COMPLETED] Authentication system with Supabase
- [COMPLETED] Dashboard and navigation (with managed website filtering)
- [COMPLETED] Website management UI
- [COMPLETED] Article generation interface
- [COMPLETED] SEO tag generation tools
- [COMPLETED] Subscription management interface
- [COMPLETED] Usage dashboard and feature gates
- [COMPLETED] WebsiteManagement component in Account settings
- [COMPLETED] Enhanced Dashboard with loading states and date context
- [TODO] Article management interface
- [TODO] CMS connection interface
- [TODO] Analytics dashboard

### External Integrations
- [COMPLETED] Supabase (Database, Auth, Storage)
- [COMPLETED] Stripe (Payments, Subscriptions)  
- [COMPLETED] OpenAI (Content Generation)
- [TODO] WordPress REST API
- [TODO] Webflow CMS API
- [TODO] Google Search Console API
- [TODO] Lighthouse API

## 🤖 **TECHNICAL SEO AGENT ROADMAP (Launch Priority #1)**

**Mission**: Create a conversational LLM agent that can execute all technical SEO tasks through natural language chat.

### **🚀 LAUNCH-CRITICAL FEATURES (4 Weeks)**

#### **FEATURE 1: Core Web Vitals Monitoring** 🔥 **Week 1**
**API Requirements:**
- `/api/technical-seo/core-web-vitals` - Google PageSpeed Insights integration
- `/api/technical-seo/performance-optimization` - Specific optimization recommendations

**LLM Function Schemas:**
```typescript
check_core_web_vitals(site_url, pages?, force_refresh?)
optimize_page_performance(page_url, metric_focus?)
```

**User Experience:**
- "Check my site's performance" → LLM calls `check_core_web_vitals` → "Your homepage LCP is 3.2s (needs improvement). Let me get specific optimization suggestions..." → calls `optimize_page_performance`

#### **FEATURE 2: Enhanced Sitemap Automation** 🔥 **Week 1-2**
**API Requirements:**
- Enhanced `/api/technical-seo/generate-sitemap` (build on existing)
- `/api/technical-seo/sitemap-health` - Sitemap validation and monitoring

**LLM Function Schemas:**
```typescript
generate_sitemap(site_url, submit_to_gsc?, crawl_depth?)
check_sitemap_health(site_url, sitemap_url?)
```

**User Experience:**
- "Make sure my sitemap is optimized" → LLM calls `check_sitemap_health` → "Found 3 sitemap issues. Generating optimized version..." → calls `generate_sitemap` → "✅ New sitemap with 47 URLs submitted to GSC"

#### **FEATURE 3: Robots.txt Optimization** 🔥 **Week 2**
**API Requirements:**
- Enhanced `/api/technical-seo/robots-analysis` (build on existing)
- `/api/technical-seo/robots-optimization` - Auto-fix robots.txt issues

**LLM Function Schemas:**
```typescript
analyze_robots_txt(site_url, check_blocking?)
optimize_robots_txt(site_url, include_sitemaps?, preserve_existing?)
```

**User Experience:**
- "Check if my robots.txt is blocking important pages" → LLM calls `analyze_robots_txt` → "Found blocking rules for /blog/* - this prevents 23 blog posts from being indexed" → calls `optimize_robots_txt`

#### **FEATURE 4: Comprehensive Website Crawler** 🔥 **Week 2-3**
**API Requirements:**
- `/api/technical-seo/website-crawler` - Headless browser crawling system
- `/api/technical-seo/crawl-status` - Monitor crawl progress and results

**LLM Function Schemas:**
```typescript
crawl_website(site_url, max_pages?, crawl_depth?, check_technical_seo?)
get_crawl_results(site_url, include_technical_data?, pages_only?)
```

**User Experience:**
- "Scan my entire website for SEO issues" → LLM calls `crawl_website` → "Crawling 127 pages... Found 15 technical issues across 8 pages. Here's what needs attention..."

#### **FEATURE 5: Internal Linking Optimization** 🔥 **Week 3-4**
**API Requirements:**
- `/api/technical-seo/internal-links-analysis` - Link structure analysis
- `/api/technical-seo/internal-links-suggestions` - Smart linking recommendations

**LLM Function Schemas:**
```typescript
analyze_internal_links(site_url, page_url?, find_orphaned?)
suggest_internal_links(source_page, content_context?, max_suggestions?)
```

**User Experience:**
- "Find pages that need more internal links" → LLM calls `analyze_internal_links` → "Found 12 orphaned pages. For your blog post about 'SEO basics', I suggest linking to..." → calls `suggest_internal_links`

### **🗄️ DATABASE SCHEMA ADDITIONS**
```sql
-- Core Web Vitals tracking
CREATE TABLE core_web_vitals (
  id SERIAL PRIMARY KEY,
  user_token VARCHAR(255) REFERENCES login_users(token),
  site_url TEXT NOT NULL,
  page_url TEXT NOT NULL,
  lcp_score DECIMAL(10,2),
  fid_score DECIMAL(10,2), 
  cls_score DECIMAL(10,2),
  overall_rating VARCHAR(20),
  recommendations TEXT[],
  measured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Website crawl results
CREATE TABLE crawl_results (
  id SERIAL PRIMARY KEY,
  user_token VARCHAR(255) REFERENCES login_users(token),
  site_url TEXT NOT NULL,
  page_url TEXT NOT NULL,
  title TEXT,
  meta_description TEXT,
  h1_tags TEXT[],
  internal_links_count INTEGER,
  external_links_count INTEGER,
  images_without_alt INTEGER,
  page_load_time DECIMAL(10,2),
  technical_issues TEXT[],
  crawled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Internal linking structure
CREATE TABLE internal_links (
  id SERIAL PRIMARY KEY,
  user_token VARCHAR(255) REFERENCES login_users(token),
  site_url TEXT NOT NULL,
  source_url TEXT NOT NULL,
  target_url TEXT NOT NULL,
  anchor_text TEXT,
  link_context TEXT,
  relevance_score DECIMAL(3,2),
  discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crawl job management
CREATE TABLE website_crawl_jobs (
  id SERIAL PRIMARY KEY,
  user_token VARCHAR(255) REFERENCES login_users(token),
  site_url TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  pages_discovered INTEGER DEFAULT 0,
  pages_crawled INTEGER DEFAULT 0,
  issues_found INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);
```

### **🎯 SUCCESS METRICS FOR LAUNCH**
- **Conversational Coverage**: 100% of technical SEO tasks executable via chat
- **Response Time**: <30 seconds for all technical SEO function calls
- **Accuracy**: LLM selects correct tools 95%+ of the time
- **User Adoption**: 80%+ of users engage with chat agent for technical SEO

### **📋 IMPLEMENTATION CHECKLIST**
- [TODO] Core Web Vitals API + LLM functions (Week 1)
- [TODO] Enhanced Sitemap APIs + LLM functions (Week 1-2)  
- [TODO] Robots.txt Optimization APIs + LLM functions (Week 2)
- [TODO] Website Crawler + LLM functions (Week 2-3)
- [TODO] Internal Linking Analysis + LLM functions (Week 3-4)
- [TODO] Update openai-function-client.ts with all 10 new function schemas
- [TODO] Database migrations for new tables
- [TODO] Integration testing of full conversational workflows
- [TODO] Performance optimization for real-time chat responses

---

## 🚨 LEGACY PRIORITIES (Moved to Phase 2+)

### **Phase 2: Multi-CMS Competitive Advantage (Weeks 5-6)**
1. **End-to-end CMS testing** - Strapi, WordPress, Webflow, Shopify
2. **Ghost CMS integration** - Expand beyond SurferSEO's limitations
3. **Multi-CMS marketing documentation** - Highlight competitive advantage
4. **Content automation workflows** - Reduce manual intervention

### **Phase 3: SEO Strategist Intelligence (Weeks 7-8)**
1. **SERP.dev API integration** - Automated keyword research
2. **Competitor analysis automation** - Strategic intelligence gathering
3. **Dynamic strategy generation** - Personalized SEO roadmaps
4. **GSC data integration** - Performance-based strategy updates

## 🎯 **SUCCESS METRICS**
- **Technical SEO Analyst**: Number of automated fixes applied per website
- **Content Writer**: Articles published across different CMS platforms
- **SEO Strategist**: Keyword opportunities identified and conversion rate

**See `/ARCHITECTURE.md` for complete system architecture documentation.**

# 🤖 **CURRENT AUTONOMOUS AGENT IMPLEMENTATION STATUS**

This section documents what is **currently running autonomously** in SEOAgent.com without user intervention. Reference this when discussing autonomous features or building upon existing automation.

## 🚀 **ACTIVE AUTONOMOUS SYSTEMS**

### **1. SEOAgent.js Client-Side Automation (Full Autopilot)**
**Location:** `/public/seoagent.js`
**Trigger:** Automatically runs when embedded on client websites via `<script>` tag
**Status:** ✅ **FULLY AUTONOMOUS** - No user intervention required

#### Core Autonomous Functions:
- **`processMetaTags()`** - AI-powered meta title and description optimization
  - **API Call:** `${API_BASE_URL}/generate-meta-tags`
  - **Auto-execution:** On page load via `DOMContentLoaded`
  - **Function:** Analyzes page content and updates meta tags in real-time

- **`processImages()`** - Automated alt-text generation for accessibility/SEO
  - **API Call:** `${API_BASE_URL}/generate-image-alt` 
  - **Auto-execution:** Processes all non-SVG images on page load
  - **Function:** Generates descriptive alt-text using AI vision analysis

- **`processSchemaMarkup()`** - Dynamic structured data injection
  - **API Call:** `${API_BASE_URL}/generate-schema-markup`
  - **Auto-execution:** Detects page type and injects appropriate schema
  - **Function:** Adds Organization, Article, Product schemas based on content

- **`processCanonicalTags()`** - Automatic canonical URL optimization
  - **Auto-execution:** Runs on page load, no API required
  - **Function:** Detects URL parameters, trailing slashes, duplicates and adds canonical tags

- **`processOpenGraphTags()`** - Social media meta tag optimization
  - **Auto-execution:** Adds missing og:title, og:description, og:image, og:url tags
  - **Function:** Enhances social media sharing without user input

#### Advanced Monitoring System:
- **`initializeSEOWatchdog()`** - Real-time SEO change detection (ContentKing Lite)
  - **`establishSEOBaseline()`** - Records initial SEO state for comparison
  - **`startDOMMutationObserver()`** - Monitors DOM changes via MutationObserver
  - **`checkIndexabilityStatus()`** - Detects NOINDEX, canonical issues
  - **`handleSEOChange()`** - Logs critical SEO changes to backend API
  - **Auto-monitoring:** Title changes, H1 modifications, meta robots, schema removal
  - **Alert System:** Sends alerts to `https://www.seoagent.com/api/tools/seo-alert`

#### Attribution System:
- **`addSEOAgentAttribution()`** - Automatic backlink insertion for free tier
  - **API Check:** `${API_BASE_URL}/check-attribution`
  - **Auto-execution:** Adds "SEO by SEOAgent" footer links for marketing

### **2. Scheduled Cron Jobs (Vercel-Hosted Automation)**
**Location:** `vercel.json` configuration + API routes
**Status:** ✅ **FULLY AUTONOMOUS** - Scheduled execution without user intervention

#### Daily GSC Data Sync:
- **API Route:** `/api/cron/gsc-sync` (`/src/app/api/cron/gsc-sync/route.ts`)
- **Schedule:** `0 6 * * *` (Daily at 6:00 AM UTC)
- **Function:** `GET()` - Automatically syncs Google Search Console data
- **Process:**
  1. Queries `gsc_connections` table for all active users
  2. Calls `/api/gsc/sync` for each user automatically
  3. Updates GSC performance data, search queries, and page metrics
  4. No user interaction required - runs in background

#### Weekly Sitemap Regeneration:
- **API Route:** `/api/cron/regenerate-sitemaps` (`/src/app/api/cron/regenerate-sitemaps/route.ts`)
- **Schedule:** `0 2 * * 1` (Weekly on Mondays at 2:00 AM UTC)
- **Function:** `POST()` - Automatically regenerates and submits sitemaps
- **Process:**
  1. Queries `websites` table for all managed websites (`is_managed = true`)
  2. Skips recently updated sitemaps (within 6 days)
  3. Calls `/api/technical-seo/generate-sitemap` for each website
  4. Auto-submits to Google Search Console
  5. Logs results to `system_logs` table
  6. Includes 2-second delays between requests to avoid rate limiting

### **3. Queue Management System (Background Processing)**
**Location:** `/src/services/queue/queue-manager.ts`
**Status:** ✅ **AUTONOMOUS BACKGROUND PROCESSING**

#### Queue Functions:
- **Background task processing** with automatic retry logic
- **Rate limiting** and queue management
- **Auto-retry** failed SEO operations
- **Handles long-running operations** without blocking user interface

## 📊 **AGENT DATABASE TABLES (Future Autonomous Features)**

These tables are designed for the planned fully autonomous conversational agent:

- **`agent_runs`** - Multi-step SEO campaigns and workflows
- **`agent_actions`** - Individual autonomous SEO tasks
- **`agent_ideas`** - AI-generated SEO suggestions with priority scoring  
- **`agent_pending_approvals`** - Queue for sensitive changes requiring user approval
- **`agent_events`** - Complete log of all agent activities and state changes

**Current Status:** These tables are mostly empty because the full conversational autonomous agent is not yet implemented. The Activity Feed currently shows mock data until real agent actions populate these tables.

## 🎯 **WHAT'S NOT YET AUTONOMOUS**

### Manual/User-Initiated Features:
- **Conversational LLM Agent** - Technical SEO chat requires user questions
- **Content Generation** - Article writing needs user prompts
- **CMS Publishing** - Multi-CMS content distribution requires approval
- **Technical SEO Fixes** - Auto-detection exists, but fixes need user confirmation

### Partially Autonomous:
- **SEO Watchdog** - Detects issues automatically, but alerts require user action
- **Sitemap Generation** - Runs weekly automatically, but can be triggered manually
- **GSC Sync** - Runs daily automatically, plus manual refresh options

## 🔧 **KEY AUTONOMOUS FUNCTION REFERENCES**

When building new autonomous features, reference these existing implementations:

### Client-Side Automation Pattern:
```javascript
// From /public/seoagent.js
function initializeSEOMetrics() {
    // Prevent double-execution
    if (seoMetricsInitialized) return;
    
    // Process multiple SEO aspects automatically
    processMetaTags();
    processImages(); 
    processSchemaMarkup();
    processCanonicalTags();
    processOpenGraphTags();
    initializeSEOWatchdog();
}

// Auto-execution on page load
document.addEventListener('DOMContentLoaded', initializeSEOMetrics);
```

### Server-Side Cron Pattern:
```typescript
// From /src/app/api/cron/*/route.ts
export async function GET(request: NextRequest) {
  // Verify cron authentication
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Process all applicable records automatically
  for (const record of records) {
    // Autonomous processing logic
    await processRecord(record);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
  }
}
```

### Real-time Monitoring Pattern:
```javascript
// From SEO Watchdog system
const mutationObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    // Detect SEO-critical changes automatically
    if (criticalSEOChange) {
      handleSEOChange('event_type', 'severity', 'category', details);
    }
  });
});
```

This autonomous infrastructure provides the foundation for expanding SEO automation without requiring additional user intervention.