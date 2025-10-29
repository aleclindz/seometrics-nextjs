import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CMSManager } from '@/lib/cms/cms-manager';

/**
 * GET /api/cms/webflow/sites
 * Fetches all Webflow sites for a user's connected account
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const connectionId = searchParams.get('connectionId');

    if (!userToken) {
      return NextResponse.json(
        { error: 'Missing userToken' },
        { status: 400 }
      );
    }

    // Get the Webflow connection from database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: connection, error: connectionError } = await supabase
      .from('cms_connections')
      .select('*')
      .eq('user_token', userToken)
      .eq('cms_type', 'webflow')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'Webflow connection not found' },
        { status: 404 }
      );
    }

    // Use the CMSManager to fetch sites
    const cmsManager = new CMSManager();
    const provider = cmsManager.getProvider('webflow');

    if (!provider) {
      return NextResponse.json(
        { error: 'Webflow provider not available' },
        { status: 500 }
      );
    }

    const credentials = {
      accessToken: connection.api_token,
    };

    // Fetch sites from Webflow API
    const sitesResponse = await fetch('https://api.webflow.com/v2/sites', {
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'accept-version': '1.0.0',
      },
    });

    if (!sitesResponse.ok) {
      throw new Error(`Webflow API error: ${sitesResponse.statusText}`);
    }

    const sitesData = await sitesResponse.json();
    const sites = sitesData.sites || [];

    // Format sites for frontend
    const formattedSites = sites.map((site: any) => ({
      siteId: site.id,
      name: site.displayName || site.shortName,
      customDomain: site.customDomains?.[0]?.url || site.previewUrl,
      previewUrl: site.previewUrl,
    }));

    return NextResponse.json({
      success: true,
      sites: formattedSites,
    });
  } catch (error) {
    console.error('[WEBFLOW SITES] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch Webflow sites',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
