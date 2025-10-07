# Publishing 400 Error - Diagnostic Summary

## Current Status

Getting **400 Bad Request** error when trying to publish articles to WordPress.com.

## Diagnostic Results

### ✅ What's Working

1. **Articles have content** - All draft articles have generated content
2. **CMS connection exists** - WordPress.com connection (ID: 6) is active
3. **Website ID matches** - Article website_id (23) matches CMS connection website_id (23)
4. **User token matches** - Both article and connection have the same user_token
5. **OAuth token present** - WordPress.com access token exists (64 chars)

### Example Diagnostic Run

```
Article 20: "5 Best Suppliers & Procurement Tools for 2025"
   - Status: publishing_failed
   - Website ID: 23 ✓
   - CMS Connection ID: null (will use fallback)
   - Has Content: true ✓
   - Content Length: 7119 chars ✓

CMS Connection 6:
   - Website ID: 23 ✓
   - Type: wordpress_com ✓
   - Status: active ✓
   - Has OAuth Token: true ✓

Diagnostic Result: Should be publishable ✓
```

## The Mystery

**All conditions are met** according to the diagnostic script, yet publishing still returns **400 Bad Request**.

## Hypothesis

The 400 error might be caused by:

1. **Environment variable issue** - Publish endpoint can't access Supabase credentials properly in production
2. **Different query path** - The publish endpoint SQL query might be structured differently than the diagnostic
3. **Hidden validation** - Some other validation we haven't logged yet
4. **Request body issue** - The request from the UI might be malformed

## Enhanced Logging Added

Added detailed console logs to identify which 400 error is being triggered:

### `/src/app/api/articles/publish/route.ts`

**Line 25:** Missing userToken or articleId
```typescript
console.error('[PUBLISH EDGE] 400 ERROR: Missing required fields', {...});
```

**Line 62:** Article content not generated
```typescript
console.error('[PUBLISH EDGE] 400 ERROR: Article content not generated yet', {...});
```

**Lines 73-125:** CMS connection resolution with detailed logging
```typescript
console.log('[PUBLISH EDGE] CMS connection resolution:', {...});
console.log('[PUBLISH EDGE] Fallback connection search result:', {...});
console.error('[PUBLISH EDGE] 400 ERROR: No CMS connection found', {...});
console.log('[PUBLISH EDGE] Using CMS connection:', {...});
```

## Next Steps to Diagnose

### Option 1: Check Production Logs (Recommended)

After deploying the enhanced logging:

1. Go to Vercel dashboard
2. Navigate to project logs
3. Try publishing an article
4. Search logs for `[PUBLISH EDGE]`
5. Identify which 400 error is being triggered

Look for one of these error patterns:
- `400 ERROR: Missing required fields`
- `400 ERROR: Article content not generated yet`
- `400 ERROR: No CMS connection found`

### Option 2: Test Locally

Run the publish endpoint locally with the same data:

```bash
curl -X POST http://localhost:3000/api/articles/publish \
  -H "Content-Type: application/json" \
  -d '{
    "userToken": "71d3a313-563d-4701-afa5-59d3ba8d7a9c",
    "articleId": 20,
    "publishDraft": true
  }'
```

Then check console output for `[PUBLISH EDGE]` logs.

### Option 3: Use Diagnostic Scripts

Two new diagnostic scripts created:

**List all draft articles:**
```bash
npx tsx scripts/list-draft-articles.ts 71d3a313-563d-4701-afa5-59d3ba8d7a9c
```

**Diagnose specific article:**
```bash
npx tsx scripts/diagnose-article-publish.ts 20 71d3a313-563d-4701-afa5-59d3ba8d7a9c
```

## Files Modified

- ✅ `/src/app/api/articles/publish/route.ts` - Added comprehensive logging for 400 errors
- ✅ `/scripts/diagnose-article-publish.ts` - New diagnostic script
- ✅ `/scripts/list-draft-articles.ts` - List all draft articles for a user

## Build Status

✅ **Build successful** - No TypeScript errors

Ready to deploy to production for enhanced logging.

## Recommendation

**Deploy the enhanced logging to production**, then attempt to publish an article while monitoring Vercel logs in real-time. The detailed logs will tell us exactly which validation is failing.
