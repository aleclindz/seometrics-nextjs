import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST: Generate bulk article ideas for the next period
export async function POST(request: NextRequest) {
  try {
    const { userToken, websiteToken, domain, period = 'week', count = 10, addToQueue = false } = await request.json();

    if (!userToken || !domain) {
      return NextResponse.json(
        { success: false, error: 'User token and domain are required' },
        { status: 400 }
      );
    }

    console.log(`[BULK IDEAS] Generating ${count} article ideas for ${period} for domain: ${domain}`);

    // Call autonomous topic selection with the specified count
    const topicResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/agent/autonomous-topic-selection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userToken,
        websiteToken,
        domain,
        analysisType: 'comprehensive',
        generateCount: count
      })
    });

    if (!topicResponse.ok) {
      throw new Error(`Topic generation failed: ${topicResponse.status}`);
    }

    const topicData = await topicResponse.json();

    if (!topicData.success) {
      return NextResponse.json({
        success: false,
        error: topicData.error || 'Failed to generate topic ideas'
      });
    }

    const articleIdeas = topicData.selectedTopics || [];

    // If addToQueue is true, add these to the content generation queue
    if (addToQueue && articleIdeas.length > 0) {
      const now = new Date();
      const queueItems = articleIdeas.map((idea: any, index: number) => {
        // Spread articles over the specified period
        const hoursOffset = period === 'week' ? (index * (7 * 24 / count)) : (index * (24 / count));
        const scheduledTime = new Date(now.getTime() + hoursOffset * 60 * 60 * 1000);

        return {
          user_token: userToken,
          website_token: websiteToken,
          scheduled_for: scheduledTime.toISOString(),
          topic: idea.title,
          target_word_count: idea.recommendedLength,
          content_style: 'professional', // Default, can be customized
          status: 'draft',
          // Enhanced schema fields
          topic_cluster: idea.mainTopic,
          content_pillar: idea.mainTopic, // Can be more specific based on content strategy
          target_keywords: JSON.stringify(idea.targetKeywords || []),
          short_description: idea.contentBrief?.substring(0, 200) || `Article about ${idea.title}`,
          article_format: JSON.stringify(idea.articleFormat || {}),
          authority_level: idea.authorityLevel || 'foundation',
          priority: idea.priority || (index + 1),
          estimated_traffic_potential: idea.estimatedTrafficPotential || 0,
          target_queries: JSON.stringify(idea.targetQueries || []),
          content_brief: idea.contentBrief || '',
          queue_position: index + 1,
          // Legacy metadata field for backward compatibility
          metadata: JSON.stringify({
            priority: idea.priority,
            targetKeywords: idea.targetKeywords,
            articleFormat: idea.articleFormat,
            authorityLevel: idea.authorityLevel,
            estimatedTrafficPotential: idea.estimatedTrafficPotential,
            targetQueries: idea.targetQueries
          })
        };
      });

      const { data: insertedItems, error: insertError } = await supabase
        .from('content_generation_queue')
        .insert(queueItems)
        .select('*');

      if (insertError) {
        console.error('[BULK IDEAS] Error adding to queue:', insertError);
        return NextResponse.json({
          success: false,
          error: 'Failed to add ideas to queue'
        });
      }

      console.log(`[BULK IDEAS] Added ${insertedItems?.length || 0} ideas to queue`);
    }

    // Calculate publish dates for UI display
    const now = new Date();
    const articleIdeasWithDates = articleIdeas.map((idea: any, index: number) => {
      const hoursOffset = period === 'week' ? (index * (7 * 24 / count)) : (index * (24 / count));
      const suggestedPublishDate = new Date(now.getTime() + hoursOffset * 60 * 60 * 1000);

      return {
        ...idea,
        suggestedPublishDate: suggestedPublishDate.toISOString(),
        queueStatus: addToQueue ? 'queued' : 'draft'
      };
    });

    return NextResponse.json({
      success: true,
      articleIdeas: articleIdeasWithDates,
      period,
      count,
      addedToQueue: addToQueue,
      summary: {
        totalIdeas: articleIdeas.length,
        formatBreakdown: articleIdeas.reduce((acc: any, idea: any) => {
          const format = idea.articleFormat?.type || 'unknown';
          acc[format] = (acc[format] || 0) + 1;
          return acc;
        }, {}),
        authorityLevels: articleIdeas.reduce((acc: any, idea: any) => {
          const level = idea.authorityLevel || 'foundation';
          acc[level] = (acc[level] || 0) + 1;
          return acc;
        }, {}),
        estimatedTotalTraffic: articleIdeas.reduce((sum: number, idea: any) => sum + (idea.estimatedTrafficPotential || 0), 0)
      }
    });

  } catch (error) {
    console.error('[BULK IDEAS] Error generating bulk article ideas:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate bulk article ideas' },
      { status: 500 }
    );
  }
}

// GET: Retrieve current article ideas queue
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const domain = searchParams.get('domain');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!userToken) {
      return NextResponse.json(
        { success: false, error: 'User token is required' },
        { status: 400 }
      );
    }

    // Get current queue items
    let query = supabase
      .from('content_generation_queue')
      .select('*')
      .eq('user_token', userToken)
      .in('status', ['draft', 'pending', 'generating'])
      .order('scheduled_for', { ascending: true })
      .limit(limit);

    if (domain) {
      // Filter by domain if specified (would need to join with websites table)
      const { data: websiteData } = await supabase
        .from('websites')
        .select('website_token')
        .eq('domain', domain)
        .single();

      if (websiteData) {
        query = query.eq('website_token', websiteData.website_token);
      }
    }

    const { data: queueItems, error } = await query;

    if (error) {
      throw error;
    }

    // Parse metadata and format for UI
    const formattedQueue = (queueItems || []).map((item: any) => {
      let metadata = {};
      try {
        metadata = JSON.parse(item.metadata || '{}');
      } catch (e) {
        console.warn('Failed to parse queue item metadata:', e);
      }

      return {
        id: item.id,
        title: item.topic,
        scheduledFor: item.scheduled_for,
        status: item.status,
        wordCount: item.target_word_count,
        contentStyle: item.content_style,
        createdAt: item.created_at,
        ...metadata
      };
    });

    return NextResponse.json({
      success: true,
      queue: formattedQueue,
      total: formattedQueue.length,
      nextScheduled: formattedQueue[0]?.scheduledFor || null
    });

  } catch (error) {
    console.error('[BULK IDEAS] Error retrieving queue:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve article queue' },
      { status: 500 }
    );
  }
}