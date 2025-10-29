import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/cms/webflow/publish
 * Publishes an article to Webflow using saved field mapping
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userToken,
      connectionId,
      title,
      content,
      slug,
      excerpt,
      metaTitle,
      metaDescription,
      featuredImageUrl,
      status, // 'draft' or 'published'
    } = body;

    if (!userToken || !connectionId || !title || !content) {
      return NextResponse.json(
        { error: 'Missing required fields (userToken, connectionId, title, content)' },
        { status: 400 }
      );
    }

    // Get the Webflow connection with saved configuration
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: connection, error: connectionError } = await supabase
      .from('cms_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_token', userToken)
      .eq('cms_type', 'webflow')
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'Webflow connection not found' },
        { status: 404 }
      );
    }

    if (!connection.auth_config || !connection.auth_config.fieldMapping) {
      return NextResponse.json(
        { error: 'Webflow connection not properly configured. Please complete setup first.' },
        { status: 400 }
      );
    }

    const config = connection.auth_config;
    const { siteId, collectionId, fieldMapping, publishMode } = config;

    // Build field data using the saved mapping
    const fieldData: any = {};

    // Required fields
    fieldData[fieldMapping.slugFieldId] = slug || generateSlug(title);

    // Map title field
    if (fieldMapping.titleFieldId) {
      fieldData[fieldMapping.titleFieldId] = title;
    }

    // Map body field
    if (fieldMapping.bodyFieldId) {
      fieldData[fieldMapping.bodyFieldId] = content;
    }

    // Optional fields
    if (fieldMapping.metaTitleFieldId && metaTitle) {
      fieldData[fieldMapping.metaTitleFieldId] = metaTitle;
    }

    if (fieldMapping.metaDescriptionFieldId && metaDescription) {
      fieldData[fieldMapping.metaDescriptionFieldId] = metaDescription;
    }

    if (fieldMapping.featuredImageFieldId && featuredImageUrl) {
      // For Webflow ImageRef fields, we need to upload the image first
      // For now, we'll pass the URL (may need to handle image upload separately)
      fieldData[fieldMapping.featuredImageFieldId] = {
        url: featuredImageUrl,
      };
    }

    // Add excerpt if it exists in the mapping (not always present)
    if (excerpt) {
      // Try to find an excerpt/summary field in the collection
      const excerptFieldId = Object.keys(fieldData).find(key =>
        /excerpt|summary|intro/i.test(key)
      );
      if (excerptFieldId) {
        fieldData[excerptFieldId] = excerpt;
      }
    }

    // Determine if item should be draft based on status parameter or saved publishMode
    const shouldBeDraft = status === 'draft' || publishMode === 'draft';

    const itemData = {
      isArchived: false,
      isDraft: shouldBeDraft,
      fieldData,
    };

    // Create the item in Webflow
    const createResponse = await fetch(
      `https://api.webflow.com/v2/collections/${collectionId}/items`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${connection.api_token}`,
          'Content-Type': 'application/json',
          'accept-version': '1.0.0',
        },
        body: JSON.stringify(itemData),
      }
    );

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      console.error('[WEBFLOW PUBLISH] API error:', errorData);
      return NextResponse.json(
        {
          error: 'Failed to create item in Webflow',
          details: errorData
        },
        { status: createResponse.status }
      );
    }

    const createdItem = await createResponse.json();

    // If not a draft and publishMode is 'auto_publish', publish the site
    if (!shouldBeDraft && publishMode === 'auto_publish') {
      try {
        const publishResponse = await fetch(
          `https://api.webflow.com/v2/sites/${siteId}/publish`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${connection.api_token}`,
              'Content-Type': 'application/json',
              'accept-version': '1.0.0',
            },
            body: JSON.stringify({
              publishToWebflowSubdomain: true,
            }),
          }
        );

        if (!publishResponse.ok) {
          console.warn('[WEBFLOW PUBLISH] Site publish warning:', await publishResponse.text());
        }
      } catch (publishError) {
        console.warn('[WEBFLOW PUBLISH] Failed to auto-publish site:', publishError);
      }
    }

    // Update connection last_sync_at
    await supabase
      .from('cms_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', connectionId);

    return NextResponse.json({
      success: true,
      message: shouldBeDraft
        ? 'Article saved as draft in Webflow'
        : 'Article published to Webflow',
      article: {
        id: createdItem.id,
        title,
        slug: fieldData[fieldMapping.slugFieldId],
        status: shouldBeDraft ? 'draft' : 'published',
        webflowUrl: `https://webflow.com/design/${siteId}`, // Link to Webflow designer
      },
    });
  } catch (error) {
    console.error('[WEBFLOW PUBLISH] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to publish to Webflow',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
