# Article Publishing UX Fix - Failed Publishes Stay in Drafts

## Problem

When clicking "Publish" on a drafted article, if publishing failed:
1. ❌ Article disappeared from the "Drafted Articles" list
2. ❌ No error indicator was shown
3. ❌ User couldn't retry publishing
4. ❌ No feedback about what went wrong

This created a confusing UX where failed publishes looked like they succeeded but the article just vanished.

## Solution Implemented

### 1. Enhanced Error Handling

**File:** `/src/components/ArticleQueueManager.tsx`

#### Updated Interface (Lines 25-35)
```typescript
interface PublishedArticleItem {
  id: number;
  title: string;
  slug: string;
  created_at?: string;
  published_at?: string | null;
  domain?: string;
  status?: string;
  error_message?: string | null;  // NEW: Store error message
  publishing?: boolean;            // NEW: Local state for button
}
```

#### Improved Publish Button Handler (Lines 658-751)

**Before (Broken):**
```typescript
onClick={async () => {
  try {
    showToast('Publishing…', 'info');
    const resp = await fetch('/api/articles/publish', {...});
    if (resp.ok) {
      // refresh and show success
    }
  } catch (e) {
    console.error('Publish failed', e); // ❌ Silent failure
  }
}}
```

**After (Fixed):**
```typescript
onClick={async () => {
  try {
    // Set publishing state
    setDrafts(prev => prev.map(art =>
      art.id === a.id
        ? { ...art, publishing: true, error_message: null }
        : art
    ));
    showToast('Publishing…', 'info');

    const resp = await fetch('/api/articles/publish', {...});

    if (resp.ok) {
      // Success: refresh and move to published
      // ... refresh logic
      showToast('Published successfully!', 'success', 3000);
    } else {
      // ✅ Handle error response
      const errorData = await resp.json().catch(() => ({}));
      const errorMessage = errorData.error || errorData.details || `Publishing failed (${resp.status})`;

      console.error('[PUBLISH] Failed:', resp.status, errorData);

      // ✅ Keep article in drafts with error message
      setDrafts(prev => prev.map(art =>
        art.id === a.id
          ? { ...art, publishing: false, error_message: errorMessage, status: 'publishing_failed' }
          : art
      ));

      showToast(`Publishing failed: ${errorMessage}`, 'error', 5000);
    }
  } catch (e) {
    // ✅ Handle network errors
    const errorMsg = e instanceof Error ? e.message : 'Unknown error';

    setDrafts(prev => prev.map(art =>
      art.id === a.id
        ? { ...art, publishing: false, error_message: errorMsg, status: 'publishing_failed' }
        : art
    ));

    showToast(`Publishing failed: ${errorMsg}`, 'error', 5000);
  }
}}
```

### 2. Visual Error Indicators

#### Error Message Display (Lines 653-656)
```typescript
{a.error_message && (
  <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200 max-w-xs">
    ⚠️ {a.error_message}
  </div>
)}
```

#### Button State Styling (Lines 741-747)
```typescript
className={`inline-flex items-center px-2 py-1 text-xs border rounded ${
  a.publishing
    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'      // During publishing
    : a.error_message
      ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'  // Error state
      : 'text-gray-700 hover:bg-gray-50'                   // Normal state
}`}
```

#### Button Text (Line 749)
```typescript
{a.publishing ? '⏳ Publishing...' : a.error_message ? 'Retry Publish' : 'Publish Now'}
```

### 3. Updated Status Filter

Added `'publishing_failed'` to the draft status filter in three places:

#### Initial Fetch (Lines 115-146)
```typescript
const isDraft = ['pending', 'generating', 'generated', 'publishing_failed'].includes(a.status);
```

#### Polling Interval (Lines 168-200)
```typescript
const isDraft = ['pending', 'generating', 'generated', 'publishing_failed'].includes(a.status);
```

#### Post-Publish Refresh (Lines 689-705)
```typescript
const isDraft = ['pending', 'generating', 'generated', 'publishing_failed'].includes(a.status);
```

### 4. Enhanced Data Mapping

All fetch operations now include `error_message` field:

```typescript
.map((a: any) => ({
  id: a.id,
  title: a.title,
  slug: a.slug,
  created_at: a.created_at,
  published_at: a.published_at,
  domain: a.websites?.domain,
  status: a.status,
  error_message: a.error_message  // NEW: Include error message from API
}))
```

## User Experience After Fix

### Before Fix
1. User clicks "Publish"
2. Publishing fails (404 error)
3. Article disappears ❌
4. No error message ❌
5. No way to retry ❌

### After Fix
1. User clicks "Publish"
2. Button shows "⏳ Publishing..." (disabled during request)
3. If publishing fails:
   - ✅ Article stays in "Drafted Articles" list
   - ✅ Red error box appears: "⚠️ Publishing failed: WordPress API endpoint not found (404)"
   - ✅ Button changes to "Retry Publish" with red styling
   - ✅ Error toast: "Publishing failed: WordPress API endpoint not found (404)"
   - ✅ Article status updates to `publishing_failed`
4. User can click "Retry Publish" to try again

## Database Support

The fix relies on the existing `error_message` column in the `article_queue` table, which is populated by the `/api/articles/publish` endpoint when publishing fails (see line 315 in `publish/route.ts`):

```typescript
await supabase
  .from('article_queue')
  .update({
    status: 'publishing_failed',
    error_message: publishError instanceof Error ? publishError.message : 'Publication failed',
    retry_count: (article.retry_count || 0) + 1,
    updated_at: new Date().toISOString()
  })
  .eq('id', articleId);
```

## Testing Checklist

- [x] Build succeeds with no TypeScript errors
- [ ] Failed publish keeps article in drafts list
- [ ] Error message displays correctly
- [ ] Button shows "Retry Publish" on error
- [ ] Button is disabled during publishing
- [ ] Error toast appears with full error message
- [ ] Retry button works and clears previous error
- [ ] Successful publish moves article to published list

## Files Modified

- ✅ `/src/components/ArticleQueueManager.tsx` - Enhanced publish button handler with error handling

## Related Fixes

This fix works in conjunction with:
- `WORDPRESS_PUBLISHING_FIX.md` - Fixed the root cause of 404 publishing errors
- `/src/app/api/articles/publish/route.ts` - Backend already sets `error_message` and `publishing_failed` status
