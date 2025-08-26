import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const siteUrl = searchParams.get('siteUrl');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!userToken) {
      return NextResponse.json({ error: 'User token required' }, { status: 401 });
    }

    const activities = [];

    // Fetch recent agent events
    let eventsQuery = supabase
      .from('agent_events')
      .select('*')
      .eq('user_token', userToken)
      .order('created_at', { ascending: false })
      .limit(Math.floor(limit / 3));

    const { data: events, error: eventsError } = await eventsQuery;

    if (events && !eventsError) {
      activities.push(...events);
    }

    // Fetch recent agent actions
    let actionsQuery = supabase
      .from('agent_actions')
      .select('*')
      .eq('user_token', userToken)
      .order('updated_at', { ascending: false })
      .limit(Math.floor(limit / 3));

    if (siteUrl) {
      actionsQuery = actionsQuery.eq('site_url', siteUrl);
    }

    const { data: actions, error: actionsError } = await actionsQuery;

    if (actions && !actionsError) {
      activities.push(...actions);
    }

    // Fetch recent agent ideas
    let ideasQuery = supabase
      .from('agent_ideas')
      .select('*')
      .eq('user_token', userToken)
      .order('updated_at', { ascending: false })
      .limit(Math.floor(limit / 3));

    if (siteUrl) {
      ideasQuery = ideasQuery.eq('site_url', siteUrl);
    }

    const { data: ideas, error: ideasError } = await ideasQuery;

    if (ideas && !ideasError) {
      activities.push(...ideas);
    }

    // Sort all activities by timestamp
    activities.sort((a, b) => {
      const aTime = new Date(a.updated_at || a.created_at).getTime();
      const bTime = new Date(b.updated_at || b.created_at).getTime();
      return bTime - aTime;
    });

    // Take only the requested limit
    const limitedActivities = activities.slice(0, limit);

    return NextResponse.json({
      success: true,
      activities: limitedActivities,
      count: limitedActivities.length,
      siteUrl: siteUrl || 'all_sites'
    });

  } catch (error) {
    console.error('[AGENT ACTIVITIES] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        activities: [] 
      }, 
      { status: 500 }
    );
  }
}