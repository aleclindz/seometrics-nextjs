import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateSchedule, formatScheduleSummary, type PlanTier } from '@/lib/scheduling';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ScheduleAllRequest {
  userToken: string;
  websiteToken: string;
}

interface ScheduleResult {
  success: boolean;
  message: string;
  briefsScheduled: number;
  articlesScheduled: number;
  totalScheduled: number;
  schedules: Date[];
  planTier: string;
  error?: string;
}

/**
 * POST /api/content/schedule-all
 * Automatically schedule all unscheduled briefs and articles based on user's plan
 */
export async function POST(request: NextRequest): Promise<NextResponse<ScheduleResult>> {
  try {
    const body: ScheduleAllRequest = await request.json();
    const { userToken, websiteToken } = body;

    if (!userToken || !websiteToken) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required parameters',
          briefsScheduled: 0,
          articlesScheduled: 0,
          totalScheduled: 0,
          schedules: [],
          planTier: '',
          error: 'userToken and websiteToken are required',
        },
        { status: 400 }
      );
    }

    // Step 1: Get user's plan tier
    const { data: userPlan, error: planError } = await supabase
      .from('user_plans')
      .select('tier, status')
      .eq('user_token', userToken)
      .single();

    if (planError || !userPlan) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to retrieve user plan',
          briefsScheduled: 0,
          articlesScheduled: 0,
          totalScheduled: 0,
          schedules: [],
          planTier: '',
          error: 'User plan not found',
        },
        { status: 404 }
      );
    }

    // Check if subscription is active
    if (userPlan.status !== 'active') {
      return NextResponse.json(
        {
          success: false,
          message: 'Subscription is not active',
          briefsScheduled: 0,
          articlesScheduled: 0,
          totalScheduled: 0,
          schedules: [],
          planTier: userPlan.tier,
          error: 'Please activate your subscription to schedule content',
        },
        { status: 403 }
      );
    }

    const planTier = userPlan.tier as PlanTier;

    // Step 2: Query unscheduled briefs (status = queued or draft, no scheduled_for)
    const { data: unscheduledBriefs, error: briefsError } = await supabase
      .from('article_briefs')
      .select('id')
      .eq('user_token', userToken)
      .eq('website_token', websiteToken)
      .in('status', ['draft', 'queued'])
      .is('scheduled_for', null)
      .order('sort_index', { ascending: true });

    if (briefsError) {
      console.error('Error querying briefs:', briefsError);
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to query briefs',
          briefsScheduled: 0,
          articlesScheduled: 0,
          totalScheduled: 0,
          schedules: [],
          planTier,
          error: briefsError.message,
        },
        { status: 500 }
      );
    }

    // Step 3: Query unscheduled articles (status = generated, no scheduled_for)
    const { data: unscheduledArticles, error: articlesError } = await supabase
      .from('article_queue')
      .select('id')
      .eq('user_token', userToken)
      .eq('website_id', websiteToken)
      .eq('status', 'generated')
      .is('scheduled_for', null)
      .order('created_at', { ascending: true });

    if (articlesError) {
      console.error('Error querying articles:', articlesError);
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to query articles',
          briefsScheduled: 0,
          articlesScheduled: 0,
          totalScheduled: 0,
          schedules: [],
          planTier,
          error: articlesError.message,
        },
        { status: 500 }
      );
    }

    const briefIds = unscheduledBriefs?.map((b) => b.id) || [];
    const articleIds = unscheduledArticles?.map((a) => a.id) || [];
    const totalItems = briefIds.length + articleIds.length;

    // If no items to schedule, return early
    if (totalItems === 0) {
      return NextResponse.json({
        success: true,
        message: 'No unscheduled items found. All briefs and articles are already scheduled!',
        briefsScheduled: 0,
        articlesScheduled: 0,
        totalScheduled: 0,
        schedules: [],
        planTier,
      });
    }

    // Step 4: Calculate schedule dates starting tomorrow
    const schedules = calculateSchedule(totalItems, planTier);

    if (schedules.length < totalItems) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unable to generate enough schedule dates',
          briefsScheduled: 0,
          articlesScheduled: 0,
          totalScheduled: 0,
          schedules: [],
          planTier,
          error: 'Schedule generation failed',
        },
        { status: 500 }
      );
    }

    // Step 5: Update briefs with scheduled dates (first N schedules)
    let briefsUpdated = 0;
    if (briefIds.length > 0) {
      const briefSchedules = schedules.slice(0, briefIds.length);

      for (let i = 0; i < briefIds.length; i++) {
        const { error: updateError } = await supabase
          .from('article_briefs')
          .update({ scheduled_for: briefSchedules[i].toISOString() })
          .eq('id', briefIds[i]);

        if (!updateError) {
          briefsUpdated++;
        } else {
          console.error(`Error updating brief ${briefIds[i]}:`, updateError);
        }
      }
    }

    // Step 6: Update articles with scheduled dates (remaining schedules)
    let articlesUpdated = 0;
    if (articleIds.length > 0) {
      const articleSchedules = schedules.slice(briefIds.length);

      for (let i = 0; i < articleIds.length; i++) {
        const { error: updateError } = await supabase
          .from('article_queue')
          .update({ scheduled_for: articleSchedules[i].toISOString() })
          .eq('id', articleIds[i]);

        if (!updateError) {
          articlesUpdated++;
        } else {
          console.error(`Error updating article ${articleIds[i]}:`, updateError);
        }
      }
    }

    // Step 7: Create activity log
    await supabase.from('agent_events').insert({
      user_token: userToken,
      website_token: websiteToken,
      event_type: 'content_scheduled',
      entity_type: 'content_schedule',
      entity_id: websiteToken,
      event_data: {
        briefs_scheduled: briefsUpdated,
        articles_scheduled: articlesUpdated,
        total_scheduled: briefsUpdated + articlesUpdated,
        plan_tier: planTier,
        first_scheduled_date: schedules[0]?.toISOString(),
        last_scheduled_date: schedules[schedules.length - 1]?.toISOString(),
      },
      triggered_by: 'user_action',
    });

    // Step 8: Format summary message
    const summary = formatScheduleSummary(
      briefsUpdated,
      articlesUpdated,
      schedules.slice(0, briefsUpdated + articlesUpdated),
      planTier
    );

    return NextResponse.json({
      success: true,
      message: summary,
      briefsScheduled: briefsUpdated,
      articlesScheduled: articlesUpdated,
      totalScheduled: briefsUpdated + articlesUpdated,
      schedules: schedules.slice(0, briefsUpdated + articlesUpdated),
      planTier,
    });
  } catch (error) {
    console.error('Error in schedule-all:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred',
        briefsScheduled: 0,
        articlesScheduled: 0,
        totalScheduled: 0,
        schedules: [],
        planTier: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
