# System Architecture

## Overview

SEOAgent.com is built on a modern, scalable architecture using Next.js 14, TypeScript, and Supabase. The system follows a three-pillar approach to automated SEO: Technical SEO Analyst, Content Writer, and SEO Strategist.

## 🏗️ High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Next.js)     │◄──►│   (API Routes)  │◄──►│   (Supabase)    │
│                 │    │                 │    │                 │
│ • React         │    │ • Next.js API   │    │ • PostgreSQL    │
│ • TypeScript    │    │ • Server Actions │    │ • Row Level     │
│ • Tailwind CSS  │    │ • Edge Functions │    │   Security      │
│ • Client State  │    │ • Webhooks      │    │ • Real-time     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────►│  External APIs  │◄─────────────┘
                        │                 │
                        │ • Google GSC    │
                        │ • Stripe        │
                        │ • OpenAI        │
                        │ • CMS APIs      │
                        └─────────────────┘
```

## 🔧 Technology Stack

### Frontend Technologies
- **Next.js 14**: App Router, Server Components, Client Components
- **React 18**: Hooks, Context API, Suspense boundaries
- **TypeScript**: Full type safety and developer experience
- **Tailwind CSS**: Utility-first styling with custom design system
- **Supabase Client**: Real-time database connections and auth

### Backend Technologies
- **Next.js API Routes**: RESTful API endpoints
- **Server Actions**: Form handling and server-side mutations
- **Edge Functions**: Geographically distributed API processing
- **Webhook Handlers**: External service integrations

### Database & Infrastructure
- **Supabase**: PostgreSQL with real-time subscriptions
- **Row Level Security**: User-based data isolation
- **Connection Pooling**: Efficient database connection management
- **Automated Backups**: Point-in-time recovery capabilities

### External Integrations
- **Google Search Console API**: Website performance data
- **Stripe API**: Subscription and payment processing
- **OpenAI API**: Content generation and AI assistance
- **Multi-CMS APIs**: Content publishing automation

---

## 🎯 Three-Pillar Architecture

### Pillar 1: Technical SEO Analyst
**Purpose**: Automated technical SEO monitoring and fixes

#### Components
- **GSC Data Sync**: [`/api/gsc/sync`](api-reference.md#gsc-sync)
- **Website Crawler**: Automated site analysis
- **Issue Detection**: Technical SEO problem identification
- **Auto-Fix Engine**: Automated resolution workflows

#### Data Flow
```
GSC API → Performance Data → Issue Detection → Auto-Fix → User Notification
```

### Pillar 2: Content Writer  
**Purpose**: AI-powered content generation and multi-CMS publishing

#### Components
- **AI Content Generator**: [`/api/articles/generate`](api-reference.md#generate-article)
- **CMS Connectors**: Multi-platform publishing
- **Content Optimizer**: SEO-focused content enhancement
- **Publishing Pipeline**: Automated content deployment

#### Data Flow
```
User Input → AI Generation → SEO Optimization → CMS Publishing → URL Tracking
```

### Pillar 3: SEO Strategist
**Purpose**: Keyword research and competitive analysis (in development)

#### Planned Components
- **Keyword Research Engine**: SERP.dev API integration
- **Competitor Analysis**: Automated competitive intelligence
- **Strategy Generator**: Personalized SEO roadmaps
- **Performance Forecasting**: ROI predictions

---

## 🔐 Authentication & Security

### Authentication Flow
```
User Login → Supabase Auth → JWT Token → User Context → API Access
```

#### Components
- **AuthProvider**: [`/src/contexts/auth.tsx`](api-reference.md#auth-provider)
- **useAuth Hook**: Authentication state management
- **Protected Routes**: Route-level access control
- **Token Management**: Secure token storage and refresh

#### Security Features
- **Row Level Security**: Database-level user isolation
- **JWT Token Validation**: API endpoint protection
- **OAuth Integration**: Secure third-party connections
- **Data Encryption**: Sensitive data protection at rest

### User Session Management
- **30-minute timeout**: Automatic session expiration
- **Static session handling**: No reactive listeners (prevents focus issues)
- **Inline token fetching**: Avoids circular dependencies
- **Single useEffect**: Runs once to prevent infinite loops

---

## 📊 Data Architecture

### Database Design Principles
- **User-Centric**: All data belongs to authenticated users
- **Scalable**: Designed for millions of websites and articles
- **Secure**: RLS policies protect user data
- **Performant**: Optimized indexes and query patterns

### Key Relationships
```sql
login_users (1) → (n) websites
login_users (1) → (1) user_plans  
login_users (1) → (n) articles
websites (1) → (n) articles
cms_connections (1) → (n) articles
```

### Data Flow Patterns
1. **Authentication**: User → login_users table
2. **Website Management**: GSC sync → websites table
3. **Content Generation**: AI → articles table → CMS publishing
4. **Usage Tracking**: Actions → usage_tracking table
5. **Plan Enforcement**: usage_tracking + user_plans → feature gates

---

## 🖥️ Frontend Architecture

### Component Structure
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── dashboard/         # Main application routes
│   └── api/              # API route handlers
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components
│   ├── forms/            # Form components
│   └── features/         # Feature-specific components
├── contexts/             # React Context providers
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
└── types/                # TypeScript type definitions
```

### State Management Strategy
- **React Context**: Global auth and user state
- **useState/useEffect**: Local component state
- **Server State**: Supabase real-time subscriptions
- **Form State**: React Hook Form for complex forms

### Component Patterns
- **Server Components**: Static content and initial data loading
- **Client Components**: Interactive features and state management
- **Compound Components**: Complex UI patterns with multiple parts
- **Feature Gates**: Plan-based component rendering

---

## 🚀 API Architecture

### API Design Principles
- **RESTful**: Standard HTTP methods and status codes
- **User-Scoped**: All operations filtered by user token
- **Type-Safe**: Full TypeScript integration
- **Error Handling**: Consistent error response patterns

### Route Organization
```
/api/
├── auth/                 # Authentication endpoints
├── websites/            # Website management
├── articles/            # Content generation
├── cms/                 # CMS integrations
├── gsc/                 # Google Search Console
├── subscription/        # Stripe integration
└── debug/              # SEO analysis tools
```

### Authentication Pattern
```typescript
// Standard API authentication
const userToken = request.nextUrl.searchParams.get('userToken');
const user = await getUserByToken(userToken);
if (!user) return Response.json({error: 'Unauthorized'}, {status: 401});
```

### Error Handling Pattern
```typescript
// Consistent error responses
return Response.json({
  success: false,
  error: "Error description",
  code: "ERROR_CODE",
  details: {}
}, {status: 400});
```

---

## 🔌 External Integrations

### Google Search Console
**Purpose**: Website performance data and property management

#### OAuth Flow
```
User → OAuth Start → Google Consent → Callback → Token Storage → API Access
```

#### Data Sync Process
1. **Property Discovery**: Fetch user's GSC properties
2. **Permission Validation**: Verify user access levels
3. **Website Creation**: Add new properties to database
4. **Performance Sync**: Cache performance data locally
5. **Real-time Updates**: Ongoing data synchronization

### Stripe Integration
**Purpose**: Subscription management and payment processing

#### Webhook Processing
```
Stripe Event → Webhook Validation → Database Update → User Notification
```

#### Supported Events
- `customer.subscription.created`: New subscription activation
- `customer.subscription.updated`: Plan changes and renewals
- `customer.subscription.deleted`: Cancellation processing
- `invoice.payment_succeeded`: Successful payment confirmation
- `invoice.payment_failed`: Payment failure handling

### Multi-CMS Publishing
**Purpose**: Automated content publishing across platforms

#### CMS Abstraction Layer
```typescript
interface CMSConnector {
  authenticate(): Promise<void>;
  publishArticle(article: Article): Promise<PublishResult>;
  testConnection(): Promise<ConnectionStatus>;
}
```

#### Supported Platforms
- **Strapi**: REST API with token authentication
- **WordPress**: REST API with application passwords
- **Webflow**: CMS API with OAuth
- **Shopify**: Admin API with private app credentials
- **Ghost**: Admin API with key authentication

---

## 📈 Performance Optimizations

### Frontend Performance
- **Server-Side Rendering**: Fast initial page loads
- **Static Generation**: Pre-built pages where possible
- **Code Splitting**: Lazy loading of feature components
- **Image Optimization**: Next.js automatic image handling
- **Caching**: Aggressive caching of static assets

### Database Performance
- **Indexing Strategy**: Optimized indexes for common queries
- **Connection Pooling**: Efficient database connection reuse
- **Query Optimization**: Minimal database round trips
- **Real-time Subscriptions**: Selective data synchronization

### API Performance
- **Edge Deployment**: Geographically distributed API processing
- **Response Caching**: Redis-based response caching
- **Rate Limiting**: Prevents abuse and ensures fair usage
- **Compression**: Gzip compression for all responses

---

## 🔄 Development Workflow

### Code Organization
- **Feature-Based Structure**: Components organized by functionality
- **Shared Utilities**: Common functions in `/lib` directory
- **Type Safety**: Comprehensive TypeScript coverage
- **API Contracts**: Shared types between frontend and backend

### Quality Assurance
- **ESLint**: Code quality and consistency
- **Prettier**: Automated code formatting
- **TypeScript**: Compile-time error detection
- **Testing**: Unit tests for critical functions

### Deployment Pipeline
- **Vercel Integration**: Automated deployments from Git
- **Preview Deployments**: Branch-based preview environments
- **Environment Management**: Separate staging and production configs
- **Database Migrations**: Automated schema updates

---

## 🚦 Monitoring & Observability

### Error Tracking
- **Client-Side**: Browser error monitoring
- **Server-Side**: API error logging
- **Database**: Query performance monitoring
- **External APIs**: Integration failure tracking

### Performance Monitoring
- **Core Web Vitals**: Frontend performance metrics
- **API Response Times**: Backend performance tracking
- **Database Queries**: Query performance analysis
- **User Analytics**: Feature usage and engagement

### Alerting
- **Uptime Monitoring**: Service availability alerts
- **Error Rate Thresholds**: Automated incident detection
- **Performance Degradation**: Response time alerts
- **Business Metrics**: Subscription and usage monitoring

---

## 🔮 Future Architecture Considerations

### Scalability Plans
- **Microservices**: Breaking down monolithic API structure
- **Event-Driven Architecture**: Decoupled service communication
- **Caching Layer**: Redis for improved performance
- **CDN Integration**: Global content delivery

### Feature Expansion
- **Mobile App**: React Native mobile application
- **Browser Extension**: Chrome extension for SEO analysis
- **API Platform**: Public API for third-party integrations
- **Marketplace**: Plugin ecosystem for custom features

---

This architecture supports SEOAgent's mission of automated SEO management while maintaining flexibility for future growth and feature expansion. The system is designed for scalability, security, and developer productivity.