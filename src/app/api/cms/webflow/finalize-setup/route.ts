import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/cms/webflow/finalize-setup
 * Saves the complete Webflow configuration after user completes setup modal
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userToken,
      websiteId,
      connectionId,
      siteId,
      siteName,
      collectionId,
      collectionName,
      fieldMapping,
      publishMode,
    } = body;

    if (!userToken || !websiteId || !connectionId || !siteId || !collectionId || !fieldMapping) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate field mapping structure
    if (!fieldMapping.titleFieldId || !fieldMapping.slugFieldId || !fieldMapping.bodyFieldId) {
      return NextResponse.json(
        { error: 'Field mapping must include title, slug, and body fields' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Update the cms_connections record with the complete configuration
    const { data: connection, error: updateError } = await supabase
      .from('cms_connections')
      .update({
        status: 'active',
        auth_config: {
          siteId,
          siteName,
          collectionId,
          collectionName,
          fieldMapping: {
            titleFieldId: fieldMapping.titleFieldId,
            slugFieldId: fieldMapping.slugFieldId,
            bodyFieldId: fieldMapping.bodyFieldId,
            metaTitleFieldId: fieldMapping.metaTitleFieldId || null,
            metaDescriptionFieldId: fieldMapping.metaDescriptionFieldId || null,
            featuredImageFieldId: fieldMapping.featuredImageFieldId || null,
          },
          publishMode: publishMode || 'draft',
        },
        content_type: collectionId, // Store collection ID for quick access
        connection_name: `${siteName} - ${collectionName}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId)
      .eq('user_token', userToken)
      .select()
      .single();

    if (updateError) {
      console.error('[WEBFLOW FINALIZE] Database error:', updateError);
      return NextResponse.json(
        { error: 'Failed to save configuration' },
        { status: 500 }
      );
    }

    // Update website cms_status to 'connected'
    const { error: websiteError } = await supabase
      .from('websites')
      .update({
        cms_status: 'connected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', websiteId)
      .eq('user_token', userToken);

    if (websiteError) {
      console.warn('[WEBFLOW FINALIZE] Failed to update website status:', websiteError);
    }

    return NextResponse.json({
      success: true,
      message: 'Webflow configuration saved successfully',
      connection: {
        id: connection.id,
        siteName,
        collectionName,
        publishMode: publishMode || 'draft',
      },
    });
  } catch (error) {
    console.error('[WEBFLOW FINALIZE] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to finalize Webflow setup',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
