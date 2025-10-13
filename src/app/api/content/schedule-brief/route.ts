import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/content/schedule-brief
 *
 * Schedules an article brief for automatic generation by the cron job
 *
 * Body:
 * {
 *   userToken: string,
 *   briefId: number,
 *   scheduledDate: string (ISO date) | null (to unschedule)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { userToken, briefId, scheduledDate } = await request.json();

    if (!userToken || !briefId) {
      return NextResponse.json(
        { success: false, error: 'userToken and briefId are required' },
        { status: 400 }
      );
    }

    // Parse scheduled date
    const scheduledFor = scheduledDate ? new Date(scheduledDate).toISOString() : null;

    // Validate that scheduled date is not in the past
    if (scheduledFor) {
      const scheduledDateObj = new Date(scheduledFor);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      scheduledDateObj.setHours(0, 0, 0, 0); // Start of scheduled day

      if (scheduledDateObj < today) {
        return NextResponse.json(
          { success: false, error: 'Cannot schedule briefs for past dates' },
          { status: 400 }
        );
      }
    }

    // Determine new status based on scheduling
    const newStatus = scheduledFor ? 'queued' : 'draft';

    // Update article_briefs with scheduled date and status
    const { error } = await supabase
      .from('article_briefs')
      .update({
        scheduled_for: scheduledFor,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', briefId)
      .eq('user_token', userToken);

    if (error) {
      console.error('[SCHEDULE BRIEF] Error updating brief:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to schedule brief' },
        { status: 500 }
      );
    }

    console.log('[SCHEDULE BRIEF]', scheduledFor ? 'Scheduled' : 'Unscheduled', 'brief', briefId, 'for', scheduledFor || 'immediate generation');

    return NextResponse.json({
      success: true,
      briefId,
      scheduledFor,
      status: newStatus
    });
  } catch (error) {
    console.error('[SCHEDULE BRIEF] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
