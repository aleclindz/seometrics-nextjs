# SEOMetrics API Service

Backend API service for SEOMetrics.ai - handles authentication, data processing, and third-party integrations.

## Architecture

This is a standalone Express.js API service that provides:

- **Authentication & Authorization** - JWT-based auth with Supabase
- **Google Search Console Integration** - OAuth, data sync, performance metrics
- **CMS Integrations** - WordPress, Webflow, Strapi, Ghost connections
- **Article Generation** - AI-powered content creation with OpenAI
- **Subscription Management** - Stripe integration for billing
- **Technical SEO Tools** - Website analysis and optimization

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account and database
- Environment variables configured

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure environment variables
nano .env

# Start development server
npm run dev
```

### Environment Variables

See `.env.example` for required environment variables.

## API Documentation

### Base URL
- Development: `http://localhost:3001/v1`
- Production: `https://api.seometrics.ai/v1`

### Endpoints

#### Health Check
- `GET /v1/health` - Basic health check
- `GET /v1/health/detailed` - Detailed system status
- `GET /v1/health/ready` - Readiness probe
- `GET /v1/health/alive` - Liveness probe

#### Authentication
- `POST /v1/auth/login` - User login
- `POST /v1/auth/register` - User registration
- `POST /v1/auth/refresh` - Refresh JWT token
- `GET /v1/auth/me` - Get user profile

#### Google Search Console
- `GET /v1/gsc/connection` - Check GSC connection status
- `GET /v1/gsc/oauth/start` - Start OAuth flow
- `GET /v1/gsc/oauth/callback` - OAuth callback
- `POST /v1/gsc/oauth/refresh` - Refresh GSC tokens
- `GET /v1/gsc/properties` - Get GSC properties
- `POST /v1/gsc/sync` - Sync GSC data
- `GET /v1/gsc/performance` - Get performance data

#### CMS Integrations
- `GET /v1/cms/connections` - List CMS connections
- `POST /v1/cms/connections` - Create CMS connection
- `DELETE /v1/cms/connections/:id` - Remove CMS connection
- `POST /v1/cms/test-connection` - Test CMS connection

#### Articles
- `GET /v1/articles` - List articles
- `POST /v1/articles/generate` - Generate new article
- `POST /v1/articles/publish` - Publish article to CMS
- `GET /v1/articles/:id` - Get article details
- `PUT /v1/articles/:id` - Update article
- `DELETE /v1/articles/:id` - Delete article

#### Subscriptions
- `GET /v1/subscriptions/manage` - Get subscription details
- `POST /v1/subscriptions/create-checkout-session` - Create Stripe checkout
- `POST /v1/subscriptions/webhook` - Stripe webhook handler
- `GET /v1/subscriptions/usage` - Get usage statistics

### Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Development

### Scripts

```bash
npm run dev      # Start development server with nodemon
npm run start    # Start production server
npm run test     # Run tests
npm run lint     # Run ESLint
```

### Project Structure

```
src/
├── config/          # Configuration files
├── middleware/      # Express middleware
├── routes/          # API route handlers
├── services/        # Business logic services
├── utils/           # Utility functions
└── server.js        # Main server file
```

## Deployment

The API service can be deployed to:

- **Vercel** (recommended for Next.js compatibility)
- **Railway** (Node.js optimized)
- **Render** (simple deployment)
- **Docker** (containerized deployment)

### Environment Configuration

Make sure all required environment variables are set in your deployment platform.

## Security

- **CORS** configured for allowed origins
- **Rate limiting** (1000 requests per 15 minutes per IP)
- **Helmet** security headers
- **JWT** token-based authentication
- **Input validation** with express-validator
- **Error handling** without information leakage

## Monitoring

- **Winston logging** with different levels
- **Request/response logging** with Morgan
- **Health check endpoints** for monitoring
- **Error tracking** and alerting ready

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
```

Test files should be placed in `__tests__/` directories or named `*.test.js`.