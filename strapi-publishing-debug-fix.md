# Strapi Publishing Debug & Fix Summary

## Issues Identified & Fixed ✅

### 1. **CMS Manager Database Schema Mismatch** ✅
**Problem**: CMS Manager was using modern schema (`user_id`, `is_active`) but database has legacy schema (`user_token`, `status`)
**Error**: `400 Bad Request` when querying `cms_connections` table  
**Fixed**: Updated `/src/lib/cms/cms-manager.ts` to use correct column names:
- `user_id` → `user_token`
- `is_active` → `status = 'active'`
- Updated `dbRecordToConnection()` to map legacy schema properly

### 2. **Created Supabase Edge Function** ✅
**File**: `/supabase/functions/publish-article/index.ts`
**Purpose**: Replace Vercel Edge Functions with Supabase Edge Functions
**Features**:
- Same publishing logic as current API
- Improved Strapi content type parsing
- Better error handling and logging
- CORS support for frontend calls

## Current Strapi Publishing Error Analysis

The error you're seeing:
```
"Method not allowed for endpoint: api::blog-post.blog-post"
```

This suggests the content type parsing is still having issues. Here's what to debug:

### Debug Steps:

#### 1. **Check your CMS Connection Data**
Run this in Supabase SQL Editor to see Article 2's CMS connection:
```sql
SELECT 
  aq.*,
  cc.connection_name,
  cc.cms_type,
  cc.base_url,
  cc.content_type,
  cc.status
FROM article_queue aq
LEFT JOIN cms_connections cc ON cc.id = aq.cms_connection_id
WHERE aq.id = 2 AND aq.user_token = '71d3a313-563d-4701-afa5-59d3ba8d7a9c';
```

#### 2. **Test CMS Connection Directly**
Check if your Strapi instance is accessible:
```bash
curl -X GET "https://your-strapi-instance.com/api/blog-posts" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

#### 3. **Check Strapi Content Type**
In your Strapi admin:
1. Go to **Content-Type Builder**
2. Check what the actual API ID is for your blog posts
3. It might be `api/blog-posts` (plural) rather than `api::blog-post.blog-post`

## Next Steps

### Option A: Use Current API (Quick Fix)
The CMS Manager fix should resolve the 400 error. Try publishing Article 2 again with the current API.

### Option B: Deploy Supabase Edge Function (Recommended)
1. **Deploy the Edge Function**:
   ```bash
   npx supabase functions deploy publish-article
   ```

2. **Update Frontend to Call Supabase Function**:
   Replace the current `/api/articles/publish` calls with:
   ```typescript
   const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/publish-article`, {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
       'Content-Type': 'application/json',
     },
     body: JSON.stringify({ userToken, articleId, publishDraft })
   })
   ```

### Option C: Debug Strapi Content Type
If still getting Method Not Allowed:
1. Check your Strapi API endpoints in browser: `https://your-strapi-instance.com/api/`
2. Verify the correct content type format
3. Try posting directly to the endpoint with Postman/curl

## Files Modified:
- ✅ `/src/lib/cms/cms-manager.ts` - Fixed database schema mismatch
- ✅ `/supabase/functions/publish-article/index.ts` - New Supabase Edge Function
- ✅ `/supabase/migrations/020_granular_article_status_corrected.sql` - Status enum fix

## Expected Result:
After these fixes, Article 2 should:
1. ✅ Show **"Retry Publishing"** button (fixed with granular statuses)
2. ✅ Successfully query CMS connection data (fixed with schema alignment)  
3. 🔄 **Publish to Strapi** (test with either current API or new Edge Function)

Try publishing Article 2 again - the 400 CMS connection error should be resolved!