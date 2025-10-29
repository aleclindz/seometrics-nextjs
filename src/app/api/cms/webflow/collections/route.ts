import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/cms/webflow/collections
 * Fetches all collections for a specific Webflow site
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const siteId = searchParams.get('siteId');

    if (!userToken || !siteId) {
      return NextResponse.json(
        { error: 'Missing userToken or siteId' },
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

    // Fetch collections from Webflow API
    const collectionsResponse = await fetch(
      `https://api.webflow.com/v2/sites/${siteId}/collections`,
      {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
          'accept-version': '1.0.0',
        },
      }
    );

    if (!collectionsResponse.ok) {
      throw new Error(`Webflow API error: ${collectionsResponse.statusText}`);
    }

    const collectionsData = await collectionsResponse.json();
    const collections = collectionsData.collections || [];

    // Apply heuristic scoring to identify blog collections
    const scoredCollections = collections.map((collection: any) => {
      let score = 0;

      const name = (collection.displayName || collection.singularName || '').toLowerCase();
      const slug = (collection.slug || '').toLowerCase();

      // +4 if collection name or slug matches blog-related keywords
      const blogKeywords = ['blog', 'blogs', 'post', 'posts', 'article', 'articles', 'news', 'resources', 'insights', 'learn'];
      if (blogKeywords.some(keyword => name.includes(keyword) || slug.includes(keyword))) {
        score += 4;
      }

      // +3 if collection has RichText field
      const hasRichText = collection.fields?.some((f: any) => f.type === 'RichText');
      if (hasRichText) {
        score += 3;
      }

      // +2 if collection has Slug field
      const hasSlug = collection.fields?.some((f: any) => f.type === 'Slug');
      if (hasSlug) {
        score += 2;
      }

      // +1 if collection has ImageRef field
      const hasImage = collection.fields?.some((f: any) => f.type === 'ImageRef');
      if (hasImage) {
        score += 1;
      }

      // +1 if any field contains SEO/meta keywords
      const hasSeoField = collection.fields?.some((f: any) => {
        const fieldName = (f.displayName || f.slug || '').toLowerCase();
        return fieldName.includes('seo') || fieldName.includes('meta') || fieldName.includes('description');
      });
      if (hasSeoField) {
        score += 1;
      }

      return {
        collectionId: collection.id,
        name: collection.displayName || collection.singularName,
        slug: collection.slug,
        fields: collection.fields || [],
        score,
      };
    });

    // Sort by score (highest first)
    scoredCollections.sort((a: any, b: any) => b.score - a.score);

    return NextResponse.json({
      success: true,
      collections: scoredCollections,
      suggestedCollectionId: scoredCollections[0]?.collectionId,
    });
  } catch (error) {
    console.error('[WEBFLOW COLLECTIONS] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch Webflow collections',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
