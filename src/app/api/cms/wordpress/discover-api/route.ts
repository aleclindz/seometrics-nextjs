import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * WordPress API Discovery Endpoint
 * Dynamically discovers and validates WordPress REST API endpoints
 *
 * This endpoint implements a robust discovery mechanism to:
 * 1. Verify the root /wp-json/ endpoint exists
 * 2. Check /wp/v2/posts accessibility
 * 3. Detect WordPress.com vs self-hosted configuration
 * 4. Return diagnostic information for troubleshooting
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userToken, connectionId } = body;

    if (!userToken || !connectionId) {
      return NextResponse.json(
        { error: 'Missing required fields: userToken, connectionId' },
        { status: 400 }
      );
    }

    console.log('[WORDPRESS DISCOVERY] Starting API discovery for connection:', connectionId);

    // Get the WordPress connection
    const { data: connection, error: connectionError } = await supabase
      .from('cms_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_token', userToken)
      .single();

    if (connectionError || !connection) {
      console.error('[WORDPRESS DISCOVERY] Connection not found:', connectionError);
      return NextResponse.json(
        { error: 'WordPress connection not found or access denied' },
        { status: 404 }
      );
    }

    const cmsType: string = connection.cms_type;
    const siteUrl = connection.base_url.replace(/\/$/, '');
    const isWpCom = cmsType === 'wordpress_com';

    console.log('[WORDPRESS DISCOVERY] Site configuration:', {
      siteUrl,
      cmsType,
      isWpCom
    });

    const discoveryResults: any = {
      siteUrl,
      cmsType,
      isWordPressCom: isWpCom,
      endpoints: {},
      recommendations: []
    };

    // Step 1: Discover WordPress.com or self-hosted API structure
    if (isWpCom) {
      // WordPress.com API Discovery
      const wpcomAccessToken = connection.api_token;
      if (!wpcomAccessToken) {
        return NextResponse.json(
          { error: 'Missing WordPress.com access token' },
          { status: 400 }
        );
      }

      let siteIdentifier = '';
      try {
        siteIdentifier = new URL(siteUrl).host;
      } catch {
        siteIdentifier = siteUrl;
      }

      console.log('[WORDPRESS DISCOVERY] Testing WordPress.com API with identifier:', siteIdentifier);

      // Test WordPress.com root endpoint
      const wpcomRootUrl = `https://public-api.wordpress.com/rest/v1.1/sites/${siteIdentifier}`;
      console.log('[WORDPRESS DISCOVERY] Testing WordPress.com root:', wpcomRootUrl);

      try {
        const rootResponse = await fetch(wpcomRootUrl, {
          headers: {
            'Authorization': `Bearer ${wpcomAccessToken}`,
            'Content-Type': 'application/json'
          }
        });

        discoveryResults.endpoints.wpcomRoot = {
          url: wpcomRootUrl,
          status: rootResponse.status,
          accessible: rootResponse.ok
        };

        if (rootResponse.ok) {
          const siteInfo = await rootResponse.json();
          discoveryResults.siteInfo = {
            name: siteInfo.name,
            description: siteInfo.description,
            url: siteInfo.URL
          };
          console.log('[WORDPRESS DISCOVERY] WordPress.com site info retrieved:', siteInfo.name);
        } else {
          const errorText = await rootResponse.text();
          console.error('[WORDPRESS DISCOVERY] WordPress.com root endpoint failed:', errorText);
          discoveryResults.endpoints.wpcomRoot.error = errorText;
        }
      } catch (error: any) {
        console.error('[WORDPRESS DISCOVERY] WordPress.com root endpoint error:', error);
        discoveryResults.endpoints.wpcomRoot = {
          url: wpcomRootUrl,
          accessible: false,
          error: error.message
        };
      }

      // Test WordPress.com posts endpoint (WP REST API v2)
      const wpcomPostsUrl = `https://public-api.wordpress.com/wp/v2/sites/${siteIdentifier}/posts`;
      console.log('[WORDPRESS DISCOVERY] Testing WordPress.com posts endpoint:', wpcomPostsUrl);

      try {
        const postsResponse = await fetch(wpcomPostsUrl, {
          headers: {
            'Authorization': `Bearer ${wpcomAccessToken}`,
            'Content-Type': 'application/json'
          }
        });

        discoveryResults.endpoints.posts = {
          url: wpcomPostsUrl,
          status: postsResponse.status,
          accessible: postsResponse.ok
        };

        if (postsResponse.ok) {
          console.log('[WORDPRESS DISCOVERY] WordPress.com posts endpoint accessible');
        } else {
          const errorText = await postsResponse.text();
          console.error('[WORDPRESS DISCOVERY] WordPress.com posts endpoint failed:', errorText);
          discoveryResults.endpoints.posts.error = errorText;

          discoveryResults.recommendations.push({
            issue: 'WordPress.com posts endpoint returned error',
            suggestion: 'Verify OAuth token has write permissions and the site exists',
            statusCode: postsResponse.status
          });
        }
      } catch (error: any) {
        console.error('[WORDPRESS DISCOVERY] WordPress.com posts endpoint error:', error);
        discoveryResults.endpoints.posts = {
          url: wpcomPostsUrl,
          accessible: false,
          error: error.message
        };

        discoveryResults.recommendations.push({
          issue: 'Cannot reach WordPress.com API',
          suggestion: 'Check network connectivity and verify the site URL is correct'
        });
      }

    } else {
      // Self-hosted WordPress API Discovery
      const parts = String(connection.api_token || '').split(':');
      if (parts.length !== 2) {
        return NextResponse.json(
          { error: 'Invalid application password format in connection' },
          { status: 400 }
        );
      }
      const [username, password] = parts;
      const authBasic = btoa(`${username}:${password}`);

      // Step 1: Test root /wp-json/ endpoint
      const rootUrl = `${siteUrl}/wp-json/`;
      console.log('[WORDPRESS DISCOVERY] Testing root endpoint:', rootUrl);

      try {
        const rootResponse = await fetch(rootUrl, {
          headers: {
            'Authorization': `Basic ${authBasic}`,
            'Content-Type': 'application/json'
          }
        });

        discoveryResults.endpoints.root = {
          url: rootUrl,
          status: rootResponse.status,
          accessible: rootResponse.ok
        };

        if (rootResponse.ok) {
          const rootData = await rootResponse.json();
          discoveryResults.apiInfo = {
            name: rootData.name,
            description: rootData.description,
            url: rootData.url,
            routes: rootData.routes ? Object.keys(rootData.routes) : []
          };
          console.log('[WORDPRESS DISCOVERY] Root endpoint accessible, found',
            rootData.routes ? Object.keys(rootData.routes).length : 0, 'routes');
        } else {
          const errorText = await rootResponse.text();
          console.error('[WORDPRESS DISCOVERY] Root endpoint returned error:', rootResponse.status);
          console.error('[WORDPRESS DISCOVERY] Error body:', errorText.substring(0, 500));

          discoveryResults.endpoints.root.error = errorText.substring(0, 500);
          discoveryResults.recommendations.push({
            issue: 'WordPress REST API root endpoint not accessible',
            suggestion: 'Verify WordPress is installed at this URL and REST API is not disabled',
            statusCode: rootResponse.status
          });
        }
      } catch (error: any) {
        console.error('[WORDPRESS DISCOVERY] Root endpoint error:', error);
        discoveryResults.endpoints.root = {
          url: rootUrl,
          accessible: false,
          error: error.message
        };

        discoveryResults.recommendations.push({
          issue: 'Cannot reach WordPress root endpoint',
          suggestion: 'Verify the site URL is correct and the site is accessible'
        });
      }

      // Step 2: Test /wp/v2/posts endpoint
      const postsUrl = `${siteUrl}/wp-json/wp/v2/posts`;
      console.log('[WORDPRESS DISCOVERY] Testing posts endpoint:', postsUrl);

      try {
        const postsResponse = await fetch(postsUrl, {
          headers: {
            'Authorization': `Basic ${authBasic}`,
            'Content-Type': 'application/json'
          }
        });

        discoveryResults.endpoints.posts = {
          url: postsUrl,
          status: postsResponse.status,
          accessible: postsResponse.ok
        };

        if (postsResponse.ok) {
          const posts = await postsResponse.json();
          discoveryResults.endpoints.posts.postCount = Array.isArray(posts) ? posts.length : 0;
          console.log('[WORDPRESS DISCOVERY] Posts endpoint accessible, found',
            discoveryResults.endpoints.posts.postCount, 'posts');
        } else {
          const errorText = await postsResponse.text();
          console.error('[WORDPRESS DISCOVERY] Posts endpoint returned error:', postsResponse.status);
          console.error('[WORDPRESS DISCOVERY] Error body:', errorText.substring(0, 500));

          discoveryResults.endpoints.posts.error = errorText.substring(0, 500);

          if (postsResponse.status === 404) {
            discoveryResults.recommendations.push({
              issue: 'Posts endpoint returned 404',
              suggestion: 'The /wp/v2/ API prefix may be incorrect or REST API is disabled. Check if permalinks are set to "Post name" in WordPress settings.',
              statusCode: 404
            });
          } else if (postsResponse.status === 401 || postsResponse.status === 403) {
            discoveryResults.recommendations.push({
              issue: 'Authentication failed',
              suggestion: 'Application password may be invalid or expired. Re-authenticate with WordPress.',
              statusCode: postsResponse.status
            });
          }
        }
      } catch (error: any) {
        console.error('[WORDPRESS DISCOVERY] Posts endpoint error:', error);
        discoveryResults.endpoints.posts = {
          url: postsUrl,
          accessible: false,
          error: error.message
        };

        discoveryResults.recommendations.push({
          issue: 'Cannot reach posts endpoint',
          suggestion: 'Verify WordPress REST API is enabled and not blocked by security plugins'
        });
      }

      // Step 3: Test authentication with /wp/v2/users/me
      const usersUrl = `${siteUrl}/wp-json/wp/v2/users/me`;
      console.log('[WORDPRESS DISCOVERY] Testing authentication with:', usersUrl);

      try {
        const usersResponse = await fetch(usersUrl, {
          headers: {
            'Authorization': `Basic ${authBasic}`,
            'Content-Type': 'application/json'
          }
        });

        discoveryResults.endpoints.authentication = {
          url: usersUrl,
          status: usersResponse.status,
          authenticated: usersResponse.ok
        };

        if (usersResponse.ok) {
          const userData = await usersResponse.json();
          discoveryResults.user = {
            id: userData.id,
            username: userData.slug,
            name: userData.name,
            capabilities: userData.capabilities
          };
          console.log('[WORDPRESS DISCOVERY] Authentication successful for user:', userData.name);
        } else {
          console.error('[WORDPRESS DISCOVERY] Authentication failed:', usersResponse.status);
        }
      } catch (error: any) {
        console.error('[WORDPRESS DISCOVERY] Authentication endpoint error:', error);
        discoveryResults.endpoints.authentication = {
          url: usersUrl,
          authenticated: false,
          error: error.message
        };
      }
    }

    // Final recommendations
    if (discoveryResults.recommendations.length === 0) {
      discoveryResults.recommendations.push({
        issue: 'None',
        suggestion: 'All endpoints are accessible. Publishing should work.'
      });
    }

    console.log('[WORDPRESS DISCOVERY] Discovery complete. Accessible endpoints:',
      Object.keys(discoveryResults.endpoints).filter(key =>
        discoveryResults.endpoints[key].accessible
      ).length
    );

    return NextResponse.json({
      success: true,
      discovery: discoveryResults
    });

  } catch (error: any) {
    console.error('[WORDPRESS DISCOVERY] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error during API discovery',
        details: error.message
      },
      { status: 500 }
    );
  }
}
