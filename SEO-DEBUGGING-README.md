# SEO Agent Debugging & Audit Tools

This document explains how to use the comprehensive debugging and audit tools created to investigate why seoagent.com (or any website) may not be generating alt-tags or meta-tags properly.

## 🔍 Problem Analysis

The seoagent.com website has the smart.js script installed but no alt-tags or meta-tags are being generated. This could be due to several issues:

1. **Database Issues**: Website token doesn't exist or is misconfigured
2. **API Issues**: Edge Functions not working properly
3. **Configuration Issues**: Feature flags disabled or incorrect setup
4. **Script Issues**: JavaScript not executing or encountering errors

## 🛠️ Available Tools

### 1. Database Audit Script

**Purpose**: Check if website token exists in database and verify configuration

**Usage**:
```bash
npm run audit-db
```

**What it checks**:
- ✅ Website token existence (`1c9d8bc5-14eb-4223-a6ff-8c69d6aab1d8`)
- ✅ Website configuration (domain, feature flags, user association)
- ✅ Associated user account
- ✅ Existing alt-tags and meta-tags count
- ✅ API endpoint connectivity tests

**Example Output**:
```
🔍 SEO Agent Database Audit
================================
Target Token: 1c9d8bc5-14eb-4223-a6ff-8c69d6aab1d8
Target Domain: seoagent.com

1️⃣ Checking website token existence...
✅ Website token found!

📊 Website Configuration:
------------------------
Domain: seoagent.com
User Token: abc123...
Language: english
Meta Tags Enabled: true
Image Tags Enabled: true
Meta Tags Count: 0
Image Tags Count: 0
```

### 2. Database Initialization Script

**Purpose**: Create or update the seoagent.com website record in the database

**Usage**:
```bash
# First set the admin user token
export ADMIN_USER_TOKEN="your-admin-user-token"

# Then run the initialization
npm run init-seoagent
```

**What it does**:
- ✅ Verifies admin user exists
- ✅ Creates or updates website record
- ✅ Sets proper configuration (domain, feature flags)
- ✅ Tests API endpoints after setup

**Creating Admin User** (if needed):
```bash
node scripts/init-seoagent-website.js --create-admin admin@seoagent.com
```

### 3. Debug Dashboard

**Purpose**: Real-time debugging interface for testing SEO Agent functionality

**Access**: Visit `/debug-seo` in your browser (requires authentication)

**Features**:
- 🔍 **Website Token Validation**: Checks if token is properly formatted
- 🔍 **Database Website Record**: Verifies website exists in database
- 🔍 **Meta Tags API Test**: Tests meta-tag generation API
- 🔍 **Alt Tags API Test**: Tests alt-tag generation API
- 🔍 **Smart.js Script Status**: Checks if script is loaded properly
- 🔍 **Browser Console Logs**: Instructions for checking console logs
- 📊 **Current Page Analysis**: Shows images and meta-tags on current page

**Usage**:
1. Login to your SEO Agent account
2. Navigate to `/debug-seo`
3. Click "Run All Tests" or run individual tests
4. Review results for any errors or issues

### 4. Enhanced Logging

**Browser Console Logs**:
The smart.js script now provides comprehensive logging. Open browser DevTools (F12) and look for:

```
[SEO-AGENT] Smart.js initializing...
[SEO-METRICS] API Base URL: https://...
[SEO-AGENT] Website token (idv): 1c9d8bc5-14eb-4223-a6ff-8c69d6aab1d8
[SEO-AGENT] Current page URL: https://seoagent.com/
[SEO-AGENT] Found 5 total img elements
[SEO-AGENT] Filtered to 3 non-SVG images
[SEO-AGENT] Meta tags processed successfully
```

**Edge Function Logs**:
Check Supabase Edge Function logs for detailed server-side information:

```
[META-TAGS] Function called with method: POST
[META-TAGS] Processing smart.js request for URL: https://seoagent.com/
[META-TAGS] Found website: seoagent.com, meta_tags_enabled: true
[META-TAGS] Meta tags processed successfully
```

## 🚀 Quick Start Troubleshooting

### Step 1: Check Database
```bash
npm run audit-db
```

### Step 2: If Website Not Found
```bash
# Set admin user token (get from database or create new user)
export ADMIN_USER_TOKEN="your-admin-user-token"

# Initialize website
npm run init-seoagent
```

### Step 3: Test in Browser
1. Visit your website
2. Open DevTools (F12) → Console
3. Look for `[SEO-AGENT]` logs
4. Check for any error messages

### Step 4: Use Debug Dashboard
1. Login to SEO Agent
2. Visit `/debug-seo`
3. Run all tests
4. Review any failed tests

## 🔧 Environment Variables Required

Make sure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ADMIN_USER_TOKEN=your_admin_user_token
```

## 📋 Common Issues & Solutions

### Issue 1: Website Token Not Found
**Symptoms**: Audit script shows "Website token not found"
**Solution**: Run `npm run init-seoagent` to create the website record

### Issue 2: API Endpoints Return 404
**Symptoms**: Debug dashboard shows API test failures
**Solution**: Check Edge Functions are deployed and OpenAI API key is configured

### Issue 3: Smart.js Not Loading
**Symptoms**: No console logs starting with `[SEO-AGENT]`
**Solution**: Check script is included in HTML and website token is defined

### Issue 4: Feature Flags Disabled
**Symptoms**: API returns "disabled" messages
**Solution**: Check database record has `enable_meta_tags: true` and `enable_image_tags: true`

### Issue 5: Permission Errors
**Symptoms**: 401/403 errors in API calls
**Solution**: Check Supabase RLS policies and anonymous key permissions

## 🔍 Advanced Debugging

### Check Supabase Edge Function Logs
1. Go to Supabase Dashboard
2. Navigate to Edge Functions
3. Click on function name
4. View logs for detailed error information

### Check Network Requests
1. Open DevTools → Network tab
2. Reload page
3. Look for requests to `/functions/v1/generate-meta-tags` and `/functions/v1/generate-image-alt`
4. Check response status and content

### Verify Database Tables
Query these tables directly in Supabase:
- `websites` - Website configuration
- `login_users` - User accounts
- `alt_tags` - Generated alt-tags
- `meta_tags` - Generated meta-tags

## 📞 Support

If you're still having issues after using these tools:

1. **Gather Information**: Run all diagnostic tools and collect output
2. **Check Logs**: Review browser console and Edge Function logs
3. **Document Issue**: Include specific error messages and configuration details
4. **Test Environment**: Verify all environment variables are set correctly

The debugging tools should help identify exactly where the issue is occurring and provide specific steps to resolve it.