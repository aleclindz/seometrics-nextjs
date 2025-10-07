/**
 * List WordPress Connections
 *
 * This script lists all WordPress connections in the database to help
 * identify the connection ID and user token for testing.
 *
 * Usage:
 *   npx tsx scripts/list-wordpress-connections.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function listWordPressConnections() {
  console.log('\n========================================');
  console.log('WordPress Connections');
  console.log('========================================\n');

  try {
    const { data: connections, error } = await supabase
      .from('cms_connections')
      .select('*')
      .or('cms_type.eq.wordpress,cms_type.eq.wordpress_com')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching connections:', error);
      return;
    }

    if (!connections || connections.length === 0) {
      console.log('No WordPress connections found.');
      return;
    }

    console.log(`Found ${connections.length} WordPress connection(s):\n`);

    connections.forEach((conn, index) => {
      console.log(`[${index + 1}] Connection ID: ${conn.id}`);
      console.log(`    User Token: ${conn.user_token}`);
      console.log(`    CMS Type: ${conn.cms_type}`);
      console.log(`    Base URL: ${conn.base_url}`);
      console.log(`    Status: ${conn.status}`);
      console.log(`    Connection Name: ${conn.connection_name || 'N/A'}`);
      console.log(`    Created: ${new Date(conn.created_at).toLocaleString()}`);
      console.log(`    Has Token: ${conn.api_token ? 'Yes' : 'No'}`);

      if (conn.cms_type === 'wordpress_com') {
        let siteIdentifier = '';
        try {
          siteIdentifier = new URL(conn.base_url).host;
        } catch {
          siteIdentifier = conn.base_url;
        }
        console.log(`    Site Identifier: ${siteIdentifier}`);
      }

      console.log(`\n    To test this connection, run:`);
      console.log(`    npx tsx scripts/test-wordpress-publish.ts ${conn.id} ${conn.user_token}`);
      console.log('\n' + '─'.repeat(80) + '\n');
    });

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

listWordPressConnections();
