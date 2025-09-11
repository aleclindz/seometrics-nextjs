// Worker entrypoint for Railway (or any long-running Node environment)
// Imports the BullMQ queue manager which initializes all workers.
// Ensure REDIS_URL/BULL_REDIS_URL and Supabase env vars are set.

import '../../../src/services/queue/queue-manager';

console.log('[WORKER] SEOAgent worker started. Listening for jobs...');

// Keep process alive
process.stdin.resume();

