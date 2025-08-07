# 🔗 SEOAgent Microservices API Contracts & Service Boundaries

This document defines the precise API contracts and service boundaries for the SEOAgent microservices architecture. Each service has clearly defined responsibilities and communicates through well-defined APIs.

## 🏢 Platform API Service

**Base URL**: `https://platform-api.seoagent.com`  
**Responsibility**: User management, authentication, billing, website management  
**Port**: `3001`

### Authentication Endpoints

#### `GET /auth/validate`
Validate user token across services
```typescript
Request: { user_token: string }
Response: {
  success: boolean
  data: {
    valid: boolean
    user: User
    permissions: string[]
  }
}
```

#### `POST /auth/service-token`
Generate service-to-service authentication token
```typescript
Request: { 
  service: string
  scope: string[]
}
Response: {
  success: boolean
  data: {
    token: string
    expires_at: number
  }
}
```

### User Management Endpoints

#### `GET /users/:userToken/profile`
Get complete user profile
```typescript
Response: {
  success: boolean
  data: {
    user: User
    plan: UserPlan
    usage_current_period: UsageTracking[]
  }
}
```

#### `GET /users/:userToken/quota/:resourceType`
Check quota for specific resource
```typescript
Response: {
  success: boolean
  data: {
    allowed: boolean
    current_usage: number
    limit: number
    remaining: number
    reset_date: string
  }
}
```

#### `POST /users/:userToken/quota/:resourceType`
Update usage count for resource
```typescript
Request: {
  count: number
  metadata?: Record<string, any>
}
Response: {
  success: boolean
  data: {
    updated_usage: number
    remaining: number
  }
}
```

### Website Management Endpoints

#### `GET /users/:userToken/websites`
Get user's websites
```typescript
Response: {
  success: boolean
  data: Website[]
}
```

#### `GET /websites/:websiteId`
Get website by ID (cross-service access)
```typescript
Response: {
  success: boolean
  data: {
    website: Website
    owner_token: string
    permissions: string[]
  }
}
```

#### `POST /websites`
Create new website
```typescript
Request: {
  user_token: string
  domain: string
  language?: string
  enable_meta_tags?: boolean
  enable_image_tags?: boolean
}
Response: {
  success: boolean
  data: Website
}
```

#### `PUT /websites/:websiteId/management`
Update website management status
```typescript
Request: {
  is_managed: boolean
  is_excluded_from_sync?: boolean
}
Response: {
  success: boolean
  data: Website
}
```

### Subscription Management Endpoints

#### `GET /users/:userToken/subscription`
Get subscription details
```typescript
Response: {
  success: boolean
  data: {
    plan: UserPlan
    usage_stats: Record<string, number>
    limits: Record<string, number>
    billing_info: {
      next_billing_date: string
      amount: number
      currency: string
    }
  }
}
```

#### `POST /subscriptions/checkout-session`
Create Stripe checkout session
```typescript
Request: {
  user_token: string
  price_id: string
  success_url: string
  cancel_url: string
}
Response: {
  success: boolean
  data: {
    checkout_url: string
    session_id: string
  }
}
```

#### `POST /subscriptions/webhook`
Handle Stripe webhook events
```typescript
Request: StripeWebhookEvent
Response: { received: boolean }
```

---

## ✍️ Content Service

**Base URL**: `https://content-api.seoagent.com`  
**Responsibility**: Article generation, CMS integration, content management  
**Port**: `3002`

### Article Generation Endpoints

#### `POST /articles/generate`
Generate article with OpenAI
```typescript
Request: {
  user_token: string
  topic: string
  keywords?: string[]
  website_id: number
  cms_connection_id?: number
  language?: string
  settings: ArticleSettings
}
Response: {
  success: boolean
  data: {
    article_id: number
    queue_id: number
    status: ArticleStatus
    estimated_completion_minutes: number
  }
}
```

#### `GET /articles/:articleId`
Get article by ID
```typescript
Response: {
  success: boolean
  data: {
    article: Article
    versions: ArticleVersion[]
    generation_logs: Array<{
      step: string
      status: string
      duration_seconds: number
      created_at: string
    }>
  }
}
```

#### `GET /users/:userToken/articles`
Get user's articles with pagination
```typescript
Query: {
  page?: number
  per_page?: number
  status?: ArticleStatus
  website_id?: number
  sort?: 'created_at' | 'updated_at' | 'title'
  order?: 'asc' | 'desc'
}
Response: {
  success: boolean
  data: Article[]
  pagination: PaginationMeta
}
```

#### `GET /articles/queue/:queueId/status`
Get generation status
```typescript
Response: {
  success: boolean
  data: {
    status: ArticleStatus
    progress_percentage: number
    current_step: string
    error_message?: string
    estimated_remaining_minutes?: number
  }
}
```

### Article Publishing Endpoints

#### `POST /articles/:articleId/publish`
Publish article to CMS
```typescript
Request: {
  cms_connection_id: number
  publish_immediately?: boolean
  scheduled_for?: string
  additional_settings?: Record<string, any>
}
Response: {
  success: boolean
  data: {
    cms_article_id: string
    public_url?: string
    admin_url?: string
    status: ArticleStatus
    published_at?: string
  }
}
```

#### `PUT /articles/:articleId/content`
Update article content
```typescript
Request: {
  title?: string
  content?: string
  meta_title?: string
  meta_description?: string
  settings?: Partial<ArticleSettings>
}
Response: {
  success: boolean
  data: {
    article: Article
    version_number: number
  }
}
```

### CMS Integration Endpoints

#### `GET /users/:userToken/cms-connections`
Get CMS connections
```typescript
Response: {
  success: boolean
  data: CMSConnection[]
}
```

#### `POST /cms-connections`
Create CMS connection
```typescript
Request: {
  user_token: string
  cms_type: 'strapi' | 'wordpress' | 'webflow' | 'shopify' | 'ghost'
  connection_name: string
  base_url: string
  api_token: string
  website_id?: number
  content_type?: string
}
Response: {
  success: boolean
  data: CMSConnection
}
```

#### `POST /cms-connections/:connectionId/test`
Test CMS connection
```typescript
Response: {
  success: boolean
  data: {
    status: 'success' | 'failed'
    content_types?: string[]
    error_details?: string
    response_time_ms: number
  }
}
```

#### `GET /cms-connections/:connectionId/content-types`
Discover CMS content types
```typescript
Response: {
  success: boolean
  data: {
    content_types: CMSContentSchema[]
    default_type: string
  }
}
```

### OAuth & Integration Endpoints

#### `POST /cms/oauth/:cmsType/start`
Start CMS OAuth flow
```typescript
Request: {
  user_token: string
  website_id?: number
  redirect_uri: string
}
Response: {
  success: boolean
  data: {
    auth_url: string
    state: string
  }
}
```

#### `GET /cms/oauth/:cmsType/callback`
Handle CMS OAuth callback
```typescript
Query: {
  code: string
  state: string
}
Response: {
  success: boolean
  data: CMSConnection
}
```

---

## 🔧 Technical SEO Service

**Base URL**: `https://seo-api.seoagent.com`  
**Responsibility**: GSC integration, SEO audits, technical monitoring  
**Port**: `3003`

### Google Search Console Endpoints

#### `GET /gsc/connection/:userToken`
Get GSC connection status
```typescript
Response: {
  success: boolean
  data: {
    connected: boolean
    connection?: {
      id: string
      email: string
      connected_at: string
      expires_at: string
      is_expired: boolean
      properties_count: number
      last_sync_at?: string
    }
  }
}
```

#### `POST /gsc/oauth/start`
Start GSC OAuth flow
```typescript
Request: {
  user_token: string
  redirect_uri?: string
}
Response: {
  success: boolean
  data: {
    auth_url: string
    state: string
  }
}
```

#### `GET /gsc/oauth/callback`
Handle GSC OAuth callback
```typescript
Query: {
  code: string
  state: string
}
Response: {
  success: boolean
  data: {
    connection_id: string
    email: string
    properties: GSCProperty[]
  }
}
```

#### `DELETE /gsc/connection/:userToken`
Disconnect GSC
```typescript
Response: {
  success: boolean
  data: { disconnected: boolean }
}
```

#### `POST /gsc/oauth/refresh`
Refresh GSC tokens
```typescript
Request: {
  user_token: string
}
Response: {
  success: boolean
  data: {
    connection_id: string
    expires_at: string
  }
}
```

### GSC Data Endpoints

#### `GET /gsc/:userToken/properties`
Get verified GSC properties
```typescript
Response: {
  success: boolean
  data: GSCProperty[]
}
```

#### `POST /gsc/performance`
Fetch GSC performance data
```typescript
Request: {
  user_token: string
  site_url: string
  start_date: string
  end_date: string
  dimensions?: Array<'query' | 'page' | 'country' | 'device'>
  filters?: Array<{
    dimension: string
    operator: 'equals' | 'contains' | 'notEquals'
    expression: string
  }>
  row_limit?: number
}
Response: {
  success: boolean
  data: {
    date_range: { start_date: string, end_date: string }
    total: GSCPerformanceMetrics
    top_queries: GSCQueryData[]
    top_pages: GSCPageData[]
    top_countries: GSCCountryData[]
    device_data: GSCDeviceData[]
    raw_row_count: number
  }
}
```

#### `POST /gsc/sitemap/submit`
Submit sitemap to GSC
```typescript
Request: {
  user_token: string
  site_url: string
  sitemap_url: string
}
Response: {
  success: boolean
  data: {
    submission_id: string
    status: 'submitted' | 'error'
    message?: string
  }
}
```

#### `POST /gsc/url-inspection`
Inspect URL via GSC
```typescript
Request: {
  user_token: string
  site_url: string
  inspected_url: string
}
Response: {
  success: boolean
  data: URLInspection
}
```

### SEO Audit Endpoints

#### `POST /audits/start`
Start SEO audit
```typescript
Request: {
  user_token: string
  website_url: string
  audit_type?: 'full' | 'technical' | 'content' | 'performance'
  max_pages?: number
  crawl_depth?: number
  user_agent?: string
}
Response: {
  success: boolean
  data: {
    audit_id: string
    status: 'pending' | 'running'
    estimated_duration_minutes: number
  }
}
```

#### `GET /audits/:auditId`
Get audit details
```typescript
Response: {
  success: boolean
  data: {
    audit: SEOAudit
    progress: {
      current_step: string
      pages_crawled: number
      pages_remaining: number
      percentage_complete: number
    }
  }
}
```

#### `GET /audits/:auditId/issues`
Get audit issues with pagination
```typescript
Query: {
  page?: number
  per_page?: number
  severity?: 'critical' | 'warning' | 'info'
  category?: 'technical' | 'content' | 'performance' | 'accessibility'
  status?: 'active' | 'fixed' | 'ignored'
}
Response: {
  success: boolean
  data: AuditIssue[]
  pagination: PaginationMeta
}
```

#### `GET /audits/:auditId/summary`
Get audit summary
```typescript
Response: {
  success: boolean
  data: {
    overall_score: number
    issues_by_severity: {
      critical: number
      warning: number
      info: number
    }
    issues_by_category: {
      technical: number
      content: number
      performance: number
      accessibility: number
    }
    top_issues: AuditIssue[]
    pages_with_issues: number
    recommendations: string[]
  }
}
```

### Technical SEO Monitoring

#### `GET /monitoring/:userToken/summary`
Get technical SEO summary
```typescript
Query: {
  site_url: string
  days?: number
}
Response: {
  success: boolean
  data: {
    website_health_score: number
    critical_issues: number
    total_issues: number
    recent_fixes: TechnicalSEOFix[]
    gsc_data?: GSCPerformanceMetrics
    last_audit?: SEOAudit
    robots_status: 'healthy' | 'issues' | 'not_found'
    sitemap_status: 'submitted' | 'pending' | 'error'
    schema_markup_count: number
  }
}
```

#### `GET /monitoring/:userToken/activity`
Get SEO activity summary
```typescript
Query: {
  site_url: string
  days?: number
}
Response: {
  success: boolean
  data: ActivitySummary[]
}
```

#### `POST /monitoring/auto-fix`
Apply automated SEO fixes
```typescript
Request: {
  user_token: string
  site_url: string
  fix_types: string[]
  dry_run?: boolean
}
Response: {
  success: boolean
  data: TechnicalSEOFix
}
```

### Robots.txt & Sitemap Management

#### `POST /robots/analyze`
Analyze robots.txt
```typescript
Request: {
  user_token: string
  site_url: string
}
Response: {
  success: boolean
  data: RobotsAnalysis
}
```

#### `POST /sitemaps/generate`
Generate XML sitemap
```typescript
Request: {
  user_token: string
  website_url: string
  max_urls?: number
  include_images?: boolean
  change_frequency?: string
  priority?: number
}
Response: {
  success: boolean
  data: {
    sitemap_url: string
    url_count: number
    file_size_bytes: number
    generated_at: string
  }
}
```

---

## 🤖 Chat Service

**Base URL**: `https://chat-api.seoagent.com`  
**Responsibility**: AI chat interface, conversation management  
**Port**: `3004`

### Chat Thread Management

#### `POST /threads`
Create new chat thread
```typescript
Request: {
  user_token: string
  title?: string
  website_context?: string
}
Response: {
  success: boolean
  data: ChatThread
}
```

#### `GET /users/:userToken/threads`
Get user's chat threads
```typescript
Query: {
  page?: number
  per_page?: number
  sort?: 'created_at' | 'last_message_at'
  order?: 'asc' | 'desc'
}
Response: {
  success: boolean
  data: ChatThread[]
  pagination: PaginationMeta
}
```

#### `GET /threads/:threadId`
Get thread details
```typescript
Response: {
  success: boolean
  data: {
    thread: ChatThread
    message_count: number
    last_messages: ChatMessage[]
  }
}
```

#### `PUT /threads/:threadId`
Update thread
```typescript
Request: {
  title?: string
  website_context?: string
}
Response: {
  success: boolean
  data: ChatThread
}
```

#### `DELETE /threads/:threadId`
Delete thread
```typescript
Response: {
  success: boolean
  data: { deleted: boolean }
}
```

### Message Management

#### `POST /threads/:threadId/messages`
Send message to thread
```typescript
Request: {
  user_token: string
  content: string
  metadata?: Record<string, any>
}
Response: {
  success: boolean
  data: {
    user_message: ChatMessage
    ai_response: ChatMessage
    response_time_ms: number
  }
}
```

#### `GET /threads/:threadId/messages`
Get thread messages
```typescript
Query: {
  page?: number
  per_page?: number
  since?: string  // ISO timestamp
  before?: string // ISO timestamp
}
Response: {
  success: boolean
  data: ChatMessage[]
  pagination: PaginationMeta
}
```

### Context & Integration

#### `GET /context/sites/:userToken`
Get sites for chat context
```typescript
Response: {
  success: boolean
  data: Array<{
    website: Website
    recent_articles?: Article[]
    seo_summary?: {
      health_score: number
      critical_issues: number
      recent_activity: string[]
    }
  }>
}
```

#### `POST /ai/response`
Generate AI response (internal)
```typescript
Request: {
  thread_id: string
  user_message: string
  context: {
    website_data?: Website[]
    seo_data?: any[]
    article_data?: Article[]
  }
}
Response: {
  success: boolean
  data: {
    response: string
    sources?: string[]
    confidence_score: number
  }
}
```

---

## 🔒 Cross-Service Security

### Service-to-Service Authentication

All services use JWT tokens for cross-service communication:

```typescript
// Service token structure
interface ServiceToken {
  service: string        // 'platform-api', 'content-api', etc.
  scope: string[]       // ['read:users', 'write:usage']
  iat: number           // Issued at
  exp: number           // Expires at
  iss: string           // 'platform-api'
}

// Request headers
headers: {
  'Authorization': 'Bearer <service_token>',
  'X-Service-Name': 'content-api',
  'X-Correlation-ID': '<uuid>'
}
```

### Rate Limiting

Each service implements rate limiting:
- **Public APIs**: 1000 requests/hour per user
- **Service APIs**: 10000 requests/hour per service
- **Internal APIs**: Unlimited

### Error Handling

Standardized error response format:
```typescript
interface ErrorResponse {
  success: false
  error: {
    code: string          // 'INVALID_TOKEN', 'QUOTA_EXCEEDED'
    message: string       // Human-readable message
    details?: any         // Additional error context
  }
  timestamp: string
  correlation_id?: string
}
```

## 🚀 Service Discovery

Services register with a central registry:

```typescript
interface ServiceRegistry {
  services: {
    'platform-api': {
      base_url: 'https://platform-api.seoagent.com'
      health_check: '/health'
      version: '1.0.0'
      status: 'healthy' | 'degraded' | 'unhealthy'
    }
    'content-api': {
      base_url: 'https://content-api.seoagent.com'
      health_check: '/health'
      version: '1.0.0'
      status: 'healthy' | 'degraded' | 'unhealthy'
    }
    // ... other services
  }
}
```

## 📊 Health Checks

Each service exposes health check endpoints:

#### `GET /health`
Service health status
```typescript
Response: {
  status: 'healthy' | 'degraded' | 'unhealthy'
  version: string
  uptime_seconds: number
  checks: Array<{
    name: string         // 'database', 'external_api'
    status: 'pass' | 'fail'
    duration_ms: number
    message?: string
  }>
  dependencies: Array<{
    service: string
    status: 'healthy' | 'degraded' | 'unhealthy'
    response_time_ms: number
  }>
}
```

This comprehensive API contract ensures type-safe, reliable communication between all SEOAgent microservices while maintaining clear service boundaries and responsibilities.