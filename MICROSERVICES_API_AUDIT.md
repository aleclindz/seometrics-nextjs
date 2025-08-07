# 🔍 SEOAgent API Audit for Microservices Architecture

This document provides a comprehensive audit of all current API endpoints and their proposed service allocation for the microservices architecture.

## 📊 Current API Inventory (47 Endpoints)

### **🏢 Platform API Service** (12 endpoints)
**Core user management, authentication, billing, and website management**

| Endpoint | Method | Current Function | Dependencies |
|----------|--------|------------------|-------------|
| `/api/auth/get-token` | GET | Get user authentication token | Supabase Auth |
| `/api/subscription/create-checkout-session` | POST | Create Stripe checkout | Stripe API, `user_plans` table |
| `/api/subscription/webhook` | POST | Handle Stripe webhooks | Stripe API, `user_plans` table |
| `/api/subscription/manage` | GET | Get subscription data | `user_plans`, `usage_tracking` tables |
| `/api/websites` | GET/POST | Manage user websites | `websites` table, GSC properties |
| `/api/websites/[websiteToken]/stats` | GET | Website statistics | `alt_tags_generated`, `meta_tags_generated` |
| `/api/websites/switch-info` | GET | Website switching info | `website_switches` table |
| `/api/websites/record-switch` | POST | Record website switch | `website_switches` table |
| `/api/admin/migrate-websites` | POST | Admin website migration | Multiple admin tables |
| `/api/admin/fix-plan-limits` | POST | Fix user plan limits | `user_plans` table |
| `/api/admin/check-schema` | GET | Database schema validation | All tables |
| `/api/admin/check-token-type` | GET | Check token type | Auth validation |

### **✍️ Content Service** (8 endpoints)
**Article generation, CMS integration, and content management**

| Endpoint | Method | Current Function | Dependencies |
|----------|--------|------------------|-------------|
| `/api/articles` | GET/POST | Manage articles | `articles`, `article_versions` tables |
| `/api/articles/generate` | POST | Generate articles with OpenAI | OpenAI API, `articles` table |
| `/api/articles/publish` | POST | Publish to CMS platforms | CMS APIs, `cms_connections` |
| `/api/cms/connections` | GET/POST | Manage CMS connections | `cms_connections` table |
| `/api/cms/connections/[id]` | DELETE | Delete CMS connection | `cms_connections` table |
| `/api/cms/oauth/start` | POST | Start CMS OAuth flow | CMS OAuth APIs |
| `/api/cms/oauth/callback/[type]` | GET | Handle CMS OAuth callback | CMS OAuth APIs, `cms_connections` |
| `/api/cms/test-connection` | POST | Test CMS connection | CMS APIs, `cms_connections` |

### **🔧 Technical SEO Service** (17 endpoints)  
**SEO analysis, GSC integration, audits, and technical optimizations**

| Endpoint | Method | Current Function | Dependencies |
|----------|--------|------------------|-------------|
| `/api/gsc/connection` | GET/DELETE | Manage GSC connections | `gsc_connections` table |
| `/api/gsc/oauth/start` | GET | Start GSC OAuth | Google OAuth API |
| `/api/gsc/oauth/callback` | GET | Handle GSC OAuth callback | Google OAuth, `gsc_connections` |
| `/api/gsc/oauth/refresh` | POST | Refresh GSC tokens | Google OAuth, `gsc_connections` |
| `/api/gsc/performance` | POST | Fetch GSC performance data | Google Search Console API |
| `/api/gsc/properties` | GET | Get GSC properties | Google Search Console API |
| `/api/gsc/sync` | POST | Sync GSC data | Google Search Console API |
| `/api/gsc/sitemap` | POST | Submit sitemaps to GSC | Google Search Console API |
| `/api/gsc/url-inspection` | POST | GSC URL inspection | Google Search Console API |
| `/api/audits` | GET | List website audits | `audits` table |
| `/api/audits/[auditId]` | GET | Get specific audit | `audits` table |
| `/api/audits/start` | POST | Start website audit | `audits` table, audit engine |
| `/api/technical-seo/summary` | GET | Technical SEO overview | Multiple SEO tables |
| `/api/technical-seo/activity-summary` | GET | SEO activity summary | `activity_summaries` table |
| `/api/technical-seo/ai-fix-suggestions` | POST | AI-powered SEO fix suggestions | OpenAI API |
| `/api/technical-seo/auto-fix` | POST | Apply automated SEO fixes | SEO automation |
| `/api/technical-seo/robots-analysis` | POST | Robots.txt analysis | `robots_analyses` table |
| `/api/technical-seo/generate-sitemap` | POST | Generate XML sitemaps | Sitemap generation |

### **🤖 Chat/AI Service** (4 endpoints)
**AI chat interface and thread management**

| Endpoint | Method | Current Function | Dependencies |
|----------|--------|------------------|-------------|
| `/api/chat/threads` | GET/POST | Manage chat threads | `chat_threads` table |
| `/api/chat/messages` | GET/POST | Manage chat messages | `chat_messages` table |
| `/api/chat/sites` | GET | Get user sites for chat | `websites` table, GSC data |
| `/api/chat/ai-response` | POST | Generate AI responses | OpenAI API |

### **🛠 Utility/Debug Endpoints** (6 endpoints)
**Development and debugging utilities**

| Endpoint | Method | Current Function | Dependencies |
|----------|--------|------------------|-------------|
| `/api/smartjs/check` | GET | Check SEOAgent.js installation | Website scraping |
| `/api/cron/gsc-sync` | POST | Cron job for GSC sync | GSC APIs, database |
| `/api/debug/tables` | GET | Debug database tables | Database inspection |
| `/api/debug/env` | GET | Debug environment variables | Environment inspection |
| `/api/debug/gsc-data` | GET | Debug GSC data | GSC connections |
| `/api/debug/gsc-test` | POST | Test GSC functionality | GSC APIs |
| `/api/debug/url-inspections` | GET | Debug URL inspections | GSC URL inspection data |

## 🎯 Service Allocation Strategy

### **Recommended Service Boundaries**

#### **1. Platform API Service** → `platform-api/`
**Core business logic and user management**
- Authentication and user tokens
- Subscription management and billing
- Website management and switching
- Admin operations and utilities
- **Database Schema**: `login_users`, `user_plans`, `usage_tracking`, `websites`, `website_switches`

#### **2. Content Service** → `content-api/`
**Content generation and CMS integration**
- Article generation and management
- CMS platform integrations
- Content publishing workflows
- **Database Schema**: `articles`, `article_versions`, `cms_connections`

#### **3. Technical SEO Service** → `seo-api/`
**SEO analysis and Google Search Console integration**
- GSC OAuth and data fetching
- Website audits and technical SEO
- Sitemap generation and submission
- SEO automation and fixes
- **Database Schema**: `gsc_connections`, `gsc_properties`, `gsc_performance_data`, `audits`, `robots_analyses`, `sitemap_submissions`, `activity_summaries`

#### **4. Chat/AI Service** → `chat-api/` 
**AI-powered chat interface**
- Chat thread and message management
- AI response generation
- Site data integration for chat context
- **Database Schema**: `chat_threads`, `chat_messages`

## 🔗 Inter-Service Dependencies

### **Platform API → Other Services**
- **Provides**: User authentication tokens, subscription limits, website ownership validation
- **Consumed by**: All other services for auth validation and quota enforcement

### **Content Service Dependencies**
- **Platform API**: User auth, website ownership validation, usage tracking
- **Technical SEO Service**: Website performance data for content optimization

### **Technical SEO Service Dependencies**
- **Platform API**: User auth, website ownership validation
- **Content Service**: May trigger content updates based on SEO recommendations

### **Chat Service Dependencies**
- **Platform API**: User auth, website list
- **Content Service**: Article data for chat context
- **Technical SEO Service**: SEO data for chat recommendations

## 🚀 Migration Strategy

### **Phase 1: Service Extraction Order**
1. **Content Service** (least coupled, highest development velocity)
2. **Technical SEO Service** (complex but well-bounded domain)
3. **Chat Service** (specialized AI functionality)
4. **Platform API** (core dependency, migrate last)

### **Phase 2: API Gateway Pattern**
```typescript
// Frontend API client structure
const apiClient = {
  platform: new PlatformApiClient(PLATFORM_API_URL),
  content: new ContentApiClient(CONTENT_API_URL),
  seo: new TechnicalSeoApiClient(SEO_API_URL),
  chat: new ChatApiClient(CHAT_API_URL)
}
```

### **Phase 3: Service-to-Service Communication**
- **Internal API calls** with service tokens
- **Shared event system** for cross-service updates
- **Database consistency** via API-first approach

## 📈 Benefits Analysis

### **Development Velocity**
- **3x Parallel Teams**: Frontend+Platform, Content, Technical SEO
- **Independent Release Cycles**: Ship SEO features without waiting for Content
- **Domain Expertise**: Teams become specialists in their service

### **Scalability**
- **Independent Scaling**: Scale Content service during high article generation
- **Resource Optimization**: Different compute requirements per service
- **Fault Isolation**: Service failures don't cascade

### **Operational Benefits**
- **Clear Ownership**: Each team owns their service end-to-end
- **Simplified Debugging**: Issues isolated to specific services
- **Technology Flexibility**: Use best tools for each domain

## 🎯 Next Steps

1. **Database Schema Mapping** → Map current tables to service domains
2. **Shared Types Library** → Extract common TypeScript interfaces
3. **Service Contracts** → Define API contracts between services
4. **Content Service Extraction** → Start with least coupled service
5. **Frontend Refactoring** → Update API clients for service communication

This audit provides the foundation for implementing the microservices architecture that will enable parallel development with multiple Claude Code instances while maintaining code quality and system reliability.