import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Get all users with their stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search'); // Search by email

    // Get all users
    let usersQuery = supabase
      .from('login_users')
      .select('id, email, token, plan, created_at, updated_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      usersQuery = usersQuery.ilike('email', `%${search}%`);
    }

    const { data: users, error: usersError } = await usersQuery;

    if (usersError) {
      console.error('[ADMIN USERS] Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Enrich with stats
    const enrichedUsers = await Promise.all(
      (users || []).map(async (user) => {
        // Get websites count
        const { count: websitesCount } = await supabase
          .from('websites')
          .select('*', { count: 'exact', head: true })
          .eq('user_token', user.token);

        // Get managed websites count
        const { count: managedCount } = await supabase
          .from('websites')
          .select('*', { count: 'exact', head: true })
          .eq('user_token', user.token)
          .eq('is_managed', true);

        // Get subscription info
        const { data: subscription } = await supabase
          .from('user_plans')
          .select('tier, status, sites_allowed, posts_allowed, stripe_customer_id')
          .eq('user_token', user.token)
          .single();

        // Get articles generated count
        const { count: articlesCount } = await supabase
          .from('article_queue')
          .select('*', { count: 'exact', head: true })
          .eq('user_token', user.token);

        // Get articles published count
        const { count: publishedCount } = await supabase
          .from('article_queue')
          .select('*', { count: 'exact', head: true })
          .eq('user_token', user.token)
          .eq('status', 'published');

        // Get GSC connections
        const { count: gscConnectionsCount } = await supabase
          .from('gsc_connections')
          .select('*', { count: 'exact', head: true })
          .eq('user_token', user.token)
          .eq('is_active', true);

        // Get CMS connections
        const { count: cmsConnectionsCount } = await supabase
          .from('cms_connections')
          .select('*', { count: 'exact', head: true })
          .eq('user_token', user.token)
          .eq('status', 'active');

        // Get conversation threads count
        const { count: conversationsCount } = await supabase
          .from('chat_threads')
          .select('*', { count: 'exact', head: true })
          .eq('user_token', user.token);

        return {
          ...user,
          stats: {
            websites_total: websitesCount || 0,
            websites_managed: managedCount || 0,
            articles_generated: articlesCount || 0,
            articles_published: publishedCount || 0,
            gsc_connections: gscConnectionsCount || 0,
            cms_connections: cmsConnectionsCount || 0,
            conversations: conversationsCount || 0
          },
          subscription: subscription || null
        };
      })
    );

    // Get total count for pagination
    let countQuery = supabase
      .from('login_users')
      .select('*', { count: 'exact', head: true });

    if (search) {
      countQuery = countQuery.ilike('email', `%${search}%`);
    }

    const { count: totalCount } = await countQuery;

    return NextResponse.json({
      success: true,
      users: enrichedUsers,
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        has_more: (totalCount || 0) > offset + limit
      }
    });

  } catch (error) {
    console.error('[ADMIN USERS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
