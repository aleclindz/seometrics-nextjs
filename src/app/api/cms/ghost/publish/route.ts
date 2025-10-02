import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userToken,
      connectionId,
      title,
      content,
      slug,
      status = 'draft',
      excerpt,
      tags = [],
      featuredImage,
      publishedAt,
      seoTitle,
      seoDescription,
      customFields = {}
    } = body;

    if (!userToken || !connectionId || !title || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: userToken, connectionId, title, content' },
        { status: 400 }
      );
    }

    console.log('[GHOST PUBLISH] Publishing article to Ghost:', title);

    // Get the Ghost connection
    const { data: connection, error: connectionError } = await supabase
      .from('cms_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_token', userToken)
      .single();

    if (connectionError || !connection) {
      console.error('[GHOST PUBLISH] Connection not found:', connectionError);
      return NextResponse.json(
        { error: 'Ghost connection not found or access denied' },
        { status: 404 }
      );
    }

    const siteUrl = connection.base_url.replace(/\/$/, '');
    const apiKey = connection.api_token;

    // Validate API key format
    const keyParts = apiKey.split(':');
    if (keyParts.length !== 2) {
      return NextResponse.json(
        { error: 'Invalid Ghost Admin API Key format in connection' },
        { status: 400 }
      );
    }

    // Import Ghost Admin API client
    const GhostAdminAPI = (await import('@tryghost/admin-api')).default;

    // Initialize Ghost Admin API client
    const api = new GhostAdminAPI({
      url: siteUrl,
      key: apiKey,
      version: 'v5.0'
    });

    // Convert HTML content to Lexical format for Ghost
    const lexicalContent = convertHTMLToLexical(content);

    // Prepare the Ghost post data
    const postData: any = {
      title: title,
      lexical: lexicalContent,
      status: status === 'published' ? 'published' : 'draft',
      slug: slug || generateSlug(title)
    };

    // Add excerpt if provided
    if (excerpt) {
      postData.custom_excerpt = excerpt;
    }

    // Add publish date if provided
    if (publishedAt) {
      postData.published_at = new Date(publishedAt).toISOString();
    }

    // Add featured image if provided
    if (featuredImage) {
      postData.feature_image = featuredImage;
    }

    // Add meta title/description for SEO
    if (seoTitle) {
      postData.meta_title = seoTitle;
    }
    if (seoDescription) {
      postData.meta_description = seoDescription;
    }

    // Handle tags (Ghost native feature)
    if (tags.length > 0) {
      // Ghost expects tags as objects with name property
      postData.tags = tags.map((tag: string) => ({ name: tag }));
    }

    console.log('[GHOST PUBLISH] Creating Ghost post...');

    let createdPost: any;
    try {
      createdPost = await api.posts.add(postData, { source: 'html' });
      console.log('[GHOST PUBLISH] Post created successfully:', createdPost.id);
    } catch (publishError: any) {
      console.error('[GHOST PUBLISH] Post creation failed:', publishError.message);

      return NextResponse.json(
        {
          error: `Failed to create Ghost post: ${publishError.message}`,
          details: publishError.message
        },
        { status: 500 }
      );
    }

    // Prepare response data
    const publishedArticle = {
      id: createdPost.id,
      title: createdPost.title,
      content: createdPost.html || content,
      slug: createdPost.slug,
      status: createdPost.status === 'published' ? 'published' : 'draft',
      url: createdPost.url,
      publishedAt: createdPost.status === 'published' ? new Date(createdPost.published_at) : null,
      excerpt: createdPost.custom_excerpt || excerpt || '',
      tags: tags,
      featuredImage: createdPost.feature_image || featuredImage,
      seo: {
        title: createdPost.meta_title || seoTitle || title,
        description: createdPost.meta_description || seoDescription || excerpt || ''
      }
    };

    // Update website CMS status
    await updateWebsiteCMSStatus(userToken, siteUrl, true);

    return NextResponse.json({
      success: true,
      message: 'Article published to Ghost successfully',
      article: publishedArticle,
      ghostId: createdPost.id,
      url: createdPost.url
    });

  } catch (error) {
    console.error('[GHOST PUBLISH] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error during Ghost publishing' },
      { status: 500 }
    );
  }
}

// Helper function to generate a URL-friendly slug
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

// Helper function to convert HTML to Lexical format
function convertHTMLToLexical(html: string): string {
  // Ghost 5.0+ uses Lexical editor format
  // For simple HTML, we can create a basic Lexical structure
  // For more complex content, you'd want a proper HTML-to-Lexical converter

  // Strip HTML tags to get plain text (simple approach)
  const plainText = html.replace(/<[^>]*>/g, '\n').replace(/\n+/g, '\n').trim();

  // Split into paragraphs
  const paragraphs = plainText.split('\n').filter(p => p.trim());

  // Build Lexical structure
  const lexicalContent = {
    root: {
      children: paragraphs.map(text => ({
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: text.trim(),
            type: 'text',
            version: 1
          }
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1
      })),
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'root',
      version: 1
    }
  };

  return JSON.stringify(lexicalContent);
}

// Helper function to update website CMS status
async function updateWebsiteCMSStatus(userToken: string, baseUrl: string, success: boolean): Promise<void> {
  try {
    const domain = baseUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');

    await supabase
      .from('websites')
      .update({
        cms_status: success ? 'connected' : 'error',
        last_status_check: new Date().toISOString()
      })
      .eq('user_token', userToken)
      .or(`domain.ilike.%${domain}%,cleaned_domain.ilike.%${domain}%`);
  } catch (error) {
    console.error('[GHOST PUBLISH] Failed to update website status:', error);
  }
}
