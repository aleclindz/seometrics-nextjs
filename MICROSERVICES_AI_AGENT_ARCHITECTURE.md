# 🤖 AI Agent Architecture in SEOAgent Microservices

This document details how the AI Agent system integrates within the SEOAgent microservices architecture, including data flows, function calling, and cross-service orchestration.

## 🎯 AI Agent Overview

The AI Agent is an intelligent SEO assistant that orchestrates actions across multiple microservices through OpenAI's function calling capabilities. It serves as the intelligent automation layer that connects user intent with service execution.

### **Current AI Agent Implementation**
- **Location**: `/src/services/chat/openai-function-client.ts`
- **Model**: GPT-4 with function calling
- **Functions**: 13 specialized SEO tools
- **Integration**: Direct API calls to platform services

## 🏗️ AI Agent in Microservices Architecture

### **Service Placement: Chat Service**
```
Chat Service (Port 3004)
├── AI Agent Controller
├── Function Execution Engine  
├── Cross-Service Orchestration
├── Context Management
└── Response Generation
```

The AI Agent will be the core component of the **Chat Service**, serving as the intelligent orchestrator that:
1. **Receives** user requests through chat interface
2. **Analyzes** intent and determines required actions
3. **Orchestrates** function calls across multiple services
4. **Aggregates** responses and generates intelligent summaries

## 🔧 Function Architecture & Cross-Service Integration

### **Function Categories & Service Mapping**

#### **🏢 Platform Integration Functions** → Platform API Service
```typescript
// Authentication & User Management
connect_gsc()        → POST /gsc/oauth/start
list_sites()         → GET /users/:token/websites  
add_site()          → POST /websites
get_site_status()   → GET /websites/:id + aggregated data
```

#### **✍️ Content Generation Functions** → Content Service  
```typescript
// Article & Content Management
generate_article()           → POST /articles/generate
analyze_content_gaps()       → POST /content/gap-analysis
optimize_page_content()      → POST /content/optimize
connect_cms()               → POST /cms-connections
```

#### **🔧 Technical SEO Functions** → Technical SEO Service
```typescript
// SEO Monitoring & Analysis
sync_gsc_data()             → POST /gsc/performance
get_site_performance()      → GET /gsc/:token/metrics
audit_site()               → POST /audits/start
generate_seo_report()       → POST /audits/:id/summary
check_smartjs_status()      → GET /monitoring/smartjs-status
```

## 🌐 Smart.js Integration Architecture

### **Smart.js System Overview**
Smart.js (seoagent.js) is a client-side SEO automation script that performs real-time optimization:

```javascript
// Core Smart.js Functions
processMetaTags()        // AI-generated meta titles & descriptions
processImages()          // AI-generated alt tags for images
processSchemaMarkup()    // Structured data injection
processCanonicalTags()   // Canonical URL optimization
processOpenGraphTags()   // Social sharing optimization
```

### **Smart.js Data Flow**
```
Website Page Load
       ↓
Smart.js Script Execution
       ↓
Supabase Edge Functions
       ↓
OpenAI API (GPT-4)
       ↓
Real-time DOM Updates
```

### **Smart.js in Microservices Context**

#### **Service Integration Points**
1. **Technical SEO Service**: Manages Smart.js installation status
2. **Content Service**: Provides AI-generated content for meta tags
3. **Platform Service**: Handles website token validation (idv)

#### **Smart.js API Endpoints** (Technical SEO Service)
```typescript
// Smart.js Management APIs
GET    /smartjs/:userToken/status     // Installation status across sites
POST   /smartjs/install              // Generate installation code
PUT    /smartjs/:siteId/config       // Update Smart.js settings
GET    /smartjs/:siteId/analytics     // Performance metrics
POST   /smartjs/validate             // Validate script functionality
```

## 🔄 AI Agent Function Call Flow

### **Orchestrated Function Execution**
```typescript
// Example: Site Audit with Cross-Service Data
async function auditSite(args: { site_url: string }) {
  // 1. Validate user and get website data (Platform API)
  const website = await platformAPI.getWebsite(site_url, user_token)
  
  // 2. Get GSC performance data (Technical SEO API) 
  const gscData = await seoAPI.getPerformanceData(site_url, user_token)
  
  // 3. Check Smart.js status (Technical SEO API)
  const smartjsStatus = await seoAPI.getSmartJSStatus(site_url)
  
  // 4. Get recent articles (Content API)
  const articles = await contentAPI.getRecentArticles(website.id, user_token)
  
  // 5. Aggregate and analyze
  const auditResults = this.generateComprehensiveAudit({
    website, gscData, smartjsStatus, articles
  })
  
  return { success: true, data: auditResults }
}
```

### **Context Gathering System**
The AI Agent maintains rich context by aggregating data from all services:

```typescript
interface ChatContext {
  user: {
    token: string
    plan: UserPlan
    websites: Website[]
  }
  selected_site?: {
    website: Website
    gsc_data: GSCPerformanceMetrics
    smartjs_status: SmartJSStatus
    recent_articles: Article[]
    audit_summary: SEOAuditSummary
  }
  conversation_history: ChatMessage[]
}
```

## 🔑 AI Agent Service APIs

### **Chat Service Internal APIs**

#### **Function Execution Endpoint**
```typescript
POST /ai/execute-function
Request: {
  function_name: string
  arguments: Record<string, any>
  user_token: string
  context: ChatContext
}
Response: {
  success: boolean
  data: any
  execution_time_ms: number
  services_called: string[]
}
```

#### **Context Aggregation Endpoint**
```typescript
GET /ai/context/:userToken
Query: {
  website_id?: number
  include_gsc?: boolean
  include_articles?: boolean
  include_audit_data?: boolean
}
Response: {
  success: boolean
  data: ChatContext
}
```

## 🚀 AI Agent Enhancement Opportunities

### **Intelligent Automation Features**
1. **Proactive Monitoring**: Automatically detect and report SEO issues
2. **Smart Recommendations**: ML-driven optimization suggestions  
3. **Workflow Automation**: Chain multiple functions for complex tasks
4. **Performance Forecasting**: Predict SEO impact of changes

### **Advanced Function Capabilities**
```typescript
// Future AI Agent Functions
auto_fix_technical_issues()     // Automated technical SEO fixes
schedule_content_campaign()     // Multi-article content planning
competitor_analysis()          // Automated competitive research
performance_forecasting()      // Predict SEO impact
bulk_optimize_pages()         // Mass page optimization
```

## 🔄 Smart.js Enhancement Roadmap

### **Phase 1: Enhanced Monitoring** (Weeks 1-2)
- Real-time performance tracking
- Enhanced error reporting and diagnostics
- Advanced installation validation

### **Phase 2: Intelligent Optimization** (Weeks 3-4)
- Machine learning-driven content optimization
- Dynamic schema markup generation
- Advanced image optimization

### **Phase 3: Automation Integration** (Weeks 5-6)
- Integration with AI Agent for automated fixes
- Cross-page optimization coordination
- Performance-based optimization adjustments

## 🎯 Implementation Priority

### **High Priority AI Agent Functions**
1. **audit_site()** - Comprehensive SEO auditing
2. **check_smartjs_status()** - Smart.js monitoring  
3. **get_site_performance()** - GSC data analysis
4. **generate_article()** - Content creation

### **Smart.js Core Features**
1. **Meta tag automation** - Title/description optimization
2. **Alt tag generation** - Image accessibility 
3. **Schema markup** - Structured data injection
4. **Performance monitoring** - Real-time optimization tracking

## 📊 Monitoring & Analytics

### **AI Agent Metrics**
- Function execution success rates
- Cross-service response times
- User satisfaction scores
- Automation effectiveness

### **Smart.js Performance Metrics**
- Script load times and performance
- Optimization success rates
- DOM modification impact
- SEO improvement metrics

This architecture ensures the AI Agent and Smart.js systems work seamlessly within the microservices ecosystem, providing intelligent automation and real-time optimization across all SEO functions.