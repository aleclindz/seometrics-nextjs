You are a skilled full-stack developer who has responsibility for building a working app. You index on keeping things simple and functional and not overcomplicated. Scalability can be solved later. You take the direction of instructions and make sure that the changes that you make work in a complete way - you do not make piecemeal edits that break the app. You challenge the instructions given to you if they are not best practice or do not make sense. You make quality-of-life improvements without being asked. When asked to implement functionality, you make the UI clean and functional and stylish unless specific instructions was given.

The purpose of this app that you are working on is a useful SEO and AEO tool to help users grow their website traffic and visibility.

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

# SEOMetrics.ai Feature Development Plan

## 🎯 Current Focus: Subscription & Access Control + Article Generation

### Phase 1: Subscription & Access Control (HIGH PRIORITY)

#### 1.1 Stripe Integration Setup
**Goal:** Create 3-tier subscription system with proper billing

**Subscription Tiers:**
- **Starter** ($49/month): 2 connected sites, 4 articles/site/month
- **Pro** ($139/month): 5 connected sites, 10 articles/site/month  
- **Enterprise** (custom): Unlimited sites & articles

**Tasks:**
- [ ] Create Stripe products for 3 tiers
- [ ] Set up webhook handling for subscription events
- [ ] Create `user_plans` table schema
- [ ] Build subscription management UI in Settings

#### 1.2 Quota System Implementation
**Goal:** Enforce usage limits based on subscription tier

**Components:**
- `hasQuota(userId, siteId)` guard function
- Usage tracking for article generation
- Quota checks in Edge Functions
- Usage dashboard for users

**Database Schema Updates:**
```sql
-- New user_plans table
CREATE TABLE user_plans (
  id SERIAL PRIMARY KEY,
  user_token VARCHAR(255) REFERENCES login_users(token),
  tier VARCHAR(50) NOT NULL, -- 'starter', 'pro', 'enterprise'
  sites_allowed INTEGER DEFAULT 2,
  posts_allowed INTEGER DEFAULT 4,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage tracking table
CREATE TABLE usage_tracking (
  id SERIAL PRIMARY KEY,
  user_token VARCHAR(255) REFERENCES login_users(token),
  site_id INTEGER,
  resource_type VARCHAR(50), -- 'article', 'site'
  month_year VARCHAR(7), -- '2025-01'
  count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Phase 2: Enhanced Article Generation Pipeline (HIGH PRIORITY)

#### 2.1 Quality Gate System
**Goal:** Ensure high-quality content generation with automated checks

**Quality Checks:**
- ≥ 400 unique words minimum
- Readability score ≤ Grade 9 (Hemingway)
- Plagiarism detection < 5%
- EEAT checklist validation

**Implementation:**
- Quality gate before publishing
- Auto-save as draft if quality checks fail
- User notification system for failed checks

#### 2.2 Article Management System
**Goal:** Comprehensive article lifecycle management

**Enhanced Database Schema:**
```sql
-- Update articles table
ALTER TABLE articles 
ADD COLUMN site_id INTEGER REFERENCES websites(id),
ADD COLUMN slug VARCHAR(255),
ADD COLUMN status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'published', 'needs_review'
ADD COLUMN cms_id VARCHAR(255), -- External CMS ID
ADD COLUMN eeat_score INTEGER DEFAULT 0,
ADD COLUMN metrics_json JSONB DEFAULT '{}',
ADD COLUMN word_count INTEGER DEFAULT 0,
ADD COLUMN readability_score DECIMAL(3,1);

-- Article versions table
CREATE TABLE article_versions (
  id SERIAL PRIMARY KEY,
  article_id INTEGER REFERENCES articles(id),
  version_number INTEGER,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2.3 SEO Enhancement Features
**Goal:** Optimize articles for search engines

**Features:**
- Internal linking suggestions
- Schema.org Article markup
- BreadcrumbList schema
- Author information blocks
- Meta title/description optimization

### Phase 3: CMS Publishing Integration (MEDIUM PRIORITY)

#### 3.1 WordPress Adapter
**Goal:** Direct publishing to WordPress sites

**Features:**
- OAuth2 / App Password authentication
- WordPress REST API integration
- Draft/publish status management
- Category and tag assignment

**Database Schema:**
```sql
-- Sites table for CMS connections
CREATE TABLE sites (
  id SERIAL PRIMARY KEY,
  user_token VARCHAR(255) REFERENCES login_users(token),
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  cms_type VARCHAR(50) NOT NULL, -- 'wordpress', 'webflow'
  auth_json JSONB DEFAULT '{}',
  default_status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3.2 Webflow Adapter
**Goal:** Direct publishing to Webflow CMS

**Features:**
- OAuth2 authentication
- Webflow CMS API integration
- Collection management
- Item publishing workflow

### Phase 4: Additional Features (LOWER PRIORITY)

#### 4.1 Search Console Integration
**Goal:** Performance monitoring and optimization suggestions

**Features:**
- Google Search Console OAuth
- Daily performance data sync
- Low-performer identification
- Rewrite suggestions dashboard

#### 4.2 Free Site Audit Tool
**Goal:** Lead generation through value-first approach

**Features:**
- Public audit page (`/seo-audit`)
- Lighthouse API integration
- Content gap analysis
- PDF/HTML report generation

#### 4.3 Enhanced Onboarding
**Goal:** Smooth user experience from signup to first article

**Features:**
- Step-by-step wizard
- CMS connection setup
- First article generation
- Welcome call integration (Calendly)

## 🛠️ Technical Implementation

### Current Infrastructure (Supabase-based)
- **Authentication:** Supabase Auth with JWT
- **Database:** PostgreSQL with existing tables
- **Storage:** Supabase Storage for article versions
- **Edge Functions:** Serverless article generation
- **Frontend:** Next.js 14 with TypeScript

### New Components Required
- **Subscription Management:** Stripe integration
- **Quota System:** Usage tracking and limits
- **Quality Gates:** Content validation pipeline
- **CMS Adapters:** WordPress and Webflow publishing
- **Dashboard:** Usage analytics and management

## 📝 Development Notes

### TypeScript Interfaces
```typescript
interface Site {
  id: number;
  userId: string;
  name: string;
  domain: string;
  cmsType: 'wordpress' | 'webflow';
  authData: Record<string, any>;
  defaultStatus: 'draft' | 'published';
}

interface Article {
  id: number;
  siteId: number;
  title: string;
  content: string;
  slug: string;
  status: 'draft' | 'published' | 'needs_review';
  cmsId?: string;
  eeatScore: number;
  metrics: ArticleMetrics;
  wordCount: number;
  readabilityScore: number;
}

interface PublishAdapter {
  authenticate(credentials: any): Promise<boolean>;
  publish(article: Article): Promise<string>; // Returns CMS ID
  updateStatus(cmsId: string, status: string): Promise<boolean>;
}
```

### API Routes Structure
```
/api/subscription/
  - create-checkout-session
  - webhook
  - manage-subscription
  
/api/articles/
  - generate
  - publish
  - rollback
  - quality-check
  
/api/sites/
  - connect
  - disconnect
  - test-connection
```

This plan provides a clear roadmap for implementing the subscription system and enhanced article generation features while maintaining the existing SEO tag functionality.

## 📊 System Architecture Documentation

**IMPORTANT:** The comprehensive system architecture is maintained in `/architecture-diagram.md`. This Mermaid diagram shows all components, data flows, and integrations.

### Architecture Maintenance Rules

**CRITICAL: Mermaid Syntax Rules**
- **Node IDs**: Use only alphanumeric characters and underscores (A-Z, a-z, 0-9, _)
- **NO special characters** in node IDs: `/`, `-`, `.`, `(`, `)`, `[`, `]`, etc.
- **Labels**: Put actual names (with special chars) in square brackets after the ID
- **Example**: `API_ROUTE["api/subscription/create"]` NOT `API_ROUTE[api/subscription/create]`
- **Routes**: Use clean IDs like `SUB_CREATE` with labels like `["/api/subscription/create-checkout-session"]`

**When making major changes, UPDATE the architecture diagram:**

1. **New Components Added:**
   - Add new nodes to the appropriate subgraph
   - Connect with proper relationships
   - Update component details section

2. **Database Schema Changes:**
   - Update table nodes in database subgraph
   - Add/remove relationships as needed
   - Update schema documentation

3. **New API Routes/Edge Functions:**
   - Add to appropriate API subgraph
   - Connect to relevant database tables
   - Document functionality

4. **External Service Integration:**
   - Add new service nodes
   - Connect data flows
   - Update integration details

5. **Deployment Changes:**
   - Update deployment subgraph
   - Modify infrastructure components
   - Document new environment requirements

**Always update both:**
- The Mermaid diagram itself
- The component details section below it
- Any relevant data flow descriptions

**Key Changes to Always Document:**
- New database tables or major schema changes
- New API endpoints or Edge Functions
- External service integrations (Stripe, OpenAI, etc.)
- Authentication/authorization changes
- Major UI/UX component additions
- Deployment or infrastructure modifications

The architecture diagram serves as the single source of truth for system design and should be kept current with all development activities.