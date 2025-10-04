import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Check environment configuration
    const config = {
      redisEnabled: process.env.ENABLE_REDIS_QUEUES === 'true',
      workersStarted: process.env.START_WORKERS === 'true',
      eventsStarted: process.env.START_EVENTS === 'true',
      redisUrl: process.env.REDIS_URL ? '✓ Configured' : '✗ Missing',
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown'
    };

    // Query article_queue for status distribution
    const { data: articles } = await supabase
      .from('article_queue')
      .select('status, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(100);

    const statusMap: Record<string, number> = {};
    articles?.forEach((a: any) => {
      statusMap[a.status] = (statusMap[a.status] || 0) + 1;
    });

    const articleStats = {
      pending: statusMap['pending'] || 0,
      generating: statusMap['generating'] || 0,
      generated: statusMap['generated'] || 0,
      generation_failed: statusMap['generation_failed'] || 0,
      publishing: statusMap['publishing'] || 0,
      published: statusMap['published'] || 0,
      publishing_failed: statusMap['publishing_failed'] || 0,
    };

    // Get stuck articles (pending > 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: stuckArticles } = await supabase
      .from('article_queue')
      .select('id, title, status, created_at, updated_at')
      .eq('status', 'pending')
      .lt('created_at', tenMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get recently generating articles
    const { data: recentlyGenerating } = await supabase
      .from('article_queue')
      .select('id, title, status, created_at, updated_at')
      .in('status', ['generating', 'generated'])
      .order('updated_at', { ascending: false })
      .limit(5);

    // Health assessment
    const health = {
      overall: 'unknown' as 'healthy' | 'degraded' | 'unhealthy' | 'unknown',
      issues: [] as string[],
      recommendations: [] as string[]
    };

    if (!config.redisEnabled) {
      health.overall = 'degraded';
      health.issues.push('Redis queues disabled - articles will not process automatically');
      health.recommendations.push('Set ENABLE_REDIS_QUEUES=true to enable background processing');
    }

    if (config.redisEnabled && !config.workersStarted) {
      health.overall = 'degraded';
      health.issues.push('Workers not started - jobs will queue but not process');
      health.recommendations.push('Set START_WORKERS=true on Railway worker instance');
    }

    if ((stuckArticles?.length || 0) > 5) {
      health.overall = health.overall === 'degraded' ? 'degraded' : 'unhealthy';
      health.issues.push(`${stuckArticles?.length} articles stuck in pending state > 10 minutes`);
      health.recommendations.push('Check Railway worker logs for errors');
    }

    if ((articleStats.generating || 0) > 0) {
      health.overall = health.overall === 'unknown' ? 'healthy' : health.overall;
    }

    if (health.issues.length === 0 && health.overall === 'unknown') {
      health.overall = config.redisEnabled && config.workersStarted ? 'healthy' : 'degraded';
    }

    return NextResponse.json({
      success: true,
      config,
      articleStats,
      stuckArticles: stuckArticles || [],
      recentlyGenerating: recentlyGenerating || [],
      health,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[WORKER STATUS] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get worker status'
      },
      { status: 500 }
    );
  }
}
