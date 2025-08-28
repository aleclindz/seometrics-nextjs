import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const activityData = await request.json();
    
    // Validate required fields
    const required = ['user_token', 'site_url', 'activity_type', 'title'];
    for (const field of required) {
      if (!activityData[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    console.log(`[SEO-ACTIVITY] Recording ${activityData.activity_type}: ${activityData.title}`);
    
    // Store the activity in agent_events table
    const { data, error } = await supabase
      .from('agent_events')
      .insert({
        user_token: activityData.user_token,
        event_type: 'seo_automation',
        entity_type: 'seo_activity',
        entity_id: activityData.entity_id || null,
        event_data: JSON.stringify({
          title: activityData.title,
          description: activityData.description || '',
          activity_type: activityData.activity_type,
          results: activityData.results || {},
          details: activityData.details || {}
        }),
        previous_state: null,
        new_state: activityData.status || 'completed',
        triggered_by: 'seo_agent',
        metadata: JSON.stringify({
          site_url: activityData.site_url,
          page_url: activityData.page_url || activityData.site_url,
          activity_type: activityData.activity_type,
          source: 'seoagent_js',
          timestamp: Date.now(),
          ...activityData.metadata || {}
        })
      })
      .select()
      .single();

    if (error) {
      console.error('[SEO-ACTIVITY] Database error:', error);
      return NextResponse.json({ error: 'Failed to record activity' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data,
      message: 'SEO activity recorded successfully'
    });

  } catch (error) {
    console.error('[SEO-ACTIVITY] Error:', error);
    return NextResponse.json({ error: 'Failed to process activity' }, { status: 500 });
  }
}

// GET endpoint to retrieve activities for a website
export async function GET(request: NextRequest) {
  try {
    const userToken = request.nextUrl.searchParams.get('userToken');
    const siteUrl = request.nextUrl.searchParams.get('siteUrl');
    const activityType = request.nextUrl.searchParams.get('activityType');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
    
    if (!userToken) {
      return NextResponse.json({ error: 'Missing userToken' }, { status: 400 });
    }

    let query = supabase
      .from('agent_events')
      .select('*')
      .eq('user_token', userToken)
      .eq('event_type', 'seo_automation')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (siteUrl) {
      query = query.like('metadata', `%"site_url":"${siteUrl}"%`);
    }

    if (activityType) {
      query = query.like('event_data', `%"activity_type":"${activityType}"%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[SEO-ACTIVITY] Query error:', error);
      return NextResponse.json({ error: 'Failed to retrieve activities' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
      message: `Retrieved ${data?.length || 0} SEO activities`
    });

  } catch (error) {
    console.error('[SEO-ACTIVITY] Error retrieving activities:', error);
    return NextResponse.json({ error: 'Failed to retrieve activities' }, { status: 500 });
  }
}