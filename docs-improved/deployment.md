# Deployment Guide

## Production Deployment

SEOAgent.com is designed for deployment on Vercel with Supabase as the backend. This guide covers production deployment, environment configuration, and CI/CD setup.

## 🚀 Quick Deployment

### Prerequisites
- **Vercel Account**: https://vercel.com
- **Supabase Project**: https://supabase.com
- **GitHub Repository**: Code repository
- **Domain Name**: Custom domain (optional)

### One-Click Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-repo/seometrics-nextjs)

### Manual Deployment Steps
1. **Fork/Clone Repository**
2. **Connect to Vercel**
3. **Configure Environment Variables**
4. **Deploy**

---

## 🔧 Environment Configuration

### Production Environment Variables

#### Core Application
```bash
# Next.js Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-super-secure-nextauth-secret-key

# Supabase Configuration  
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

#### Authentication & API Keys
```bash
# Google OAuth (for GSC integration)
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# OpenAI API (for content generation)
OPENAI_API_KEY=your-openai-api-key

# Stripe (for subscriptions)
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-endpoint-secret
```

#### CMS Integration Keys
```bash
# WordPress (if using default connections)
WORDPRESS_DEFAULT_URL=https://your-wordpress-site.com
WORDPRESS_DEFAULT_USERNAME=your-app-password-username
WORDPRESS_DEFAULT_PASSWORD=your-app-password

# Strapi (if using default connections)
STRAPI_DEFAULT_URL=https://your-strapi-instance.com
STRAPI_DEFAULT_TOKEN=your-strapi-api-token

# Additional CMS configurations as needed
```

#### Optional Services
```bash
# SERP.dev API (for keyword research - coming soon)
SERP_DEV_API_KEY=your-serp-dev-api-key

# Lighthouse API (for SEO audits)
LIGHTHOUSE_API_KEY=your-lighthouse-api-key

# Analytics (optional)
GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX
```

---

## 📦 Database Setup (Supabase)

### Production Database Configuration

#### 1. Create Supabase Project
```bash
# Using Supabase CLI (optional)
npx supabase init
npx supabase login
npx supabase link --project-ref your-project-ref
```

#### 2. Database Schema Migration
```sql
-- Apply schema in Supabase SQL Editor
-- See complete schema in database-schema.md

-- Core tables
CREATE TABLE login_users (...);
CREATE TABLE websites (...);
CREATE TABLE user_plans (...);
CREATE TABLE usage_tracking (...);
CREATE TABLE articles (...);
CREATE TABLE cms_connections (...);
CREATE TABLE gsc_connections (...);

-- Indexes for performance
CREATE INDEX idx_websites_user_token ON websites(user_token);
CREATE INDEX idx_articles_website_token ON articles(website_token);
-- ... additional indexes
```

#### 3. Row Level Security Policies
```sql
-- Enable RLS on all tables
ALTER TABLE login_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE websites ENABLE ROW LEVEL SECURITY;
-- ... enable for all tables

-- Create policies
CREATE POLICY "Users can access own data" ON websites
FOR ALL USING (user_token = (auth.jwt() ->> 'user_token')::uuid);
-- ... create policies for all tables
```

#### 4. Database Functions
```sql
-- Utility functions for business logic
CREATE OR REPLACE FUNCTION get_user_usage_stats(user_token UUID, month_year VARCHAR)
RETURNS JSON AS $$
  -- Function implementation
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_plan_limits(user_token UUID, resource_type VARCHAR)
RETURNS BOOLEAN AS $$
  -- Function implementation  
$$ LANGUAGE plpgsql;
```

### Database Backup & Recovery
```bash
# Automated backups (Supabase handles this)
# Manual backup via CLI
npx supabase db dump --file backup.sql

# Restore from backup
npx supabase db reset --file backup.sql
```

---

## 🌐 Vercel Deployment Configuration

### Project Settings

#### Build Configuration
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "devCommand": "npm run dev"
}
```

#### Environment Variables in Vercel
1. **Vercel Dashboard** → Your Project → Settings → Environment Variables
2. **Add each environment variable** from the list above
3. **Set appropriate environments**: Production, Preview, Development

#### Build & Output Settings
```bash
# vercel.json configuration
{
  "framework": "nextjs",
  "regions": ["iad1", "sfo1"],
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "https://your-domain.com"
        }
      ]
    }
  ]
}
```

### Custom Domain Setup
```bash
# In Vercel Dashboard:
1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records:
   - Type: A, Name: @, Value: 76.76.19.61
   - Type: CNAME, Name: www, Value: cname.vercel-dns.com
4. Wait for DNS propagation (1-24 hours)
```

---

## 🔒 Security Configuration

### SSL/TLS Configuration
- **Automatic SSL**: Vercel provides automatic SSL certificates
- **HSTS Headers**: Configured in `next.config.js`
- **Security Headers**: Content Security Policy, X-Frame-Options

### API Security
```typescript  
// Rate limiting (implement in API routes)
const rateLimit = {
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
};

// CORS configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

### Environment Security
```bash
# Secure environment variable management
# Never commit .env files to git
# Use Vercel's environment variable encryption
# Rotate API keys regularly
# Use least-privilege access for all services
```

---

## 📊 Monitoring & Analytics

### Application Monitoring
```typescript
// Error tracking (implement with service like Sentry)
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

// Performance monitoring
export async function onRequest(request: Request) {
  const start = Date.now();
  // ... request handling
  const duration = Date.now() - start;
  console.log(`Request took ${duration}ms`);
}
```

### Database Monitoring
```sql
-- Performance monitoring queries
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE schemaname = 'public';

-- Connection monitoring
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';
```

### Uptime Monitoring
```bash
# Services to consider:
- Vercel Analytics (built-in)
- Uptime Robot (external monitoring)
- StatusPage.io (status page)
- Google Analytics (user analytics)
```

---

## 🚦 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Type check
        run: npm run type-check
      
      - name: Lint check
        run: npm run lint
      
      - name: Build check
        run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

### Pre-deployment Checks
```bash
#!/bin/bash
# scripts/pre-deploy.sh

echo "Running pre-deployment checks..."

# Type checking
npm run type-check || exit 1

# Linting
npm run lint || exit 1

# Tests
npm test || exit 1

# Build test
npm run build || exit 1

echo "All checks passed! Ready for deployment."
```

---

## 🔄 Database Migrations

### Migration Strategy
```sql
-- migrations/001_initial_schema.sql
-- Initial database setup

-- migrations/002_add_cms_connections.sql  
-- Add CMS connection tables

-- migrations/003_add_usage_tracking.sql
-- Add usage tracking for billing
```

### Automated Migrations
```typescript
// lib/migrations.ts
export async function runMigrations() {
  const migrations = [
    '001_initial_schema.sql',
    '002_add_cms_connections.sql',
    '003_add_usage_tracking.sql'
  ];
  
  for (const migration of migrations) {
    await executeMigration(migration);
  }
}
```

---

## 📈 Performance Optimization

### Build Optimization
```javascript
// next.config.js
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['example.com'],
    formats: ['image/webp', 'image/avif'],
  },
  compress: true,
  swcMinify: true,
};

module.exports = nextConfig;
```

### Caching Strategy
```bash
# Vercel Edge Caching
# Automatic for static assets
# API routes cached based on headers

# Database Query Caching
# Use Supabase built-in caching
# Implement Redis for session caching if needed
```

### CDN Configuration
```bash
# Vercel Edge Network (automatic)
# Global distribution of static assets
# Edge functions for API routes
# Automatic image optimization
```

---

## 🔧 Maintenance & Updates

### Regular Maintenance Tasks
```bash
# Weekly maintenance checklist:
1. Check application logs for errors
2. Review database performance metrics  
3. Update dependencies (security patches)
4. Backup verification
5. SSL certificate renewal check (automatic with Vercel)
```

### Dependency Updates
```bash
# Update dependencies safely
npm audit fix
npm update
npm run test
npm run build

# Major version updates (review breaking changes)
npm install package@latest
```

### Database Maintenance
```sql
-- Weekly database maintenance
VACUUM ANALYZE;
REINDEX DATABASE seooagent;

-- Monitor table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 🚨 Disaster Recovery

### Backup Strategy
```bash
# Automated backups (Supabase):
# - Daily automatic backups
# - Point-in-time recovery (7 days)
# - Manual backup before major changes

# Code backups:
# - Git repository (primary)
# - Vercel deployment history
# - Local development environment
```

### Recovery Procedures
```bash
# Database recovery
1. Access Supabase dashboard
2. Go to Settings → Database
3. Select backup date
4. Restore to new instance
5. Update environment variables
6. Test functionality

# Application recovery
1. Redeploy from Git
2. Verify environment variables
3. Test database connection
4. Check external API integrations
```

### Emergency Contacts
```bash
# Service status pages:
- Vercel: https://vercel-status.com
- Supabase: https://status.supabase.com
- Stripe: https://status.stripe.com
- OpenAI: https://status.openai.com

# Support contacts:
- Vercel Support (Pro plan required)
- Supabase Support  
- Domain registrar support
```

---

## 📊 Production Monitoring

### Key Metrics to Monitor
```bash
# Application metrics:
- Response times (< 500ms target)
- Error rates (< 1% target)  
- Uptime (99.9% target)
- Database query performance

# Business metrics:
- User registration rate
- Subscription conversion rate
- Feature usage statistics
- Customer support tickets
```

### Alerting Setup
```typescript
// Example monitoring setup
const alerts = {
  errorRate: {
    threshold: 0.01, // 1%
    window: '5m',
    notification: 'email'
  },
  responseTime: {
    threshold: 1000, // 1 second
    window: '5m', 
    notification: 'slack'
  },
  uptime: {
    threshold: 0.999, // 99.9%
    window: '1h',
    notification: 'sms'
  }
};
```

---

## 🏁 Post-Deployment Checklist

### Immediate Post-Deploy
- [ ] Application loads correctly
- [ ] User authentication works
- [ ] Database connections active
- [ ] API endpoints responding
- [ ] External integrations working (GSC, Stripe, OpenAI)
- [ ] SSL certificate active
- [ ] Custom domain resolving

### 24-Hour Check
- [ ] Monitor error rates and logs
- [ ] Check performance metrics
- [ ] Verify scheduled tasks running
- [ ] Test user registration flow
- [ ] Test subscription upgrades
- [ ] Verify email notifications

### Weekly Health Check
- [ ] Review application logs
- [ ] Database performance review
- [ ] Security scan results
- [ ] Backup verification
- [ ] Dependency vulnerability scan
- [ ] User feedback review

---

This deployment guide ensures a smooth, secure, and monitored production deployment of SEOAgent.com. Always test thoroughly in a staging environment before deploying to production.