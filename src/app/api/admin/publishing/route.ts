import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Get publishing activities across all users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const status = searchParams.get('status'); // pending, generating, published, etc.
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const days = parseInt(searchParams.get('days') || '30');

    const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Get article briefs
    let briefsQuery = supabase
      .from('article_briefs')
      .select('id, user_token, website_token, title, status, created_at')
      .gte('created_at', dateFrom)
      .order('created_at', { ascending: false });

    if (userToken) {
      briefsQuery = briefsQuery.eq('user_token', userToken);
    }

    const { data: briefs } = await briefsQuery;

    // Get article queue with details
    let articlesQuery = supabase
      .from('article_queue')
      .select(`
        id,
        user_token,
        website_id,
        title,
        slug,
        status,
        error_message,
        scheduled_for,
        published_at,
        cms_article_id,
        cms_admin_url,
        public_url,
        word_count,
        quality_score,
        seo_score,
        retry_count,
        generation_time_seconds,
        created_at,
        updated_at
      `)
      .gte('created_at', dateFrom)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (userToken) {
      articlesQuery = articlesQuery.eq('user_token', userToken);
    }

    if (status) {
      articlesQuery = articlesQuery.eq('status', status);
    }

    const { data: articles, error: articlesError } = await articlesQuery;

    if (articlesError) {
      console.error('[ADMIN PUBLISHING] Error fetching articles:', articlesError);
      return NextResponse.json({ error: 'Failed to fetch publishing activities' }, { status: 500 });
    }

    // Enrich articles with user, website, and error details
    const enrichedArticles = await Promise.all(
      (articles || []).map(async (article) => {
        // Get user email
        const { data: user } = await supabase
          .from('login_users')
          .select('email')
          .eq('token', article.user_token)
          .single();

        // Get website domain
        const { data: website } = await supabase
          .from('websites')
          .select('domain, cleaned_domain')
          .eq('id', article.website_id)
          .single();

        // Get generation logs (errors and steps)
        const { data: logs } = await supabase
          .from('article_generation_logs')
          .select('step, status, duration_seconds, error_details, created_at')
          .eq('article_queue_id', article.id)
          .order('created_at', { ascending: true });

        return {
          ...article,
          user_email: user?.email || 'Unknown',
          website_domain: website?.cleaned_domain || website?.domain || 'Unknown',
          generation_logs: logs || [],
          has_errors: logs?.some(log => log.status === 'failed') || !!article.error_message
        };
      })
    );

    // Get article generation error logs
    let errorLogsQuery = supabase
      .from('article_generation_logs')
      .select(`
        id,
        article_queue_id,
        step,
        status,
        error_details,
        created_at
      `)
      .eq('status', 'failed')
      .gte('created_at', dateFrom)
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: errorLogs } = await errorLogsQuery;

    // Calculate stats
    const stats = {
      briefs_created: briefs?.length || 0,
      articles_pending: enrichedArticles.filter(a => a.status === 'pending').length,
      articles_generating: enrichedArticles.filter(a => a.status === 'generating').length,
      articles_generated: enrichedArticles.filter(a => a.status === 'generated').length,
      articles_publishing: enrichedArticles.filter(a => a.status === 'publishing').length,
      articles_published: enrichedArticles.filter(a => a.status === 'published').length,
      articles_failed: enrichedArticles.filter(a =>
        a.status === 'generation_failed' || a.status === 'publishing_failed'
      ).length,
      total_errors: errorLogs?.length || 0,
      avg_generation_time: enrichedArticles.reduce((sum, a) =>
        sum + (a.generation_time_seconds || 0), 0
      ) / (enrichedArticles.length || 1),
      avg_quality_score: enrichedArticles.reduce((sum, a) =>
        sum + (a.quality_score || 0), 0
      ) / (enrichedArticles.length || 1),
      avg_seo_score: enrichedArticles.reduce((sum, a) =>
        sum + (a.seo_score || 0), 0
      ) / (enrichedArticles.length || 1)
    };

    // Get total count
    let countQuery = supabase
      .from('article_queue')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', dateFrom);

    if (userToken) countQuery = countQuery.eq('user_token', userToken);
    if (status) countQuery = countQuery.eq('status', status);

    const { count: totalCount } = await countQuery;

    return NextResponse.json({
      success: true,
      articles: enrichedArticles,
      error_logs: errorLogs || [],
      stats,
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        has_more: (totalCount || 0) > offset + limit
      }
    });

  } catch (error) {
    console.error('[ADMIN PUBLISHING] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch publishing activities' },
      { status: 500 }
    );
  }
}
