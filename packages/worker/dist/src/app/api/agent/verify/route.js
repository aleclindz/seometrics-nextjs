"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const verification_engine_1 = require("@/services/agent/verification-engine");
const queue_manager_1 = require("@/services/queue/queue-manager");
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
exports.dynamic = 'force-dynamic';
// POST /api/agent/verify - Trigger verification for an action
async function POST(request) {
    try {
        const body = await request.json();
        const { actionId, runId, userToken } = body;
        if (!actionId || !runId || !userToken) {
            return server_1.NextResponse.json({ error: 'Missing required fields: actionId, runId, userToken' }, { status: 400 });
        }
        console.log(`[AGENT VERIFY] Starting verification for action ${actionId}, run ${runId}`);
        // Queue verification job for background processing
        const verificationJobData = {
            actionId,
            userToken,
            runId,
            idempotencyKey: `verify_${actionId}_${runId}`,
            policy: {
                environment: 'PRODUCTION',
                timeoutMs: 60000 // 1 minute timeout for verification
            },
            payload: { actionId, runId }
        };
        const jobId = await queue_manager_1.queueManager.queueAction(actionId, userToken, 'verification', verificationJobData, verificationJobData.policy, { priority: 80 } // High priority for verification
        );
        return server_1.NextResponse.json({
            success: true,
            message: 'Verification job queued',
            jobId,
            actionId,
            runId,
            estimated_completion: new Date(Date.now() + 60000).toISOString()
        });
    }
    catch (error) {
        console.error('[AGENT VERIFY] Queue error:', error);
        return server_1.NextResponse.json({ error: 'Failed to queue verification' }, { status: 500 });
    }
}
// GET /api/agent/verify - Get verification results
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const actionId = searchParams.get('actionId');
        const runId = searchParams.get('runId');
        const userToken = searchParams.get('userToken');
        if (!userToken) {
            return server_1.NextResponse.json({ error: 'User token required' }, { status: 401 });
        }
        // If specific action/run requested, try to run verification immediately
        if (actionId && runId) {
            try {
                console.log(`[AGENT VERIFY] Running immediate verification for action ${actionId}, run ${runId}`);
                const result = await verification_engine_1.VerificationEngine.verifyAction(actionId, runId);
                return server_1.NextResponse.json({
                    success: true,
                    verification: result,
                    message: `Verification completed: ${result.overallStatus}`,
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                console.error('[AGENT VERIFY] Immediate verification error:', error);
                return server_1.NextResponse.json({
                    error: 'Verification failed',
                    details: error instanceof Error ? error.message : 'Unknown error'
                }, { status: 500 });
            }
        }
        // Otherwise, return recent verification results from events
        const { data: recentVerifications, error } = await supabase
            .from('agent_events')
            .select('*')
            .eq('user_token', userToken)
            .eq('event_type', 'verification_completed')
            .order('created_at', { ascending: false })
            .limit(10);
        if (error) {
            console.error('[AGENT VERIFY] Query error:', error);
            return server_1.NextResponse.json({ error: 'Failed to fetch verification history' }, { status: 500 });
        }
        const verifications = recentVerifications.map(event => ({
            action_id: event.entity_id,
            run_id: event.event_data.run_id,
            result: event.event_data.verification_result,
            timestamp: event.created_at
        }));
        return server_1.NextResponse.json({
            success: true,
            verifications,
            total: verifications.length,
            message: `Found ${verifications.length} recent verification results`
        });
    }
    catch (error) {
        console.error('[AGENT VERIFY] Get error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
