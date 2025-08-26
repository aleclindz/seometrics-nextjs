import { NextRequest, NextResponse } from 'next/server';
import { WorkflowEngine } from '@/services/agent/workflow-engine';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/agent/workflows - List available workflow templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const ideaId = searchParams.get('ideaId');

    // If ideaId provided, suggest workflows for that idea
    if (ideaId) {
      const { data: idea, error } = await supabase
        .from('agent_ideas')
        .select('*')
        .eq('id', ideaId)
        .single();

      if (error || !idea) {
        return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
      }

      const suggestedWorkflow = WorkflowEngine.suggestWorkflow(
        idea.title,
        idea.hypothesis,
        idea.evidence
      );

      const allTemplates = WorkflowEngine.getWorkflowTemplates(category || undefined, search || undefined);

      return NextResponse.json({
        success: true,
        idea: {
          id: idea.id,
          title: idea.title,
          hypothesis: idea.hypothesis
        },
        suggested_workflow: suggestedWorkflow,
        all_workflows: allTemplates,
        message: suggestedWorkflow ? 
          `Recommended workflow: ${suggestedWorkflow.name}` :
          'No specific workflow recommended - showing all available templates'
      });
    }

    // Otherwise, return all workflows
    const templates = WorkflowEngine.getWorkflowTemplates(category || undefined, search || undefined);

    // Group by category for easier consumption
    const byCategory = templates.reduce((acc: Record<string, any[]>, template) => {
      if (!acc[template.category]) acc[template.category] = [];
      acc[template.category].push(template);
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      workflows: templates,
      by_category: byCategory,
      total_count: templates.length,
      filters: { category, search }
    });

  } catch (error) {
    console.error('[AGENT WORKFLOWS] Get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/agent/workflows/plan - Create execution plan for a workflow
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ideaId, workflowId, userToken, customActions } = body;

    if (!ideaId || !workflowId || !userToken) {
      return NextResponse.json(
        { error: 'Missing required fields: ideaId, workflowId, userToken' },
        { status: 400 }
      );
    }

    // Get the idea details
    const { data: idea, error: ideaError } = await supabase
      .from('agent_ideas')
      .select('*')
      .eq('id', ideaId)
      .eq('user_token', userToken)
      .single();

    if (ideaError || !idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    // Get the workflow template
    const templates = WorkflowEngine.getWorkflowTemplates();
    const workflowTemplate = templates.find(t => t.id === workflowId);

    if (!workflowTemplate) {
      return NextResponse.json({ error: 'Workflow template not found' }, { status: 404 });
    }

    // Create execution plan
    const plan = await WorkflowEngine.createExecutionPlan(
      ideaId,
      workflowTemplate,
      userToken,
      idea.site_url
    );

    // Store the plan for future reference
    await supabase
      .from('agent_events')
      .insert({
        user_token: userToken,
        event_type: 'workflow_plan_created',
        entity_type: 'idea',
        entity_id: ideaId,
        event_data: {
          workflow_id: workflowId,
          workflow_name: workflowTemplate.name,
          execution_plan: plan
        },
        triggered_by: 'user'
      });

    return NextResponse.json({
      success: true,
      plan,
      idea: {
        id: idea.id,
        title: idea.title,
        site_url: idea.site_url
      },
      workflow: {
        id: workflowTemplate.id,
        name: workflowTemplate.name,
        category: workflowTemplate.category
      },
      message: `Execution plan created for workflow "${workflowTemplate.name}"`
    });

  } catch (error) {
    console.error('[AGENT WORKFLOWS] Plan creation error:', error);
    return NextResponse.json({ error: 'Failed to create execution plan' }, { status: 500 });
  }
}

// PUT /api/agent/workflows/execute - Execute a workflow plan
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { ideaId, workflowId, userToken, confirmExecution } = body;

    if (!ideaId || !workflowId || !userToken) {
      return NextResponse.json(
        { error: 'Missing required fields: ideaId, workflowId, userToken' },
        { status: 400 }
      );
    }

    if (!confirmExecution) {
      return NextResponse.json(
        { error: 'Execution must be explicitly confirmed with confirmExecution: true' },
        { status: 400 }
      );
    }

    // Get the idea details
    const { data: idea, error: ideaError } = await supabase
      .from('agent_ideas')
      .select('*')
      .eq('id', ideaId)
      .eq('user_token', userToken)
      .single();

    if (ideaError || !idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    if (idea.status !== 'open') {
      return NextResponse.json(
        { error: `Idea must be in 'open' status to execute workflow (current: ${idea.status})` },
        { status: 400 }
      );
    }

    // Get the workflow template
    const templates = WorkflowEngine.getWorkflowTemplates();
    const workflowTemplate = templates.find(t => t.id === workflowId);

    if (!workflowTemplate) {
      return NextResponse.json({ error: 'Workflow template not found' }, { status: 404 });
    }

    // Create and execute the plan
    const plan = await WorkflowEngine.createExecutionPlan(
      ideaId,
      workflowTemplate,
      userToken,
      idea.site_url
    );

    // Check for blocking issues
    if (plan.blockedActions.length > 0) {
      const criticalBlocks = plan.blockedActions.filter(b => 
        !b.reason.includes('optional') && !b.reason.includes('warning')
      );

      if (criticalBlocks.length > 0) {
        return NextResponse.json({
          error: 'Workflow execution blocked',
          blocked_actions: plan.blockedActions,
          message: 'Some critical dependencies are missing. Please resolve these issues before executing the workflow.'
        }, { status: 400 });
      }
    }

    // Execute the workflow
    const result = await WorkflowEngine.executeWorkflowPlan(plan, userToken, idea.site_url);

    // Log successful execution
    await supabase
      .from('agent_events')
      .insert({
        user_token: userToken,
        event_type: 'workflow_executed',
        entity_type: 'idea',
        entity_id: ideaId,
        event_data: {
          workflow_id: workflowId,
          workflow_name: workflowTemplate.name,
          actions_created: result.actionIds,
          estimated_duration: plan.totalEstimatedDuration
        },
        triggered_by: 'user'
      });

    return NextResponse.json({
      success: true,
      execution: {
        workflow_id: workflowId,
        workflow_name: workflowTemplate.name,
        actions_created: result.actionIds,
        total_actions: result.actionIds.length,
        estimated_completion: new Date(Date.now() + plan.totalEstimatedDuration * 60000).toISOString(),
        warnings: plan.warnings
      },
      idea: {
        id: idea.id,
        title: idea.title,
        new_status: 'adopted'
      },
      message: result.message,
      next_steps: [
        'Actions have been created and are ready for execution',
        'Use the list_actions tool to see all created actions',
        'Actions will be queued based on their dependencies and priority',
        plan.warnings.length > 0 ? 'Review warnings and monitor execution closely' : null
      ].filter(Boolean)
    });

  } catch (error) {
    console.error('[AGENT WORKFLOWS] Execution error:', error);
    return NextResponse.json({ 
      error: 'Failed to execute workflow',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}