# SEOAgent.com - Automated SEO Agent

An intelligent SEO automation platform that puts technical SEO, content generation, and SEO strategy on complete autopilot. Built with Next.js, Supabase, and AI-powered automation.

## 🎯 **Strategic Mission**

**Differentiate from SurferSEO and competitors** through:
- **Complete Automation**: "Set it and forget it" vs manual optimization tools
- **Multi-CMS Support**: Beyond WordPress-only limitations
- **Technical SEO Focus**: Automated fixes vs just content optimization

## 🏗️ **Three-Pillar Architecture**

### 🔧 **Technical SEO Analyst** (Autopilot Priority #1)
- Google Search Console integration for automated monitoring
- Website crawling and technical issue detection
- Automated fixes for technical SEO problems
- Performance metrics showing value delivered

### ✍️ **Content Writer** (Multi-CMS Advantage)
- Automated article generation with SurferSEO-quality structure
- Multi-CMS publishing: Strapi, WordPress, Webflow, Shopify, Ghost
- "Good enough" content automation for indie hackers

### 📊 **SEO Strategist** (Intelligence Engine)
- SERP.dev integration for automated keyword research
- Competitor analysis and strategic recommendations
- Dynamic SEO strategy updates based on performance data

## 🚀 **Technology Stack**

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions + Auth)
- **Hosting**: Vercel
- **AI Integrations**: OpenAI GPT-4, SERP.dev
- **CMS Integrations**: Strapi, WordPress, Webflow, Shopify, Ghost

## 📦 **Core Features**

### 🔧 **Technical SEO Analyst** (Automated)
- 🔄 Google Search Console OAuth integration
- 🔄 Automated website crawling and issue detection
- 🔄 Technical SEO fixes (sitemaps, meta tags, schema markup)
- 🔄 Core Web Vitals monitoring and optimization
- 🔄 Performance metrics dashboard
- 🔄 Autopilot workflow engine

### ✍️ **Content Writer** (Multi-CMS)
- ✅ AI-powered article generation with SurferSEO-inspired structure
- ✅ TL;DR summaries, examples, actionable advice
- ✅ Multi-CMS publishing (Strapi, WordPress, Webflow, Shopify)
- 🔄 Ghost CMS integration
- ✅ Public URL tracking and "View Live Article" functionality
- 🔄 Featured image generation and automated publishing

### 📊 **SEO Strategist** (Intelligence)
- 🔄 SERP.dev API integration for keyword research
- 🔄 Automated competitor analysis and tracking
- 🔄 Dynamic SEO strategy generation
- 🔄 Performance-based strategy updates
- 🔄 Content gap analysis and opportunity identification

### 💳 **Foundation Features**
- ✅ User authentication and authorization (Supabase)
- ✅ Multi-tier subscription plans (Stripe integration)
- ✅ Usage tracking and quota management
- ✅ Feature gates and access control

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd seoagent-nextjs
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Fill in your API keys and Supabase configuration.

4. **Setup Supabase**
   - Create a new Supabase project
   - Run the database migrations (see `/supabase/migrations/`)
   - Deploy edge functions (see `/supabase/functions/`)

5. **Run the development server**
   ```bash
   npm run dev
   ```

## 🗄️ Database Schema

The Supabase database mirrors the original MySQL structure:

- `login_users` - User accounts and subscription plans
- `websites` - User websites and settings
- `pages` - Website pages for meta tag processing
- `images` - Images for alt-text generation
- `articles` - Generated articles and content
- `api_usage` - API usage tracking

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on git push

### Netlify Alternative
1. Connect repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `.next`

## 🔧 API Endpoints

### Content Generation
- `POST /api/articles/generate` - Generate articles
- `POST /api/meta-tags/generate` - Generate meta tags
- `POST /api/images/alt-text` - Generate image alt-text

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/websites` - List user websites
- `POST /api/websites` - Add new website

## 🔑 Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI APIs
OPENAI_API_KEY=

# Technical SEO Analyst APIs
GOOGLE_SEARCH_CONSOLE_CLIENT_ID=
GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET=
SCRAPINGBEE_API_KEY=

# SEO Strategist APIs
SERP_DEV_API_KEY=
VALUESERP_API_KEY=

# CMS Integrations
WORDPRESS_APP_PASSWORD=
WEBFLOW_API_TOKEN=
SHOPIFY_API_KEY=
GHOST_ADMIN_API_KEY=

# Subscription Management
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Optional Enhancements
UNSPLASH_ACCESS_KEY=
YOUTUBE_API_KEY=
```

## 📋 **Development Status**

### 🔧 **Technical SEO Analyst** (Phase 1 Priority)
- ⏳ Google Search Console OAuth integration
- ⏳ Automated website crawling system
- ⏳ Technical SEO issue detection
- ⏳ Automated fixing workflows
- ⏳ Performance metrics dashboard

### ✍️ **Content Writer** (Competitive Advantage)
- ✅ Enhanced article generation (SurferSEO-inspired)
- ✅ Strapi CMS integration
- 🔄 WordPress, Webflow, Shopify testing
- ⏳ Ghost CMS integration
- ✅ Multi-CMS publishing infrastructure

### 📊 **SEO Strategist** (Intelligence Engine)
- ⏳ SERP.dev API integration
- ⏳ Automated competitor analysis
- ⏳ Dynamic SEO strategy generation
- ⏳ Performance-based strategy updates

### 💳 **Foundation Infrastructure**
- ✅ Project setup and configuration
- ✅ Database schema design
- ✅ Supabase authentication and edge functions
- ✅ Stripe subscription management
- ✅ Basic UI components and pages
- ✅ Production deployment ready

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details