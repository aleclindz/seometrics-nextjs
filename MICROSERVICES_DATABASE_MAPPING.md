# 🗄️ SEOAgent Database Schema Mapping for Microservices

This document maps the current database schema to the proposed microservice architecture, ensuring clean service boundaries and data ownership.

## 🎯 Service-to-Database Mapping Strategy

### **🏢 Platform API Service**
**Responsibility**: User management, authentication, billing, website management
**Data Ownership**: Core business entities

#### **Primary Tables** (Owned)
- `login_users` - Core user authentication and profiles
- `user_plans` - Subscription tiers and billing information  
- `usage_tracking` - Quota enforcement and usage monitoring
- `websites` - Website registry and management
- `website_switches` - Website switching/management history

#### **Shared/Reference Tables** (Read Access)
- None (Platform API is the source of truth for user data)

---

### **✍️ Content Service** 
**Responsibility**: Article generation, CMS integration, content management
**Data Ownership**: Content creation and publishing workflow

#### **Primary Tables** (Owned)
- `articles` - Generated articles and metadata
- `article_versions` - Article version control
- `article_queue` - Article generation pipeline with status tracking
- `article_images` - Generated images for articles (DALL-E integration)  
- `article_generation_logs` - Debug and monitoring logs
- `cms_connections` - CMS platform integrations
- `cms_content_schemas` - Dynamic CMS field mappings

#### **Shared/Reference Tables** (Read Access)
- `login_users` - User authentication (read user_token)
- `websites` - Website validation (read website data)
- `user_plans` - Quota enforcement (read limits)
- `usage_tracking` - Update usage counters

---

### **🔧 Technical SEO Service**
**Responsibility**: GSC integration, SEO audits, technical monitoring
**Data Ownership**: SEO analysis and technical optimization

#### **Primary Tables** (Owned)
- `gsc_connections` - Google Search Console OAuth tokens
- `gsc_properties` - Verified GSC properties  
- `gsc_performance_data` - Historical GSC performance metrics
- `url_inspections` - GSC URL Inspection API results
- `robots_analyses` - robots.txt analysis results
- `sitemap_submissions` - Sitemap submission tracking
- `technical_seo_fixes` - Automated SEO fixes applied
- `schema_generations` - Schema markup generation tracking
- `seo_audits` - Audit runs and overall results
- `audit_issues` - Individual SEO problems found
- `audit_pages` - Crawled pages during audits
- `activity_summaries` - SEO activity aggregation

#### **Shared/Reference Tables** (Read Access)
- `login_users` - User authentication (read user_token)
- `websites` - Website validation (read website data)
- `user_plans` - Feature access validation

---

### **🤖 Chat/AI Service**
**Responsibility**: AI chat interface, conversation management
**Data Ownership**: Chat conversations and AI interactions

#### **Primary Tables** (Owned)
- `chat_threads` - Chat conversation threads
- `chat_messages` - Individual chat messages
- `chat_contexts` - Context for AI responses (if exists)

#### **Shared/Reference Tables** (Read Access)  
- `login_users` - User authentication (read user_token)
- `websites` - Website context for chat
- `articles` - Content context for discussions
- `gsc_performance_data` - SEO data for recommendations

---

### **🏷️ SEO Tags Service** (Utility)
**Responsibility**: Meta tags and alt-text generation
**Data Ownership**: Generated SEO tags and optimization

#### **Primary Tables** (Owned)
- `alt_tags` - Generated alt-text for images
- `meta_tags` - Generated meta titles and descriptions  
- `pages` - Page data for meta tag processing
- `images` - Image data for alt-text processing

#### **Shared/Reference Tables** (Read Access)
- `login_users` - User authentication (read user_token)  
- `websites` - Website validation (read website data)

---

## 🔗 Cross-Service Data Access Patterns

### **Service-to-Service API Calls**
```typescript
// Content Service → Platform API Service
async function validateUserWebsite(userToken: string, websiteId: string) {
  const response = await platformApi.get(`/users/${userToken}/websites/${websiteId}`)
  return response.data.hasAccess
}

// Technical SEO Service → Platform API Service  
async function checkFeatureAccess(userToken: string, feature: string) {
  const response = await platformApi.get(`/users/${userToken}/features/${feature}`)
  return response.data.hasAccess
}

// Chat Service → Content Service
async function getUserArticles(userToken: string) {
  const response = await contentApi.get(`/users/${userToken}/articles`)
  return response.data.articles
}
```

### **Database Access Patterns**

#### **Direct Database Access** (Same Service)
```sql
-- Content Service accessing its own tables
SELECT * FROM articles WHERE user_token = $1;
SELECT * FROM cms_connections WHERE user_token = $1;
```

#### **Cross-Service Data** (Via API)
```typescript
// Instead of direct DB access across services:
// ❌ const users = await supabase.from('login_users').select()

// ✅ Use service API:
const users = await platformApi.getUserProfile(userToken)
```

---

## 🔄 Data Migration Strategy

### **Phase 1: Schema Preparation**
1. **Add Service Identifiers**: Tag tables with owning service
2. **Create Service Views**: Limit cross-service data access
3. **RLS Policy Updates**: Enforce service boundaries

### **Phase 2: Service-Specific Schemas** 
```sql
-- Example: Content Service schema
CREATE SCHEMA content_service;

-- Move content-related tables
ALTER TABLE articles SET SCHEMA content_service;
ALTER TABLE article_versions SET SCHEMA content_service; 
ALTER TABLE cms_connections SET SCHEMA content_service;

-- Create cross-service views
CREATE VIEW content_service.user_profiles AS 
SELECT token, email, plan FROM public.login_users;
```

### **Phase 3: API Boundaries**
- **Service APIs**: Each service exposes only its data
- **Authentication**: Service-to-service tokens
- **Rate Limiting**: Prevent service abuse

---

## 🛡️ Security & Access Control

### **Row Level Security (RLS)**
- **Maintained per service**: Each service enforces its own RLS
- **Service roles**: Use dedicated service role keys
- **API authentication**: JWT tokens for cross-service calls

### **Service Authentication Matrix**

| Service | Platform API | Content API | Technical SEO API | Chat API |
|---------|-------------|-------------|------------------|----------|
| Platform API | ✅ Full | 🔑 Service Token | 🔑 Service Token | 🔑 Service Token |
| Content API | 📖 Read Users/Websites | ✅ Full | ❌ No Access | 📖 Read Articles |
| Technical SEO API | 📖 Read Users/Websites | ❌ No Access | ✅ Full | 📖 Read SEO Data |
| Chat API | 📖 Read Users | 📖 Read Articles | 📖 Read SEO Data | ✅ Full |

**Legend**: ✅ Full Access | 📖 Read Only | 🔑 Service Token Required | ❌ No Access

---

## 📊 Performance Considerations

### **Database Connection Pooling**
```typescript
// Per-service connection pools
const platformDb = createSupabaseClient(PLATFORM_DB_URL, PLATFORM_SERVICE_KEY)
const contentDb = createSupabaseClient(CONTENT_DB_URL, CONTENT_SERVICE_KEY) 
const seoDb = createSupabaseClient(SEO_DB_URL, SEO_SERVICE_KEY)
```

### **Caching Strategy**
- **User data**: Platform API caches user profiles (5 min TTL)
- **Website data**: Cached across services (10 min TTL)  
- **SEO data**: Technical SEO service caches GSC data (1 hour TTL)
- **Content**: Content service caches article metadata (15 min TTL)

### **Query Optimization**
```sql
-- Service-specific indexes
CREATE INDEX idx_articles_user_token ON articles(user_token);
CREATE INDEX idx_gsc_connections_user_token ON gsc_connections(user_token);
CREATE INDEX idx_chat_threads_user_token ON chat_threads(user_token);
```

---

## 🚀 Implementation Roadmap

### **Week 1: Schema Analysis & Planning**
- ✅ Complete database mapping
- ✅ Define service boundaries  
- ✅ Plan cross-service APIs

### **Week 2: Service Extraction Preparation**
- 📋 Create shared types library
- 📋 Define API contracts
- 📋 Setup service authentication

### **Week 3-4: Service Implementation**
- 📋 Extract Content Service (least coupled)
- 📋 Extract Technical SEO Service  
- 📋 Create Platform API Service
- 📋 Update frontend API clients

### **Week 5: Testing & Optimization**  
- 📋 Cross-service integration testing
- 📋 Performance optimization
- 📋 Documentation and team training

This database mapping ensures clean service boundaries while maintaining data consistency and enabling independent service development and deployment.