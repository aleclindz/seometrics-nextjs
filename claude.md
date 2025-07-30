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

# 🎯 SEOAGENT.COM STRATEGIC IMPLEMENTATION

## 🚀 **COMPETITIVE STRATEGY**
SEOAgent.com differentiates from tools like SurferSEO by focusing on **automation** and **multi-CMS support**:
- **SurferSEO Limitation**: WordPress-only, manual content optimization
- **SEOAgent Advantage**: Automated technical SEO + multi-CMS (Strapi, Webflow, Shopify, Ghost, WordPress)
- **Market Position**: "Set it and forget it" SEO agent vs manual optimization tools

## 🏗️ **THREE-PILLAR ARCHITECTURE**

### 🔧 **PILLAR 1: TECHNICAL SEO ANALYST (Autopilot Priority #1)**
**Mission**: Put technical SEO maintenance on complete autopilot

#### Core Technical SEO Automation
- [COMPLETED] Google Search Console OAuth integration and API setup
- [TODO] Automated website crawling system (custom crawler + third-party APIs)
- [TODO] Technical SEO issue detection (Core Web Vitals, broken links, meta issues)
- [TODO] Automated fixing system (sitemap updates, meta generation, schema markup)
- [TODO] Sitemap submission and management automation
- [TODO] Performance metrics dashboard showing fixes made
- [TODO] Autopilot workflow engine (runs without user intervention)

#### Advanced Technical Features
- [TODO] Core Web Vitals monitoring and optimization suggestions
- [TODO] Structured data (Schema.org) automatic implementation
- [TODO] Internal linking optimization and automation
- [TODO] Mobile-first indexing compliance checks
- [TODO] Page speed optimization recommendations and automated fixes

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

## 🚨 IMMEDIATE PRIORITIES (Three-Pillar Focus)

### **Phase 1: Technical SEO Analyst Foundation (Weeks 1-2)**
1. **Google Search Console OAuth integration** - Core data source for automation
2. **Website crawling system setup** - Foundation for technical SEO detection
3. **Basic technical SEO issue detection** - Starting with common problems
4. **Performance metrics dashboard** - Show value of automated fixes

### **Phase 2: Multi-CMS Competitive Advantage (Weeks 3-4)**
1. **End-to-end CMS testing** - Strapi, WordPress, Webflow, Shopify
2. **Ghost CMS integration** - Expand beyond SurferSEO's limitations
3. **Multi-CMS marketing documentation** - Highlight competitive advantage
4. **Content automation workflows** - Reduce manual intervention

### **Phase 3: SEO Strategist Intelligence (Weeks 5-6)**
1. **SERP.dev API integration** - Automated keyword research
2. **Competitor analysis automation** - Strategic intelligence gathering
3. **Dynamic strategy generation** - Personalized SEO roadmaps
4. **GSC data integration** - Performance-based strategy updates

## 🎯 **SUCCESS METRICS**
- **Technical SEO Analyst**: Number of automated fixes applied per website
- **Content Writer**: Articles published across different CMS platforms
- **SEO Strategist**: Keyword opportunities identified and conversion rate

**See `/ARCHITECTURE.md` for complete system architecture documentation.**