/**
 * Verify Lovable Integration
 *
 * This script tests and verifies the Lovable hosting integration
 * for translateyoutubevideos.com, updating its status from pending to active
 *
 * Run with: npx tsx scripts/verify-lovable-integration.ts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

// Load .env.local file
config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface VerificationResult {
  url: string;
  type: string;
  status: 'success' | 'error';
  message: string;
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

    if (response.ok) {
      let message = `✅ ${type} accessible (${response.status})`;

      if (type === 'sitemap' && content.includes('<?xml')) {
        const urlCount = (content.match(/<loc>/g) || []).length;
        message += ` - ${urlCount} URLs in sitemap`;
      } else if (type === 'robots' && content.toLowerCase().includes('sitemap')) {
        message += ' - references sitemap';
      } else if (type === 'validation') {
        try {
          const jsonData = JSON.parse(content);
          if (jsonData.generator) {
            message += ` - generator: ${jsonData.generator}`;
          }
        } catch (e) {}
      }

      return {
        url,
        type,
        status: 'success',
        message,
        verified_at
      };
    } else {
      return {
        url,
        type,
        status: 'error',
        message: `❌ ${type} returned HTTP ${response.status}`,
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

async function verifyLovableIntegration() {
  console.log('🔍 Verifying Lovable Integration...\n');

  const userToken = '71d3a313-563d-4701-afa5-59d3ba8d7a9c';
  const integrationId = '24b3d01c-426b-4f3e-b766-2345ec730752';
  const domain = 'translateyoutubevideos.com';

  // 1. Get current integration status
  const { data: integration, error: fetchError } = await supabase
    .from('hosting_integrations')
    .select('*')
    .eq('id', integrationId)
    .single();

  if (fetchError || !integration) {
    console.error('❌ Error fetching integration:', fetchError);
    process.exit(1);
  }

  console.log('📊 Current Integration Status:');
  console.log(`   Provider: ${integration.provider_name}`);
  console.log(`   Domain: ${integration.site_url}`);
  console.log(`   Status: ${integration.status}`);
  console.log(`   Type: ${integration.integration_type}`);
  console.log(`   Last Verified: ${integration.configuration?.last_verified_at || 'Never'}\n`);

  // 2. Run verification tests
  console.log('🧪 Running Verification Tests...\n');

  const tests = [
    { url: `https://${domain}/sitemap.xml`, type: 'sitemap' },
    { url: `https://${domain}/robots.txt`, type: 'robots' },
    { url: `https://${domain}/sitemap-status.json`, type: 'validation' }
  ];

  const results: VerificationResult[] = [];
  for (const test of tests) {
    console.log(`   Testing: ${test.url}`);
    const result = await testUrl(test.url, test.type);
    results.push(result);
    console.log(`   ${result.message}\n`);
  }

  // 3. Determine verification status
  const allPassed = results.every(r => r.status === 'success');
  const criticalPassed = results
    .filter(r => r.type === 'sitemap' || r.type === 'robots')
    .every(r => r.status === 'success');

  console.log('=' .repeat(60));
  console.log('📊 Verification Results:');
  console.log('='.repeat(60));
  console.log(`   All Tests Passed: ${allPassed ? '✅ Yes' : '❌ No'}`);
  console.log(`   Critical Tests Passed: ${criticalPassed ? '✅ Yes' : '❌ No'}`);
  console.log(`   Status: ${allPassed ? 'ACTIVE' : (criticalPassed ? 'ACTIVE (validation optional)' : 'FAILED')}`);
  console.log('='.repeat(60) + '\n');

  // 4. Update integration status
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
  }

  const { error: updateError } = await supabase
    .from('hosting_integrations')
    .update(updateData)
    .eq('id', integrationId);

  if (updateError) {
    console.error('❌ Error updating integration:', updateError);
    process.exit(1);
  }

  console.log('✅ Integration status updated to:', newStatus);

  // 5. Verify update
  const { data: updatedIntegration } = await supabase
    .from('hosting_integrations')
    .select('id, status, configuration, last_deployment_at')
    .eq('id', integrationId)
    .single();

  console.log('\n📊 Updated Integration Status:');
  console.log(`   Status: ${updatedIntegration?.status}`);
  console.log(`   Last Verified: ${updatedIntegration?.configuration?.last_verified_at}`);
  console.log(`   Verification Status: ${updatedIntegration?.configuration?.verification_status}`);
  console.log(`   Last Deployment: ${updatedIntegration?.last_deployment_at || 'N/A'}`);

  console.log('\n🎉 Verification complete!');
}

verifyLovableIntegration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
