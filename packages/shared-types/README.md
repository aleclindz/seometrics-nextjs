# 🎯 @seoagent/shared-types

> Shared TypeScript types and interfaces for SEOAgent microservices architecture

This library provides type-safe interfaces and contracts between the SEOAgent microservices, ensuring consistency and reducing integration errors across the Platform API, Content Service, Technical SEO Service, and Chat Service.

## 📦 Installation

```bash
npm install @seoagent/shared-types
```

## 🚀 Usage

### Basic Import

```typescript
import { User, Website, Article, ApiResponse } from '@seoagent/shared-types'

// Use types in your service
interface UserService {
  getUser(token: string): Promise<ApiResponse<User>>
  getWebsites(userToken: string): Promise<ApiResponse<Website[]>>
}
```

### Namespace Imports for API Contracts

```typescript
import { PlatformAPI, ContentAPI, TechnicalSeoAPI } from '@seoagent/shared-types'

// Platform Service API types
async function createWebsite(
  request: PlatformAPI.CreateWebsiteRequest
): Promise<PlatformAPI.CreateWebsiteResponse> {
  // Implementation
}

// Content Service API types  
async function generateArticle(
  request: ContentAPI.GenerateArticleRequest
): Promise<ContentAPI.GenerateArticleResponse> {
  // Implementation
}
```

### Service Configuration Types

```typescript
import { PlatformServiceConfig, ContentServiceConfig } from '@seoagent/shared-types'

const platformConfig: PlatformServiceConfig = {
  service_name: 'platform-api',
  version: '1.0.0',
  port: 3001,
  environment: 'production',
  database: {
    supabase_url: process.env.SUPABASE_URL!,
    supabase_service_key: process.env.SUPABASE_SERVICE_KEY!,
    // ...
  },
  // ...
}
```

## 📁 Type Categories

### 🔐 Core Types
- **User Management**: `User`, `UserPlan`, `UsageTracking`
- **Website Management**: `Website`, `WebsiteWithMetrics`, `WebsiteStatus`
- **Authentication**: `UserSession`, `ServiceToken`

### ✍️ Content Types
- **Articles**: `Article`, `ArticleQueue`, `ArticleSettings`, `ArticleStatus`
- **CMS Integration**: `CMSConnection`, `CMSContentSchema`
- **Content Generation**: `ArticleGenerationRequest`, `LocalizedContent`

### 🔧 Technical SEO Types
- **GSC Integration**: `GSCConnection`, `GSCProperty`, `GSCPerformanceData`
- **SEO Auditing**: `SEOAudit`, `AuditIssue`, `TechnicalSEOFix`
- **Monitoring**: `URLInspection`, `RobotsAnalysis`, `SitemapSubmission`

### 🤖 Chat & AI Types
- **Chat System**: `ChatThread`, `ChatMessage`
- **AI Configuration**: `ChatServiceConfig`

### 🌐 API Contracts
- **Platform API**: `PlatformAPI.*` namespace
- **Content API**: `ContentAPI.*` namespace  
- **Technical SEO API**: `TechnicalSeoAPI.*` namespace
- **Chat API**: `ChatAPI.*` namespace

## 🎯 Service-Specific Usage

### Platform API Service

```typescript
import { 
  User, 
  UserPlan, 
  Website, 
  PlatformAPI,
  PlatformServiceConfig 
} from '@seoagent/shared-types'

// Use in route handlers
app.get('/users/:token', async (req, res) => {
  const response: PlatformAPI.GetUserProfileResponse = {
    success: true,
    data: {
      user: userData,
      plan: planData,
      usage: usageData
    }
  }
  res.json(response)
})
```

### Content Service

```typescript
import { 
  Article, 
  CMSConnection, 
  ContentAPI,
  ArticleGenerationRequest 
} from '@seoagent/shared-types'

class ArticleService {
  async generateArticle(
    request: ArticleGenerationRequest
  ): Promise<ContentAPI.GenerateArticleResponse> {
    // Implementation
  }
}
```

### Technical SEO Service

```typescript
import { 
  GSCConnection, 
  SEOAudit, 
  TechnicalSeoAPI,
  GSCPerformanceData 
} from '@seoagent/shared-types'

class GSCService {
  async getPerformanceData(
    request: TechnicalSeoAPI.GetGSCPerformanceRequest
  ): Promise<TechnicalSeoAPI.GetGSCPerformanceResponse> {
    // Implementation
  }
}
```

### Frontend/Client Usage

```typescript
import { ApiResponse, Website, Article } from '@seoagent/shared-types'

// Type-safe API calls
const websiteResponse: ApiResponse<Website[]> = await fetch('/api/websites')
  .then(res => res.json())

if (websiteResponse.success) {
  const websites = websiteResponse.data // TypeScript knows this is Website[]
}
```

## 🔄 Cross-Service Communication

The library provides type-safe interfaces for service-to-service communication:

```typescript
import { InternalAPI } from '@seoagent/shared-types'

// Validate user across services
async function validateUser(userToken: string): Promise<boolean> {
  const request: InternalAPI.UserValidationRequest = { user_token: userToken }
  const response: InternalAPI.UserValidationResponse = await platformApi.validateUser(request)
  return response.data?.valid ?? false
}

// Check quotas across services
async function checkQuota(userToken: string, resourceType: string): Promise<boolean> {
  const request: InternalAPI.QuotaCheckRequest = { 
    user_token: userToken, 
    resource_type: resourceType as any 
  }
  const response: InternalAPI.QuotaCheckResponse = await platformApi.checkQuota(request)
  return response.data?.allowed ?? false
}
```

## 📊 Database Schema Integration

The library includes database-specific types that match your actual schema:

```typescript
import { Database, DatabaseUser, DatabaseWebsite } from '@seoagent/shared-types'

// Supabase client with typed schema
const supabase = createClient<Database>(url, key)

// Type-safe database operations
const { data: users } = await supabase
  .from('login_users')
  .select('*')
  .returns<DatabaseUser[]>()
```

## 🛠 Development Workflow

### Building the Types Library

```bash
# Build TypeScript to JavaScript
npm run build

# Watch mode for development
npm run build:watch

# Type checking only
npm run typecheck
```

### Using in Development

For local development, you can link the package:

```bash
# In the shared-types directory
npm link

# In your service directory
npm link @seoagent/shared-types
```

## 📝 Contributing

When adding new types:

1. **Add the interface** to the appropriate file (`index.ts`, `api.ts`, `database.ts`, or `services.ts`)
2. **Update the exports** in `index.ts`
3. **Add JSDoc comments** for complex types
4. **Follow the naming conventions** (PascalCase for interfaces, camelCase for properties)
5. **Test the types** in the consuming services

### Type Organization

- `index.ts` - Main types and core business entities
- `api.ts` - API request/response types and service contracts  
- `database.ts` - Database schema and table types
- `services.ts` - Service configuration and infrastructure types

## 🔒 Type Safety Benefits

✅ **Compile-time error detection** - Catch API contract mismatches early  
✅ **IDE Autocomplete** - Better developer experience with IntelliSense  
✅ **Refactoring safety** - TypeScript will catch breaking changes across services  
✅ **Documentation** - Types serve as living documentation of your API contracts  
✅ **Consistency** - Ensures all services use the same data structures  

## 📚 Examples

See the `/examples` directory for complete usage examples:
- Platform API integration
- Content Service implementation  
- Technical SEO Service setup
- Cross-service communication patterns

---

**🚀 Ready to use in your SEOAgent microservices!**

This shared types library is the foundation for type-safe, maintainable microservices communication in the SEOAgent ecosystem.