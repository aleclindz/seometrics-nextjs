"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
exports.dynamic = 'force-dynamic';
function getConnection() {
    const url = process.env.BULL_REDIS_URL || process.env.REDIS_URL || process.env.KV_URL || '';
    return new ioredis_1.default(url, { maxRetriesPerRequest: null, enableReadyCheck: false });
}
async function GET(req) {
    const conn = getConnection();
    try {
        const q = new bullmq_1.Queue('content-generation', { connection: conn });
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            q.getWaiting(),
            q.getActive(),
            q.getCompleted(),
            q.getFailed(),
            q.getDelayed(),
        ]);
        const counts = await q.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
        await q.close();
        return server_1.NextResponse.json({
            success: true,
            counts,
            samples: {
                waiting: waiting.map(j => ({ id: j.id, name: j.name, timestamp: j.timestamp })).slice(0, 5),
                active: active.map(j => ({ id: j.id, name: j.name, timestamp: j.timestamp })).slice(0, 5),
                failed: failed.map(j => ({ id: j.id, name: j.name, failedReason: j.failedReason })).slice(0, 5)
            }
        });
    }
    catch (e) {
        return server_1.NextResponse.json({ success: false, error: e?.message || 'Queue inspect failed' }, { status: 500 });
    }
    finally {
        try {
            await conn.quit();
        }
        catch { }
    }
}
