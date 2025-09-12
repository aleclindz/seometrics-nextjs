"use strict";
// Worker entrypoint for Railway (or any long-running Node environment)
// Ensure REDIS_URL/BULL_REDIS_URL and Supabase env vars are set.
Object.defineProperty(exports, "__esModule", { value: true });
const queue_manager_1 = require("../../../src/services/queue/queue-manager");
queue_manager_1.queueManager.startWorkers();
console.log('[WORKER] SEOAgent worker started. Listening for jobs...');
// Keep process alive
process.stdin.resume();
