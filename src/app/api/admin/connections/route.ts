import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Get all website connections with their statuses
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get websites with connection statuses
    let websitesQuery = supabase
      .from('websites')
      .select(`
        id,
        website_token,
        user_token,
        domain,
        cleaned_domain,
        is_managed,
        is_excluded_from_sync,
        gsc_status,
        seoagentjs_status,
        cms_status,
        hosting_status,
        last_status_check,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (userToken) {
      websitesQuery = websitesQuery.eq('user_token', userToken);
    }

    const { data: websites, error: websitesError } = await websitesQuery;

    if (websitesError) {
      console.error('[ADMIN CONNECTIONS] Error fetching websites:', websitesError);
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 });
    }

    // Enrich with user email and detailed connection info
    const enrichedWebsites = await Promise.all(
      (websites || []).map(async (website) => {
        // Get user email
        const { data: user } = await supabase
          .from('login_users')
          .select('email')
          .eq('token', website.user_token)
          .single();

        // Get GSC connection details
        const { data: gscConnection } = await supabase
          .from('gsc_connections')
          .select('email, last_sync_at, is_active')
          .eq('user_token', website.user_token)
          .single();

        // Get CMS connection details
        const { data: cmsConnection } = await supabase
          .from('cms_connections')
          .select('cms_type, connection_name, status, last_sync_at, error_message')
          .eq('website_id', website.id)
          .single();

        // Get GSC property for this website
        const { data: gscProperty } = await supabase
          .from('gsc_properties')
          .select('site_url, permission_level, is_verified, last_sync_at')
          .eq('user_token', website.user_token)
          .ilike('site_url', `%${website.cleaned_domain || website.domain}%`)
          .maybeSingle();

        return {
          ...website,
          user_email: user?.email || 'Unknown',
          gsc_connection: gscConnection ? {
            email: gscConnection.email,
            last_sync: gscConnection.last_sync_at,
            is_active: gscConnection.is_active
          } : null,
          gsc_property: gscProperty ? {
            site_url: gscProperty.site_url,
            permission_level: gscProperty.permission_level,
            is_verified: gscProperty.is_verified,
            last_sync: gscProperty.last_sync_at
          } : null,
          cms_connection: cmsConnection ? {
            type: cmsConnection.cms_type,
            name: cmsConnection.connection_name,
            status: cmsConnection.status,
            last_sync: cmsConnection.last_sync_at,
            error: cmsConnection.error_message
          } : null
        };
      })
    );

    // Get total count
    let countQuery = supabase
      .from('websites')
      .select('*', { count: 'exact', head: true });

    if (userToken) {
      countQuery = countQuery.eq('user_token', userToken);
    }

    const { count: totalCount } = await countQuery;

    // Calculate connection stats
    const stats = {
      total_websites: totalCount || 0,
      gsc_connected: enrichedWebsites.filter(w => w.gsc_status === 'connected').length,
      seoagentjs_active: enrichedWebsites.filter(w => w.seoagentjs_status === 'active').length,
      cms_connected: enrichedWebsites.filter(w => w.cms_status === 'connected').length,
      hosting_connected: enrichedWebsites.filter(w => w.hosting_status === 'connected').length,
      fully_connected: enrichedWebsites.filter(w =>
        w.gsc_status === 'connected' &&
        w.seoagentjs_status === 'active' &&
        w.cms_status === 'connected'
      ).length
    };

    return NextResponse.json({
      success: true,
      connections: enrichedWebsites,
      stats,
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        has_more: (totalCount || 0) > offset + limit
      }
    });

  } catch (error) {
    console.error('[ADMIN CONNECTIONS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    );
  }
}
