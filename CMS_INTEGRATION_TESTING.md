# CMS Integration Testing Guide

This document provides step-by-step instructions for testing the blog post submission and publishing functionality for WordPress, Strapi, and Ghost CMS integrations.

## Prerequisites

Before testing, ensure you have:
- [ ] Access to SEOAgent.com deployed instance
- [ ] User account with authentication
- [ ] Test websites added to your account

---

## 🎃 Ghost CMS Testing

### Setup Requirements
1. **Ghost Instance**: Self-hosted or Ghost Pro account
2. **Admin Access**: Ability to create Custom Integrations
3. **Ghost URL**: e.g., `https://yourblog.ghost.io`

### Test 1: Ghost Connection Setup

**Steps:**
1. Navigate to Website Setup Modal
2. Click "CMS" tab
3. Click "Ghost" option (👻 icon)
4. Enter your Ghost site URL
5. Get Admin API Key:
   - Go to Ghost Admin → Settings → Integrations
   - Click "Add custom integration"
   - Name it "SEOAgent"
   - Copy the **Admin API Key** (format: `id:secret`)
6. Paste API key into SEOAgent
7. Click "Test Connection"

**Expected Results:**
- ✅ Connection test should show: "Ghost connection successful! Full read and write access confirmed for [Site Name]"
- ✅ Should display site info (title, version)
- ✅ Should show post count
- ✅ Should confirm read and write access

**Failure Scenarios to Test:**
- ❌ Invalid API key format → Should show: "Invalid Ghost Admin API Key format"
- ❌ Wrong site URL → Should show: "Ghost site not found at this URL"
- ❌ Invalid credentials → Should show: "Authentication failed"

### Test 2: Ghost Draft Post Publishing

**Steps:**
1. Navigate to Content Writer or Article Queue
2. Create or select an article with:
   - Title: "SEOAgent Test Article - Ghost Draft"
   - Content: Sample blog post content (HTML)
   - Tags: ["test", "seoagent"]
   - Featured Image URL (optional)
3. Select Ghost CMS connection
4. Set status to "draft"
5. Click "Publish"

**Expected Results:**
- ✅ API call to `/api/cms/ghost/publish` succeeds
- ✅ Response includes article ID and Ghost URL
- ✅ Article appears in Ghost Admin as a **Draft**
- ✅ Content is properly converted from HTML to Lexical format
- ✅ Tags are correctly assigned
- ✅ Featured image is set (if provided)
- ✅ Slug is auto-generated from title

**Verify in Ghost Admin:**
- [ ] Draft post exists with correct title
- [ ] Content displays correctly
- [ ] Tags are present
- [ ] Featured image is set
- [ ] Meta description is populated

### Test 3: Ghost Published Post

**Steps:**
1. Repeat Test 2 but set status to "published"
2. Optionally add:
   - Custom excerpt
   - SEO meta title
   - SEO meta description
   - Published date

**Expected Results:**
- ✅ Article appears as **Published** in Ghost
- ✅ Article is immediately live on the blog
- ✅ SEO meta fields are properly set
- ✅ Custom excerpt displays in listings
- ✅ URL is accessible and returns valid content

**Verify on Live Blog:**
- [ ] Article is publicly accessible
- [ ] Content renders correctly
- [ ] Images display properly
- [ ] Tags appear in UI
- [ ] Meta tags are present in HTML source

---

## 📝 WordPress Testing

### Setup Requirements
1. **WordPress Instance**: Self-hosted WordPress site
2. **Application Password**: Generated for your user
3. **REST API Access**: `/wp-json/wp/v2` endpoint accessible

### Test 1: WordPress Connection Setup

**Steps:**
1. Navigate to Website Setup Modal
2. Click "CMS" tab
3. Click "WordPress" option
4. Click "Connect WordPress (Self-hosted)"
5. Enter your WordPress site URL
6. Enter username (without @)
7. Generate Application Password:
   - WordPress Admin → Users → Profile → Application Passwords
   - Create new password named "SEOAgent"
8. Paste application password (spaces are OK)
9. Click "Test Connection"

**Expected Results:**
- ✅ Connection test should show: "WordPress connection successful! Full read and write access confirmed"
- ✅ Should display site info (name, version)
- ✅ Should show user info and roles
- ✅ Should confirm read and write access

**Failure Scenarios:**
- ❌ Invalid credentials → "Authentication failed"
- ❌ REST API disabled → "WordPress REST API not found"
- ❌ WordPress.com hosted → Should guide user to use OAuth

### Test 2: WordPress Draft Post Publishing

**Steps:**
1. Create/select test article with:
   - Title: "SEOAgent Test - WordPress Draft"
   - Content: Sample HTML content
   - Categories: ["Technology", "SEO"]
   - Tags: ["test", "automation"]
   - Featured image URL
2. Select WordPress connection
3. Set status to "draft"
4. Click "Publish"

**Expected Results:**
- ✅ Post created as draft in WordPress
- ✅ Categories auto-created if they don't exist
- ✅ Tags auto-created if they don't exist
- ✅ Featured image set (if provided)
- ✅ Yoast SEO meta fields populated (if plugin installed)

**Verify in WordPress Admin:**
- [ ] Draft post exists
- [ ] Categories assigned correctly
- [ ] Tags assigned correctly
- [ ] Featured image set
- [ ] Content formatted properly

### Test 3: WordPress Published Post

**Steps:**
1. Publish article with status "published"
2. Include custom fields:
   - SEO title
   - SEO description
   - Publish date

**Expected Results:**
- ✅ Post immediately published
- ✅ SEO fields set correctly
- ✅ Custom publish date respected
- ✅ Post URL returned and accessible

---

## 🚀 Strapi Testing

### Setup Requirements
1. **Strapi Instance**: Self-hosted or cloud Strapi
2. **API Token**: Full access token from Strapi admin
3. **Content Type**: Blog post content type configured

### Test 1: Strapi Connection Setup

**Steps:**
1. Navigate to Website Setup Modal
2. Click "CMS" tab
3. Click "Strapi" option
4. Enter Strapi base URL (e.g., `https://api.yoursite.com`)
5. Generate API Token:
   - Strapi Admin → Settings → API Tokens
   - Create new token with "Full Access"
6. Paste API token
7. Click "Test Connection"

**Expected Results:**
- ✅ Connection test should discover content types
- ✅ Should show list of available content types
- ✅ Should highlight blog-suitable content types
- ✅ Should confirm read and write permissions

### Test 2: Strapi Content Type Discovery

**Steps:**
1. After connection succeeds, review discovered content types
2. Select appropriate content type for blog posts

**Expected Results:**
- ✅ Should show content types sorted by suitability
- ✅ Blog/article content types highlighted
- ✅ Field information displayed (rich text, media, etc.)

### Test 3: Strapi Draft Post Publishing

**Steps:**
1. Create test article
2. Select Strapi connection
3. Select content type
4. Set status to "draft" (if draft/publish enabled)
5. Publish

**Expected Results:**
- ✅ Entry created in Strapi
- ✅ Published status set to false (draft)
- ✅ Content properly formatted
- ✅ Required fields populated

**Verify in Strapi Admin:**
- [ ] Entry exists in content manager
- [ ] All fields populated correctly
- [ ] Draft status set appropriately
- [ ] Relations/media handled correctly

### Test 4: Strapi Published Entry

**Steps:**
1. Publish article with published status
2. Verify through Strapi API

**Expected Results:**
- ✅ Entry published immediately
- ✅ Available via API endpoint
- ✅ All metadata correct

---

## 🧪 Cross-CMS Testing Scenarios

### Test 1: Same Article to Multiple CMS

**Steps:**
1. Create a single article in SEOAgent
2. Publish to WordPress (draft)
3. Publish to Ghost (draft)
4. Publish to Strapi (draft)

**Expected Results:**
- ✅ All three CMS receive the article
- ✅ Content formatted appropriately for each CMS
- ✅ Article URLs tracked for each platform
- ✅ No interference between platforms

### Test 2: Rich Content Formatting

**Test Article Content:**
```html
<h2>Main Heading</h2>
<p>This is a paragraph with <strong>bold text</strong> and <em>italic text</em>.</p>
<ul>
  <li>List item 1</li>
  <li>List item 2</li>
</ul>
<blockquote>This is a quote</blockquote>
<a href="https://example.com">External link</a>
```

**Expected Results:**
- ✅ WordPress: HTML preserved
- ✅ Ghost: Converted to Lexical format properly
- ✅ Strapi: Formatted according to rich text field type
- ✅ All formatting elements render correctly

### Test 3: Special Characters & Unicode

**Test Content:**
```
Title: "Testing – Special Characters & Symbols"
Content: "Quotes", 'apostrophes', dashes—em & en–dash, emojis 🚀💡
```

**Expected Results:**
- ✅ All special characters preserved
- ✅ URLs properly encoded
- ✅ Emojis display correctly (if supported)
- ✅ No character encoding errors

### Test 4: Large Content

**Steps:**
1. Create article with 5000+ words
2. Include multiple images
3. Publish to all CMS platforms

**Expected Results:**
- ✅ No timeout errors
- ✅ All content transmitted
- ✅ No truncation
- ✅ Reasonable performance (<30s per publish)

---

## 🐛 Known Issues & Edge Cases

### Ghost Specific
- [ ] Lexical conversion may not preserve all HTML formatting
- [ ] Complex nested structures might simplify
- [ ] Featured images must be publicly accessible URLs

### WordPress Specific
- [ ] Application passwords require WordPress 5.6+
- [ ] WordPress.com requires OAuth (separate flow)
- [ ] Category/tag creation requires appropriate permissions

### Strapi Specific
- [ ] Content type structure varies by configuration
- [ ] Required fields must be identified correctly
- [ ] Media upload requires separate handling

---

## 📊 Test Results Template

| Test Case | CMS | Status | Notes |
|-----------|-----|--------|-------|
| Connection Setup | Ghost | ⏳ | |
| Draft Publishing | Ghost | ⏳ | |
| Published Post | Ghost | ⏳ | |
| Connection Setup | WordPress | ⏳ | |
| Draft Publishing | WordPress | ⏳ | |
| Published Post | WordPress | ⏳ | |
| Connection Setup | Strapi | ⏳ | |
| Draft Publishing | Strapi | ⏳ | |
| Published Entry | Strapi | ⏳ | |
| Cross-CMS Same Article | All | ⏳ | |
| Rich Formatting | All | ⏳ | |
| Special Characters | All | ⏳ | |
| Large Content | All | ⏳ | |

**Legend:**
- ⏳ Not Tested
- ✅ Passed
- ❌ Failed
- ⚠️ Partial/Issues

---

## 🔍 Debugging Tips

### Check API Responses
Use browser DevTools Network tab to inspect:
1. Request payload to `/api/cms/[cms-type]/publish`
2. Response status codes
3. Error messages in response body

### Check Server Logs
Review Vercel deployment logs for:
- `[GHOST PUBLISH]` logs
- `[WORDPRESS PUBLISH]` logs
- `[STRAPI PUBLISH]` logs
- Error stack traces

### Common Issues

**"Connection not found or access denied"**
- Verify connection saved properly in database
- Check user authentication token matches

**"Failed to create post"**
- Check API credentials still valid
- Verify CMS API endpoint accessible
- Review CMS-specific error in response

**"Invalid format" errors**
- Check API key/token format
- Verify required fields provided
- Review content encoding

---

## 🎯 Success Criteria

✅ **Ghost Integration Complete When:**
- [ ] Connection setup works end-to-end
- [ ] Draft posts publish successfully
- [ ] Published posts appear live immediately
- [ ] Tags, images, SEO fields work correctly
- [ ] Error handling provides clear messages

✅ **WordPress Integration Complete When:**
- [ ] Application password authentication works
- [ ] Posts create with correct categories/tags
- [ ] Featured images set properly
- [ ] SEO plugin fields populate (if installed)
- [ ] Both draft and published work

✅ **Strapi Integration Complete When:**
- [ ] Content type discovery works
- [ ] Multiple content types supported
- [ ] Draft/publish toggle works (if enabled)
- [ ] Required fields properly validated
- [ ] Entry appears in Strapi admin

---

## 📝 Testing Checklist Summary

- [ ] All three CMS connections test successfully
- [ ] Draft publishing works for all platforms
- [ ] Published/live publishing works for all platforms
- [ ] Content formatting preserved appropriately
- [ ] Tags/categories/taxonomies handled correctly
- [ ] Featured images work across platforms
- [ ] SEO meta fields populate correctly
- [ ] Error messages are user-friendly
- [ ] Cross-CMS publishing doesn't conflict
- [ ] Large content handles without timeout
- [ ] Special characters don't break encoding
- [ ] Database records created correctly
- [ ] Article URLs tracked and returned

---

**Last Updated:** 2025-01-10
**Integration Version:** Ghost v1.0, WordPress v1.0, Strapi v1.0
