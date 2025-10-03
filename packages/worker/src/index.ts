// Worker entrypoint for Railway (or any long-running Node environment)
// Ensure REDIS_URL/BULL_REDIS_URL and Supabase env vars are set.

import { queueManager } from '../../../src/services/queue/queue-manager';

// Only start workers if Redis is explicitly enabled
if (process.env.ENABLE_REDIS_QUEUES === 'true') {
  queueManager.startWorkers();
  console.log('[WORKER] SEOAgent worker started. Listening for jobs...');

  // Keep process alive
  process.stdin.resume();
} else {
  console.log('[WORKER] Redis queues disabled. Set ENABLE_REDIS_QUEUES=true to enable worker.');
  console.log('[WORKER] Exiting gracefully...');
  process.exit(0);
}
