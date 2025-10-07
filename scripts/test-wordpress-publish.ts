/**
 * WordPress Publishing Diagnostic Test Script
 *
 * This script tests WordPress publishing capabilities by:
 * 1. Running API endpoint discovery
 * 2. Attempting a test publish
 * 3. Providing detailed diagnostic information
 *
 * Usage:
 *   npx tsx scripts/test-wordpress-publish.ts <connectionId> <userToken>
 *
 * Example:
 *   npx tsx scripts/test-wordpress-publish.ts 123 abc-def-ghi
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TestResult {
  step: string;
  success: boolean;
  details?: any;
  error?: string;
}

async function testWordPressPublishing(connectionId: string, userToken: string): Promise<TestResult[]> {
  const results: TestResult[] = [];

  console.log('\n========================================');
  console.log('WordPress Publishing Diagnostic Test');
  console.log('========================================\n');

  // Step 1: Fetch connection details
  console.log('[1/5] Fetching WordPress connection...');
  try {
    const { data: connection, error } = await supabase
      .from('cms_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_token', userToken)
      .single();

    if (error || !connection) {
      results.push({
        step: 'Fetch Connection',
        success: false,
        error: error?.message || 'Connection not found'
      });
      console.error('❌ Connection not found');
      return results;
    }

    results.push({
      step: 'Fetch Connection',
      success: true,
      details: {
        id: connection.id,
        cms_type: connection.cms_type,
        base_url: connection.base_url,
        status: connection.status
      }
    });

    console.log('✅ Connection found');
    console.log(`   CMS Type: ${connection.cms_type}`);
    console.log(`   Base URL: ${connection.base_url}`);
    console.log(`   Status: ${connection.status}`);

    const isWpCom = connection.cms_type === 'wordpress_com';
    const siteUrl = connection.base_url.replace(/\/$/, '');

    // Step 2: Test API endpoint discovery
    console.log('\n[2/5] Testing API endpoint discovery...');

    if (isWpCom) {
      // WordPress.com API test
      const wpcomAccessToken = connection.api_token;

      if (!wpcomAccessToken) {
        results.push({
          step: 'API Discovery',
          success: false,
          error: 'Missing WordPress.com access token'
        });
        console.error('❌ Missing access token');
        return results;
      }

      let siteIdentifier = '';
      try {
        siteIdentifier = new URL(siteUrl).host;
      } catch {
        siteIdentifier = siteUrl;
      }

      console.log(`   Site identifier: ${siteIdentifier}`);

      // Test WordPress.com REST API v2 root
      const rootUrl = `https://public-api.wordpress.com/rest/v1.1/sites/${siteIdentifier}`;
      console.log(`   Testing root: ${rootUrl}`);

      try {
        const rootResponse = await fetch(rootUrl, {
          headers: {
            'Authorization': `Bearer ${wpcomAccessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (rootResponse.ok) {
          const siteInfo = await rootResponse.json();
          results.push({
            step: 'API Discovery - Root',
            success: true,
            details: {
              url: rootUrl,
              siteName: siteInfo.name,
              siteDescription: siteInfo.description
            }
          });
          console.log('   ✅ Root endpoint accessible');
          console.log(`      Site: ${siteInfo.name}`);
        } else {
          const errorText = await rootResponse.text();
          results.push({
            step: 'API Discovery - Root',
            success: false,
            error: `${rootResponse.status}: ${errorText.substring(0, 200)}`
          });
          console.error(`   ❌ Root endpoint failed (${rootResponse.status})`);
        }
      } catch (error: any) {
        results.push({
          step: 'API Discovery - Root',
          success: false,
          error: error.message
        });
        console.error(`   ❌ Root endpoint error: ${error.message}`);
      }

      // Test posts endpoint
      const postsUrl = `https://public-api.wordpress.com/wp/v2/sites/${siteIdentifier}/posts`;
      console.log(`   Testing posts: ${postsUrl}`);

      try {
        const postsResponse = await fetch(postsUrl, {
          headers: {
            'Authorization': `Bearer ${wpcomAccessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (postsResponse.ok) {
          const posts = await postsResponse.json();
          results.push({
            step: 'API Discovery - Posts',
            success: true,
            details: {
              url: postsUrl,
              postCount: Array.isArray(posts) ? posts.length : 0
            }
          });
          console.log('   ✅ Posts endpoint accessible');
          console.log(`      Found ${Array.isArray(posts) ? posts.length : 0} posts`);
        } else {
          const errorText = await postsResponse.text();
          const isHtml = errorText.trim().startsWith('<!DOCTYPE') || errorText.trim().startsWith('<html');

          results.push({
            step: 'API Discovery - Posts',
            success: false,
            error: `${postsResponse.status}: ${isHtml ? 'HTML error page (404 Not Found)' : errorText.substring(0, 200)}`
          });

          console.error(`   ❌ Posts endpoint failed (${postsResponse.status})`);
          if (isHtml) {
            console.error('      Received HTML error page instead of JSON response');
            console.error('      This indicates the API endpoint URL is incorrect');
          }
        }
      } catch (error: any) {
        results.push({
          step: 'API Discovery - Posts',
          success: false,
          error: error.message
        });
        console.error(`   ❌ Posts endpoint error: ${error.message}`);
      }

      // Step 3: Test publish endpoint with minimal data
      console.log('\n[3/5] Testing publish endpoint...');

      const testPostData = {
        title: 'SEOAgent Test Post - ' + new Date().toISOString(),
        content: '<p>This is a test post from SEOAgent to verify publishing functionality.</p>',
        status: 'draft' // Use draft to avoid cluttering the live site
      };

      const publishUrl = `https://public-api.wordpress.com/wp/v2/sites/${siteIdentifier}/posts`;
      console.log(`   Publishing to: ${publishUrl}`);
      console.log(`   Post title: ${testPostData.title}`);
      console.log(`   Post status: ${testPostData.status}`);

      try {
        const publishResponse = await fetch(publishUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${wpcomAccessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(testPostData)
        });

        if (publishResponse.ok) {
          const createdPost = await publishResponse.json();
          results.push({
            step: 'Test Publish',
            success: true,
            details: {
              postId: createdPost.id,
              postTitle: createdPost.title?.rendered || testPostData.title,
              postUrl: createdPost.link,
              status: createdPost.status
            }
          });
          console.log('   ✅ Post created successfully!');
          console.log(`      Post ID: ${createdPost.id}`);
          console.log(`      URL: ${createdPost.link}`);
          console.log(`      Status: ${createdPost.status}`);
        } else {
          const errorText = await publishResponse.text();
          const isHtml = errorText.trim().startsWith('<!DOCTYPE') || errorText.trim().startsWith('<html');

          results.push({
            step: 'Test Publish',
            success: false,
            error: `${publishResponse.status}: ${isHtml ? 'HTML error page' : errorText.substring(0, 500)}`
          });

          console.error(`   ❌ Publishing failed (${publishResponse.status})`);
          console.error(`      Content-Type: ${publishResponse.headers.get('content-type')}`);

          if (isHtml) {
            console.error('      Received HTML error page instead of JSON response');
            console.error('      Error preview:', errorText.substring(0, 300));
            console.error('\n      DIAGNOSIS:');
            console.error('      - The URL is returning a 404 error page');
            console.error('      - This suggests the API endpoint is incorrect');
            console.error('      - For WordPress.com sites, ensure you\'re using:');
            console.error('        https://public-api.wordpress.com/wp/v2/sites/{SITE}/posts');
            console.error(`      - Current site identifier: ${siteIdentifier}`);
            console.error('      - Try using the site ID instead of domain name');
          } else {
            console.error('      Error details:', errorText.substring(0, 500));
          }
        }
      } catch (error: any) {
        results.push({
          step: 'Test Publish',
          success: false,
          error: error.message
        });
        console.error(`   ❌ Publishing error: ${error.message}`);
      }

    } else {
      // Self-hosted WordPress
      console.log('   Testing self-hosted WordPress...');

      const parts = String(connection.api_token || '').split(':');
      if (parts.length !== 2) {
        results.push({
          step: 'API Discovery',
          success: false,
          error: 'Invalid application password format'
        });
        console.error('❌ Invalid application password format');
        return results;
      }

      const [username, password] = parts;
      const authBasic = btoa(`${username}:${password}`);

      // Test root endpoint
      const rootUrl = `${siteUrl}/wp-json/`;
      console.log(`   Testing root: ${rootUrl}`);

      try {
        const rootResponse = await fetch(rootUrl, {
          headers: {
            'Authorization': `Basic ${authBasic}`,
            'Content-Type': 'application/json'
          }
        });

        if (rootResponse.ok) {
          const rootData = await rootResponse.json();
          results.push({
            step: 'API Discovery - Root',
            success: true,
            details: {
              url: rootUrl,
              siteName: rootData.name,
              apiRoutes: rootData.routes ? Object.keys(rootData.routes).length : 0
            }
          });
          console.log('   ✅ Root endpoint accessible');
        } else {
          results.push({
            step: 'API Discovery - Root',
            success: false,
            error: `${rootResponse.status}`
          });
          console.error(`   ❌ Root endpoint failed (${rootResponse.status})`);
        }
      } catch (error: any) {
        results.push({
          step: 'API Discovery - Root',
          success: false,
          error: error.message
        });
        console.error(`   ❌ Root endpoint error: ${error.message}`);
      }

      // Test posts endpoint
      const postsUrl = `${siteUrl}/wp-json/wp/v2/posts`;
      console.log(`   Testing posts: ${postsUrl}`);

      try {
        const postsResponse = await fetch(postsUrl, {
          headers: {
            'Authorization': `Basic ${authBasic}`,
            'Content-Type': 'application/json'
          }
        });

        if (postsResponse.ok) {
          const posts = await postsResponse.json();
          results.push({
            step: 'API Discovery - Posts',
            success: true,
            details: {
              url: postsUrl,
              postCount: Array.isArray(posts) ? posts.length : 0
            }
          });
          console.log('   ✅ Posts endpoint accessible');
        } else {
          results.push({
            step: 'API Discovery - Posts',
            success: false,
            error: `${postsResponse.status}`
          });
          console.error(`   ❌ Posts endpoint failed (${postsResponse.status})`);
        }
      } catch (error: any) {
        results.push({
          step: 'API Discovery - Posts',
          success: false,
          error: error.message
        });
        console.error(`   ❌ Posts endpoint error: ${error.message}`);
      }
    }

  } catch (error: any) {
    results.push({
      step: 'Unexpected Error',
      success: false,
      error: error.message
    });
    console.error('\n❌ Unexpected error:', error);
  }

  return results;
}

// Main execution
const args = process.argv.slice(2);
const connectionId = args[0];
const userToken = args[1];

if (!connectionId || !userToken) {
  console.error('Usage: npx tsx scripts/test-wordpress-publish.ts <connectionId> <userToken>');
  console.error('\nExample:');
  console.error('  npx tsx scripts/test-wordpress-publish.ts 123 abc-def-ghi');
  process.exit(1);
}

testWordPressPublishing(connectionId, userToken).then((results) => {
  console.log('\n========================================');
  console.log('Test Summary');
  console.log('========================================\n');

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${results.length}`);

  console.log('\nDetailed Results:');
  results.forEach((result, index) => {
    const icon = result.success ? '✅' : '❌';
    console.log(`\n${icon} ${result.step}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.details) {
      console.log(`   Details:`, JSON.stringify(result.details, null, 2));
    }
  });

  console.log('\n========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
