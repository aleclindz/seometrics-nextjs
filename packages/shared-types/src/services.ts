/**
 * Service-specific configuration and utility types
 * These types are used for service initialization and configuration
 */

// Base service configuration
export interface BaseServiceConfig {
  service_name: string
  version: string
  port: number
  environment: 'development' | 'staging' | 'production'
  log_level: 'debug' | 'info' | 'warn' | 'error'
  cors_origins: string[]
  rate_limit: {
    window_ms: number
    max_requests: number
  }
}

// Database configuration shared across services
export interface DatabaseConfig {
  supabase_url: string
  supabase_service_key: string
  connection_pool_size: number
  query_timeout_ms: number
  ssl_mode: boolean
}

// Authentication configuration
export interface AuthConfig {
  jwt_secret: string
  jwt_expires_in: string
  service_token_secret: string
  allowed_services: string[]
}

// Platform Service specific configuration
export interface PlatformServiceConfig extends BaseServiceConfig {
  database: DatabaseConfig
  auth: AuthConfig
  stripe: {
    secret_key: string
    webhook_secret: string
    price_ids: {
      starter_monthly: string
      pro_monthly: string
      enterprise_monthly: string
    }
  }
  external_apis: {
    sendgrid_api_key?: string
    analytics_api_key?: string
  }
}

// Content Service specific configuration
export interface ContentServiceConfig extends BaseServiceConfig {
  database: DatabaseConfig
  auth: AuthConfig
  openai: {
    api_key: string
    model: string
    max_tokens: number
    temperature: number
    timeout_ms: number
  }
  cms_integrations: {
    strapi: {
      timeout_ms: number
      retry_attempts: number
    }
    wordpress: {
      timeout_ms: number
      retry_attempts: number
    }
    webflow: {
      timeout_ms: number
      retry_attempts: number
    }
    shopify: {
      timeout_ms: number
      retry_attempts: number
    }
    ghost: {
      timeout_ms: number
      retry_attempts: number
    }
  }
  image_generation: {
    dalle_model: string
    max_images_per_article: number
    default_image_size: string
  }
}

// Technical SEO Service specific configuration
export interface TechnicalSeoServiceConfig extends BaseServiceConfig {
  database: DatabaseConfig
  auth: AuthConfig
  google: {
    client_id: string
    client_secret: string
    redirect_uri: string
    scopes: string[]
  }
  crawling: {
    user_agent: string
    max_concurrent_requests: number
    request_timeout_ms: number
    crawl_delay_ms: number
    max_pages_per_audit: number
  }
  lighthouse: {
    api_key?: string
    timeout_ms: number
    performance_threshold: number
    seo_threshold: number
  }
}

// Chat Service specific configuration
export interface ChatServiceConfig extends BaseServiceConfig {
  database: DatabaseConfig
  auth: AuthConfig
  openai: {
    api_key: string
    model: string
    max_tokens: number
    temperature: number
    system_prompt: string
  }
  context: {
    max_messages_history: number
    website_data_cache_ttl_minutes: number
    seo_data_cache_ttl_minutes: number
  }
}

// Service health check interface
export interface ServiceHealthCheck {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  duration_ms: number
  message?: string
  last_checked: string
}

export interface ServiceStatus {
  service: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  version: string
  uptime_seconds: number
  checks: ServiceHealthCheck[]
  dependencies: Array<{
    service: string
    status: 'healthy' | 'degraded' | 'unhealthy'
    response_time_ms: number
  }>
}

// Service discovery and communication
export interface ServiceEndpoint {
  service_name: string
  base_url: string
  health_check_path: string
  api_version: string
  authentication_required: boolean
}

export interface ServiceRegistry {
  platform_api: ServiceEndpoint
  content_api: ServiceEndpoint
  technical_seo_api: ServiceEndpoint
  chat_api: ServiceEndpoint
}

// Error handling and logging
export interface ServiceError {
  code: string
  message: string
  service: string
  endpoint?: string
  timestamp: string
  user_token?: string
  correlation_id?: string
  stack_trace?: string
}

export interface ServiceLog {
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  service: string
  timestamp: string
  metadata?: Record<string, any>
  correlation_id?: string
  user_token?: string
}

// Monitoring and metrics
export interface ServiceMetrics {
  service: string
  timestamp: string
  requests_total: number
  requests_per_minute: number
  average_response_time_ms: number
  p95_response_time_ms: number
  error_count: number
  error_rate_percentage: number
  cpu_usage_percentage: number
  memory_usage_mb: number
  active_connections: number
  database_connections: number
}

// Queue and background job types (for future implementation)
export interface BackgroundJob {
  id: string
  type: string
  payload: Record<string, any>
  priority: number
  attempts: number
  max_attempts: number
  scheduled_for: string
  created_at: string
  updated_at: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message?: string
}

export interface JobQueue {
  name: string
  max_concurrency: number
  retry_delay_ms: number
  max_retries: number
  dead_letter_queue: boolean
}

// Service initialization helpers
export type ServiceType = 'platform' | 'content' | 'technical-seo' | 'chat'

export interface ServiceBootstrap {
  config: BaseServiceConfig
  database?: DatabaseConfig
  auth?: AuthConfig
  health_checks: Array<() => Promise<ServiceHealthCheck>>
  startup_tasks: Array<() => Promise<void>>
  shutdown_tasks: Array<() => Promise<void>>
}

// API client interfaces for cross-service communication
export interface ServiceApiClient {
  baseUrl: string
  timeout: number
  retries: number
  headers: Record<string, string>
  
  get<T>(endpoint: string, params?: Record<string, any>): Promise<T>
  post<T>(endpoint: string, data?: any): Promise<T>
  put<T>(endpoint: string, data?: any): Promise<T>
  delete<T>(endpoint: string): Promise<T>
}

export interface PlatformApiClient extends ServiceApiClient {
  users: {
    getProfile(userToken: string): Promise<any>
    validateToken(userToken: string): Promise<any>
    checkQuota(userToken: string, resourceType: string): Promise<any>
  }
  websites: {
    getByUser(userToken: string): Promise<any>
    getById(websiteId: string): Promise<any>
    create(data: any): Promise<any>
    update(websiteId: string, data: any): Promise<any>
  }
  subscriptions: {
    getByUser(userToken: string): Promise<any>
    updateUsage(userToken: string, usage: any): Promise<any>
  }
}

export interface ContentApiClient extends ServiceApiClient {
  articles: {
    generate(data: any): Promise<any>
    getByUser(userToken: string): Promise<any>
    getById(articleId: string): Promise<any>
    publish(articleId: string, data: any): Promise<any>
  }
  cms: {
    getConnections(userToken: string): Promise<any>
    testConnection(connectionId: string): Promise<any>
    createConnection(data: any): Promise<any>
  }
}

export interface TechnicalSeoApiClient extends ServiceApiClient {
  gsc: {
    getConnection(userToken: string): Promise<any>
    startOAuth(userToken: string): Promise<any>
    getPerformance(data: any): Promise<any>
    submitSitemap(data: any): Promise<any>
  }
  audits: {
    start(data: any): Promise<any>
    getById(auditId: string): Promise<any>
    getIssues(auditId: string): Promise<any>
  }
  monitoring: {
    getSummary(userToken: string, siteUrl: string): Promise<any>
    getActivity(userToken: string, siteUrl: string): Promise<any>
  }
}

export interface ChatApiClient extends ServiceApiClient {
  threads: {
    create(data: any): Promise<any>
    getByUser(userToken: string): Promise<any>
    getById(threadId: string): Promise<any>
  }
  messages: {
    send(threadId: string, content: string): Promise<any>
    getByThread(threadId: string): Promise<any>
  }
}