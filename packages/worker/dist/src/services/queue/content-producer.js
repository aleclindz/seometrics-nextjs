"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueContentGeneration = enqueueContentGeneration;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const redisUrl = process.env.BULL_REDIS_URL || process.env.REDIS_URL || process.env.KV_URL || '';
function createConnection() {
    // Upstash uses rediss; ioredis handles TLS via the URL scheme
    return new ioredis_1.default(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
    });
}
async function enqueueContentGeneration(jobName, data) {
    const connection = createConnection();
    try {
        const queue = new bullmq_1.Queue('content-generation', { connection });
        const job = await queue.add(jobName, data, {
            removeOnComplete: 100,
            removeOnFail: 50,
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            priority: 50,
        });
        await queue.close();
        return job.id;
    }
    finally {
        try {
            await connection.quit();
        }
        catch { }
    }
}
