import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Fetch content generation queue for a user or website
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const websiteToken = searchParams.get('websiteToken');
    const status = searchParams.get('status'); // Optional filter by status
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!userToken) {
      return NextResponse.json(
        { success: false, error: 'User token is required' },
        { status: 400 }
      );
    }

    // Build query filters
    let query = supabase
      .from('content_generation_queue')
      .select(`
        *,
        websites!content_generation_queue_website_token_fkey (
          domain,
          cleaned_domain
        ),
        content_schedules!content_generation_queue_schedule_id_fkey (
          frequency
        ),
        articles!content_generation_queue_article_id_fkey (
          title,
          status
        )
      `)
      .eq('user_token', userToken)
      .order('scheduled_for', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    // Add website filter if provided
    if (websiteToken) {
      query = query.eq('website_token', websiteToken);
    }

    // Add status filter if provided
    if (status && ['pending', 'processing', 'completed', 'failed'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data: queueData, error: queueError } = await query;

    if (queueError) {
      console.error('Error fetching queue:', queueError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch queue' },
        { status: 500 }
      );
    }

    // Get summary statistics
    let statsQuery = supabase
      .from('content_generation_queue')
      .select('status')
      .eq('user_token', userToken);

    if (websiteToken) {
      statsQuery = statsQuery.eq('website_token', websiteToken);
    }

    const { data: statsData, error: statsError } = await statsQuery;

    const stats = { pending: 0, processing: 0, completed: 0, failed: 0 };
    if (!statsError && statsData) {
      statsData.forEach(row => {
        if (row.status && stats.hasOwnProperty(row.status)) {
          stats[row.status as keyof typeof stats]++;
        }
      });
    }

    return NextResponse.json({
      success: true,
      queue: queueData || [],
      stats,
      total: (queueData || []).length
    });

  } catch (error) {
    console.error('Error fetching content generation queue:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Add item to content generation queue
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userToken,
      websiteToken,
      topic,
      scheduledFor,
      contentType = 'blog_post',
      targetWordCount = 1200,
      contentStyle = 'professional'
    } = body;

    if (!userToken || !websiteToken || !topic) {
      return NextResponse.json(
        { success: false, error: 'User token, website token, and topic are required' },
        { status: 400 }
      );
    }

    // Verify the website belongs to the user
    const { data: websiteData, error: websiteError } = await supabase
      .from('websites')
      .select('id')
      .eq('website_token', websiteToken)
      .eq('user_token', userToken)
      .single();

    if (websiteError || !websiteData) {
      return NextResponse.json(
        { success: false, error: 'Website not found or access denied' },
        { status: 404 }
      );
    }

    // Add to queue
    const scheduledTime = scheduledFor ? new Date(scheduledFor) : new Date();
    const { data: queueItem, error: insertError } = await supabase
      .from('content_generation_queue')
      .insert({
        user_token: userToken,
        website_token: websiteToken,
        scheduled_for: scheduledTime.toISOString(),
        topic,
        content_type: contentType,
        target_word_count: targetWordCount,
        content_style: contentStyle,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error adding to queue:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to add to queue' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      queueItem: {
        id: queueItem.id,
        scheduled_for: queueItem.scheduled_for,
        status: queueItem.status,
        topic: queueItem.topic,
        content_type: queueItem.content_type,
        target_word_count: queueItem.target_word_count,
        content_style: queueItem.content_style,
        created_at: queueItem.created_at
      },
      message: 'Content generation queued successfully'
    });

  } catch (error) {
    console.error('Error adding to content generation queue:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT: Update queue item status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userToken, queueId, status, articleId, errorMessage } = body;

    if (!userToken || !queueId || !status) {
      return NextResponse.json(
        { success: false, error: 'User token, queue ID, and status are required' },
        { status: 400 }
      );
    }

    if (!['pending', 'processing', 'completed', 'failed'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Verify the queue item belongs to the user
    const { data: existingItem, error: verifyError } = await supabase
      .from('content_generation_queue')
      .select('id')
      .eq('id', queueId)
      .eq('user_token', userToken)
      .single();

    if (verifyError || !existingItem) {
      return NextResponse.json(
        { success: false, error: 'Queue item not found or access denied' },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'processing' && !errorMessage) {
      updateData.started_at = new Date().toISOString();
    }

    if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }

    if (articleId) {
      updateData.article_id = articleId;
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    // Update the queue item
    const { data: updatedItem, error: updateError } = await supabase
      .from('content_generation_queue')
      .update(updateData)
      .eq('id', queueId)
      .eq('user_token', userToken)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating queue item:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update queue item' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      queueItem: {
        id: updatedItem.id,
        status: updatedItem.status,
        article_id: updatedItem.article_id,
        error_message: updatedItem.error_message,
        started_at: updatedItem.started_at,
        completed_at: updatedItem.completed_at
      },
      message: 'Queue item updated successfully'
    });

  } catch (error) {
    console.error('Error updating content generation queue:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Remove item from queue
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const queueId = searchParams.get('queueId');

    if (!userToken || !queueId) {
      return NextResponse.json(
        { success: false, error: 'User token and queue ID are required' },
        { status: 400 }
      );
    }

    // Delete the queue item (only if it belongs to the user)
    const { data, error } = await supabase
      .from('content_generation_queue')
      .delete()
      .eq('id', queueId)
      .eq('user_token', userToken)
      .select();

    if (error || !data || data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Queue item not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Queue item deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting content generation queue item:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}