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
      .limit(Math.floor(limit / 5));

    const { data: events, error: eventsError } = await eventsQuery;

    if (events && !eventsError) {
      activities.push(...events.map(event => ({ ...event, source_table: 'agent_events' })));
    }

    // Fetch recent agent actions
    let actionsQuery = supabase
      .from('agent_actions')
      .select('*')
      .eq('user_token', userToken)
      .order('updated_at', { ascending: false })
      .limit(Math.floor(limit / 5));

    if (siteUrl) {
      actionsQuery = actionsQuery.eq('site_url', siteUrl);
    }

    const { data: actions, error: actionsError } = await actionsQuery;

    if (actions && !actionsError) {
      activities.push(...actions.map(action => ({ ...action, source_table: 'agent_actions' })));
    }

    // Fetch recent agent ideas
    let ideasQuery = supabase
      .from('agent_ideas')
      .select('*')
      .eq('user_token', userToken)
      .order('updated_at', { ascending: false })
      .limit(Math.floor(limit / 5));

    if (siteUrl) {
      ideasQuery = ideasQuery.eq('site_url', siteUrl);
    }

    const { data: ideas, error: ideasError } = await ideasQuery;

    if (ideas && !ideasError) {
      activities.push(...ideas.map(idea => ({ ...idea, source_table: 'agent_ideas' })));
    }

    // Fetch recent SEO monitoring events (watchdog alerts, automated fixes)
    let seoEventsQuery = supabase
      .from('seo_monitoring_events')
      .select('*')
      .eq('user_token', userToken)
      .order('detected_at', { ascending: false })
      .limit(Math.floor(limit / 5));

    if (siteUrl) {
      seoEventsQuery = seoEventsQuery.eq('site_url', siteUrl);
    }

    const { data: seoEvents, error: seoEventsError } = await seoEventsQuery;

    if (seoEvents && !seoEventsError) {
      activities.push(...seoEvents.map(event => ({ ...event, source_table: 'seo_monitoring_events' })));
    }

    // Fetch recent system logs (cron jobs, automated tasks)
    let systemLogsQuery = supabase
      .from('system_logs')
      .select('*')
      .in('log_type', ['cron_sitemap_regeneration', 'cron_gsc_sync'])
      .order('created_at', { ascending: false })
      .limit(Math.floor(limit / 5));

    const { data: systemLogs, error: systemLogsError } = await systemLogsQuery;

    if (systemLogs && !systemLogsError) {
      activities.push(...systemLogs.map(log => ({ ...log, source_table: 'system_logs' })));
    }

    // Sort all activities by timestamp (handle different timestamp fields from different tables)
    activities.sort((a, b) => {
      let aTime, bTime;
      
      // Get timestamp based on source table
      if (a.source_table === 'seo_monitoring_events') {
        aTime = new Date(a.detected_at || a.created_at).getTime();
      } else {
        aTime = new Date(a.updated_at || a.created_at).getTime();
      }
      
      if (b.source_table === 'seo_monitoring_events') {
        bTime = new Date(b.detected_at || b.created_at).getTime();
      } else {
        bTime = new Date(b.updated_at || b.created_at).getTime();
      }
      
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