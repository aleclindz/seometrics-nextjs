import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/cms/webflow/finalize-setup
 * Saves the complete Webflow configuration after user completes setup modal
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[WEBFLOW FINALIZE] Received request body:', JSON.stringify(body, null, 2));

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

    // Detailed validation logging
    const validationChecks = {
      userToken: !!userToken,
      websiteId: !!websiteId,
      connectionId: !!connectionId,
      siteId: !!siteId,
      collectionId: !!collectionId,
      fieldMapping: !!fieldMapping,
    };
    console.log('[WEBFLOW FINALIZE] Field validation:', validationChecks);

    if (!userToken || !websiteId || !connectionId || !siteId || !collectionId || !fieldMapping) {
      console.error('[WEBFLOW FINALIZE] ❌ Missing required fields:', validationChecks);
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: validationChecks,
        },
        { status: 400 }
      );
    }

    // Validate field mapping structure
    const fieldMappingChecks = {
      titleFieldId: !!fieldMapping.titleFieldId,
      slugFieldId: !!fieldMapping.slugFieldId,
      bodyFieldId: !!fieldMapping.bodyFieldId,
    };
    console.log('[WEBFLOW FINALIZE] Field mapping validation:', fieldMappingChecks);

    if (!fieldMapping.titleFieldId || !fieldMapping.slugFieldId || !fieldMapping.bodyFieldId) {
      console.error('[WEBFLOW FINALIZE] ❌ Invalid field mapping:', fieldMappingChecks);
      return NextResponse.json(
        {
          error: 'Field mapping must include title, slug, and body fields',
          details: fieldMappingChecks,
          receivedMapping: fieldMapping,
        },
        { status: 400 }
      );
    }

    console.log('[WEBFLOW FINALIZE] ✅ All validations passed, proceeding with database update');

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
