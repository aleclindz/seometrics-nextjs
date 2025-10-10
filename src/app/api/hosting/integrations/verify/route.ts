import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Verify Hosting Integration
 *
 * Tests sitemap, robots.txt, and validation endpoints to verify
 * that a manual hosting integration is properly configured.
 */

interface VerificationResult {
  url: string;
  type: string;
  status: 'success' | 'error';
  statusCode?: number;
  message: string;
  content?: string;
  verified_at: string;
}

async function testUrl(url: string, type: string): Promise<VerificationResult> {
  const verified_at = new Date().toISOString();

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'SEOAgent-Verification/1.0'
      },
      redirect: 'follow'
    });

    const content = await response.text();
    const statusCode = response.status;

    if (response.ok) {
      let message = `✅ ${type} accessible`;

      // Check for specific content based on type
      if (type === 'sitemap' && content.includes('<?xml')) {
        if (content.includes('SEOAgent') || content.includes('seoagent')) {
          message += ' with SEOAgent attribution';
        }
        // Count URLs in sitemap
        const urlCount = (content.match(/<loc>/g) || []).length;
        message += ` (${urlCount} URLs)`;
      } else if (type === 'robots' && content.toLowerCase().includes('sitemap')) {
        message += ' and references sitemap';
      } else if (type === 'validation') {
        try {
          const jsonData = JSON.parse(content);
          if (jsonData.generator?.includes('seoagent')) {
            message += ' with correct SEOAgent status';
          }
        } catch (e) {
          message += ' (JSON parse warning)';
        }
      }

      return {
        url,
        type,
        status: 'success',
        statusCode,
        message,
        content: content.substring(0, 500), // Store first 500 chars
        verified_at
      };
    } else {
      return {
        url,
        type,
        status: 'error',
        statusCode,
        message: `❌ ${type} returned HTTP ${statusCode}`,
        verified_at
      };
    }
  } catch (error) {
    return {
      url,
      type,
      status: 'error',
      message: `❌ ${type} test failed - ${error instanceof Error ? error.message : 'Network error'}`,
      verified_at
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userToken, integrationId, domain } = await request.json();

    if (!userToken || !integrationId) {
      return NextResponse.json(
        { error: 'Missing required parameters: userToken, integrationId' },
        { status: 400 }
      );
    }

    console.log('[INTEGRATION VERIFY] Verifying integration:', integrationId);

    // Get integration
    const { data: integration, error: fetchError } = await supabase
      .from('hosting_integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('user_token', userToken)
      .single();

    if (fetchError || !integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    const targetDomain = domain || integration.site_url;
    const normalizedDomain = targetDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');

    console.log('[INTEGRATION VERIFY] Testing domain:', normalizedDomain);

    // Run verification tests
    const tests = [
      { url: `https://${normalizedDomain}/sitemap.xml`, type: 'sitemap' },
      { url: `https://${normalizedDomain}/robots.txt`, type: 'robots' },
      { url: `https://${normalizedDomain}/sitemap-status.json`, type: 'validation' }
    ];

    const results: VerificationResult[] = [];
    for (const test of tests) {
      const result = await testUrl(test.url, test.type);
      results.push(result);
    }

    // Determine if verification passed
    const allPassed = results.every(r => r.status === 'success');
    const criticalPassed = results
      .filter(r => r.type === 'sitemap' || r.type === 'robots')
      .every(r => r.status === 'success');

    // Update integration status
    const newStatus = allPassed ? 'active' : (criticalPassed ? 'active' : 'error');
    const updateData: any = {
      status: newStatus,
      updated_at: new Date().toISOString(),
      configuration: {
        ...integration.configuration,
        verification_results: results,
        last_verified_at: new Date().toISOString(),
        verification_status: allPassed ? 'all_passed' : (criticalPassed ? 'critical_passed' : 'failed')
      }
    };

    if (allPassed || criticalPassed) {
      updateData.last_deployment_at = new Date().toISOString();
      updateData.error_count = 0;
      updateData.last_error_message = null;
    } else {
      updateData.error_count = (integration.error_count || 0) + 1;
      updateData.last_error_message = 'Verification failed: ' + results
        .filter(r => r.status === 'error')
        .map(r => r.type)
        .join(', ');
    }

    const { error: updateError } = await supabase
      .from('hosting_integrations')
      .update(updateData)
      .eq('id', integrationId)
      .eq('user_token', userToken);

    if (updateError) {
      console.error('[INTEGRATION VERIFY] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update integration status' },
        { status: 500 }
      );
    }

    console.log('[INTEGRATION VERIFY] Verification complete:', { status: newStatus, allPassed, criticalPassed });

    return NextResponse.json({
      success: true,
      message: allPassed
        ? 'All verification tests passed'
        : (criticalPassed ? 'Critical tests passed (validation optional)' : 'Verification failed'),
      verification: {
        status: newStatus,
        allPassed,
        criticalPassed,
        results,
        verifiedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[INTEGRATION VERIFY] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Check current verification status
export async function GET(request: NextRequest) {
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

    const { data: integration, error } = await supabase
      .from('hosting_integrations')
      .select('id, status, configuration, last_deployment_at, updated_at')
      .eq('id', integrationId)
      .eq('user_token', userToken)
      .single();

    if (error || !integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      verification: {
        status: integration.status,
        lastVerifiedAt: integration.configuration?.last_verified_at,
        verificationStatus: integration.configuration?.verification_status,
        results: integration.configuration?.verification_results || [],
        lastDeploymentAt: integration.last_deployment_at
      }
    });

  } catch (error) {
    console.error('[INTEGRATION VERIFY] Get error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
