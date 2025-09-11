import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const redisUrl = process.env.BULL_REDIS_URL || process.env.REDIS_URL || process.env.KV_URL || '';

function createConnection() {
  // Upstash uses rediss; ioredis handles TLS via the URL scheme
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

export async function enqueueContentGeneration(jobName: string, data: Record<string, any>) {
  const connection = createConnection();
  try {
    const queue = new Queue('content-generation', { connection });
    const job = await queue.add(jobName, data, {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      priority: 50,
    });
    await queue.close();
    return job.id as string;
  } finally {
    try { await connection.quit(); } catch {}
  }
}

