# SEOAgent.com User Guide

## Overview

SEOAgent.com is an automated SEO platform that handles technical SEO optimization and content creation for your websites. This guide covers all user-facing features organized by the pages you'll interact with.

## 🏠 Landing Page & Authentication

### What You See
The landing page introduces SEOAgent's three-pillar approach:
1. **Technical SEO Analyst** - Automated technical SEO fixes
2. **Content Writer** - AI article generation with multi-CMS publishing  
3. **SEO Strategist** - Keyword research and competitive analysis

### What You Can Do
- **Sign Up** - Create a new account with email/password
- **Sign In** - Access your existing account
- **Learn More** - View feature explanations and pricing

**Related API**: [`/api/auth/*`](api-reference.md#authentication)

---

## 📊 Dashboard

### What You See
Your central command center showing:
- **Managed websites count** and plan limits
- **Google Search Console data** (when connected)
- **Recent activity** from SEO tasks and content creation
- **Quick action buttons** for common tasks

### What You Can Do
- **Connect Google Search Console** - Link your GSC account via OAuth
- **Manage Websites** - Select which sites SEOAgent should optimize
- **View GSC Performance Data** - See clicks, impressions, and rankings
- **Access Feature Areas** - Navigate to Content Writer, Keywords, etc.

### GSC Integration Details
- **OAuth Flow**: Secure Google authorization
- **Data Sync**: Automatic property import and performance data
- **Website Selection**: Choose which GSC properties to manage within plan limits

**Related APIs**: 
- [`/api/gsc/*`](api-reference.md#google-search-console) - GSC connection and data
- [`/api/websites`](api-reference.md#website-management) - Website management

---

## 🌐 Website Management

### What You See
- **List of connected websites** from Google Search Console
- **Management status** (managed vs. available)
- **Plan limits** and current usage
- **Website selection controls** (radio buttons for single-site plans, checkboxes for multi-site)

### What You Can Do
- **Select Managed Sites** - Choose which websites SEOAgent actively optimizes
- **Switch Managed Sites** - Change your managed website (single-site plans)
- **Remove Websites** - Permanently exclude sites from SEOAgent
- **View Plan Limits** - See how many sites your plan allows

### Plan-Based Behavior
- **Starter ($29/month)**: Manage 1 website with unlimited articles
- **Pro ($79/month)**: Manage 5 websites with unlimited articles
- **Enterprise**: Unlimited websites and custom features

### Smart Management Features
- **Automatic Switching**: Single-site plans auto-switch when selecting a different site
- **Soft Deletion**: Removed sites won't be re-imported from GSC
- **Plan Enforcement**: Clear messaging when reaching limits with upgrade options

**Related APIs**: 
- [`/api/websites`](api-reference.md#website-management) - Website CRUD operations
- [`/api/subscription/manage`](api-reference.md#subscription-management) - Plan limits and usage

---

## ✍️ Content Writer

### What You See
- **Article creation form** with title, website selection, and target keywords
- **CMS connection selector** for publishing
- **Article history** with status, publication links, and management options
- **Website filter** to view articles by site

### What You Can Do
- **Generate Articles** - AI-powered content creation optimized for SEO
- **Select Publishing Destination** - Choose connected CMS for automatic publishing
- **Set Target Keywords** - Specify keywords for content optimization
- **View Live Articles** - Click through to published content
- **Edit in CMS** - Direct links to edit articles in your CMS
- **Manage Article History** - View, republish, or delete generated content

### Content Generation Process
1. **Input Requirements**: Title, target website, keywords (optional)
2. **AI Generation**: High-quality, SEO-optimized article creation
3. **CMS Publishing**: Automatic publishing to connected CMS platforms
4. **URL Tracking**: Links to live articles for easy access

### CMS Integration
- **Supported Platforms**: Strapi, WordPress, Webflow, Shopify, Ghost
- **Auto-Publishing**: Direct integration with CMS APIs
- **Format Optimization**: Content formatted for each platform's requirements

**Related APIs**: 
- [`/api/articles/*`](api-reference.md#content-generation) - Article generation and management
- [`/api/cms/*`](api-reference.md#cms-integration) - CMS connections and publishing

---

## 🔗 CMS Connections

### What You See
- **Available CMS platforms** (Strapi, WordPress, Webflow, etc.)
- **Connection status** for each platform
- **OAuth setup flows** for supported platforms
- **Manual connection forms** for API-based connections
- **Connected services list** with management options

### What You Can Do
- **Connect CMS Platforms** - Link your content management systems
- **Authenticate via OAuth** - Secure authorization flows where supported
- **Configure API Connections** - Manual setup with API keys and URLs
- **Test Connections** - Verify connectivity and permissions
- **Manage Connected Services** - Update, disconnect, or reconfigure connections

### Platform-Specific Features
- **Strapi**: Full content type integration with custom field mapping
- **WordPress**: Post creation and management via REST API
- **Webflow**: Collection item publishing with site selection
- **Shopify**: Blog post creation for e-commerce content marketing
- **Ghost**: Article publishing with tag and author management

**Related APIs**: 
- [`/api/cms/connections`](api-reference.md#cms-integration) - Connection management
- [`/api/cms/oauth/*`](api-reference.md#cms-oauth) - OAuth authentication flows
- [`/api/cms/test-connection`](api-reference.md#cms-testing) - Connection validation

---

## 🔍 Keywords Research

### What You See
- **Keyword research interface** (coming soon)
- **SERP analysis tools** for competitive research
- **Keyword opportunity identification**
- **Search volume and difficulty metrics**

### What You Can Do
- **Research Keywords** - Find high-value keyword opportunities
- **Analyze Competition** - Study competitor keyword strategies
- **Track Rankings** - Monitor your website's keyword positions
- **Export Data** - Download keyword research for external use

**Feature Status**: Currently in development as part of the SEO Strategist pillar

**Related APIs**: [`/api/keywords/*`](api-reference.md#keyword-research) (planned)

---

## 🛠️ SEO Debug Tools

### What You See
- **Website analysis interface** with URL input
- **Technical SEO test results** including:
  - Meta title and description analysis
  - Image alt-text detection
  - Core Web Vitals assessment
  - Schema markup validation
- **Detailed diagnostic reports** with actionable recommendations

### What You Can Do
- **Run SEO Audits** - Comprehensive technical SEO analysis
- **Test Specific URLs** - Page-level SEO diagnostics
- **View Recommendations** - Get specific improvement suggestions
- **Download Reports** - Export audit results for sharing

### Available Tests
- **Meta Tag Analysis** - Title, description, and header optimization
- **Image SEO** - Alt-text and image optimization checks
- **Performance Metrics** - Core Web Vitals and loading speed
- **Technical Issues** - Crawling errors and indexing problems

**Related APIs**: [`/api/debug/*`](api-reference.md#seo-debug) - SEO testing and analysis

---

## ⚙️ Account Management

### What You See
- **Profile Information** - Email, user ID, account creation date
- **Subscription Details** - Current plan, pricing, usage limits
- **Website Management** - Integrated website selection interface
- **Account Actions** - Sign out and account management options

### What You Can Do
- **View Account Details** - Access your profile and subscription information
- **Manage Subscriptions** - Upgrade, downgrade, or cancel plans via Stripe
- **Update Plan Limits** - See current usage vs. plan allowances
- **Sign Out** - Securely end your session

### Subscription Management
- **Current Plan Display** - Plan name, price, and feature limits
- **Usage Tracking** - Websites managed and articles generated
- **Stripe Integration** - Secure payment processing and plan changes
- **Plan Comparison** - Feature differences between tiers

**Related APIs**: 
- [`/api/subscription/*`](api-reference.md#subscription-management) - Plan and billing management
- [`/api/usage/*`](api-reference.md#usage-tracking) - Usage statistics

---

## 🚀 Autopilot Features

### What You See
- **Automation dashboard** with Google Search Console connection status
- **Tracking script generator** for website integration
- **Automated task history** and scheduling options
- **Performance monitoring** with automated improvements

### What You Can Do
- **Enable Autopilot Mode** - Set up automated SEO maintenance
- **Install Tracking Scripts** - Add monitoring code to your websites
- **Configure Automation Rules** - Set parameters for automated actions
- **Monitor Automated Tasks** - View what SEOAgent has done automatically

### Automation Capabilities
- **Technical SEO Fixes** - Automatic meta tag and structure improvements
- **Content Optimization** - Ongoing content enhancement suggestions
- **Performance Monitoring** - Continuous site speed and Core Web Vitals tracking
- **GSC Data Integration** - Automated sync and analysis of search console data

**Related APIs**: [`/api/autopilot/*`](api-reference.md#automation) - Automation configuration and monitoring

---

## 💬 AI Chat Assistant

### What You See
- **Chat interface** with SEO-focused AI assistant
- **Conversation history** organized by topics
- **Website-specific advice** based on your connected sites
- **Actionable recommendations** with direct implementation links

### What You Can Do
- **Ask SEO Questions** - Get expert advice on optimization strategies
- **Request Site Analysis** - AI-powered website reviews and recommendations
- **Plan Content Strategy** - Get suggestions for content creation and optimization
- **Troubleshoot Issues** - Get help with technical SEO problems

### AI Capabilities
- **SEO Expertise** - Trained on current SEO best practices and guidelines
- **Site-Specific Advice** - Recommendations based on your actual website data
- **Actionable Insights** - Suggestions you can implement immediately
- **Learning Integration** - Advice that connects to platform features

**Related APIs**: [`/api/chat/*`](api-reference.md#ai-chat) - Chat interface and AI integration

---

## 📈 Performance Tracking

### Integration Points
Throughout the platform, you'll see performance data integrated into relevant sections:

- **Dashboard GSC Widgets** - Key metrics from Google Search Console
- **Article Performance** - How generated content performs in search
- **Website Rankings** - Keyword position tracking for managed sites
- **Technical SEO Scores** - Ongoing assessment of site health

### Data Sources
- **Google Search Console** - Official search performance data
- **Internal Analytics** - Platform usage and optimization tracking
- **Third-party APIs** - Additional SEO metrics and benchmarking

---

## 🔄 Workflow Examples

### Setting Up Your First Website
1. **Connect Google Search Console** from the Dashboard
2. **Select your website** in Website Management
3. **Connect a CMS** in CMS Connections
4. **Generate your first article** in Content Writer
5. **Monitor performance** via Dashboard GSC data

### Managing Multiple Websites (Pro Plan)
1. **Upgrade to Pro plan** in Account settings
2. **Select up to 5 websites** in Website Management
3. **Set up CMS connections** for each site
4. **Create targeted content** for different websites
5. **Track comparative performance** across all sites

### Automating SEO Tasks
1. **Enable GSC connection** for data access
2. **Configure Autopilot settings** with your preferences
3. **Install tracking scripts** on your websites
4. **Monitor automated improvements** in the dashboard
5. **Review and approve** suggested optimizations

---

This user guide covers all current functionality. Features marked as "coming soon" are part of the planned development roadmap focusing on the three-pillar architecture: Technical SEO Analyst, Content Writer, and SEO Strategist.