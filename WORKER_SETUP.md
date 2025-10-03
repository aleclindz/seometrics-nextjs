# BullMQ Worker Setup for Railway

## Overview

The SEOAgent background worker system uses BullMQ with Redis for job processing. This document explains how to configure it properly to avoid hammering your Upstash Redis quota.

## Critical Architecture Decisions

### 1. Single Shared Redis Connection
- One `IORedis` connection shared across all queues, workers, and events
- Prevents connection churn and reduces Redis commands

### 2. Aggressive Rate Limiting
- Workers limited to **50 ops/sec** (adjustable per queue)
- Content generation: **20 ops/sec** (AI-heavy jobs)
- Stalled checks: **every 60 seconds** (instead of default 30s)
- Lock duration: **60 seconds** (reduces renewal frequency)

### 3. Separate Processes
- **Web replicas** (Vercel): Do NOT start workers or events
- **Worker replicas** (Railway): Start workers with `START_WORKERS=true`
- **Events leader** (single instance): Start events with `START_EVENTS=true`

## Environment Variables

### Required for All Processes

```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis (only if using queues)
ENABLE_REDIS_QUEUES=true
REDIS_URL=rediss://default:password@host:6379
```

### Worker-Specific (Railway)

```bash
# Enable worker processing
START_WORKERS=true

# Enable QueueEvents (ONLY on ONE instance)
START_EVENTS=true
```

### Web-Specific (Vercel)

```bash
# Do NOT set these on web replicas
# START_WORKERS=false (or omit)
# START_EVENTS=false (or omit)
```

## Railway Configuration

### Option 1: Single Worker Instance (Recommended)

**Railway Service: `seoagent-worker`**
- Scale: **1 replica** (important!)
- Environment Variables:
  ```bash
  ENABLE_REDIS_QUEUES=true
  START_WORKERS=true
  START_EVENTS=true
  REDIS_URL=rediss://...
  NEXT_PUBLIC_SUPABASE_URL=https://...
  SUPABASE_SERVICE_ROLE_KEY=...
  ```

### Option 2: Multiple Workers + Separate Events Leader

**Railway Service 1: `seoagent-workers`**
- Scale: 2-3 replicas
- Environment Variables:
  ```bash
  ENABLE_REDIS_QUEUES=true
  START_WORKERS=true
  START_EVENTS=false  # ❌ No events!
  REDIS_URL=rediss://...
  NEXT_PUBLIC_SUPABASE_URL=https://...
  SUPABASE_SERVICE_ROLE_KEY=...
  ```

**Railway Service 2: `seoagent-events-leader`**
- Scale: **1 replica** (MUST be exactly 1!)
- Environment Variables:
  ```bash
  ENABLE_REDIS_QUEUES=true
  START_WORKERS=false  # ❌ No workers!
  START_EVENTS=true
  REDIS_URL=rediss://...
  ```

## Vercel Configuration

Make sure your Vercel deployment does NOT start workers:

```bash
# .env.production (Vercel)
ENABLE_REDIS_QUEUES=false  # Or omit entirely
# DO NOT SET: START_WORKERS
# DO NOT SET: START_EVENTS
```

## Queue Configuration

### Active Queues

1. **agent-actions** (concurrency: 2)
   - General agent operations
   - Rate limit: 50 ops/sec

2. **content-generation** (concurrency: 1)
   - AI-powered article generation
   - Rate limit: 20 ops/sec (most conservative)
   - Long-running jobs

3. **technical-seo** (concurrency: 2)
   - SEO analysis and fixes
   - Rate limit: 50 ops/sec

4. **cms-publishing** (concurrency: 1)
   - Publishing to external CMS platforms
   - Rate limit: 50 ops/sec

5. **verification** (concurrency: 3)
   - Post-action verification tasks
   - Rate limit: 50 ops/sec

### Rate Limit Calculation

With **1 worker instance** and default settings:
- 5 workers × 50 ops/sec = **~250 Redis ops/sec**
- Content worker: 20 ops/sec (lower)
- Stalled checks: 5 queues × 1 check/60s = **~0.08 ops/sec**
- Total estimated: **~250-300 Redis ops/sec**

**Daily usage estimate:**
- 300 ops/sec × 86,400 seconds = **~26M requests/day**
- Upstash free tier: **500k requests/month** → Need paid plan!

## Upstash Plan Recommendations

### Current Usage
If you're hitting the 500k/month limit, you need:

1. **Upstash Pay-as-you-go**: $0.20 per 100k requests
   - ~26M requests/month = $52/month

2. **Reduce worker concurrency further**:
   - Lower rate limits to 25 ops/sec
   - Increase stalled interval to 120s
   - Run workers only during business hours

3. **Use separate Redis for queues**:
   - Keep cache/session Redis separate from BullMQ
   - Isolate request budgets

## Monitoring

### Check Redis Usage in Upstash Dashboard
- Navigate to your database → Metrics
- Watch "Commands/sec" graph
- Should see steady ~250-300 ops/sec (not spikes!)

### Railway Logs to Watch

**Good startup log:**
```
[WORKER] ✅ SEOAgent worker started successfully
[QUEUE MANAGER] Workers started successfully
[QUEUE MANAGER] Rate limiting: 50 ops/sec per worker
[QUEUE MANAGER] Stalled checks: every 60s
[QUEUE MANAGER] QueueEvents: ENABLED (leader mode)
[REDIS] Connected
```

**Bad startup log:**
```
ReplyError: ERR max requests limit exceeded
```

### Health Check Commands

```bash
# Check queue stats (from Railway terminal)
node -e "
const { queueManager } = require('./dist/src/services/queue/queue-manager.js');
(async () => {
  const stats = await queueManager.getQueueStats('content-generation');
  console.log('Queue stats:', stats);
})();
"
```

## Troubleshooting

### Problem: "max requests limit exceeded"

**Solution 1: Pause all queues immediately**
```typescript
import { queueManager } from './src/services/queue/queue-manager';

// Run this to stop bleeding
await queueManager.pauseQueue('agent-actions');
await queueManager.pauseQueue('content-generation');
await queueManager.pauseQueue('technical-seo');
await queueManager.pauseQueue('cms-publishing');
await queueManager.pauseQueue('verification');
```

**Solution 2: Scale down Railway workers to 0**
- In Railway dashboard: Scale replicas → 0
- Wait for quota to reset (monthly or upgrade plan)

**Solution 3: Lower rate limits**
- Edit `queue-manager.ts` → reduce `limiter.max` to 10-25

### Problem: Jobs stuck in "active" state

**Cause**: Stalled job detection might be too aggressive

**Solution**: Increase lock duration:
```typescript
lockDuration: 120000, // 2 minutes instead of 1 minute
stalledInterval: 120000, // Check every 2 minutes
```

### Problem: Multiple QueueEvents running

**Symptom**: Log shows duplicate "Job completed" messages

**Solution**: Ensure ONLY ONE instance has `START_EVENTS=true`

## Development vs Production

### Development (Local)

```bash
# .env.local
ENABLE_REDIS_QUEUES=false  # Use synchronous processing
```

### Production (Railway)

```bash
# Railway environment
ENABLE_REDIS_QUEUES=true
START_WORKERS=true
START_EVENTS=true  # Only on 1 instance!
REDIS_URL=rediss://...
```

## Cost Optimization Tips

1. **Run workers only when needed**
   - Use Railway's "Sleep" feature during off-hours
   - Or manually scale to 0 when not generating content

2. **Batch job additions**
   - Use `queue.addBulk([...])` instead of multiple `queue.add()` calls

3. **Increase intervals**
   - `stalledInterval: 300000` (5 minutes)
   - `blockingTimeout: 600000` (10 minutes for QueueEvents)

4. **Reduce concurrency**
   - Lower all worker concurrency to 1
   - Process jobs serially (slower but cheaper)

5. **Use job scheduling**
   - Queue jobs with `delay` or `repeat` options
   - Spread load over time instead of bursts

## Support

If you continue to have issues:

1. Check Upstash metrics for actual request rate
2. Review Railway logs for error patterns
3. Verify only 1 instance is running with `START_EVENTS=true`
4. Consider upgrading Upstash plan if sustained high usage is needed
