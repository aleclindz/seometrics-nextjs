# Getting Started with SEOAgent.com

## Welcome to SEOAgent

SEOAgent.com is your automated SEO partner that handles technical SEO optimization and content creation for your websites. This guide will help you get up and running quickly.

## 🚀 Quick Start (5 Minutes)

### 1. Create Your Account
1. Visit [SEOAgent.com](https://seoagent.com)
2. Click **Sign Up** 
3. Enter your email and create a password
4. Verify your email address

### 2. Connect Google Search Console
1. From your Dashboard, click **Connect Google Search Console**
2. Authorize SEOAgent to access your GSC data
3. Your websites will automatically import

### 3. Select Your Website
1. Go to **Website Management**
2. Choose which website to manage (Free: 0 sites, Starter: 1 site, Pro: 5 sites)
3. Your selected website is now under SEOAgent's care

### 4. Generate Your First Article
1. Visit **Content Writer**
2. Enter an article title and target keywords
3. Select a connected CMS (optional - you can generate without publishing)
4. Click **Generate Article**

🎉 **Congratulations!** You've successfully set up SEOAgent and generated your first AI-optimized article.

---

## 📋 Detailed Setup Guide

### Account Creation & Authentication

**What You Need:**
- Valid email address
- Strong password (8+ characters with numbers and symbols)

**Steps:**
1. **Sign Up Process**
   - Email verification required
   - Account automatically created with Free plan
   - User token generated for API access

2. **Initial Login**
   - Dashboard loads with setup guidance
   - GSC connection prompt appears
   - Plan selection options available

**Related API**: [`/api/auth/get-token`](api-reference.md#authentication)

### Google Search Console Integration

**Prerequisites:**
- Google account with Search Console access
- Website verified in Google Search Console
- Owner or verified user permissions

**Setup Process:**
1. **OAuth Authorization**
   - Click "Connect Google Search Console" on Dashboard
   - Google consent screen appears
   - Grant SEOAgent access to your GSC data
   - Automatic redirect back to platform

2. **Property Import**
   - SEOAgent syncs your GSC properties
   - All verified websites appear in Website Management
   - Sites respect verification levels and permissions

3. **Data Access**
   - Performance data becomes available on Dashboard
   - 90 days of historical data cached locally
   - Real-time sync for new data

**Related APIs**: 
- [`/api/gsc/oauth/start`](api-reference.md#gsc-oauth-start)
- [`/api/gsc/sync`](api-reference.md#gsc-sync)

### Website Selection & Management

**Plan Limits:**
- **Free Plan**: View data, no managed websites
- **Starter Plan ($29/month)**: 1 managed website, unlimited articles
- **Pro Plan ($79/month)**: 5 managed websites, unlimited articles
- **Enterprise**: Custom limits and features

**Selection Process:**
1. **View Available Sites**
   - All GSC properties listed
   - Management status clearly marked
   - Plan limits displayed

2. **Choose Managed Sites**
   - Single-site plans: Radio button selection (auto-switches)
   - Multi-site plans: Checkbox selection up to limit
   - Clear upgrade prompts when limits reached

3. **Management Benefits**
   - Technical SEO monitoring activated
   - Content generation enabled for managed sites
   - Performance tracking and alerts

**Related API**: [`/api/websites`](api-reference.md#website-management)

---

## 🔧 CMS Connection Setup

### Supported Platforms

#### Strapi CMS
**Requirements:**
- Strapi v4+ instance
- API token with content permissions
- Content-Type configured for articles

**Setup:**
1. In Strapi: Settings → API Tokens → Create Token
2. In SEOAgent: CMS Connections → Strapi → Enter URL and token
3. Test connection to verify permissions

#### WordPress
**Requirements:**
- WordPress 5.6+ with REST API enabled
- Application password generated
- User with post creation permissions

**Setup:**
1. WordPress: Users → Profile → Application Passwords → Add New
2. SEOAgent: CMS Connections → WordPress → Enter credentials
3. Test connection and verify post creation ability

#### Webflow
**Requirements:**
- Webflow account with site access
- CMS collection configured for blog posts
- OAuth permissions for API access

**Setup:**
1. SEOAgent: CMS Connections → Webflow → Start OAuth
2. Authorize SEOAgent in Webflow
3. Select site and collection for publishing

#### Shopify
**Requirements:**
- Shopify store with blog enabled
- Private app credentials
- Blog post creation permissions

**Setup:**
1. Shopify: Apps → Manage Private Apps → Create App
2. Enable blog post permissions
3. SEOAgent: Enter private app credentials

#### Ghost CMS
**Requirements:**
- Ghost v4+ installation
- Admin API key
- Author role access

**Setup:**
1. Ghost: Settings → Integrations → Add Custom Integration
2. Copy Admin API key
3. SEOAgent: CMS Connections → Ghost → Enter key and URL

**Related API**: [`/api/cms/connections`](api-reference.md#cms-integration)

---

## 📊 Understanding Your Dashboard

### Key Widgets

#### GSC Performance Overview
- **Clicks**: Total clicks from search results
- **Impressions**: How often your site appeared in search
- **CTR**: Click-through rate (clicks ÷ impressions)
- **Average Position**: Your average ranking position

#### Managed Websites Status
- Current managed site count vs. plan limit
- Quick website switching (single-site plans)
- Upgrade prompts when approaching limits

#### Recent Activity Feed
- New articles generated
- CMS publishing status
- Technical SEO fixes applied
- GSC data sync updates

### Quick Actions
- **Generate Article**: Jump to Content Writer
- **Add Website**: Manage more sites (if plan allows)
- **Connect CMS**: Set up publishing destinations
- **View Reports**: Detailed SEO analysis

---

## ✍️ Your First Article

### Planning Your Content

**Choose Effective Topics:**
- Target keywords your audience searches for
- Address common questions in your industry
- Create how-to guides and tutorials
- Write about trending topics relevant to your niche

**Keyword Research Tips:**
- Use 2-4 target keywords per article
- Mix short-tail and long-tail keywords
- Consider search intent (informational, commercial, navigational)
- Check keyword difficulty and competition

### Generation Process

1. **Article Setup**
   - Enter a descriptive, keyword-rich title
   - Select your managed website
   - Add target keywords (comma-separated)
   - Choose CMS connection (optional)

2. **AI Generation**
   - SEOAgent creates SEO-optimized content
   - Includes proper heading structure (H1, H2, H3)
   - Optimizes keyword density and placement
   - Generates meta description automatically

3. **Review & Publish**
   - Preview generated content
   - Edit in your CMS if needed
   - Publish directly or save as draft
   - Track performance via published URL

### Content Quality Features

**SEO Optimization:**
- Proper heading hierarchy
- Keyword optimization without stuffing  
- Meta descriptions under 160 characters
- URL-friendly slugs generated

**Content Structure:**
- Introduction with hook
- Main content with subheadings
- Actionable advice and examples
- Conclusion with call-to-action

**Multi-CMS Formatting:**
- Platform-specific formatting applied
- Image placeholders where appropriate
- Tags and categories suggested
- Publishing metadata included

---

## 🎯 Best Practices

### Website Management
- Start with your highest-traffic website
- Focus on quality over quantity
- Regularly review managed site performance
- Upgrade plan when ready to scale

### Content Creation
- Generate articles consistently (weekly recommended)
- Target different keyword variations
- Create content clusters around topics
- Monitor article performance in GSC

### CMS Integration
- Test connections regularly
- Keep API credentials secure
- Monitor publishing success rates
- Use platform-specific features (tags, categories)

### Performance Monitoring
- Check Dashboard weekly for insights
- Review GSC data for keyword opportunities
- Track article performance post-publication
- Adjust strategy based on data

---

## 🆘 Common Issues & Solutions

### GSC Connection Problems
**Issue**: "Failed to connect to Google Search Console"
**Solution**: 
- Ensure you have owner/verified user access
- Check that website is verified in GSC
- Try disconnecting and reconnecting

### Website Not Manageable
**Issue**: "Cannot manage this website"
**Solution**:
- Verify you haven't reached plan limits
- Check website is verified in GSC
- Ensure sufficient permissions

### CMS Publishing Fails
**Issue**: "Failed to publish article"
**Solution**:
- Test CMS connection in settings
- Verify API credentials are current
- Check CMS permissions and content types

### Article Generation Errors
**Issue**: "Article generation failed"
**Solution**:
- Check target keywords aren't too competitive
- Ensure title is descriptive and specific
- Verify managed website is selected

---

## 🚀 Next Steps

Once you've completed the basic setup:

1. **Explore Advanced Features**
   - [SEO Debug Tools](user-guide.md#seo-debug-tools) for technical analysis
   - [AI Chat Assistant](user-guide.md#ai-chat-assistant) for personalized advice
   - [Autopilot Features](user-guide.md#autopilot-features) for automation

2. **Scale Your SEO**
   - Consider upgrading to Pro for multiple websites
   - Set up additional CMS connections
   - Create content calendars for consistent publishing

3. **Monitor & Optimize**
   - Review GSC performance weekly
   - Track article success rates
   - Adjust content strategy based on data

4. **Get Help**
   - Use the AI Chat Assistant for specific questions
   - Check [Troubleshooting](troubleshooting.md) for common issues
   - Contact support for technical problems

---

**Ready to automate your SEO?** Head to your [Dashboard](user-guide.md#dashboard) and start optimizing!