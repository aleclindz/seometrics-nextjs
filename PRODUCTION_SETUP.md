# SEOAgent Production Setup Guide

## 🚀 Redis & Bull Queue Production Setup

## ⚡ **Quick Start (Upstash - Recommended)**

**Most users should follow these steps:**

1. **Create Upstash Redis Database:**
   - Go to https://console.upstash.com → Create account → Create Database
   - Copy your connection details from the database page

2. **Add to Vercel Environment Variables:**
   ```bash
   REDIS_URL=redis://default:YOUR_PASSWORD@your-db.upstash.io:6379
   UPSTASH_REDIS_REST_URL=https://your-db.upstash.io  
   UPSTASH_REDIS_REST_TOKEN=YOUR_TOKEN
   BULL_REDIS_URL=redis://default:YOUR_PASSWORD@your-db.upstash.io:6379
   ```

3. **Install Dependencies:**
   ```bash
   npm install bull redis ioredis @types/bull
   ```

4. **Deploy and Test:**
   ```bash
   vercel deploy
   curl https://your-app.vercel.app/api/test/agent-health
   ```

**For detailed setup options, continue reading below.**

---

### **Step 1: Create Redis Database**

#### **Option A: Upstash Redis (Recommended - Free Tier Available)**

1. **Sign up at Upstash:**
   - Go to https://console.upstash.com
   - Create account (GitHub/Google signup available)
   - Verify email if required

2. **Create Redis Database:**
   ```bash
   # Click "Create Database" in Upstash console
   # Choose settings:
   # - Name: seoagent-redis (or your preference)
   # - Type: Regional (cheaper) or Global (faster)
   # - Region: Choose closest to your Vercel deployment region
   # - TLS: Enable (recommended for security)
   ```

3. **Get Connection Details:**
   - After creation, click on your database
   - Copy these values from the "Details" tab:
     - **UPSTASH_REDIS_REST_URL**: `https://your-db.upstash.io`
     - **UPSTASH_REDIS_REST_TOKEN**: `AYourTokenHere`
     - **Endpoint**: `your-db.upstash.io`
     - **Password**: Your password

4. **Format Connection String:**
   ```bash
   # Your REDIS_URL will look like:
   redis://default:YOUR_PASSWORD@your-db.upstash.io:6379
   ```

#### **Option B: Vercel KV (Vercel's Redis Service)**

1. **Enable Vercel KV:**
   ```bash
   # In your Vercel project dashboard:
   # 1. Go to Storage tab
   # 2. Click "Create Database" 
   # 3. Select "KV (Redis)"
   # 4. Choose region and create
   ```

2. **Get Connection Details:**
   - Vercel automatically adds these environment variables:
     - `KV_URL`
     - `KV_REST_API_URL`
     - `KV_REST_API_TOKEN`

#### **Option C: Redis Cloud (Enterprise Option)**

1. **Sign up at Redis Cloud:**
   - Go to https://redis.com/try-free/
   - Create account and verify email

2. **Create Database:**
   - Click "New Database"
   - Choose free tier (30MB) or paid plan
   - Select region close to your users
   - Note down endpoint and password

### **Step 2: Add Redis Environment Variables to Vercel**

#### **For Upstash:**
```bash
# Add these to your Vercel project environment variables:
vercel env add REDIS_URL "redis://default:YOUR_PASSWORD@your-db.upstash.io:6379"
vercel env add UPSTASH_REDIS_REST_URL "https://your-db.upstash.io"
vercel env add UPSTASH_REDIS_REST_TOKEN "YOUR_TOKEN"

# Also set these for Bull queue compatibility:
vercel env add BULL_REDIS_URL "redis://default:YOUR_PASSWORD@your-db.upstash.io:6379"
```

#### **For Vercel KV (automatically added):**
```bash
# Vercel KV automatically provides:
# KV_URL=your-connection-string
# KV_REST_API_URL=https://your-db.kv.vercel-storage.com
# KV_REST_API_TOKEN=your-token

# Add these for Bull compatibility:
vercel env add REDIS_URL $KV_URL
vercel env add BULL_REDIS_URL $KV_URL
```

#### **Adding via Vercel Dashboard:**
1. Go to your Vercel project dashboard
2. Click "Settings" → "Environment Variables"
3. Add each variable for all environments (Development, Preview, Production)

#### **Adding via CLI:**
```bash
# Set for production
vercel env add REDIS_URL production
# Paste your Redis URL when prompted

# Set for preview
vercel env add REDIS_URL preview

# Set for development  
vercel env add REDIS_URL development
```

### **Step 3: Install Required Dependencies**

```bash
npm install bull redis ioredis @types/bull
npm install --save-dev @types/redis
```

### **Step 4: Configure Bull Queue (Already Exists)**

The codebase already has Bull configured in:
- `src/lib/queue-manager.ts` - Queue management
- `src/lib/email-queue.ts` - Email processing
- `src/app/api/cron/` - Scheduled jobs

### **Step 5: Update Environment Variables**

Add these to your `.env.local` and Vercel production:

```bash
# Redis Configuration  
REDIS_URL=redis://default:password@hostname:port
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-password

# Bull Configuration
BULL_REDIS_URL=redis://default:password@hostname:port

# Queue Configuration
ENABLE_QUEUES=true
QUEUE_CONCURRENCY=5
QUEUE_MAX_ATTEMPTS=3
```

### **Step 6: Initialize Redis Connection**

Create or update `src/lib/redis.ts`:

```typescript
import Redis from 'ioredis';
import Queue from 'bull';

// Redis connection
export const redis = new Redis(process.env.REDIS_URL || {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
});

// Bull queues
export const agentQueue = new Queue('agent tasks', process.env.BULL_REDIS_URL || process.env.REDIS_URL);
export const seoQueue = new Queue('seo tasks', process.env.BULL_REDIS_URL || process.env.REDIS_URL);
export const emailQueue = new Queue('email tasks', process.env.BULL_REDIS_URL || process.env.REDIS_URL);

// Queue processing
agentQueue.process('agent-function-call', async (job) => {
  const { functionName, args, userToken } = job.data;
  // Process agent function calls here
  console.log(\`Processing agent function: \${functionName}\`);
});

seoQueue.process('technical-seo-scan', async (job) => {
  const { siteUrl, userToken } = job.data;
  // Process SEO scans here
  console.log(\`Processing SEO scan for: \${siteUrl}\`);
});
```

### **Step 7: Deploy Queue Workers (Vercel)**

Since Vercel doesn't support background workers, you have two options:

#### **Option A: API-Based Queue Processing (Simpler)**
Create `src/app/api/queues/process/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { agentQueue, seoQueue } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    // Process a batch of jobs
    const agentJobs = await agentQueue.getWaiting(0, 5);
    const seoJobs = await seoQueue.getWaiting(0, 5);
    
    // Process jobs synchronously
    for (const job of [...agentJobs, ...seoJobs]) {
      await job.progress(100);
      await job.moveToCompleted();
    }
    
    return NextResponse.json({ 
      processed: agentJobs.length + seoJobs.length 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Queue processing failed' }, { status: 500 });
  }
}
```

Then set up a cron job to call this endpoint every minute.

#### **Option B: External Worker Service (Better for Scale)**
Deploy workers on Railway, Fly.io, or DigitalOcean:

```dockerfile
# Dockerfile for worker
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["node", "worker.js"]
```

### **Step 8: Queue Health Monitoring**

Add queue monitoring to your health check:

```typescript
// In src/app/api/test/agent-health/route.ts
import { agentQueue, seoQueue, redis } from '@/lib/redis';

// Add to health checks:
const queueHealth = {
  redis_connected: redis.status === 'ready',
  agent_queue_waiting: await agentQueue.getWaiting().length,
  seo_queue_waiting: await seoQueue.getWaiting().length,
  agent_queue_active: await agentQueue.getActive().length,
  seo_queue_active: await seoQueue.getActive().length
};
```

### **Step 9: Vercel Deployment Configuration**

Update `vercel.json`:

```json
{
  "functions": {
    "src/app/api/queues/process/route.ts": {
      "maxDuration": 60
    },
    "src/app/api/chat/ai-response/route.ts": {
      "maxDuration": 30  
    }
  },
  "crons": [
    {
      "path": "/api/queues/process",
      "schedule": "* * * * *"
    }
  ]
}
```

### **Step 10: Test Your Setup**

```bash
# Test Redis connection
curl https://your-app.vercel.app/api/test/agent-health

# Test queue processing  
curl -X POST https://your-app.vercel.app/api/queues/process

# Monitor queues
curl https://your-app.vercel.app/api/admin/queue-stats
```

## 🔍 **Production Checklist**

- [ ] Redis instance created and accessible
- [ ] Environment variables added to Vercel
- [ ] Dependencies installed (`bull`, `redis`, `ioredis`)
- [ ] Queue processing endpoint created
- [ ] Cron job configured for queue processing
- [ ] Health monitoring includes queue status
- [ ] Error handling and retry logic configured
- [ ] Queue dashboard accessible for monitoring

## 🚨 **Important Notes**

1. **Vercel Limitations**: 
   - No persistent background workers
   - Max function duration: 60s (hobby), 300s (pro)
   - Use API-based processing + cron jobs

2. **Redis Connection Limits**:
   - Configure connection pooling
   - Set reasonable max connections
   - Monitor connection usage

3. **Queue Job Sizing**:
   - Keep jobs under 30s each
   - Break large tasks into smaller chunks
   - Use job progress tracking

4. **Error Recovery**:
   - Configure dead letter queues
   - Set up retry policies
   - Monitor failed jobs

## 📊 **Monitoring & Debugging**

```bash
# Check queue status
GET /api/admin/queue-stats

# Process stuck jobs manually
POST /api/queues/process

# View failed jobs
GET /api/admin/failed-jobs

# Retry failed jobs
POST /api/admin/retry-failed
```

This setup will give you reliable background processing for SEO tasks, agent functions, and automated workflows while working within Vercel's constraints.