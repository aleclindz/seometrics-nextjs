import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CMSManager } from '@/lib/cms/cms-manager';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const cmsManager = new CMSManager();

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
      categories = [],
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

    console.log('[WORDPRESS PUBLISH] Publishing article to WordPress:', title);

    // Get the WordPress connection
    const { data: connection, error: connectionError } = await supabase
      .from('cms_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_token', userToken)
      .single();

    if (connectionError || !connection) {
      console.error('[WORDPRESS PUBLISH] Connection not found:', connectionError);
      return NextResponse.json(
        { error: 'WordPress connection not found or access denied' },
        { status: 404 }
      );
    }

    const cmsType: string = connection.cms_type;
    const siteUrl = connection.base_url.replace(/\/$/, '');
    const isWpCom = cmsType === 'wordpress_com';
    let authBasic = '';
    let wpcomAccessToken = '';
    if (isWpCom) {
      wpcomAccessToken = connection.api_token;
      if (!wpcomAccessToken) {
        return NextResponse.json({ error: 'Missing WordPress.com access token' }, { status: 400 });
      }
    } else {
      // Self-hosted WordPress using Application Passwords
      const parts = String(connection.api_token || '').split(':');
      if (parts.length !== 2) {
        return NextResponse.json(
          { error: 'Invalid application password format in connection' },
          { status: 400 }
        );
      }
      const [username, password] = parts;
      authBasic = btoa(`${username}:${password}`);
    }

    // Prepare the WordPress post data
    const postData: any = {
      title: title,
      content: content,
      status: status === 'published' ? 'publish' : 'draft',
      excerpt: excerpt || '',
      slug: slug || generateSlug(title)
    };

    // Add publish date if provided
    if (publishedAt) {
      postData.date = new Date(publishedAt).toISOString();
    }

    // Handle categories/tags for self-hosted only (WP.com requires site-specific taxonomy handling; skip initial)
    if (!isWpCom) {
      if (categories.length > 0) {
        const categoryIds = await getOrCreateCategories(siteUrl, authBasic, categories);
        if (categoryIds.length > 0) {
          postData.categories = categoryIds;
        }
      }
      if (tags.length > 0) {
        const tagIds = await getOrCreateTags(siteUrl, authBasic, tags);
        if (tagIds.length > 0) {
          postData.tags = tagIds;
        }
      }
    }

    // Handle SEO metadata (for Yoast SEO plugin)
    if (seoTitle || seoDescription) {
      postData.meta = {
        ...(seoTitle && { _yoast_wpseo_title: seoTitle }),
        ...(seoDescription && { _yoast_wpseo_metadesc: seoDescription }),
        ...customFields
      };
    }

    console.log('[WORDPRESS PUBLISH] Creating WordPress post...');

    let response: Response;
    if (isWpCom) {
      // Use WordPress.com REST API v2
      let siteIdentifier = '';
      try { siteIdentifier = new URL(siteUrl).host; } catch { siteIdentifier = siteUrl; }
      response = await fetch(`https://public-api.wordpress.com/wp/v2/sites/${siteIdentifier}/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${wpcomAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
      });
    } else {
      response = await fetch(`${siteUrl}/wp-json/wp/v2/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authBasic}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData)
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[WORDPRESS PUBLISH] Post creation failed:', response.status, errorText);

      return NextResponse.json(
        {
          error: `Failed to create WordPress post (${response.status})`,
          details: errorText
        },
        { status: response.status }
      );
    }

    const createdPost = await response.json();
    console.log('[WORDPRESS PUBLISH] Post created successfully:', createdPost.id);

    // Handle featured image if provided (self-hosted path only for now)
    if (!isWpCom && featuredImage && createdPost.id) {
      try {
        await setFeaturedImage(siteUrl, authBasic, createdPost.id, featuredImage);
      } catch (imageError) {
        console.warn('[WORDPRESS PUBLISH] Failed to set featured image:', imageError);
        // Don't fail the entire operation for image issues
      }
    }

    // Prepare response data
    const publishedArticle = {
      id: createdPost.id.toString(),
      title: createdPost.title.rendered,
      content: createdPost.content.rendered,
      slug: createdPost.slug,
      status: createdPost.status === 'publish' ? 'published' : 'draft',
      url: createdPost.link,
      publishedAt: createdPost.status === 'publish' ? new Date(createdPost.date) : null,
      excerpt: createdPost.excerpt.rendered ? stripHtml(createdPost.excerpt.rendered) : '',
      author: createdPost.author,
      categories: categories,
      tags: tags,
      featuredImage: featuredImage,
      seo: {
        title: seoTitle || title,
        description: seoDescription || excerpt || ''
      }
    };

    // Update website CMS status
    await updateWebsiteCMSStatus(userToken, siteUrl, true);

    return NextResponse.json({
      success: true,
      message: 'Article published to WordPress successfully',
      article: publishedArticle,
      wordPressId: createdPost.id,
      url: createdPost.link
    });

  } catch (error) {
    console.error('[WORDPRESS PUBLISH] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error during WordPress publishing' },
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

// Helper function to get or create categories
async function getOrCreateCategories(siteUrl: string, auth: string, categoryNames: string[]): Promise<number[]> {
  const categoryIds: number[] = [];

  for (const categoryName of categoryNames) {
    try {
      // First try to find existing category
      const searchResponse = await fetch(
        `${siteUrl}/wp-json/wp/v2/categories?search=${encodeURIComponent(categoryName)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (searchResponse.ok) {
        const existingCategories = await searchResponse.json();
        const existingCategory = existingCategories.find((cat: any) =>
          cat.name.toLowerCase() === categoryName.toLowerCase()
        );

        if (existingCategory) {
          categoryIds.push(existingCategory.id);
          continue;
        }
      }

      // Create new category
      const createResponse = await fetch(`${siteUrl}/wp-json/wp/v2/categories`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: categoryName })
      });

      if (createResponse.ok) {
        const newCategory = await createResponse.json();
        categoryIds.push(newCategory.id);
      } else {
        console.warn(`[WORDPRESS PUBLISH] Failed to create category: ${categoryName}`);
      }
    } catch (error) {
      console.warn(`[WORDPRESS PUBLISH] Error processing category ${categoryName}:`, error);
    }
  }

  return categoryIds;
}

// Helper function to get or create tags
async function getOrCreateTags(siteUrl: string, auth: string, tagNames: string[]): Promise<number[]> {
  const tagIds: number[] = [];

  for (const tagName of tagNames) {
    try {
      // First try to find existing tag
      const searchResponse = await fetch(
        `${siteUrl}/wp-json/wp/v2/tags?search=${encodeURIComponent(tagName)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (searchResponse.ok) {
        const existingTags = await searchResponse.json();
        const existingTag = existingTags.find((tag: any) =>
          tag.name.toLowerCase() === tagName.toLowerCase()
        );

        if (existingTag) {
          tagIds.push(existingTag.id);
          continue;
        }
      }

      // Create new tag
      const createResponse = await fetch(`${siteUrl}/wp-json/wp/v2/tags`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: tagName })
      });

      if (createResponse.ok) {
        const newTag = await createResponse.json();
        tagIds.push(newTag.id);
      } else {
        console.warn(`[WORDPRESS PUBLISH] Failed to create tag: ${tagName}`);
      }
    } catch (error) {
      console.warn(`[WORDPRESS PUBLISH] Error processing tag ${tagName}:`, error);
    }
  }

  return tagIds;
}

// Helper function to set featured image
async function setFeaturedImage(siteUrl: string, auth: string, postId: number, imageUrl: string): Promise<void> {
  try {
    // First, we need to upload the image to WordPress media library
    // For now, we'll just try to set it directly if it's already uploaded
    // In a full implementation, you'd want to download and re-upload the image

    // Try to find existing media by URL or upload new media
    const mediaResponse = await fetch(`${siteUrl}/wp-json/wp/v2/media?per_page=100`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (mediaResponse.ok) {
      const mediaItems = await mediaResponse.json();
      const existingMedia = mediaItems.find((item: any) =>
        item.source_url === imageUrl || item.guid?.rendered === imageUrl
      );

      if (existingMedia) {
        // Set the featured image
        await fetch(`${siteUrl}/wp-json/wp/v2/posts/${postId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ featured_media: existingMedia.id })
        });

        console.log('[WORDPRESS PUBLISH] Featured image set successfully');
      } else {
        console.warn('[WORDPRESS PUBLISH] Featured image not found in media library');
      }
    }
  } catch (error) {
    console.warn('[WORDPRESS PUBLISH] Error setting featured image:', error);
    throw error;
  }
}

// Helper function to strip HTML tags
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
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
    console.error('[WORDPRESS PUBLISH] Failed to update website status:', error);
  }
}
