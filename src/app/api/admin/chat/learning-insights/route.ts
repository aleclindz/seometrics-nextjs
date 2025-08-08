import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Get agent learning insights and analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const websiteToken = searchParams.get('websiteToken');
    const days = parseInt(searchParams.get('days') || '30');

    const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Get agent learning data
    let learningQuery = supabase
      .from('agent_learning')
      .select('*')
      .gte('created_at', dateFrom)
      .order('created_at', { ascending: false });

    if (userToken) {
      learningQuery = learningQuery.eq('user_token', userToken);
    }

    if (websiteToken) {
      learningQuery = learningQuery.eq('website_token', websiteToken);
    }

    const { data: learningData, error: learningError } = await learningQuery;

    if (learningError) {
      console.error('[ADMIN LEARNING] Error fetching learning data:', learningError);
      return NextResponse.json({ error: 'Failed to fetch learning insights' }, { status: 500 });
    }

    // Calculate success rates by action type
    const actionStats = (learningData || []).reduce((acc, entry) => {
      const action = entry.action_type;
      if (!acc[action]) {
        acc[action] = { total: 0, success: 0, failure: 0, partial: 0, avgExecutionTime: 0 };
      }
      
      acc[action].total++;
      acc[action][entry.outcome]++;
      
      if (entry.execution_time_ms) {
        acc[action].avgExecutionTime = 
          (acc[action].avgExecutionTime * (acc[action].total - 1) + entry.execution_time_ms) / acc[action].total;
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate success rates
    const actionSuccessRates = Object.keys(actionStats).map(action => ({
      action,
      success_rate: actionStats[action].total > 0 ? 
        (actionStats[action].success / actionStats[action].total) : 0,
      total_executions: actionStats[action].total,
      avg_execution_time: Math.round(actionStats[action].avgExecutionTime),
      outcomes: {
        success: actionStats[action].success || 0,
        failure: actionStats[action].failure || 0,
        partial: actionStats[action].partial || 0
      }
    })).sort((a, b) => b.total_executions - a.total_executions);

    // Get memory growth over time
    let memoryQuery = supabase
      .from('agent_memory')
      .select('memory_type, created_at, last_updated')
      .gte('created_at', dateFrom)
      .order('created_at', { ascending: true });

    if (userToken) {
      memoryQuery = memoryQuery.eq('user_token', userToken);
    }

    if (websiteToken) {
      memoryQuery = memoryQuery.eq('website_token', websiteToken);
    }

    const { data: memoryData } = await memoryQuery;

    // Group memory updates by day
    const memoryGrowth = (memoryData || []).reduce((acc, entry) => {
      const date = entry.created_at.split('T')[0];
      if (!acc[date]) acc[date] = { context: 0, patterns: 0, preferences: 0, insights: 0, strategies: 0 };
      acc[date][entry.memory_type as keyof typeof acc[string]]++;
      return acc;
    }, {} as Record<string, any>);

    // Get conversation analysis stats
    const conversationMemories = (memoryData || []).filter(entry => 
      entry.metadata?.source === 'explicit' || 
      entry.metadata?.source === 'feedback'
    );

    const conversationStats = {
      total_conversation_memories: conversationMemories.length,
      by_source: conversationMemories.reduce((acc, entry) => {
        const source = entry.metadata?.source || 'unknown';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    // Get top performing websites (if not filtered by websiteToken)
    let websitePerformance = [];
    if (!websiteToken) {
      const websiteStats = (learningData || []).reduce((acc, entry) => {
        const website = entry.website_token;
        if (!acc[website]) {
          acc[website] = { total: 0, success: 0 };
        }
        acc[website].total++;
        if (entry.outcome === 'success') acc[website].success++;
        return acc;
      }, {} as Record<string, any>);

      websitePerformance = Object.keys(websiteStats)
        .map(website => ({
          website_token: website,
          success_rate: websiteStats[website].success / websiteStats[website].total,
          total_actions: websiteStats[website].total
        }))
        .sort((a, b) => b.success_rate - a.success_rate)
        .slice(0, 10);
    }

    return NextResponse.json({
      success: true,
      insights: {
        action_success_rates: actionSuccessRates,
        memory_growth_by_day: memoryGrowth,
        conversation_analysis: conversationStats,
        website_performance: websitePerformance,
        summary: {
          total_actions: learningData?.length || 0,
          overall_success_rate: learningData?.length ? 
            learningData.filter(entry => entry.outcome === 'success').length / learningData.length : 0,
          total_memory_entries: memoryData?.length || 0,
          conversation_driven_memories: conversationMemories.length,
          date_range: { from: dateFrom, to: new Date().toISOString() }
        }
      }
    });

  } catch (error) {
    console.error('[ADMIN LEARNING] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch learning insights' }, 
      { status: 500 }
    );
  }
}