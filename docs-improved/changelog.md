# Changelog

All notable changes to SEOAgent.com will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned Features
- **SEO Strategist Pillar**: Keyword research with SERP.dev API integration
- **Advanced Autopilot**: Automated technical SEO fixes and monitoring
- **Ghost CMS Integration**: Complete publishing workflow for Ghost blogs
- **Mobile App**: React Native mobile application for SEO monitoring
- **API Platform**: Public API for third-party integrations

---

## [2.1.0] - 2025-01-31

### Added
- **Enhanced Website Management**: Improved single-website plan switching logic
- **Plan Structure Updates**: Simplified plans to focus on website limits only
- **Database Migration Tools**: Admin tools for updating plan structures
- **Improved Error Handling**: Better user messaging for plan limit scenarios

### Changed
- **Article Limits Removed**: All plans now include unlimited article generation
- **Plan Focus**: Plans now differentiate only by number of manageable websites
- **Website Selection UI**: Radio buttons for single-site plans, checkboxes for multi-site
- **Account Page Cleanup**: Removed usage statistics, updated plan display

### Fixed
- **Website Delete Functionality**: Fixed deletion of currently managed websites
- **Plan Enforcement**: Corrected plan limit checks and upgrade prompts
- **Authentication Stability**: Resolved focus-related authentication issues
- **TypeScript Compilation**: Fixed Set iteration syntax for deployment compatibility

### Technical
- **Database Schema**: Updated `user_plans` table with new plan configurations
- **API Improvements**: Enhanced `/api/websites` endpoint with better plan enforcement
- **Component Updates**: Refined `WebsiteManagement` and `SubscriptionManager` components

---

## [2.0.0] - 2025-01-15

### Added
- **Three-Pillar Architecture**: Implemented Technical SEO Analyst, Content Writer, and SEO Strategist framework
- **Multi-CMS Publishing**: Complete integration with Strapi, WordPress, Webflow, and Shopify
- **Google Search Console Integration**: Full OAuth flow with performance data sync
- **Subscription Management**: Stripe-powered billing with Free, Starter, Pro, and Enterprise plans
- **AI Chat Assistant**: OpenAI-powered SEO guidance and recommendations
- **SEO Debug Tools**: Comprehensive website analysis and technical SEO auditing

### Changed
- **Complete UI Redesign**: Modern, responsive interface with dark/light mode support
- **Database Architecture**: Moved from simple blog structure to comprehensive SEO platform schema
- **Authentication System**: Upgraded to Supabase with Row Level Security
- **Content Generation**: Enhanced AI article creation with SEO optimization

### Technical
- **Next.js 14 Upgrade**: App Router implementation with Server Components
- **TypeScript Integration**: Full type safety across frontend and backend
- **Supabase Backend**: PostgreSQL with real-time subscriptions and RLS policies
- **Modern Deployment**: Vercel-optimized with edge functions

---

## [1.2.1] - 2024-12-20

### Fixed
- **Authentication Flow**: Resolved token refresh issues
- **CMS Connections**: Fixed Strapi API authentication
- **Performance**: Optimized database queries for better response times

### Security
- **Vulnerability Patches**: Updated dependencies with security fixes
- **API Security**: Enhanced rate limiting and input validation

---

## [1.2.0] - 2024-12-10

### Added
- **Strapi CMS Integration**: Full publishing workflow for Strapi-powered websites
- **Article Versioning**: Track changes and maintain article history
- **Enhanced Analytics**: Detailed usage tracking and performance metrics

### Changed
- **Dashboard Layout**: Improved organization and information hierarchy
- **Content Editor**: Enhanced article creation interface with better preview

### Fixed
- **Mobile Responsiveness**: Better experience on tablet and mobile devices
- **Error Handling**: More informative error messages throughout the application

---

## [1.1.0] - 2024-11-25

### Added
- **WordPress Integration**: Direct publishing to WordPress sites via REST API
- **Website Management**: Multi-website support with management controls
- **Usage Dashboard**: Track article generation and API usage

### Changed
- **Plan Structure**: Introduced tiered plans with different feature sets
- **UI Improvements**: Cleaner interface with better navigation

### Technical
- **Database Optimization**: Added indexes for better query performance
- **API Enhancements**: Improved error handling and response formatting

---

## [1.0.0] - 2024-11-01

### Added
- **Initial Release**: Core SEO article generation functionality
- **User Authentication**: Secure login and registration system
- **Article Generation**: AI-powered SEO content creation
- **Basic Dashboard**: Simple interface for managing generated content
- **Google Search Console**: Basic connection and data visualization

### Technical
- **Next.js Foundation**: Built on Next.js 13 with TypeScript
- **Database Setup**: Initial PostgreSQL schema with basic tables
- **OpenAI Integration**: GPT-powered content generation
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS

---

## Version History Summary

| Version | Release Date | Major Features |
|---------|-------------|----------------|
| **2.1.0** | 2025-01-31 | Website management improvements, plan simplification |
| **2.0.0** | 2025-01-15 | Three-pillar architecture, multi-CMS, GSC integration |
| **1.2.1** | 2024-12-20 | Bug fixes and security updates |
| **1.2.0** | 2024-12-10 | Strapi integration, article versioning |
| **1.1.0** | 2024-11-25 | WordPress integration, multi-website support |
| **1.0.0** | 2024-11-01 | Initial release with core functionality |

---

## Migration Guides

### Migrating from v1.x to v2.0

#### Database Changes
```sql
-- New tables added in v2.0
CREATE TABLE user_plans (...);
CREATE TABLE usage_tracking (...);
CREATE TABLE cms_connections (...);
CREATE TABLE gsc_connections (...);

-- Existing tables modified
ALTER TABLE websites ADD COLUMN is_managed BOOLEAN DEFAULT false;
ALTER TABLE websites ADD COLUMN website_token UUID DEFAULT gen_random_uuid();
```

#### API Changes
- **Breaking**: `/api/auth` endpoints restructured
- **New**: `/api/gsc/*` endpoints for Google Search Console
- **New**: `/api/subscription/*` endpoints for billing
- **Changed**: `/api/websites` now requires user authentication

#### Environment Variables
```bash
# New required variables in v2.0
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### Migrating from v2.0 to v2.1

#### Plan Structure Changes
```sql
-- Update existing user plans
UPDATE user_plans SET posts_allowed = -1; -- Unlimited articles
UPDATE user_plans SET tier = CASE
  WHEN tier = 'basic' THEN 'starter'
  ELSE tier
END;
```

#### Component Updates
- `SubscriptionManager`: Updated to show website limits only
- `WebsiteManagement`: Enhanced single-site switching logic
- Account page: Usage statistics section removed

---

## Development Changelog

### Development Workflow Changes

#### v2.1.0 Development
- **Enhanced Documentation**: Complete rewrite of user and developer documentation
- **Testing Improvements**: Expanded test coverage for plan enforcement
- **Code Quality**: Stricter ESLint rules for deployment compatibility

#### v2.0.0 Development  
- **Architectural Redesign**: Complete rewrite with three-pillar approach
- **TypeScript Migration**: Full codebase converted to TypeScript
- **Modern Stack**: Upgraded to Next.js 14, Supabase, and modern React patterns

---

## Upcoming Features Roadmap

### Q1 2025
- [ ] **SEO Strategist Pillar**: Keyword research and competitive analysis
- [ ] **Ghost CMS Integration**: Complete publishing workflow
- [ ] **Advanced Autopilot**: Automated technical SEO monitoring
- [ ] **Enhanced Analytics**: Deeper performance insights

### Q2 2025
- [ ] **Mobile Application**: React Native app for iOS and Android
- [ ] **Browser Extension**: Chrome extension for real-time SEO analysis
- [ ] **API Platform**: Public API for third-party integrations
- [ ] **White-Label Options**: Custom branding for agencies

### Q3 2025
- [ ] **Enterprise Features**: Advanced team management and permissions
- [ ] **Marketplace**: Plugin ecosystem for custom integrations
- [ ] **Advanced Automation**: Complex multi-step SEO workflows
- [ ] **International Support**: Multi-language content generation

### Q4 2025
- [ ] **AI-Powered Insights**: Predictive SEO recommendations
- [ ] **Advanced Integrations**: More CMS and marketing tool connections
- [ ] **Performance Optimization**: Enhanced speed and scalability
- [ ] **Enterprise SLA**: Dedicated support and custom features

---

## Bug Reports & Feature Requests

### How to Report Issues
1. **Check Existing Issues**: Search current issues before reporting
2. **Use Issue Templates**: Follow the provided templates for bug reports
3. **Provide Details**: Include steps to reproduce, expected behavior, screenshots
4. **Environment Info**: Browser, plan type, affected pages

### Feature Request Process
1. **Community Discussion**: Post in discussions first to gauge interest
2. **Use Feature Template**: Fill out the feature request template completely
3. **Business Case**: Explain how the feature benefits users
4. **Implementation Ideas**: Suggest technical approaches if applicable

### Contributing
We welcome contributions! See our [Development Guide](development.md) for details on:
- Setting up the development environment
- Code style and conventions
- Testing requirements
- Pull request process

---

## Support & Resources

### Documentation
- **User Guide**: Complete feature documentation
- **API Reference**: Comprehensive API documentation  
- **Development Guide**: Local development setup
- **Troubleshooting**: Common issues and solutions

### Community
- **GitHub Discussions**: Feature requests and general discussion
- **GitHub Issues**: Bug reports and technical issues  
- **Email Support**: support@seoagent.com
- **Documentation**: https://docs.seoagent.com

---

*For the most up-to-date information, always refer to the latest version of this changelog and the associated documentation.*