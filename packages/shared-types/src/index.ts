/**
 * 🎯 SEOAgent Shared Types Library
 * 
 * This library contains all shared TypeScript interfaces and types used across
 * the SEOAgent microservices architecture. It ensures type consistency between
 * the Platform API, Content Service, Technical SEO Service, and Chat Service.
 * 
 * @version 1.0.0
 * @author SEOAgent Development Team
 */

// ============================================================================
// 🔐 CORE USER & AUTHENTICATION TYPES
// ============================================================================

export interface User {
  id: number
  email: string
  token: string
  plan: number
  created_at: string
  updated_at: string
  auth_user_id: string | null
}

export interface UserPlan {
  id: number
  user_token: string
  tier: 'starter' | 'pro' | 'enterprise'
  sites_allowed: number
  posts_allowed: number
  stripe_customer_id?: string
  stripe_subscription_id?: string
  status: 'active' | 'cancelled' | 'past_due'
  created_at: string
  updated_at: string
}

export interface UsageTracking {
  id: number
  user_token: string
  site_id?: number
  resource_type: 'article' | 'site' | 'audit' | 'gsc_query'
  month_year: string // '2025-01' format
  count: number
  created_at: string
  updated_at: string
}

// ============================================================================
// 🌐 WEBSITE MANAGEMENT TYPES
// ============================================================================

export interface Website {
  id: number
  website_token: string
  user_token: string
  domain: string
  language: string
  enable_meta_tags: boolean
  enable_image_tags: boolean
  meta_tags: number
  image_tags: number
  is_managed: boolean
  is_excluded_from_sync: boolean
  created_at: string
  updated_at: string
}

export interface WebsiteWithMetrics extends Website {
  gscStatus: 'connected' | 'pending' | 'error' | 'none'
  cmsStatus: 'connected' | 'pending' | 'error' | 'none'  
  smartjsStatus: 'active' | 'inactive' | 'error'
  lastSync?: Date
  metrics?: GSCPerformanceMetrics
  lastAuditDate?: string
  auditScore?: number
  criticalIssues?: number
  metaTagsCount?: number
  altTagsCount?: number
}

export interface WebsiteSwitch {
  id: number
  user_token: string
  old_website_id?: number
  new_website_id: number
  old_domain?: string
  new_domain: string
  reason?: string
  created_at: string
}

// ============================================================================
// ✍️ CONTENT SERVICE TYPES
// ============================================================================

export interface Article {
  id: number
  user_token: string
  site_id?: number
  title: string
  content: string
  slug?: string
  status: string
  cms_id?: string
  language: string
  settings: ArticleSettings
  eeat_score: number
  metrics_json: Record<string, any>
  word_count: number
  readability_score?: number
  created_at: string
  updated_at: string
}

export interface ArticleSettings {
  language: string
  tone: number // 0: normal, 1: first-person, 2: first-person + anecdotes, 3: third-person
  humanize: boolean
  ghost: boolean
  faqs: boolean
  youtube: boolean
  tables: boolean
  keytakes: boolean
  bold: boolean
  blockquotes: boolean
  authority: boolean
  second_image: boolean
}

export type ArticleStatus = 
  | 'pending' 
  | 'generating' 
  | 'generated' 
  | 'publishing' 
  | 'published'
  | 'generation_failed' 
  | 'publishing_failed'

export interface ArticleQueue {
  id: number
  user_token: string
  website_id: number
  cms_connection_id?: number
  title?: string
  slug?: string
  target_keywords: string[]
  secondary_keywords: string[]
  content_outline: Record<string, any>
  article_content?: string
  meta_title?: string
  meta_description?: string
  featured_image_url?: string
  internal_links: Array<{url: string, anchor: string}>
  status: ArticleStatus
  scheduled_for?: string
  published_at?: string
  cms_article_id?: string
  cms_admin_url?: string
  public_url?: string
  error_message?: string
  retry_count: number
  generation_time_seconds?: number
  quality_score?: number
  word_count?: number
  readability_score?: number
  seo_score?: number
  created_at: string
  updated_at: string
}

export interface ArticleVersion {
  id: number
  article_id: number
  version_number: number
  content: string
  created_at: string
}

export interface ArticleGenerationRequest {
  topic: string
  searchkeyword?: string
  language: string
  settings: ArticleSettings
  website_id?: number
  cms_connection_id?: number
}

// ============================================================================
// 🔗 CMS INTEGRATION TYPES
// ============================================================================

export interface CMSConnection {
  id: number
  user_token: string
  website_id?: number
  cms_type: 'strapi' | 'wordpress' | 'webflow' | 'shopify' | 'ghost'
  connection_name: string
  base_url: string
  api_token?: string
  content_type: string
  auth_config: Record<string, any>
  status: 'active' | 'inactive' | 'error'
  last_sync_at?: string
  error_message?: string
  created_at: string
  updated_at: string
}

export interface CMSContentSchema {
  id: number
  connection_id: number
  content_type_name: string
  schema_data: Record<string, any>
  fields_config: Record<string, any>
  is_primary: boolean
  last_discovered_at: string
  created_at: string
  updated_at: string
}

// ============================================================================
// 🔧 TECHNICAL SEO SERVICE TYPES  
// ============================================================================

export interface GSCConnection {
  id: string // UUID
  user_token: string
  access_token: string // encrypted
  refresh_token: string // encrypted
  expires_at: string
  email: string
  scope: string
  is_active: boolean
  last_sync_at?: string
  sync_errors: Array<any>
  created_at: string
  updated_at: string
}

export interface GSCProperty {
  id: string // UUID
  connection_id: string
  user_token: string
  site_url: string
  permission_level: 'siteOwner' | 'siteFullUser' | 'siteRestrictedUser'
  is_verified: boolean
  is_active: boolean
  last_sync_at?: string
  performance_data: Record<string, any>
  created_at: string
  updated_at: string
}

export interface GSCPerformanceData {
  id: string // UUID
  property_id: string
  user_token: string
  date_start: string
  date_end: string
  total_clicks: number
  total_impressions: number
  avg_ctr: number
  avg_position: number
  queries: GSCQueryData[]
  pages: GSCPageData[]
  countries: GSCCountryData[]
  devices: GSCDeviceData[]
  created_at: string
}

export interface GSCQueryData {
  query: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface GSCPageData {
  page: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface GSCCountryData {
  country: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface GSCDeviceData {
  device: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface GSCPerformanceMetrics {
  clicks: number
  impressions: number
  ctr: number
  position: number
  dateStart?: string
  dateEnd?: string
}

export interface URLInspection {
  id: string // UUID
  user_token: string
  site_url: string
  inspected_url: string
  index_status: 'PASS' | 'FAIL' | 'PARTIAL'
  can_be_indexed: boolean
  google_canonical?: string
  user_canonical?: string
  sitemap?: string
  fetch_status: 'SUCCESS' | 'SOFT_404' | 'ACCESS_DENIED'
  last_crawl_time?: string
  robots_txt_state: 'ALLOWED' | 'DISALLOWED'
  mobile_usable: boolean
  mobile_usability_issues: number
  rich_results_items: number
  rich_results_valid: boolean
  amp_url?: string
  amp_status?: string
  inspection_data: Record<string, any>
  inspected_at: string
  created_at: string
  updated_at: string
}

export interface RobotsAnalysis {
  id: string // UUID
  user_token: string
  site_url: string
  exists: boolean
  accessible: boolean
  size: number
  content: string
  issues: Array<{type: string, message: string}>
  suggestions: Array<{type: string, message: string}>
  crawl_delay?: number
  sitemap_urls: string[]
  user_agents: string[]
  allowed_paths: string[]
  disallowed_paths: string[]
  analyzed_at: string
  created_at: string
  updated_at: string
}

export interface SitemapSubmission {
  id: string // UUID
  user_token: string
  site_url: string
  sitemap_url: string
  status: 'submitted' | 'processed' | 'error' | 'deleted'
  submission_method: 'api' | 'manual'
  warnings: number
  errors: number
  last_downloaded?: string
  is_pending: boolean
  is_sitemaps_index: boolean
  submitted_at: string
  deleted_at?: string
  created_at: string
  updated_at: string
}

export interface SEOAudit {
  id: string // UUID
  user_token: string
  website_id?: string
  website_url: string
  audit_type: 'full' | 'technical' | 'content' | 'performance'
  status: 'pending' | 'running' | 'completed' | 'failed'
  pages_crawled: number
  pages_total: number
  current_step?: string
  progress_percentage: number
  overall_score?: number
  total_issues: number
  critical_issues: number
  warning_issues: number
  info_issues: number
  user_agent: string
  crawl_depth: number
  max_pages: number
  error_message?: string
  error_details: Record<string, any>
  started_at?: string
  completed_at?: string
  duration_seconds?: number
  created_at: string
  updated_at: string
}

export interface AuditIssue {
  id: string // UUID
  audit_id: string
  user_token: string
  page_url: string
  issue_type: string
  severity: 'critical' | 'warning' | 'info'
  category: 'technical' | 'content' | 'performance' | 'accessibility'
  title: string
  description: string
  recommendation: string
  element_selector?: string
  element_content?: string
  expected_content?: string
  impact_score: number // 1-10
  fix_difficulty: 'easy' | 'medium' | 'hard'
  status: 'active' | 'fixed' | 'ignored'
  fixed_at?: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface TechnicalSEOFix {
  id: string // UUID
  user_token: string
  site_url: string
  fix_types: string[]
  results: Record<string, any>
  status: 'completed' | 'partial' | 'failed'
  fix_count: number
  duration_ms?: number
  applied_at: string
  created_at: string
}

export interface ActivitySummary {
  id: string // UUID
  user_token: string
  site_url: string
  activity_date: string
  technical_seo_fixes: number
  gsc_queries_processed: number
  sitemap_submissions: number
  robots_analysis_runs: number
  url_inspections: number
  schema_generations: number
  total_score_improvement: number
  summary_text?: string
  created_at: string
}

// ============================================================================
// 🤖 CHAT/AI SERVICE TYPES
// ============================================================================

export interface ChatThread {
  id: string // UUID
  user_token: string
  title: string
  website_context?: string
  last_message_at: string
  message_count: number
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string // UUID
  thread_id: string
  user_token: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: Record<string, any>
  created_at: string
}

// ============================================================================
// 🏷️ SEO TAGS SERVICE TYPES
// ============================================================================

export interface AltTag {
  id: number
  website_token: string
  image_url: string
  alt_text: string
  created_at: string
  updated_at: string
}

export interface MetaTag {
  id: number
  website_token: string
  page_url: string
  meta_title?: string
  meta_description?: string
  created_at: string
  updated_at: string
}

export interface Page {
  id: number
  website_token: string
  url: string
  meta_title?: string
  meta_description?: string
  processed: boolean
  created_at: string
}

export interface ImageData {
  id: number
  website_token: string
  url: string
  alt_tag?: string
  processed: boolean
  created_at: string
}

// ============================================================================
// 🔄 COMMON REQUEST/RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    total: number
    page: number
    per_page: number
    total_pages: number
  }
}

export interface MetaTagsRequest {
  content: string
  language: string
}

export interface MetaTagsResponse {
  meta_title: string
  meta_description: string
}

export interface ImageAltTextRequest {
  imageUrl: string
  language: string
}

export interface WebsiteStatus {
  gscConnected: boolean
  seoagentjsInstalled: boolean
  hasAuditScore: boolean
  criticalIssues: number
  mobileFriendly: number
  withSchema: number
  totalPages: number
}

// ============================================================================
// 🎯 SERVICE-SPECIFIC CONFIGURATION TYPES
// ============================================================================

export interface ServiceConfig {
  name: string
  version: string
  baseUrl: string
  apiKey: string
  timeout: number
  retries: number
}

export interface PlatformServiceConfig extends ServiceConfig {
  stripeSecretKey: string
  supabaseServiceKey: string
}

export interface ContentServiceConfig extends ServiceConfig {
  openaiApiKey: string
  cmsConnections: CMSConnection[]
}

export interface TechnicalSeoServiceConfig extends ServiceConfig {
  googleClientId: string
  googleClientSecret: string
  lighthouseApiKey?: string
}

export interface ChatServiceConfig extends ServiceConfig {
  openaiApiKey: string
  maxTokens: number
  temperature: number
}

// ============================================================================
// 📊 ANALYTICS & MONITORING TYPES
// ============================================================================

export interface ServiceMetrics {
  service_name: string
  endpoint: string
  method: string
  status_code: number
  response_time_ms: number
  timestamp: string
  user_token?: string
  error_message?: string
}

export interface UsageStatistics {
  user_token: string
  period: string // '2025-01'
  articles_generated: number
  sites_managed: number
  gsc_queries: number
  audit_runs: number
  api_calls: number
  storage_used_mb: number
}

// ============================================================================
// 🌍 INTERNATIONALIZATION TYPES  
// ============================================================================

export interface Language {
  code: string
  name: string
  country_code: string
}

export interface LocalizedContent {
  language: string
  title: string
  content: string
  meta_title?: string
  meta_description?: string
}

// ============================================================================
// 🔒 AUTHENTICATION TYPES
// ============================================================================

export interface ServiceToken {
  service: string
  scope: string[]
  expires_at: number
  issued_at: number
}

export interface UserSession {
  user_token: string
  email: string
  plan: string
  permissions: string[]
  expires_at: number
}

// ============================================================================
// 📝 VALIDATION TYPES
// ============================================================================

export interface ValidationError {
  field: string
  code: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

// ============================================================================
// 🚀 EXPORT ALL TYPES
// ============================================================================

export * from './database'
export * from './api'
export * from './services'

// Note: TypeScript interfaces cannot be exported as runtime values
// All types are available via named exports above