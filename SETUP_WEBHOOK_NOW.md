# 🚨 URGENT: Setup Vercel Webhook for Auto-Fix System

## Why You're Seeing This

Your deployment failed, but the webhook system **is not configured** yet, so no automatic fix was triggered.

## Quick Fix (5 Minutes)

### Step 1: Go to Vercel Webhook Settings

🔗 **[Click here to open webhook settings](https://vercel.com/baxter/seometrics-nextjs/settings/webhooks)**

### Step 2: Click "Create Webhook"

### Step 3: Fill in the form:

**URL:**
```
https://seoagent.com/api/webhooks/vercel-deployment
```

**Events** - Check ONLY these two:
- ✅ `deployment.error` (Build/deployment errors)
- ✅ `deployment.succeeded` (Successful deployments)

**Secret:** Generate one by running:
```bash
openssl rand -hex 32
```

Copy the output and paste it into the "Secret" field.

**Projects:** Select `seometrics-nextjs`

### Step 4: Click "Create"

### Step 5: Add Environment Variable

🔗 **[Click here to add environment variable](https://vercel.com/baxter/seometrics-nextjs/settings/environment-variables)**

Add this variable:

- **Key**: `VERCEL_WEBHOOK_SECRET`
- **Value**: [Paste the secret you generated in Step 3]
- **Environments**: Production, Preview, Development

Click "Save"

### Step 6: Redeploy

The webhook will now monitor all future deployments!

---

## What Happens After Setup?

1. **Deployment fails** → Webhook fires immediately
2. **Error analysis** → Build logs fetched and analyzed
3. **Auto-fix queued** → Fix stored in database
4. **Cron runs** (every 5 min) → Applies automated fixes
5. **Auto-commit & push** → Triggers new deployment
6. **Success!** → Deployment fixed automatically

---

## Common Errors That Auto-Fix Handles

✅ **Unescaped quotes in JSX** (`react/no-unescaped-entities`)
✅ **Missing `next/image` imports** (`@next/next/no-img-element`)
✅ **Simple ESLint errors** (formatting, unused vars)

⚠️ **Manual review needed** for:
- TypeScript type errors
- Missing dependencies
- Complex logic errors

---

## Check if Webhook is Working

After setup, manually trigger a test deployment failure:

```bash
# Add an intentional error
echo '<p>Dont use quotes</p>' >> test-file.tsx

# Commit and push
git add test-file.tsx
git commit -m "test: trigger webhook"
git push

# Wait 5 minutes for auto-fix
# Check logs: https://vercel.com/baxter/seometrics-nextjs/logs
```

---

## Database Tables

The auto-fix system uses these tables (already created):

- `deployment_failures` - Logs all failed deployments
- `auto_fix_queue` - Queue of pending fixes
- `get_pending_fixes()` - Helper function

If you need to check the migration was run:

```bash
# Check if tables exist
psql -h db.kfbuflsjbkncehtmykhj.supabase.co -U postgres -d postgres -c "\dt deployment_failures"
```

---

## Environment Variables Checklist

Make sure these are set in Vercel:

- ✅ `VERCEL_WEBHOOK_SECRET` - (Add in Step 5)
- ✅ `VERCEL_TOKEN` - For fetching build logs
- ✅ `CRON_SECRET` - For authenticating cron job
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Already set
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Already set

---

## Why Didn't It Work for the Last Failure?

The deployment that failed (commit `6d4998b`) was **before** the webhook was configured.

The webhook system was:
- ✅ Code deployed to production
- ✅ Endpoint ready at `/api/webhooks/vercel-deployment`
- ✅ Cron job ready at `/api/cron/auto-fix-deployments`
- ❌ **Webhook NOT configured in Vercel** ← This is why it didn't trigger

---

## After You Set It Up

The system will:
1. ✅ Monitor all deployments automatically
2. ✅ Fix common errors within 5 minutes
3. ✅ Commit fixes with descriptive messages
4. ✅ Retry up to 3 times if needed
5. ✅ Flag complex errors for manual review

---

## Need Help?

See full documentation: `WEBHOOK_SETUP.md`

Or run the automated setup script:
```bash
export VERCEL_TOKEN="your-token"
./scripts/setup-vercel-webhook.sh
```

---

**⏱️ Time to complete:** 5 minutes
**🎯 Benefit:** Never manually fix deployment errors again!
