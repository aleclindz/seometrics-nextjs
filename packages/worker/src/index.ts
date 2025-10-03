// Worker entrypoint for Railway (or any long-running Node environment)
// Required environment variables:
//   ENABLE_REDIS_QUEUES=true
//   START_WORKERS=true
//   START_EVENTS=true (only on ONE instance - the "leader")
//   REDIS_URL=rediss://...
//   NEXT_PUBLIC_SUPABASE_URL=https://...
//   SUPABASE_SERVICE_ROLE_KEY=...

import { queueManager } from '../../../src/services/queue/queue-manager';

console.log('[WORKER] Starting SEOAgent background worker...');
console.log('[WORKER] Configuration:');
console.log('[WORKER]   ENABLE_REDIS_QUEUES:', process.env.ENABLE_REDIS_QUEUES);
console.log('[WORKER]   START_WORKERS:', process.env.START_WORKERS);
console.log('[WORKER]   START_EVENTS:', process.env.START_EVENTS);
console.log('[WORKER]   REDIS_URL:', process.env.REDIS_URL ? '✓ Set' : '✗ Missing');

// Only start workers if Redis is explicitly enabled
if (process.env.ENABLE_REDIS_QUEUES !== 'true') {
  console.log('[WORKER] ❌ Redis queues disabled. Set ENABLE_REDIS_QUEUES=true to enable.');
  console.log('[WORKER] Exiting gracefully...');
  process.exit(0);
}

if (process.env.START_WORKERS !== 'true') {
  console.log('[WORKER] ❌ Workers disabled. Set START_WORKERS=true to enable.');
  console.log('[WORKER] Exiting gracefully...');
  process.exit(0);
}

// Start the workers (will respect START_EVENTS flag internally)
queueManager.startWorkers();

console.log('[WORKER] ✅ SEOAgent worker started successfully');
console.log('[WORKER] 📊 Listening for jobs with rate limiting...');

// Keep process alive
process.stdin.resume();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[WORKER] SIGTERM received, shutting down gracefully...');
  await queueManager.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[WORKER] SIGINT received, shutting down gracefully...');
  await queueManager.shutdown();
  process.exit(0);
});
