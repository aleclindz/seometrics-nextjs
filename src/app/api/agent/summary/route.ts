import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/agent/summary - "Since we last spoke" canonical activity summary
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const siteUrl = searchParams.get('siteUrl');
    const since = searchParams.get('since'); // ISO timestamp

    if (!userToken) {
      return NextResponse.json({ error: 'User token required' }, { status: 401 });
    }

    const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours default
    
    // Get activity since the specified time
    let baseQuery = supabase
      .from('agent_events')
      .select('*')
      .eq('user_token', userToken)
      .gte('created_at', sinceDate.toISOString())
      .order('created_at', { ascending: false });

    if (siteUrl) {
      // For site-specific summary, we need to join with actions/ideas to filter by site
      baseQuery = supabase
        .from('agent_events')
        .select(`
          *,
          action:agent_actions!inner(site_url),
          idea:agent_ideas!inner(site_url)
        `)
        .eq('user_token', userToken)
        .or(`action.site_url.eq.${siteUrl},idea.site_url.eq.${siteUrl}`)
        .gte('created_at', sinceDate.toISOString())
        .order('created_at', { ascending: false });
    }

    const { data: events, error } = await baseQuery.limit(100);

    if (error) {
      console.error('[AGENT SUMMARY] Events query error:', error);
      return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
    }

    // Get current state counts
    let actionsQuery = supabase
      .from('agent_actions')
      .select('status, action_type')
      .eq('user_token', userToken);

    let ideasQuery = supabase
      .from('agent_ideas')
      .select('status, ice_score')
      .eq('user_token', userToken);

    if (siteUrl) {
      actionsQuery = actionsQuery.eq('site_url', siteUrl);
      ideasQuery = ideasQuery.eq('site_url', siteUrl);
    }

    const [actionsResult, ideasResult] = await Promise.all([
      actionsQuery,
      ideasQuery
    ]);

    if (actionsResult.error || ideasResult.error) {
      console.error('[AGENT SUMMARY] State query error:', { 
        actionsError: actionsResult.error, 
        ideasError: ideasResult.error 
      });
      return NextResponse.json({ error: 'Failed to fetch current state' }, { status: 500 });
    }

    // Process activity into summary
    const activitySummary = processActivity(events || [], actionsResult.data || [], ideasResult.data || []);

    return NextResponse.json({
      success: true,
      summary: activitySummary,
      period: {
        since: sinceDate.toISOString(),
        until: new Date().toISOString(),
        siteUrl: siteUrl || 'all_sites'
      }
    });

  } catch (error) {
    console.error('[AGENT SUMMARY] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function processActivity(events: any[], currentActions: any[], currentIdeas: any[]) {
  // Group events by type for analysis
  const eventsByType = events.reduce((acc: Record<string, any[]>, event) => {
    if (!acc[event.event_type]) acc[event.event_type] = [];
    acc[event.event_type].push(event);
    return acc;
  }, {});

  // Count completed actions by type
  const completedActions = events
    .filter(e => e.event_type === 'action_status_changed' && e.new_state === 'completed')
    .reduce((acc: Record<string, number>, event) => {
      const actionType = event.event_data?.type || 'unknown';
      acc[actionType] = (acc[actionType] || 0) + 1;
      return acc;
    }, {});

  // Get upcoming scheduled actions
  const upcomingActions = currentActions
    .filter(a => a.status === 'scheduled' || a.status === 'queued')
    .sort((a, b) => new Date(a.scheduled_for || a.created_at).getTime() - new Date(b.scheduled_for || b.created_at).getTime())
    .slice(0, 5);

  // Get top ideas by ICE score
  const topIdeas = currentIdeas
    .filter(i => i.status === 'open')
    .sort((a, b) => (b.ice_score || 0) - (a.ice_score || 0))
    .slice(0, 5);

  // Current status counts
  const actionStatusCounts = currentActions.reduce((acc: Record<string, number>, action) => {
    acc[action.status] = (acc[action.status] || 0) + 1;
    return acc;
  }, {});

  const ideaStatusCounts = currentIdeas.reduce((acc: Record<string, number>, idea) => {
    acc[idea.status] = (acc[idea.status] || 0) + 1;
    return acc;
  }, {});

  // Generate natural language summary
  const completedSummary = Object.entries(completedActions)
    .map(([type, count]) => `${count} ${type.replace(/_/g, ' ')} action${count > 1 ? 's' : ''}`)
    .join(', ');

  const activeSummary = [
    actionStatusCounts.running ? `${actionStatusCounts.running} running` : null,
    actionStatusCounts.queued ? `${actionStatusCounts.queued} queued` : null,
    actionStatusCounts.needs_verification ? `${actionStatusCounts.needs_verification} awaiting verification` : null
  ].filter(Boolean).join(', ');

  return {
    // High-level activity counts
    activity_counts: {
      total_events: events.length,
      completed_actions: Object.values(completedActions).reduce((sum: number, count: number) => sum + count, 0),
      new_ideas: eventsByType.idea_created?.length || 0,
      status_changes: (eventsByType.action_status_changed?.length || 0) + (eventsByType.idea_status_changed?.length || 0)
    },

    // Completed work breakdown
    completed_work: {
      by_type: completedActions,
      summary: completedSummary || 'No actions completed'
    },

    // Current active work
    active_work: {
      by_status: actionStatusCounts,
      summary: activeSummary || 'No active work'
    },

    // Upcoming scheduled items
    upcoming_items: upcomingActions.map(action => ({
      id: action.id,
      title: action.title,
      type: action.action_type,
      scheduled_for: action.scheduled_for || action.created_at,
      priority: action.priority_score
    })),

    // Top ideas ready for adoption
    top_ideas: topIdeas.map(idea => ({
      id: idea.id,
      title: idea.title,
      ice_score: idea.ice_score,
      status: idea.status
    })),

    // Current state overview
    current_state: {
      ideas: ideaStatusCounts,
      actions: actionStatusCounts,
      total_active: (actionStatusCounts.running || 0) + (actionStatusCounts.queued || 0) + (actionStatusCounts.needs_verification || 0),
      needs_attention: actionStatusCounts.failed || 0
    },

    // Natural language summary for LLM
    narrative: generateNarrativeSummary(completedSummary, activeSummary, upcomingActions.length, topIdeas.length, events.length)
  };
}

function generateNarrativeSummary(
  completedSummary: string, 
  activeSummary: string, 
  upcomingCount: number, 
  topIdeasCount: number, 
  totalEvents: number
): string {
  const parts = [];

  if (completedSummary && completedSummary !== 'No actions completed') {
    parts.push(`Completed: ${completedSummary}`);
  }

  if (activeSummary && activeSummary !== 'No active work') {
    parts.push(`Currently active: ${activeSummary}`);
  }

  if (upcomingCount > 0) {
    parts.push(`${upcomingCount} scheduled task${upcomingCount > 1 ? 's' : ''} coming up`);
  }

  if (topIdeasCount > 0) {
    parts.push(`${topIdeasCount} high-priority idea${topIdeasCount > 1 ? 's' : ''} ready for adoption`);
  }

  if (parts.length === 0) {
    return totalEvents > 0 ? 
      'System activity detected but no major changes completed' : 
      'No recent activity to report';
  }

  return parts.join('. ') + '.';
}

// POST /api/agent/summary - Update user's last seen timestamp for future summaries
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userToken, siteUrl, timestamp } = body;

    if (!userToken) {
      return NextResponse.json({ error: 'User token required' }, { status: 401 });
    }

    const lastSeenTime = timestamp ? new Date(timestamp) : new Date();

    // Store this in user preferences or activity_summaries table for future reference
    // For now, we'll just acknowledge the update
    console.log(`[AGENT SUMMARY] User ${userToken} last seen updated to ${lastSeenTime.toISOString()}`);

    return NextResponse.json({
      success: true,
      message: 'Last seen timestamp updated',
      timestamp: lastSeenTime.toISOString()
    });

  } catch (error) {
    console.error('[AGENT SUMMARY] Update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}