import { NextRequest, NextResponse } from 'next/server';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export const dynamic = 'force-dynamic';

// DISABLED: Redis queue status endpoint to prevent Upstash quota burnout
// This endpoint was causing 500k+ Redis commands per month on free tier
// If you need queue monitoring, use database-based tracking instead

export async function GET(req: NextRequest) {
  // Return disabled message instead of querying Redis
  return NextResponse.json({
    success: false,
    error: 'Queue status endpoint disabled to conserve Redis quota',
    message: 'Redis-based queue monitoring is disabled. Use database-based content generation status instead.',
    counts: {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0
    },
    samples: {
      waiting: [],
      active: [],
      failed: []
    }
  }, { status: 503 });
}

// Legacy implementation (disabled to save Redis commands):
/*
function getConnection() {
  const url = process.env.BULL_REDIS_URL || process.env.REDIS_URL || process.env.KV_URL || '';
  return new IORedis(url, { maxRetriesPerRequest: null, enableReadyCheck: false });
}

export async function GET_DISABLED(req: NextRequest) {
  const conn = getConnection();
  try {
    const q = new Queue('content-generation', { connection: conn });
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      q.getWaiting(),
      q.getActive(),
      q.getCompleted(),
      q.getFailed(),
      q.getDelayed(),
    ]);
    const counts = await q.getJobCounts('waiting','active','completed','failed','delayed');
    await q.close();
    return NextResponse.json({
      success: true,
      counts,
      samples: {
        waiting: waiting.map(j => ({ id: j.id, name: j.name, timestamp: j.timestamp })).slice(0, 5),
        active: active.map(j => ({ id: j.id, name: j.name, timestamp: j.timestamp })).slice(0, 5),
        failed: failed.map(j => ({ id: j.id, name: j.name, failedReason: j.failedReason })).slice(0, 5)
      }
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Queue inspect failed' }, { status: 500 });
  } finally {
    try { await conn.quit(); } catch {}
  }
}
*/

