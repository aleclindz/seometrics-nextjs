// Worker entrypoint for Railway (or any long-running Node environment)
// Ensure REDIS_URL/BULL_REDIS_URL and Supabase env vars are set.

import { queueManager } from '../../../src/services/queue/queue-manager';

queueManager.startWorkers();

console.log('[WORKER] SEOAgent worker started. Listening for jobs...');

// Keep process alive
process.stdin.resume();
