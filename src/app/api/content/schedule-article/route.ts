import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/content/schedule-article
 *
 * Schedule or unschedule an article for automatic publication
 * Used by ContentTab calendar drag-and-drop interface
 *
 * Request body:
 * - userToken: string (required) - User authentication token
 * - articleId: number (required) - ID of article in article_queue
 * - scheduledDate: string | null (required) - ISO date string or null to unschedule
 *
 * Response:
 * - success: boolean
 * - article?: object - Updated article data
 * - error?: string - Error message if failed
 */
export async function POST(request: NextRequest) {
  try {
    const { userToken, articleId, scheduledDate } = await request.json();

    // Validate required fields
    if (!userToken || !articleId) {
      return NextResponse.json(
        { success: false, error: 'userToken and articleId are required' },
        { status: 400 }
      );
    }

    // Validate scheduledDate format if provided
    if (scheduledDate !== null && scheduledDate !== undefined) {
      const date = new Date(scheduledDate);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Invalid scheduledDate format. Must be ISO date string or null' },
          { status: 400 }
        );
      }
    }

    console.log('[SCHEDULE ARTICLE] Scheduling request:', {
      articleId,
      scheduledDate,
      userToken: userToken.substring(0, 8) + '...'
    });

    // Verify article exists and belongs to user
    const { data: existingArticle, error: checkError } = await supabase
      .from('article_queue')
      .select('id, title, status, user_token')
      .eq('id', articleId)
      .eq('user_token', userToken)
      .maybeSingle();

    if (checkError) {
      console.error('[SCHEDULE ARTICLE] Database error checking article:', checkError);
      return NextResponse.json(
        { success: false, error: 'Failed to verify article ownership' },
        { status: 500 }
      );
    }

    if (!existingArticle) {
      return NextResponse.json(
        { success: false, error: 'Article not found or you do not have permission to modify it' },
        { status: 404 }
      );
    }

    // Update the scheduled_publish_at field
    const { data: updatedArticle, error: updateError } = await supabase
      .from('article_queue')
      .update({
        scheduled_publish_at: scheduledDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', articleId)
      .eq('user_token', userToken)
      .select('*')
      .single();

    if (updateError) {
      console.error('[SCHEDULE ARTICLE] Update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update article schedule' },
        { status: 500 }
      );
    }

    console.log('[SCHEDULE ARTICLE] Successfully updated:', {
      articleId: updatedArticle.id,
      title: updatedArticle.title,
      scheduled_publish_at: updatedArticle.scheduled_publish_at
    });

    return NextResponse.json({
      success: true,
      article: updatedArticle,
      message: scheduledDate
        ? `Article scheduled for ${new Date(scheduledDate).toLocaleString()}`
        : 'Article unscheduled'
    });

  } catch (error) {
    console.error('[SCHEDULE ARTICLE] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
