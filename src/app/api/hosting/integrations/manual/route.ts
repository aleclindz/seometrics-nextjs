import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DomainQueryService } from '@/lib/database/DomainQueryService';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Manual Hosting Integration API
 *
 * This endpoint handles manual hosting setups (Lovable, Netlify, etc.)
 * where users manually configure redirects/rewrites in their hosting provider
 */

// GET - Fetch manual integrations for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const provider = searchParams.get('provider');

    if (!userToken) {
      return NextResponse.json(
        { error: 'userToken is required' },
        { status: 400 }
      );
    }

    console.log('[MANUAL INTEGRATION] Fetching integrations for user:', userToken);

    let query = supabase
      .from('hosting_integrations')
      .select('*')
      .eq('user_token', userToken)
      .eq('integration_type', 'manual')
      .order('created_at', { ascending: false });

    if (provider) {
      query = query.eq('provider_name', provider);
    }

    const { data: integrations, error } = await query;

    if (error) {
      console.error('[MANUAL INTEGRATION] Fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch integrations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      integrations: integrations || []
    });

  } catch (error) {
    console.error('[MANUAL INTEGRATION] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create manual hosting integration
export async function POST(request: NextRequest) {
  try {
    const {
      userToken,
      provider,
      domain,
      websiteId,
      capabilities = [],
      configuration = {},
      verificationResults = {}
    } = await request.json();

    if (!userToken || !provider || !domain) {
      return NextResponse.json(
        { error: 'Missing required parameters: userToken, provider, domain' },
        { status: 400 }
      );
    }

    console.log('[MANUAL INTEGRATION] Creating integration:', { provider, domain });

    // Check if integration already exists
    const { data: existing } = await supabase
      .from('hosting_integrations')
      .select('id')
      .eq('user_token', userToken)
      .eq('site_url', domain)
      .eq('provider_name', provider)
      .eq('integration_type', 'manual')
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Integration already exists for this domain and provider' },
        { status: 409 }
      );
    }

    // Create integration record
    const integrationData = {
      user_token: userToken,
      site_url: domain,
      provider_name: provider,
      integration_type: 'manual',
      status: 'active',
      api_credentials: {},
      configuration: {
        deployment_method: 'manual',
        sitemap_proxy_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/seo-proxy/sitemap`,
        robots_proxy_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/seo-proxy/robots`,
        verification_results: verificationResults,
        setup_completed_at: new Date().toISOString(),
        ...configuration
      },
      capabilities_enabled: capabilities,
      deployment_count: 0,
      error_count: 0
    };

    const { data: integration, error } = await supabase
      .from('hosting_integrations')
      .insert(integrationData)
      .select()
      .single();

    if (error) {
      console.error('[MANUAL INTEGRATION] Insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create integration' },
        { status: 500 }
      );
    }

    console.log('[MANUAL INTEGRATION] Integration created:', integration.id);

    // Update hosting_status in websites table
    try {
      const timestamp = new Date().toISOString();

      // If websiteId provided, update that specific website
      if (websiteId) {
        const idNum = Number(websiteId);
        if (!Number.isNaN(idNum) && Number.isFinite(idNum)) {
          console.log('[MANUAL INTEGRATION] Updating hosting_status by websiteId', { websiteId: idNum });
          const { error: byIdErr } = await supabase
            .from('websites')
            .update({ hosting_status: 'connected', last_status_check: timestamp })
            .eq('id', idNum)
            .eq('user_token', userToken);

          if (byIdErr) {
            console.error('[MANUAL INTEGRATION] Failed to update by websiteId:', byIdErr);
          } else {
            console.log('[MANUAL INTEGRATION] hosting_status updated by websiteId');
          }
        }
      } else {
        // Try to find website by domain
        console.log('[MANUAL INTEGRATION] Resolving website by domain', { domain });
        const result = await DomainQueryService.findWebsiteByDomain(userToken, domain, 'id,domain');

        if (result.success && result.data?.id) {
          const { error: byDomainErr } = await supabase
            .from('websites')
            .update({ hosting_status: 'connected', last_status_check: timestamp })
            .eq('id', result.data.id)
            .eq('user_token', userToken);

          if (byDomainErr) {
            console.error('[MANUAL INTEGRATION] Failed to update by domain:', byDomainErr);
          } else {
            console.log('[MANUAL INTEGRATION] hosting_status updated by domain', { matchedDomain: result.matchedDomain });
          }
        } else {
          console.warn('[MANUAL INTEGRATION] No website matched provided domain');
        }
      }
    } catch (updateError) {
      console.error('[MANUAL INTEGRATION] Error updating website hosting_status:', updateError);
      // Continue with successful response
    }

    return NextResponse.json({
      success: true,
      message: `${provider} integration created successfully`,
      integration: {
        id: integration.id,
        provider: integration.provider_name,
        status: integration.status,
        domain,
        capabilities: integration.capabilities_enabled,
        createdAt: integration.created_at
      }
    });

  } catch (error) {
    console.error('[MANUAL INTEGRATION] Create error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update manual integration status
export async function PUT(request: NextRequest) {
  try {
    const {
      userToken,
      integrationId,
      status,
      verificationResults,
      configuration
    } = await request.json();

    if (!userToken || !integrationId) {
      return NextResponse.json(
        { error: 'Missing required parameters: userToken, integrationId' },
        { status: 400 }
      );
    }

    console.log('[MANUAL INTEGRATION] Updating integration:', integrationId);

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('hosting_integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('user_token', userToken)
      .eq('integration_type', 'manual')
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (status) {
      updateData.status = status;
    }

    if (verificationResults) {
      updateData.configuration = {
        ...existing.configuration,
        verification_results: verificationResults,
        last_verified_at: new Date().toISOString()
      };
    }

    if (configuration) {
      updateData.configuration = {
        ...existing.configuration,
        ...configuration
      };
    }

    const { data: integration, error } = await supabase
      .from('hosting_integrations')
      .update(updateData)
      .eq('id', integrationId)
      .eq('user_token', userToken)
      .select()
      .single();

    if (error) {
      console.error('[MANUAL INTEGRATION] Update error:', error);
      return NextResponse.json(
        { error: 'Failed to update integration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Integration updated successfully',
      integration: {
        id: integration.id,
        status: integration.status,
        updatedAt: integration.updated_at
      }
    });

  } catch (error) {
    console.error('[MANUAL INTEGRATION] Update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove manual integration
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const integrationId = searchParams.get('integrationId');

    if (!userToken || !integrationId) {
      return NextResponse.json(
        { error: 'Missing required parameters: userToken, integrationId' },
        { status: 400 }
      );
    }

    console.log('[MANUAL INTEGRATION] Deleting integration:', integrationId);

    const { error } = await supabase
      .from('hosting_integrations')
      .delete()
      .eq('id', integrationId)
      .eq('user_token', userToken)
      .eq('integration_type', 'manual');

    if (error) {
      console.error('[MANUAL INTEGRATION] Delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete integration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Integration deleted successfully'
    });

  } catch (error) {
    console.error('[MANUAL INTEGRATION] Delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
