/**
 * Migrate host_connections to hosting_integrations
 *
 * This script migrates existing host_connections records to the unified
 * hosting_integrations table, then marks the old records as migrated.
 *
 * Run with: npx tsx scripts/migrate-host-connections.ts
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

async function migrateHostConnections() {
  console.log('🔄 Migrating host_connections to hosting_integrations...\n');

  // 1. Fetch all host_connections records
  const { data: hostConnections, error: fetchError } = await supabase
    .from('host_connections')
    .select('*')
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error('❌ Error fetching host_connections:', fetchError);
    process.exit(1);
  }

  if (!hostConnections || hostConnections.length === 0) {
    console.log('✅ No host_connections to migrate');
    process.exit(0);
  }

  console.log(`📊 Found ${hostConnections.length} host_connections to migrate\n`);

  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // 2. Migrate each connection
  for (const connection of hostConnections) {
    console.log(`\n🔹 Processing: ${connection.connection_name} (${connection.host_type})`);
    console.log(`   Domain: ${connection.domain}`);
    console.log(`   Website ID: ${connection.website_id}`);

    // Check if already migrated
    const { data: existing } = await supabase
      .from('hosting_integrations')
      .select('id')
      .eq('user_token', connection.user_token)
      .eq('site_url', connection.domain)
      .eq('provider_name', connection.host_type)
      .single();

    if (existing) {
      console.log('   ⚠️  Already exists in hosting_integrations - skipping');
      skippedCount++;
      continue;
    }

    // Map capabilities based on host type
    let capabilities = [];
    if (connection.host_type === 'lovable') {
      capabilities = ['sitemap_redirect', 'robots_redirect'];
    } else if (connection.host_type === 'vercel') {
      capabilities = ['sitemap_deployment', 'robots_deployment'];
    } else if (connection.host_type === 'netlify') {
      capabilities = ['sitemap_redirect', 'robots_redirect'];
    }

    // Create new hosting_integration record
    const integrationData = {
      user_token: connection.user_token,
      site_url: connection.domain,
      provider_name: connection.host_type,
      integration_type: 'manual',
      status: connection.deployment_status === 'active' ? 'active' : 'pending',
      api_credentials: connection.api_token ? { api_token: connection.api_token } : {},
      configuration: {
        deployment_method: 'manual',
        sitemap_proxy_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/seo-proxy/sitemap`,
        robots_proxy_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/seo-proxy/robots`,
        team_id: connection.team_id,
        project_id: connection.project_id,
        project_name: connection.project_name,
        build_command: connection.build_command,
        output_directory: connection.output_directory,
        node_version: connection.node_version,
        environment_variables: connection.environment_variables,
        auto_deploy_enabled: connection.auto_deploy_enabled,
        webhook_url: connection.webhook_url,
        webhook_secret: connection.webhook_secret,
        migrated_from: 'host_connections',
        migrated_at: new Date().toISOString(),
        original_config_data: connection.config_data
      },
      capabilities_enabled: capabilities,
      last_deployment_at: connection.last_deployment_at,
      last_sync_at: connection.last_sync_at,
      deployment_count: 0,
      error_count: connection.error_message ? 1 : 0,
      last_error_message: connection.error_message,
      created_at: connection.created_at,
      updated_at: connection.updated_at
    };

    const { data: newIntegration, error: insertError } = await supabase
      .from('hosting_integrations')
      .insert(integrationData)
      .select()
      .single();

    if (insertError) {
      console.error('   ❌ Error creating integration:', insertError);
      errorCount++;
      continue;
    }

    console.log(`   ✅ Migrated to hosting_integrations (ID: ${newIntegration.id})`);

    // Update website hosting_status if applicable
    if (connection.website_id) {
      const { error: updateError } = await supabase
        .from('websites')
        .update({
          hosting_status: 'connected',
          last_status_check: new Date().toISOString()
        })
        .eq('id', connection.website_id)
        .eq('user_token', connection.user_token);

      if (updateError) {
        console.error('   ⚠️  Could not update website hosting_status:', updateError);
      } else {
        console.log('   ✅ Updated website hosting_status to "connected"');
      }
    }

    migratedCount++;
  }

  // 3. Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary:');
  console.log('='.repeat(60));
  console.log(`✅ Migrated: ${migratedCount}`);
  console.log(`⚠️  Skipped: ${skippedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log('='.repeat(60));

  if (migratedCount > 0) {
    console.log('\n📝 Next Steps:');
    console.log('   1. Verify migrated data in hosting_integrations table');
    console.log('   2. Test that all hosting integrations still work');
    console.log('   3. After verification, consider removing host_connections table');
  }

  console.log('\n🎉 Migration completed!');
}

migrateHostConnections()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
