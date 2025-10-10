/**
 * One-time script to fix hosting_status for usebaxter.com
 *
 * This script links the existing Vercel integration to usebaxter.com
 * and updates the hosting_status from 'none' to 'connected'
 *
 * Run with: npx tsx scripts/fix-usebaxter-hosting-status.ts
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

async function fixHostingStatus() {
  console.log('🔧 Fixing hosting_status for usebaxter.com...\n');

  const userToken = '71d3a313-563d-4701-afa5-59d3ba8d7a9c';
  const websiteId = 8;
  const domain = 'usebaxter.com';

  // 1. Check current status
  const { data: website, error: fetchError } = await supabase
    .from('websites')
    .select('id, domain, cleaned_domain, hosting_status, last_status_check')
    .eq('id', websiteId)
    .eq('user_token', userToken)
    .single();

  if (fetchError || !website) {
    console.error('❌ Error fetching website:', fetchError);
    process.exit(1);
  }

  console.log('📊 Current website status:');
  console.log(`   Domain: ${website.domain}`);
  console.log(`   Cleaned Domain: ${website.cleaned_domain}`);
  console.log(`   Hosting Status: ${website.hosting_status}`);
  console.log(`   Last Check: ${website.last_status_check}\n`);

  // 2. Check Vercel integration exists
  const { data: integration, error: integrationError } = await supabase
    .from('hosting_integrations')
    .select('id, site_url, provider_name, status, api_credentials')
    .eq('user_token', userToken)
    .eq('provider_name', 'vercel')
    .single();

  if (integrationError || !integration) {
    console.error('❌ No Vercel integration found:', integrationError);
    process.exit(1);
  }

  console.log('✅ Vercel integration found:');
  console.log(`   Integration ID: ${integration.id}`);
  console.log(`   Site URL: ${integration.site_url}`);
  console.log(`   Status: ${integration.status}`);
  console.log(`   Project ID: ${integration.api_credentials?.project_id}\n`);

  // 3. Update hosting_status
  if (website.hosting_status === 'connected') {
    console.log('✅ hosting_status is already "connected" - no update needed');
    process.exit(0);
  }

  const { error: updateError } = await supabase
    .from('websites')
    .update({
      hosting_status: 'connected',
      last_status_check: new Date().toISOString()
    })
    .eq('id', websiteId)
    .eq('user_token', userToken);

  if (updateError) {
    console.error('❌ Error updating hosting_status:', updateError);
    process.exit(1);
  }

  console.log('✅ Successfully updated hosting_status to "connected"');

  // 4. Verify update
  const { data: updatedWebsite } = await supabase
    .from('websites')
    .select('id, domain, hosting_status, last_status_check')
    .eq('id', websiteId)
    .single();

  console.log('\n📊 Updated website status:');
  console.log(`   Domain: ${updatedWebsite?.domain}`);
  console.log(`   Hosting Status: ${updatedWebsite?.hosting_status}`);
  console.log(`   Last Check: ${updatedWebsite?.last_status_check}`);

  console.log('\n🎉 Fix completed successfully!');
}

fixHostingStatus()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
