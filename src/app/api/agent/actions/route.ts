import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { queueManager } from '@/services/queue/queue-manager';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/agent/actions - List actions with filtering and status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const siteUrl = searchParams.get('siteUrl');
    const status = searchParams.get('status');
    const ideaId = searchParams.get('ideaId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!userToken) {
      return NextResponse.json({ error: 'User token required' }, { status: 401 });
    }

    let query = supabase
      .from('agent_actions')
      .select(`
        *,
        idea:agent_ideas(id, title, hypothesis)
      `)
      .eq('user_token', userToken)
      .order('priority_score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (siteUrl) query = query.eq('site_url', siteUrl);
    if (status) query = query.eq('status', status);
    if (ideaId) query = query.eq('idea_id', ideaId);

    const { data: actions, error } = await query;

    if (error) {
      console.error('[AGENT ACTIONS] Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch actions' }, { status: 500 });
    }

    // Get summary stats
    const { data: stats, error: statsError } = await supabase
      .from('agent_actions')
      .select('status')
      .eq('user_token', userToken);

    const statusCounts = stats?.reduce((acc: Record<string, number>, action) => {
      acc[action.status] = (acc[action.status] || 0) + 1;
      return acc;
    }, {}) || {};

    return NextResponse.json({ 
      success: true, 
      actions,
      stats: statusCounts
    });

  } catch (error) {
    console.error('[AGENT ACTIONS] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/agent/actions - Create new action (from idea adoption or direct)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userToken, 
      siteUrl, 
      ideaId,
      actionType, 
      title, 
      description,
      payload, 
      policy,
      priorityScore,
      scheduledFor
    } = body;

    if (!userToken || !siteUrl || !actionType || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: userToken, siteUrl, actionType, title' },
        { status: 400 }
      );
    }

    // Validate idea ownership if ideaId provided
    if (ideaId) {
      const { data: idea, error: ideaError } = await supabase
        .from('agent_ideas')
        .select('id, status')
        .eq('id', ideaId)
        .eq('user_token', userToken)
        .single();

      if (ideaError || !idea) {
        return NextResponse.json({ error: 'Invalid idea reference' }, { status: 400 });
      }

      // Update idea status to adopted if it's open
      if (idea.status === 'open') {
        await supabase
          .from('agent_ideas')
          .update({ 
            status: 'adopted',
            adopted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', ideaId);
      }
    }

    // Set default policy if not provided
    const defaultPolicy = {
      environment: 'DRY_RUN',
      maxPages: 10,
      maxPatches: 20,
      timeoutMs: 300000, // 5 minutes
      requiresApproval: false,
      ...policy
    };

    const { data: action, error } = await supabase
      .from('agent_actions')
      .insert({
        idea_id: ideaId || null,
        user_token: userToken,
        site_url: siteUrl,
        action_type: actionType,
        title,
        description: description || null,
        payload: payload || {},
        policy: defaultPolicy,
        priority_score: priorityScore || 50,
        scheduled_for: scheduledFor || null,
        status: 'proposed'
      })
      .select()
      .single();

    if (error) {
      console.error('[AGENT ACTIONS] Insert error:', error);
      return NextResponse.json({ error: 'Failed to create action' }, { status: 500 });
    }

    console.log(`[AGENT ACTIONS] Created action ${action.id}: ${title}`);

    return NextResponse.json({ 
      success: true, 
      action,
      message: `Action "${title}" created and ready for execution` 
    });

  } catch (error) {
    console.error('[AGENT ACTIONS] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/agent/actions - Update action status or queue for execution
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { actionId, userToken, status, updates, queueForExecution } = body;

    if (!actionId || !userToken) {
      return NextResponse.json(
        { error: 'Missing required fields: actionId, userToken' },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: existingAction, error: fetchError } = await supabase
      .from('agent_actions')
      .select('*')
      .eq('id', actionId)
      .eq('user_token', userToken)
      .single();

    if (fetchError || !existingAction) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = { updated_at: new Date().toISOString() };
    
    if (status) {
      updateData.status = status;
      
      // Set timestamp fields based on status
      if (status === 'queued') updateData.queued_at = new Date().toISOString();
      if (status === 'running') updateData.started_at = new Date().toISOString();
      if (status === 'completed') updateData.completed_at = new Date().toISOString();
      if (status === 'failed') updateData.failed_at = new Date().toISOString();
    }

    // Add any additional updates
    if (updates) {
      Object.assign(updateData, updates);
    }

    // Update the action
    const { data: updatedAction, error: updateError } = await supabase
      .from('agent_actions')
      .update(updateData)
      .eq('id', actionId)
      .eq('user_token', userToken)
      .select()
      .single();

    if (updateError) {
      console.error('[AGENT ACTIONS] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update action' }, { status: 500 });
    }

    // Queue for execution if requested
    if (queueForExecution && updatedAction.status === 'queued') {
      try {
        const jobId = await queueManager.queueAction(
          actionId,
          userToken,
          updatedAction.action_type,
          updatedAction.payload,
          updatedAction.policy,
          {
            priority: updatedAction.priority_score,
            delay: updatedAction.scheduled_for ? 
              new Date(updatedAction.scheduled_for).getTime() - Date.now() : 0
          }
        );

        console.log(`[AGENT ACTIONS] Queued action ${actionId} as job ${jobId}`);

        return NextResponse.json({ 
          success: true, 
          action: updatedAction,
          jobId,
          message: `Action "${updatedAction.title}" queued for execution` 
        });

      } catch (queueError) {
        console.error('[AGENT ACTIONS] Queue error:', queueError);
        
        // Revert action status
        await supabase
          .from('agent_actions')
          .update({ status: 'proposed', updated_at: new Date().toISOString() })
          .eq('id', actionId);

        return NextResponse.json({ 
          error: 'Failed to queue action for execution' 
        }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      action: updatedAction,
      message: `Action updated successfully` 
    });

  } catch (error) {
    console.error('[AGENT ACTIONS] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}