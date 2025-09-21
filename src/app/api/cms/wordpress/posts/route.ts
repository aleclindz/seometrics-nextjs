import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const connectionId = searchParams.get('connectionId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const status = searchParams.get('status') || 'publish'; // publish, draft, private

    if (!userToken || !connectionId) {
      return NextResponse.json(
        { error: 'Missing required parameters: userToken, connectionId' },
        { status: 400 }
      );
    }

    console.log('[WORDPRESS POSTS] Fetching WordPress posts for connection:', connectionId);

    // Get the WordPress connection
    const { data: connection, error: connectionError } = await supabase
      .from('cms_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_token', userToken)
      .eq('cms_type', 'wordpress')
      .single();

    if (connectionError || !connection) {
      console.error('[WORDPRESS POSTS] Connection not found:', connectionError);
      return NextResponse.json(
        { error: 'WordPress connection not found or access denied' },
        { status: 404 }
      );
    }

    // Parse application password
    const parts = connection.api_token.split(':');
    if (parts.length !== 2) {
      return NextResponse.json(
        { error: 'Invalid application password format in connection' },
        { status: 400 }
      );
    }

    const [username, password] = parts;
    const auth = btoa(`${username}:${password}`);
    const siteUrl = connection.base_url.replace(/\/$/, '');

    // Build WordPress API URL
    let apiUrl = `${siteUrl}/wp-json/wp/v2/posts?per_page=${limit}&status=${status}&_embed=wp:term,author,wp:featuredmedia`;

    if (search) {
      apiUrl += `&search=${encodeURIComponent(search)}`;
    }

    console.log('[WORDPRESS POSTS] Fetching from:', apiUrl);

    // Fetch posts from WordPress
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[WORDPRESS POSTS] Failed to fetch posts:', response.status, errorText);

      if (response.status === 401) {
        return NextResponse.json(
          { error: 'WordPress authentication failed. Please check your connection.' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        {
          error: `Failed to fetch WordPress posts (${response.status})`,
          details: errorText
        },
        { status: response.status }
      );
    }

    const wordpressPosts = await response.json();
    console.log('[WORDPRESS POSTS] Fetched', wordpressPosts.length, 'posts');

    // Transform WordPress posts to our standard format
    const posts = wordpressPosts.map((post: any) => ({
      id: post.id.toString(),
      title: post.title.rendered,
      content: post.content.rendered,
      excerpt: post.excerpt.rendered ? stripHtml(post.excerpt.rendered) : '',
      slug: post.slug,
      status: post.status,
      url: post.link,
      publishedAt: post.status === 'publish' ? new Date(post.date) : null,
      modifiedAt: new Date(post.modified),
      author: {
        id: post.author,
        name: post._embedded?.author?.[0]?.name || 'Unknown',
        avatar: post._embedded?.author?.[0]?.avatar_urls?.['48'] || null
      },
      categories: post._embedded?.['wp:term']?.[0]?.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug
      })) || [],
      tags: post._embedded?.['wp:term']?.[1]?.map((tag: any) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug
      })) || [],
      featuredImage: {
        id: post.featured_media,
        url: post._embedded?.['wp:featuredmedia']?.[0]?.source_url || null,
        alt: post._embedded?.['wp:featuredmedia']?.[0]?.alt_text || '',
        caption: post._embedded?.['wp:featuredmedia']?.[0]?.caption?.rendered || ''
      },
      wordCount: estimateWordCount(post.content.rendered),
      seo: {
        title: post.yoast_head_json?.title || post.title.rendered,
        description: post.yoast_head_json?.description ||
                    (post.excerpt.rendered ? stripHtml(post.excerpt.rendered).substring(0, 160) : ''),
        focusKeyword: post.yoast_head_json?.schema?.['@graph']?.[0]?.keywords || null
      },
      // Useful for internal linking
      internalLinkingData: {
        title: post.title.rendered,
        url: post.link,
        excerpt: post.excerpt.rendered ? stripHtml(post.excerpt.rendered) : '',
        categories: post._embedded?.['wp:term']?.[0]?.map((cat: any) => cat.name) || [],
        tags: post._embedded?.['wp:term']?.[1]?.map((tag: any) => tag.name) || [],
        wordCount: estimateWordCount(post.content.rendered)
      }
    }));

    // Also fetch categories and tags for additional context
    const [categoriesResponse, tagsResponse] = await Promise.all([
      fetch(`${siteUrl}/wp-json/wp/v2/categories?per_page=50`, {
        headers: { 'Authorization': `Basic ${auth}` }
      }),
      fetch(`${siteUrl}/wp-json/wp/v2/tags?per_page=50`, {
        headers: { 'Authorization': `Basic ${auth}` }
      })
    ]);

    let categories = [];
    let tags = [];

    if (categoriesResponse.ok) {
      categories = await categoriesResponse.json();
    }

    if (tagsResponse.ok) {
      tags = await tagsResponse.json();
    }

    return NextResponse.json({
      success: true,
      posts: posts,
      total: posts.length,
      connection: {
        id: connection.id,
        name: connection.connection_name,
        siteUrl: connection.base_url,
        status: connection.status
      },
      taxonomy: {
        categories: categories.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          count: cat.count
        })),
        tags: tags.map((tag: any) => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          count: tag.count
        }))
      }
    });

  } catch (error) {
    console.error('[WORDPRESS POSTS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching WordPress posts' },
      { status: 500 }
    );
  }
}

// Helper function to strip HTML tags
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

// Helper function to estimate word count
function estimateWordCount(html: string): number {
  const text = stripHtml(html);
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userToken,
      connectionId,
      postId,
      action, // 'update', 'add_internal_links'
      updates = {}
    } = body;

    if (!userToken || !connectionId || !postId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: userToken, connectionId, postId, action' },
        { status: 400 }
      );
    }

    console.log('[WORDPRESS POSTS] Updating WordPress post:', postId, 'Action:', action);

    // Get the WordPress connection
    const { data: connection, error: connectionError } = await supabase
      .from('cms_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_token', userToken)
      .eq('cms_type', 'wordpress')
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'WordPress connection not found or access denied' },
        { status: 404 }
      );
    }

    const parts = connection.api_token.split(':');
    if (parts.length !== 2) {
      return NextResponse.json(
        { error: 'Invalid application password format in connection' },
        { status: 400 }
      );
    }

    const [username, password] = parts;
    const auth = btoa(`${username}:${password}`);
    const siteUrl = connection.base_url.replace(/\/$/, '');

    if (action === 'update') {
      // Update the WordPress post
      const response = await fetch(`${siteUrl}/wp-json/wp/v2/posts/${postId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json(
          {
            error: `Failed to update WordPress post (${response.status})`,
            details: errorText
          },
          { status: response.status }
        );
      }

      const updatedPost = await response.json();

      return NextResponse.json({
        success: true,
        message: 'WordPress post updated successfully',
        post: {
          id: updatedPost.id.toString(),
          title: updatedPost.title.rendered,
          content: updatedPost.content.rendered,
          url: updatedPost.link,
          modifiedAt: new Date(updatedPost.modified)
        }
      });
    }

    return NextResponse.json(
      { error: `Unsupported action: ${action}` },
      { status: 400 }
    );

  } catch (error) {
    console.error('[WORDPRESS POSTS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error while updating WordPress post' },
      { status: 500 }
    );
  }
}