import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Retrieve article queue with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const websiteToken = searchParams.get('websiteToken');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userToken) {
      return NextResponse.json(
        { success: false, error: 'User token is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('content_generation_queue')
      .select('*')
      .eq('user_token', userToken);

    if (websiteToken) {
      query = query.eq('website_token', websiteToken);
    }

    if (status) {
      query = query.eq('status', status);
    } else {
      // Default: show draft and pending items
      query = query.in('status', ['draft', 'pending', 'generating']);
    }

    const { data: queueItems, error } = await query
      .order('scheduled_for', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // Format for UI
    const formattedQueue = (queueItems || []).map(formatQueueItem);

    return NextResponse.json({
      success: true,
      queue: formattedQueue,
      total: formattedQueue.length,
      hasMore: formattedQueue.length === limit
    });

  } catch (error) {
    console.error('[ARTICLE QUEUE] Error retrieving queue:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve article queue' },
      { status: 500 }
    );
  }
}

// PUT: Update article queue item
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, updates, userToken, action } = body;

    // Support adding new queue items directly from chat
    if (action === 'add') {
      const { websiteToken, item } = body as any;
      if (!userToken || !websiteToken || !item) {
        return NextResponse.json(
          { success: false, error: 'userToken, websiteToken and item are required' },
          { status: 400 }
        );
      }

      // Verify website ownership
      const { data: website, error: websiteError } = await supabase
        .from('websites')
        .select('website_token')
        .eq('user_token', userToken)
        .eq('website_token', websiteToken)
        .maybeSingle();

      if (websiteError || !website) {
        return NextResponse.json(
          { success: false, error: 'Website not found or access denied' },
          { status: 404 }
        );
      }

      // Map incoming item to DB row
      const now = new Date();
      const scheduledFor = item.scheduledFor ? new Date(item.scheduledFor) : new Date(now.getTime() + 24*60*60*1000);
      const row: any = {
        user_token: userToken,
        website_token: websiteToken,
        topic: item.topic || item.title,
        scheduled_for: scheduledFor.toISOString(),
        target_word_count: item.wordCount || item.recommendedLength || 1500,
        content_style: item.contentStyle || 'professional',
        status: item.status || 'draft',
        priority: item.priority || 1,
        estimated_traffic_potential: item.estimatedTrafficPotential || 0,
        target_keywords: Array.isArray(item.targetKeywords) ? item.targetKeywords : [],
        target_queries: Array.isArray(item.targetQueries) ? item.targetQueries : [],
        content_brief: item.contentBrief || '',
        article_format: item.articleFormat ? JSON.stringify(item.articleFormat) : null,
        authority_level: item.authorityLevel || 'foundation',
        metadata: JSON.stringify({
          priority: item.priority,
          targetKeywords: item.targetKeywords,
          targetQueries: item.targetQueries,
          articleFormat: item.articleFormat,
          authorityLevel: item.authorityLevel
        })
      };

      const { data: inserted, error: insertError } = await supabase
        .from('content_generation_queue')
        .insert(row)
        .select('*')
        .single();

      if (insertError) {
        console.error('[ARTICLE QUEUE] Add error:', insertError);
        return NextResponse.json(
          { success: false, error: 'Failed to add to queue' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, item: formatQueueItem(inserted) });
    }

    if (!id || !userToken) {
      return NextResponse.json(
        { success: false, error: 'ID and user token are required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: existingItem, error: fetchError } = await supabase
      .from('content_generation_queue')
      .select('*')
      .eq('id', id)
      .eq('user_token', userToken)
      .single();

    if (fetchError || !existingItem) {
      return NextResponse.json(
        { success: false, error: 'Article not found or access denied' },
        { status: 404 }
      );
    }

    // Prepare updates
    const allowedUpdates: any = {};
    if (updates.topic) allowedUpdates.topic = updates.topic;
    if (updates.scheduled_for) allowedUpdates.scheduled_for = updates.scheduled_for;
    if (updates.target_word_count) allowedUpdates.target_word_count = updates.target_word_count;
    if (updates.content_style) allowedUpdates.content_style = updates.content_style;
    if (updates.status) allowedUpdates.status = updates.status;

    // Handle metadata updates
    if (updates.metadata || updates.targetKeywords || updates.articleFormat) {
      let existingMetadata = {};
      try {
        existingMetadata = JSON.parse(existingItem.metadata || '{}');
      } catch (e) {
        console.warn('Failed to parse existing metadata');
      }

      const newMetadata = {
        ...existingMetadata,
        ...(updates.metadata || {}),
        ...(updates.targetKeywords && { targetKeywords: updates.targetKeywords }),
        ...(updates.articleFormat && { articleFormat: updates.articleFormat }),
        ...(updates.priority && { priority: updates.priority })
      };

      allowedUpdates.metadata = JSON.stringify(newMetadata);
    }

    allowedUpdates.updated_at = new Date().toISOString();

    const { data: updatedItem, error: updateError } = await supabase
      .from('content_generation_queue')
      .update(allowedUpdates)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      item: formatQueueItem(updatedItem)
    });

  } catch (error) {
    console.error('[ARTICLE QUEUE] Error updating item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update article' },
      { status: 500 }
    );
  }
}

// DELETE: Remove article from queue
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userToken = searchParams.get('userToken');

    if (!id || !userToken) {
      return NextResponse.json(
        { success: false, error: 'ID and user token are required' },
        { status: 400 }
      );
    }

    // Verify ownership before deletion
    const { data: deletedItem, error } = await supabase
      .from('content_generation_queue')
      .delete()
      .eq('id', parseInt(id))
      .eq('user_token', userToken)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Article not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Article removed from queue',
      deletedItem: formatQueueItem(deletedItem)
    });

  } catch (error) {
    console.error('[ARTICLE QUEUE] Error deleting item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete article' },
      { status: 500 }
    );
  }
}

// POST: Reorder queue items
export async function POST(request: NextRequest) {
  try {
    const { reorderedItems, userToken } = await request.json();

    if (!reorderedItems || !Array.isArray(reorderedItems) || !userToken) {
      return NextResponse.json(
        { success: false, error: 'Reordered items array and user token are required' },
        { status: 400 }
      );
    }

    // Verify all items belong to the user
    const itemIds = reorderedItems.map((item: any) => item.id);
    const { data: existingItems, error: fetchError } = await supabase
      .from('content_generation_queue')
      .select('id')
      .eq('user_token', userToken)
      .in('id', itemIds);

    if (fetchError || !existingItems || existingItems.length !== itemIds.length) {
      return NextResponse.json(
        { success: false, error: 'Invalid items or access denied' },
        { status: 403 }
      );
    }

    // Update each item with new scheduled time
    const now = new Date();
    const updatePromises = reorderedItems.map((item: any, index: number) => {
      const newScheduledTime = new Date(now.getTime() + index * 60 * 60 * 1000); // 1 hour apart

      return supabase
        .from('content_generation_queue')
        .update({
          scheduled_for: newScheduledTime.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id)
        .eq('user_token', userToken);
    });

    const results = await Promise.all(updatePromises);

    // Check for any errors
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      throw new Error(`Failed to update ${errors.length} items`);
    }

    // Fetch updated items
    const { data: updatedItems, error: refetchError } = await supabase
      .from('content_generation_queue')
      .select('*')
      .eq('user_token', userToken)
      .in('id', itemIds)
      .order('scheduled_for', { ascending: true });

    if (refetchError) {
      throw refetchError;
    }

    return NextResponse.json({
      success: true,
      message: 'Queue reordered successfully',
      items: (updatedItems || []).map(formatQueueItem)
    });

  } catch (error) {
    console.error('[ARTICLE QUEUE] Error reordering queue:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reorder queue' },
      { status: 500 }
    );
  }
}

// Helper function to format queue items for UI
function formatQueueItem(item: any) {
  let metadata = {};
  try {
    metadata = JSON.parse(item.metadata || '{}');
  } catch (e) {
    console.warn('Failed to parse queue item metadata');
  }

  return {
    id: item.id,
    title: item.topic,
    scheduledFor: item.scheduled_for,
    status: item.status,
    wordCount: item.target_word_count,
    contentStyle: item.content_style,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    websiteToken: item.website_token,
    ...metadata // Includes priority, targetKeywords, articleFormat, etc.
  };
}
