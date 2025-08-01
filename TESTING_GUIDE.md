# Technical SEO Automation MVP - Testing Guide

This guide walks through testing all the new Technical SEO automation features we've built.

## 🚀 Quick Start Testing

### 1. Build Check (Verify Everything Compiles)
First, make sure everything builds successfully:

```bash
# Make sure you're in the project root
cd /Users/aleclindsay/seometrics-nextjs

# Build the application
npm run build
# ✅ Should complete with "Compiled successfully"
```

### 2. Run Database Migrations
Apply all the new database migrations:

```bash
# Apply new migrations (if using Supabase CLI)
supabase db push

# Or apply manually in Supabase dashboard > SQL Editor:
# - 027_url_inspections.sql
# - 028_sitemap_submissions.sql  
# - 029_technical_seo_fixes.sql
# - 030_schema_generations.sql
```

### 3. Deploy Edge Function
Deploy the schema markup generation function:

```bash
# Deploy the edge function
supabase functions deploy generate-schema-markup

# Verify it's deployed
supabase functions list
```

### 4. Start Development Server
```bash
npm run dev
# Server should start on http://localhost:3000
```

## 🧪 Testing Each Component

### **1. Testing Smart.js Enhanced Features**

#### A. Test Schema Markup Injection
1. Open any page on your local site (e.g., `http://localhost:3000`)
2. Open browser Developer Tools (F12)
3. Go to Console tab
4. Look for smart.js logs:
   ```
   [SEO-METRICS] Starting schema markup processing
   [SEO-METRICS] Schema API response: {...}
   [SEO-METRICS] Successfully injected X schema markup blocks
   ```
5. Check the `<head>` section for new `<script type="application/ld+json">` tags
6. Validate schema using [Google's Rich Results Test](https://search.google.com/test/rich-results)

#### B. Test Canonical Tags
1. Visit a page with query parameters: `http://localhost:3000/some-page?utm_source=test`
2. Check console for:
   ```
   [SEO-METRICS] Added canonical tag: http://localhost:3000/some-page
   ```
3. Inspect `<head>` for: `<link rel="canonical" href="..." data-seoagent="auto-generated">`

#### C. Test Open Graph Tags
1. Visit any page
2. Check console for OG tag additions
3. Inspect `<head>` for new meta tags:
   ```html
   <meta property="og:title" content="..." data-seoagent="auto-generated">
   <meta property="og:description" content="..." data-seoagent="auto-generated">
   ```

### **2. Testing GSC URL Inspection API**

#### Prerequisites
- Have GSC connection set up (Google Search Console OAuth)
- At least one verified website in your GSC account

#### Test the API
```bash
# Test URL inspection endpoint
curl -X POST http://localhost:3000/api/gsc/url-inspection \
  -H "Content-Type: application/json" \
  -d '{
    "siteUrl": "https://your-domain.com",
    "urls": ["https://your-domain.com/", "https://your-domain.com/about"],
    "userToken": "your-user-token"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "siteUrl": "https://your-domain.com",
    "inspectedUrls": 2,
    "results": [...],
    "summary": {
      "indexable": 2,
      "blocked": 0,
      "mobileUsable": 2,
      "withRichResults": 0,
      "errors": 0
    },
    "issues": [...],
    "automatedFixes": [...]
  }
}
```

### **3. Testing Sitemap Submission API**

#### A. List Existing Sitemaps
```bash
curl "http://localhost:3000/api/gsc/sitemap?siteUrl=https://your-domain.com&userToken=your-user-token"
```

#### B. Submit a Sitemap
```bash
curl -X POST http://localhost:3000/api/gsc/sitemap \
  -H "Content-Type: application/json" \
  -d '{
    "siteUrl": "https://your-domain.com",
    "sitemapUrl": "https://your-domain.com/sitemap.xml",
    "userToken": "your-user-token"
  }'
```

#### C. Verify in Google Search Console
1. Go to [Google Search Console](https://search.google.com/search-console)
2. Select your property
3. Go to "Sitemaps" section
4. Verify your sitemap appears in the submitted list

### **4. Testing Technical SEO Dashboard**

#### A. Add Dashboard to Your App
Add the dashboard component to a page (e.g., in a dashboard or settings page):

```tsx
import TechnicalSEODashboard from '@/components/TechnicalSEODashboard';

// In your component
<TechnicalSEODashboard 
  userToken="your-user-token"
  websites={[
    { domain: "example.com", website_token: "token1" },
    { domain: "anotherdomain.com", website_token: "token2" }
  ]}
/>
```

#### B. Test Dashboard Features
1. **Overview Cards**: Should show metrics for total pages, indexable pages, etc.
2. **Automated Fixes Section**: Click "Trigger Fixes" button
3. **Issues Tab**: Review detected issues and auto-fix capabilities
4. **Real-time Activity Tab**: See recent automation activity

#### C. Test Auto-Fix API
```bash
curl -X POST http://localhost:3000/api/technical-seo/auto-fix \
  -H "Content-Type: application/json" \
  -d '{
    "userToken": "your-user-token",
    "siteUrl": "https://your-domain.com",
    "fixTypes": ["schema_markup", "canonical_tags", "open_graph", "meta_tags"]
  }'
```

## 🔧 Advanced Testing Scenarios

### **1. End-to-End SEO Automation Test**

**Scenario**: New website gets full SEO automation treatment

1. **Setup**: Add a new website to your account
2. **GSC Connection**: Connect the website via Google Search Console
3. **Smart.js Installation**: Add smart.js to the website
4. **URL Inspection**: Run bulk URL inspection
5. **Automated Fixes**: Trigger automated fixes
6. **Verification**: Check that fixes were applied

### **2. Schema Markup Intelligence Test**

Create test pages with different content types:

#### A. Homepage Test
```html
<!-- Create a simple homepage -->
<!DOCTYPE html>
<html>
<head>
  <title>Test Website</title>
  <meta name="description" content="This is a test website">
</head>
<body>
  <h1>Welcome to Test Website</h1>
  <p>Contact us at test@example.com</p>
  <script>const idv = 'your-website-token';</script>
  <script src="https://your-domain.com/smart.js"></script>
</body>
</html>
```

**Expected Schema**: WebSite + Organization

#### B. Article Page Test
```html
<!DOCTYPE html>
<html>
<head>
  <title>How to Test SEO Automation</title>
</head>
<body>
  <article>
    <h1>How to Test SEO Automation</h1>
    <p>This article explains testing...</p>
  </article>
  <script>const idv = 'your-website-token';</script>
  <script src="https://your-domain.com/smart.js"></script>
</body>
</html>
```

**Expected Schema**: Article + BreadcrumbList

#### C. FAQ Page Test
```html
<!DOCTYPE html>
<html>
<head>
  <title>Frequently Asked Questions</title>
</head>
<body>
  <h1>FAQ</h1>
  <h2>What is SEO automation?</h2>
  <p>SEO automation is...</p>
  <h2>How does it work?</h2>
  <p>It works by...</p>
  <script>const idv = 'your-website-token';</script>
  <script src="https://your-domain.com/smart.js"></script>
</body>
</html>
```

**Expected Schema**: FAQPage

### **3. Performance Testing**

#### A. Bulk URL Inspection
Test with maximum URLs (50):
```bash
# Create array of 50 URLs for your domain
urls=$(python3 -c "
import json
base = 'https://your-domain.com'
urls = [f'{base}/page-{i}' for i in range(50)]
print(json.dumps(urls))
")

curl -X POST http://localhost:3000/api/gsc/url-inspection \
  -H "Content-Type: application/json" \
  -d "{\"siteUrl\": \"https://your-domain.com\", \"urls\": $urls, \"userToken\": \"your-user-token\"}"
```

#### B. Rate Limiting Test
Make multiple rapid requests to test rate limiting and error handling.

## 🐛 Debugging Common Issues

### **1. Smart.js Not Loading**
**Symptoms**: No console logs from smart.js
**Debug Steps**:
1. Check network tab for 404 errors
2. Verify `idv` variable is defined before smart.js loads
3. Check for JavaScript errors in console
4. Verify website token is correct

### **2. Schema Markup Not Generated**
**Symptoms**: No schema markup appears in page head
**Debug Steps**:
1. Check edge function logs in Supabase dashboard
2. Verify API endpoint is reachable
3. Check page content meets schema generation criteria
4. Review console for API errors

### **3. GSC API Errors**
**Symptoms**: 401/403 errors from GSC APIs
**Debug Steps**:
1. Verify OAuth tokens are not expired
2. Check GSC property ownership
3. Ensure API quotas are not exceeded
4. Verify environment variables are set

### **4. Database Connection Issues**
**Symptoms**: Database-related errors in API responses
**Debug Steps**:
1. Check Supabase connection string
2. Verify RLS policies allow operations
3. Ensure service role key has correct permissions
4. Check migration status

## 📊 Testing Checklist

- [ ] Database migrations applied successfully
- [ ] Edge function deployed and responding
- [ ] Smart.js loads without errors
- [ ] Schema markup generates correctly
- [ ] Canonical tags added when needed  
- [ ] Open Graph tags populate
- [ ] GSC URL inspection returns data
- [ ] Sitemap submission works
- [ ] Technical SEO dashboard displays
- [ ] Auto-fix API triggers successfully
- [ ] All database tables have correct data
- [ ] Error handling works as expected

## 🚀 Production Testing

### **1. Deploy to Staging/Production**
```bash
# Build and deploy
npm run build
# Deploy to Vercel/your hosting platform
```

### **2. Test with Real Websites**
1. Use actual websites with GSC access
2. Test with various content types
3. Monitor for 24 hours to see automation in action
4. Check GSC for improvements in indexing/schema

### **3. Monitor Performance**
1. Check API response times
2. Monitor database query performance  
3. Review edge function execution logs
4. Track automation success rates

## 📈 Success Metrics

After testing, you should see:
- **Schema markup** automatically added to pages
- **Canonical tags** fixed on pages with URL parameters
- **Open Graph tags** added to pages missing them
- **GSC data** flowing into your dashboard
- **Sitemaps** successfully submitted
- **Technical issues** automatically resolved

The Technical SEO Automation MVP is working correctly when websites show measurable SEO improvements without manual intervention!