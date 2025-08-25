import { NextRequest, NextResponse } from 'next/server';
import { VerificationEngine } from '@/services/agent/verification-engine';
import { queueManager, QUEUE_NAMES } from '@/services/queue/queue-manager';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

// POST /api/agent/verify - Trigger verification for an action
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { actionId, runId, userToken } = body;

    if (!actionId || !runId || !userToken) {
      return NextResponse.json(
        { error: 'Missing required fields: actionId, runId, userToken' },
        { status: 400 }
      );
    }

    console.log(`[AGENT VERIFY] Starting verification for action ${actionId}, run ${runId}`);

    // Queue verification job for background processing
    const verificationJobData = {
      actionId,
      userToken,
      runId,
      idempotencyKey: `verify_${actionId}_${runId}`,
      policy: {
        environment: 'PRODUCTION' as const,
        timeoutMs: 60000 // 1 minute timeout for verification
      },
      payload: { actionId, runId }
    };

    const jobId = await queueManager.queueAction(
      actionId,
      userToken,
      'verification',
      verificationJobData,
      verificationJobData.policy,
      { priority: 80 } // High priority for verification
    );

    return NextResponse.json({
      success: true,
      message: 'Verification job queued',
      jobId,
      actionId,
      runId,
      estimated_completion: new Date(Date.now() + 60000).toISOString()
    });

  } catch (error) {
    console.error('[AGENT VERIFY] Queue error:', error);
    return NextResponse.json({ error: 'Failed to queue verification' }, { status: 500 });
  }
}

// GET /api/agent/verify - Get verification results
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const actionId = searchParams.get('actionId');
    const runId = searchParams.get('runId');
    const userToken = searchParams.get('userToken');

    if (!userToken) {
      return NextResponse.json({ error: 'User token required' }, { status: 401 });
    }

    // If specific action/run requested, try to run verification immediately
    if (actionId && runId) {
      try {
        console.log(`[AGENT VERIFY] Running immediate verification for action ${actionId}, run ${runId}`);
        
        const result = await VerificationEngine.verifyAction(actionId, runId);

        return NextResponse.json({
          success: true,
          verification: result,
          message: `Verification completed: ${result.overallStatus}`,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('[AGENT VERIFY] Immediate verification error:', error);
        return NextResponse.json({
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
      return NextResponse.json({ error: 'Failed to fetch verification history' }, { status: 500 });
    }

    const verifications = recentVerifications.map(event => ({
      action_id: event.entity_id,
      run_id: event.event_data.run_id,
      result: event.event_data.verification_result,
      timestamp: event.created_at
    }));

    return NextResponse.json({
      success: true,
      verifications,
      total: verifications.length,
      message: `Found ${verifications.length} recent verification results`
    });

  } catch (error) {
    console.error('[AGENT VERIFY] Get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}