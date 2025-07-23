You are a skilled full-stack developer building SEOMetrics.ai - a comprehensive SEO and AEO tool to help users grow their website traffic and visibility.

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

# 🎯 SEOMETRICS.AI IMPLEMENTATION STATUS

## 📋 FEATURE IMPLEMENTATION TRACKER

### PHASE 1: SUBSCRIPTION & ACCESS CONTROL
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
- [TODO] Usage tracking for article/site creation

### PHASE 2: ARTICLE GENERATION PIPELINE
#### Core Article Generation
- [COMPLETED] Basic article generation functionality
- [COMPLETED] Article database schema with enhanced fields
- [COMPLETED] Article versions tracking table
- [TODO] Quality gate system (word count, readability, EEAT)
- [TODO] Article management system (draft/published status)
- [TODO] Article editing and versioning UI

#### SEO Enhancement Features  
- [TODO] Internal linking suggestions
- [TODO] Schema.org Article markup generation
- [TODO] Meta title/description optimization
- [TODO] BreadcrumbList schema
- [TODO] Author information blocks

### PHASE 3: CMS PUBLISHING INTEGRATION
#### WordPress Integration
- [TODO] WordPress OAuth2/App Password authentication
- [TODO] WordPress REST API adapter
- [TODO] Category and tag assignment
- [TODO] Draft/publish status sync
- [TODO] CMS sites management database schema

#### Webflow Integration
- [TODO] Webflow OAuth2 authentication
- [TODO] Webflow CMS API adapter
- [TODO] Collection management
- [TODO] Item publishing workflow

### PHASE 4: ADDITIONAL FEATURES
#### Performance Monitoring
- [TODO] Google Search Console OAuth integration
- [TODO] Daily performance data sync
- [TODO] Low-performer identification
- [TODO] Rewrite suggestions dashboard

#### Lead Generation
- [TODO] Free site audit tool (`/seo-audit` page)
- [TODO] Lighthouse API integration
- [TODO] Content gap analysis
- [TODO] PDF/HTML report generation

#### Enhanced Onboarding
- [TODO] Step-by-step onboarding wizard
- [TODO] CMS connection setup flow
- [TODO] First article generation tutorial
- [TODO] Welcome call booking integration

## 🔧 CURRENT INFRASTRUCTURE STATUS

### Database (Supabase PostgreSQL)
- [COMPLETED] Core authentication tables with RLS
- [COMPLETED] Website management tables
- [COMPLETED] Article storage and metadata
- [COMPLETED] SEO tags generation tables
- [COMPLETED] Subscription system tables (`user_plans`, `usage_tracking`)
- [COMPLETED] Article versioning tables

### API Routes (Next.js)
- [COMPLETED] Authentication endpoints
- [COMPLETED] Website management endpoints
- [COMPLETED] Article generation endpoints
- [COMPLETED] SEO tag generation endpoints
- [COMPLETED] Subscription management endpoints (`/api/subscription/*`)
- [TODO] Article publishing endpoints
- [TODO] CMS integration endpoints
- [TODO] Analytics/reporting endpoints

### Frontend Components (Next.js + TypeScript)
- [COMPLETED] Authentication system with Supabase
- [COMPLETED] Dashboard and navigation
- [COMPLETED] Website management UI
- [COMPLETED] Article generation interface
- [COMPLETED] SEO tag generation tools
- [COMPLETED] Subscription management interface
- [COMPLETED] Usage dashboard and feature gates
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

## 🚨 IMMEDIATE PRIORITIES
1. **Fix auth token issue** preventing subscription data loading
2. **Test complete Stripe payment flow** end-to-end
3. **Implement quota enforcement** in article generation
4. **Build article management interface** for editing/publishing

**See `/ARCHITECTURE.md` for complete system architecture documentation.**