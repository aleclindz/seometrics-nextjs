import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/cms/webflow/collection-schema
 * Fetches detailed field schema for a specific collection with heuristic field mapping
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const collectionId = searchParams.get('collectionId');

    if (!userToken || !collectionId) {
      return NextResponse.json(
        { error: 'Missing userToken or collectionId' },
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

    const credentials = {
      accessToken: connection.api_token,
    };

    // Fetch collection schema from Webflow API
    const schemaResponse = await fetch(
      `https://api.webflow.com/v2/collections/${collectionId}`,
      {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
          'accept-version': '1.0.0',
        },
      }
    );

    if (!schemaResponse.ok) {
      throw new Error(`Webflow API error: ${schemaResponse.statusText}`);
    }

    const collectionData = await schemaResponse.json();
    const fields = collectionData.fields || [];

    // Format fields for frontend
    const formattedFields = fields.map((field: any) => ({
      id: field.id,
      name: field.displayName || field.slug,
      slug: field.slug,
      type: field.type,
      required: field.isRequired || false,
    }));

    // Apply heuristic mapping logic
    const inferredMapping = {
      titleFieldId: findTitleField(formattedFields),
      slugFieldId: findSlugField(formattedFields),
      bodyFieldId: findBodyField(formattedFields),
      metaTitleFieldId: findMetaTitleField(formattedFields),
      metaDescriptionFieldId: findMetaDescriptionField(formattedFields),
      featuredImageFieldId: findFeaturedImageField(formattedFields),
    };

    return NextResponse.json({
      success: true,
      fields: formattedFields,
      inferredMapping,
      collectionName: collectionData.displayName || collectionData.singularName,
    });
  } catch (error) {
    console.error('[WEBFLOW COLLECTION SCHEMA] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch collection schema',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Heuristic helper functions for field mapping

function findTitleField(fields: any[]): string | null {
  // Look for PlainText or Name field with title/name/headline in name
  const titleField = fields.find(f =>
    ['PlainText', 'Name'].includes(f.type) &&
    (/title|name|headline/i.test(f.name) || /title|name|headline/i.test(f.slug))
  );

  if (titleField) return titleField.id;

  // Fallback: first required PlainText field
  const firstRequiredText = fields.find(f => f.type === 'PlainText' && f.required);
  if (firstRequiredText) return firstRequiredText.id;

  // Last resort: field literally named 'Name' (Webflow default)
  const nameField = fields.find(f => f.type === 'Name' || f.slug === 'name');
  return nameField?.id || null;
}

function findSlugField(fields: any[]): string | null {
  // Should be exactly one Slug type field
  const slugField = fields.find(f => f.type === 'Slug');
  return slugField?.id || null;
}

function findBodyField(fields: any[]): string | null {
  // Look for RichText field with body/content/post/article/main keywords
  const bodyField = fields.find(f =>
    f.type === 'RichText' &&
    (/body|content|post|article|main|rich/i.test(f.name) || /body|content|post|article|main|rich/i.test(f.slug))
  );

  if (bodyField) return bodyField.id;

  // Exclude summary/excerpt/intro/blurb fields
  const richTextFields = fields.filter(f => f.type === 'RichText');
  const mainRichText = richTextFields.find(f =>
    !(/summary|excerpt|intro|blurb/i.test(f.name) || /summary|excerpt|intro|blurb/i.test(f.slug))
  );

  return mainRichText?.id || richTextFields[0]?.id || null;
}

function findMetaTitleField(fields: any[]): string | null {
  // Look for PlainText field with SEO/meta title keywords
  const metaTitleField = fields.find(f =>
    f.type === 'PlainText' &&
    (/seo.?title|meta.?title|og.?title|page.?title/i.test(f.name) || /seo.?title|meta.?title|og.?title|page.?title/i.test(f.slug))
  );

  return metaTitleField?.id || null;
}

function findMetaDescriptionField(fields: any[]): string | null {
  // Look for PlainText/TextArea field with SEO/meta description keywords
  const metaDescField = fields.find(f =>
    ['PlainText', 'TextArea'].includes(f.type) &&
    (/seo.?description|meta.?description|og.?description|search.?description/i.test(f.name) ||
     /seo.?description|meta.?description|og.?description|search.?description/i.test(f.slug))
  );

  // Prefer 'description' over 'summary'
  if (metaDescField) return metaDescField.id;

  const summaryField = fields.find(f =>
    ['PlainText', 'TextArea'].includes(f.type) &&
    (/summary/i.test(f.name) || /summary/i.test(f.slug))
  );

  return summaryField?.id || null;
}

function findFeaturedImageField(fields: any[]): string | null {
  // Look for ImageRef field with hero/featured/main/cover/thumbnail keywords
  const imageFields = fields.filter(f => f.type === 'ImageRef' || f.type === 'Image');

  const featuredImage = imageFields.find(f =>
    /hero|featured|main|cover|og.?image/i.test(f.name) ||
    /hero|featured|main|cover|og.?image/i.test(f.slug)
  );

  if (featuredImage) return featuredImage.id;

  // Fallback: first ImageRef field
  return imageFields[0]?.id || null;
}
