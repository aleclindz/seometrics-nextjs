/**
 * API-specific types for service communication
 * These types define the contracts between microservices
 */

// Standard API response wrapper
export interface BaseApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp?: string
}

export interface PaginationMeta {
  total: number
  page: number
  per_page: number
  total_pages: number
  has_next_page: boolean
  has_prev_page: boolean
}

export interface PaginatedApiResponse<T> extends BaseApiResponse<T[]> {
  pagination: PaginationMeta
}

// Platform API Types
export namespace PlatformAPI {
  export interface GetUserProfileResponse extends BaseApiResponse<{
    user: User
    plan: UserPlan
    usage: UsageTracking[]
  }> {}

  export interface GetWebsitesResponse extends BaseApiResponse<Website[]> {}

  export interface CreateWebsiteRequest {
    domain: string
    language?: string
    enable_meta_tags?: boolean
    enable_image_tags?: boolean
  }

  export interface CreateWebsiteResponse extends BaseApiResponse<Website> {}

  export interface UpdateSubscriptionRequest {
    tier: 'starter' | 'pro' | 'enterprise'
    stripe_price_id: string
  }

  export interface GetUsageStatsResponse extends BaseApiResponse<{
    current_period: string
    usage_by_type: Record<string, number>
    limits: Record<string, number>
    percentage_used: Record<string, number>
  }> {}
}

// Content Service API Types
export namespace ContentAPI {
  export interface GenerateArticleRequest {
    topic: string
    keywords?: string[]
    website_id: number
    cms_connection_id?: number
    language?: string
    settings: ArticleSettings
  }

  export interface GenerateArticleResponse extends BaseApiResponse<{
    article_id: number
    status: ArticleStatus
    estimated_completion: string
  }> {}

  export interface GetArticlesResponse extends PaginatedApiResponse<Article> {}

  export interface PublishArticleRequest {
    article_id: number
    cms_connection_id: number
    publish_immediately?: boolean
    scheduled_for?: string
  }

  export interface PublishArticleResponse extends BaseApiResponse<{
    cms_article_id: string
    public_url?: string
    admin_url?: string
    status: ArticleStatus
  }> {}

  export interface GetCMSConnectionsResponse extends BaseApiResponse<CMSConnection[]> {}

  export interface CreateCMSConnectionRequest {
    cms_type: 'strapi' | 'wordpress' | 'webflow' | 'shopify' | 'ghost'
    connection_name: string
    base_url: string
    api_token: string
    website_id?: number
    content_type?: string
  }

  export interface TestCMSConnectionRequest {
    connection_id: number
  }

  export interface TestCMSConnectionResponse extends BaseApiResponse<{
    status: 'success' | 'failed'
    content_types?: string[]
    error_details?: string
  }> {}
}

// Technical SEO Service API Types
export namespace TechnicalSeoAPI {
  export interface StartGSCOAuthRequest {
    redirect_uri?: string
  }

  export interface StartGSCOAuthResponse extends BaseApiResponse<{
    auth_url: string
    state: string
  }> {}

  export interface GetGSCConnectionResponse extends BaseApiResponse<{
    connected: boolean
    connection?: {
      id: string
      email: string
      connected_at: string
      expires_at: string
      is_expired: boolean
      properties_count: number
    }
  }> {}

  export interface GetGSCPerformanceRequest {
    site_url: string
    start_date: string
    end_date: string
    dimensions?: Array<'query' | 'page' | 'country' | 'device'>
  }

  export interface GetGSCPerformanceResponse extends BaseApiResponse<{
    date_range: { start_date: string, end_date: string }
    total: GSCPerformanceMetrics
    top_queries: GSCQueryData[]
    top_pages: GSCPageData[]
    top_countries: GSCCountryData[]
    device_data: GSCDeviceData[]
    raw_row_count: number
  }> {}

  export interface StartAuditRequest {
    website_url: string
    audit_type?: 'full' | 'technical' | 'content' | 'performance'
    max_pages?: number
    crawl_depth?: number
  }

  export interface StartAuditResponse extends BaseApiResponse<{
    audit_id: string
    status: 'pending' | 'running'
    estimated_duration_minutes: number
  }> {}

  export interface GetAuditResponse extends BaseApiResponse<SEOAudit> {}

  export interface GetAuditIssuesResponse extends PaginatedApiResponse<AuditIssue> {}

  export interface SubmitSitemapRequest {
    site_url: string
    sitemap_url: string
  }

  export interface SubmitSitemapResponse extends BaseApiResponse<{
    submission_id: string
    status: 'submitted' | 'error'
    message?: string
  }> {}

  export interface GetTechnicalSEOSummaryResponse extends BaseApiResponse<{
    website_health_score: number
    critical_issues: number
    total_issues: number
    recent_fixes: TechnicalSEOFix[]
    gsc_data: GSCPerformanceMetrics
    last_audit: SEOAudit | null
  }> {}

  export interface GetActivitySummaryResponse extends BaseApiResponse<ActivitySummary[]> {}
}

// Chat Service API Types
export namespace ChatAPI {
  export interface CreateThreadRequest {
    title?: string
    website_context?: string
  }

  export interface CreateThreadResponse extends BaseApiResponse<ChatThread> {}

  export interface GetThreadsResponse extends PaginatedApiResponse<ChatThread> {}

  export interface SendMessageRequest {
    thread_id: string
    content: string
    metadata?: Record<string, any>
  }

  export interface SendMessageResponse extends BaseApiResponse<{
    user_message: ChatMessage
    ai_response: ChatMessage
  }> {}

  export interface GetMessagesResponse extends PaginatedApiResponse<ChatMessage> {}
}

// Service-to-Service Internal API Types
export namespace InternalAPI {
  export interface ServiceHealthResponse {
    status: 'healthy' | 'degraded' | 'unhealthy'
    version: string
    uptime_seconds: number
    checks: Array<{
      name: string
      status: 'pass' | 'fail'
      duration_ms: number
      message?: string
    }>
  }

  export interface ServiceMetricsResponse {
    requests_total: number
    requests_per_minute: number
    average_response_time_ms: number
    error_rate_percentage: number
    active_connections: number
  }

  export interface UserValidationRequest {
    user_token: string
    required_permissions?: string[]
  }

  export interface UserValidationResponse extends BaseApiResponse<{
    valid: boolean
    user: User
    permissions: string[]
  }> {}

  export interface QuotaCheckRequest {
    user_token: string
    resource_type: 'article' | 'audit' | 'gsc_query' | 'site'
    requested_count?: number
  }

  export interface QuotaCheckResponse extends BaseApiResponse<{
    allowed: boolean
    current_usage: number
    limit: number
    remaining: number
  }> {}
}

// Import statement helpers for services
import { 
  User, UserPlan, UsageTracking, Website, Article, ArticleSettings, ArticleStatus,
  CMSConnection, GSCPerformanceMetrics, GSCQueryData, GSCPageData, GSCCountryData, 
  GSCDeviceData, SEOAudit, AuditIssue, TechnicalSEOFix, ActivitySummary,
  ChatThread, ChatMessage
} from './index'