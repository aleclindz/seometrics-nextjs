import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { domain, userToken, sitemapContent, robotsContent, provider } = await request.json();

    if (!domain || !userToken) {
      return NextResponse.json(
        { error: 'Missing required parameters: domain and userToken' },
        { status: 400 }
      );
    }

    if (!sitemapContent && !robotsContent) {
      return NextResponse.json(
        { error: 'At least one of sitemapContent or robotsContent is required' },
        { status: 400 }
      );
    }

    console.log(`[STORE SEO] Storing SEO content for domain: ${domain}, provider: ${provider}`);

    // Get existing content to avoid overwriting
    const { data: existing } = await supabase
      .from('hosting_seo_content')
      .select('sitemap_content, robots_content')
      .eq('user_token', userToken)
      .eq('domain', domain)
      .single();

    // Prepare upsert data, preserving existing content if not provided
    const upsertData = {
      user_token: userToken,
      domain,
      sitemap_content: sitemapContent || existing?.sitemap_content || null,
      robots_content: robotsContent || existing?.robots_content || null,
      provider: provider || 'unknown',
      status: 'active',
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('hosting_seo_content')
      .upsert(upsertData, {
        onConflict: 'user_token,domain'
      })
      .select()
      .single();

    if (error) {
      console.error('[STORE SEO] Error storing SEO content:', error);
      return NextResponse.json(
        { error: 'Failed to store SEO content' },
        { status: 500 }
      );
    }

    const response = {
      success: true,
      message: 'SEO content stored successfully',
      domain,
      provider,
      storedAt: data.updated_at,
      urls: {} as any
    };

    // Add proxy URLs for stored content
    if (data.sitemap_content) {
      response.urls.sitemap = `${process.env.NEXT_PUBLIC_APP_URL}/api/seo-proxy/sitemap?domain=${domain}&token=${userToken}`;
    }

    if (data.robots_content) {
      response.urls.robots = `${process.env.NEXT_PUBLIC_APP_URL}/api/seo-proxy/robots?domain=${domain}&token=${userToken}`;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('[STORE SEO] API error:', error);
    return NextResponse.json(
      { error: 'Internal server error storing SEO content' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');
    const userToken = searchParams.get('userToken');

    if (!domain || !userToken) {
      return NextResponse.json(
        { error: 'Missing required parameters: domain and userToken' },
        { status: 400 }
      );
    }

    console.log(`[STORE SEO] Retrieving SEO content for domain: ${domain}`);

    const { data: seoContent, error } = await supabase
      .from('hosting_seo_content')
      .select('*')
      .eq('user_token', userToken)
      .eq('domain', domain)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('[STORE SEO] Error retrieving SEO content:', error);
      return NextResponse.json(
        { error: 'SEO content not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      domain: seoContent.domain,
      provider: seoContent.provider,
      status: seoContent.status,
      hasSitemap: !!seoContent.sitemap_content,
      hasRobots: !!seoContent.robots_content,
      updatedAt: seoContent.updated_at,
      urls: {
        sitemap: seoContent.sitemap_content ? 
          `${process.env.NEXT_PUBLIC_APP_URL}/api/seo-proxy/sitemap?domain=${domain}&token=${userToken}` : null,
        robots: seoContent.robots_content ? 
          `${process.env.NEXT_PUBLIC_APP_URL}/api/seo-proxy/robots?domain=${domain}&token=${userToken}` : null
      }
    });

  } catch (error) {
    console.error('[STORE SEO] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error retrieving SEO content' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');
    const userToken = searchParams.get('userToken');

    if (!domain || !userToken) {
      return NextResponse.json(
        { error: 'Missing required parameters: domain and userToken' },
        { status: 400 }
      );
    }

    console.log(`[STORE SEO] Deleting SEO content for domain: ${domain}`);

    const { error } = await supabase
      .from('hosting_seo_content')
      .update({ status: 'inactive' })
      .eq('user_token', userToken)
      .eq('domain', domain);

    if (error) {
      console.error('[STORE SEO] Error deleting SEO content:', error);
      return NextResponse.json(
        { error: 'Failed to delete SEO content' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'SEO content deleted successfully',
      domain
    });

  } catch (error) {
    console.error('[STORE SEO] DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error deleting SEO content' },
      { status: 500 }
    );
  }
}