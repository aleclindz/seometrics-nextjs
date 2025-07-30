import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/audits - List all audits for a user
export async function GET(request: NextRequest) {
  try {
    const userToken = request.nextUrl.searchParams.get('userToken');
    const websiteUrl = request.nextUrl.searchParams.get('websiteUrl');
    const status = request.nextUrl.searchParams.get('status');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');
    
    if (!userToken) {
      return NextResponse.json({ error: 'User token is required' }, { status: 400 });
    }

    // Set RLS context
    await supabase.rpc('set_config', {
      config_key: 'app.current_user_token',
      config_value: userToken
    });

    // Build query
    let query = supabase
      .from('seo_audits')
      .select(`
        id,
        website_url,
        audit_type,
        status,
        current_step,
        progress_percentage,
        overall_score,
        total_issues,
        critical_issues,
        warning_issues,
        info_issues,
        pages_crawled,
        pages_total,
        started_at,
        completed_at,
        duration_seconds,
        created_at
      `)
      .eq('user_token', userToken)
      .order('created_at', { ascending: false });

    // Apply filters
    if (websiteUrl) {
      query = query.eq('website_url', websiteUrl);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: audits, error: auditsError } = await query;

    if (auditsError) {
      console.error('Error fetching audits:', auditsError);
      return NextResponse.json({ error: 'Failed to fetch audits' }, { status: 500 });
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('seo_audits')
      .select('id', { count: 'exact' })
      .eq('user_token', userToken);

    if (websiteUrl) {
      countQuery = countQuery.eq('website_url', websiteUrl);
    }

    if (status) {
      countQuery = countQuery.eq('status', status);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error counting audits:', countError);
    }

    // Enhance audit data with additional metrics
    const enhancedAudits = audits?.map(audit => ({
      ...audit,
      // Calculate completion percentage for display
      completionPercentage: audit.status === 'completed' ? 100 : audit.progress_percentage || 0,
      // Format duration
      durationFormatted: audit.duration_seconds ? formatDuration(audit.duration_seconds) : null,
      // Calculate health status
      healthStatus: getHealthStatus(audit.overall_score),
      // Get status color for UI
      statusColor: getStatusColor(audit.status),
      // Quick summary
      summary: {
        hasIssues: (audit.total_issues || 0) > 0,
        needsAttention: (audit.critical_issues || 0) > 0,
        score: audit.overall_score,
        lastRun: audit.completed_at || audit.started_at
      }
    }));

    return NextResponse.json({
      success: true,
      audits: enhancedAudits || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      },
      summary: {
        totalAudits: count || 0,
        runningAudits: audits?.filter(a => a.status === 'running').length || 0,
        completedAudits: audits?.filter(a => a.status === 'completed').length || 0,
        failedAudits: audits?.filter(a => a.status === 'failed').length || 0
      }
    });

  } catch (error) {
    console.error('Error listing audits:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper functions
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const remainingMinutes = Math.floor((seconds % 3600) / 60);
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
}

function getHealthStatus(score?: number): 'excellent' | 'good' | 'needs-improvement' | 'poor' | 'unknown' {
  if (score === undefined || score === null) return 'unknown';
  
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'needs-improvement';
  return 'poor';
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'green';
    case 'running':
      return 'blue';
    case 'pending':
      return 'yellow';
    case 'failed':
      return 'red';
    case 'superseded':
      return 'gray';
    default:
      return 'gray';
  }
}