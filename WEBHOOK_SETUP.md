# Vercel Webhook Setup for Automatic Deployment Fixes

## Overview
This document explains how to configure the Vercel webhook that enables automatic deployment fix system.

## Architecture

```
Vercel Deployment Fails
    ↓
Webhook fires → /api/webhooks/vercel-deployment
    ↓
Error Analysis (fetch build logs, analyze errors)
    ↓
Queue Fix → auto_fix_queue table
    ↓
Cron Job (every 5 min) → /api/cron/auto-fix-deployments
    ↓
Apply Automated Fixes (ESLint, imports, etc.)
    ↓
Git Commit & Push → Trigger New Deployment
    ↓
Success → Clear queue | Fail → Retry (max 3x)
```

## Quick Setup (Manual - Vercel Dashboard)

### 1. Navigate to Webhook Settings
- Go to: https://vercel.com/baxter/seometrics-nextjs/settings/webhooks
- Click "Create Webhook"

### 2. Configure Webhook
- **URL**: `https://seoagent.com/api/webhooks/vercel-deployment`
- **Events**: Select the following:
  - ✅ `deployment.error` - Build/deployment errors
  - ✅ `deployment.failed` - Failed deployments
  - ✅ `deployment.success` - Successful deployments (to clear queue)
- **Secret**: Generate with: `openssl rand -hex 32`
- **Projects**: Select "seometrics-nextjs"

### 3. Add Environment Variables
In Vercel project settings (https://vercel.com/baxter/seometrics-nextjs/settings/environment-variables):

```bash
# Webhook signature verification
VERCEL_WEBHOOK_SECRET=<secret-from-step-2>

# API token for fetching deployment logs (already exists)
VERCEL_TOKEN=<your-vercel-api-token>

# Cron authentication (already exists)
CRON_SECRET=<your-cron-secret>
```

### 4. Database Migration
Run the migration to create required tables:

```bash
# Connect to Supabase and run migration
psql -h db.kfbuflsjbkncehtmykhj.supabase.co -U postgres -d postgres -f migrations/027_deployment_automation.sql
```

Or use Supabase dashboard SQL editor:
- Navigate to: https://supabase.com/dashboard/project/kfbuflsjbkncehtmykhj/sql
- Paste contents of `migrations/027_deployment_automation.sql`
- Execute

## API Setup (Programmatic - Using Vercel API)

### Prerequisites
```bash
export VERCEL_TOKEN="your-vercel-api-token"
export VERCEL_WEBHOOK_SECRET=$(openssl rand -hex 32)
```

### Create Webhook
```bash
curl -X POST "https://api.vercel.com/v1/webhooks" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://seoagent.com/api/webhooks/vercel-deployment",
    "events": [
      "deployment.error",
      "deployment.failed",
      "deployment.success"
    ],
    "projectIds": ["prj_8n5bC0IAtBfKx6Z5LW60jZTAVt6O"]
  }'
```

## Testing the System

### 1. Trigger a Deployment Failure
Create an intentional ESLint error:

```typescript
// In any component, add unescaped quote
<p>Don't use quotes</p>  // This will fail ESLint
```

Commit and push:
```bash
git add .
git commit -m "test: trigger deployment failure"
git push
```

### 2. Monitor Webhook
Check webhook received the failure:
```bash
# Check deployment_failures table
SELECT * FROM deployment_failures ORDER BY created_at DESC LIMIT 5;

# Check auto_fix_queue
SELECT * FROM auto_fix_queue ORDER BY created_at DESC LIMIT 5;
```

### 3. Wait for Auto-Fix
The cron job runs every 5 minutes. Monitor:
```bash
# Check cron logs in Vercel dashboard
# Or query auto_fix_queue for status updates
SELECT id, deployment_id, status, fix_notes, retry_count
FROM auto_fix_queue
WHERE status IN ('processing', 'completed', 'failed')
ORDER BY created_at DESC;
```

### 4. Verify Fix Applied
- Check git history for auto-fix commit
- Verify new deployment succeeded
- Confirm queue status changed to 'completed'

## Monitoring & Debugging

### Check Webhook Deliveries
- Vercel Dashboard → Settings → Webhooks → View Recent Deliveries
- Look for 200 status codes (success)

### Query Database
```sql
-- Recent deployment failures
SELECT
  deployment_id,
  project_name,
  status,
  array_length(errors, 1) as error_count,
  created_at
FROM deployment_failures
ORDER BY created_at DESC
LIMIT 10;

-- Pending fixes
SELECT * FROM get_pending_fixes();

-- Fix success rate
SELECT
  status,
  COUNT(*) as count,
  AVG(retry_count) as avg_retries
FROM auto_fix_queue
GROUP BY status;
```

### Cron Job Logs
- Navigate to: https://vercel.com/baxter/seometrics-nextjs/logs
- Filter by: `/api/cron/auto-fix-deployments`

## How It Works

### 1. Webhook Endpoint (`/api/webhooks/vercel-deployment`)
- Receives deployment events from Vercel
- Verifies webhook signature for security
- Fetches detailed build logs from Vercel API
- Analyzes errors using pattern matching
- Queues fixes in `auto_fix_queue` table

### 2. Error Analysis
Common patterns detected:
- `react/no-unescaped-entities` → Replace quotes with HTML entities
- `@next/next/no-img-element` → Add Image import
- `Type error` → Flag for manual review
- `Module not found` → Suggest npm install

### 3. Auto-Fix Cron (`/api/cron/auto-fix-deployments`)
Runs every 5 minutes:
1. Fetch pending fixes from queue
2. Attempt automated fixes (file edits)
3. Run `npm run build` to verify
4. Commit and push if successful
5. Update queue status
6. Retry up to 3 times if failed

### 4. Automatic Fixes Applied
- Quote escaping (apostrophes → `&apos;`)
- Image imports (`<img>` → `<Image>`)
- File-level fixes for ESLint errors
- Auto-commit with descriptive message

### 5. Manual Review Required
Complex errors flagged for human review:
- TypeScript type mismatches
- Missing dependencies (install required)
- Logic errors
- Build configuration issues

## Environment Variables Reference

```bash
# Required for webhook system
VERCEL_WEBHOOK_SECRET=<32-char-hex-secret>    # Webhook signature verification
VERCEL_TOKEN=<vercel-api-token>                # Fetch deployment logs
CRON_SECRET=<cron-auth-secret>                 # Cron job authentication

# Database (already configured)
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<service-key>
```

## Security Considerations

1. **Webhook Signature Verification**: All webhook requests verified with HMAC-SHA1
2. **Cron Authentication**: Bearer token required for cron endpoints
3. **Rate Limiting**: 2-second delay between fix attempts
4. **Retry Limit**: Max 3 automatic fix attempts per failure
5. **Service Role**: Database operations use Supabase service role key

## Troubleshooting

### Webhook Not Firing
- Check webhook URL is correct: `https://seoagent.com/api/webhooks/vercel-deployment`
- Verify events selected: `deployment.error`, `deployment.failed`, `deployment.success`
- Check Vercel webhook delivery logs for errors

### Fixes Not Applied
- Verify `CRON_SECRET` environment variable set
- Check cron job logs for errors
- Query `auto_fix_queue` for status and error messages
- Ensure git credentials configured in deployment environment

### Build Still Failing
- Check `retry_count` in `auto_fix_queue` (max 3)
- Review `fix_notes` and `last_error` columns
- May require manual intervention for complex errors

## Support

For issues or questions:
1. Check this documentation
2. Review Vercel webhook delivery logs
3. Query database tables for error details
4. Check cron job logs in Vercel dashboard
5. Review CLAUDE.md for deployment guidelines

---

**Status**: ✅ System configured and ready
**Last Updated**: 2025-10-01
