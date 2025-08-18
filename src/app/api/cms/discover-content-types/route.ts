import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const userToken = request.nextUrl.searchParams.get('userToken');
    const body = await request.json();
    const { base_url, api_token } = body;

    if (!base_url || !api_token) {
      return NextResponse.json(
        { error: 'Missing required fields: base_url and api_token' },
        { status: 400 }
      );
    }

    if (!userToken) {
      return NextResponse.json(
        { error: 'User token is required' },
        { status: 401 }
      );
    }

    // Validate user token
    const { data: user, error: userError } = await supabase
      .from('login_users')
      .select('token')
      .eq('token', userToken)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid user token' },
        { status: 401 }
      );
    }

    console.log('[CMS DISCOVERY] Discovering content types for:', base_url);

    const cleanUrl = base_url.replace(/\/$/, '');
    
    // Test basic connectivity with content-type-builder (requires fewer permissions)
    let connectionWorking = false;
    let connectionError = '';
    
    try {
      const healthResponse = await fetch(`${cleanUrl}/api/content-type-builder/content-types`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${api_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (healthResponse.ok) {
        connectionWorking = true;
      } else if (healthResponse.status === 401) {
        connectionError = 'Invalid API token. Please create a Custom token with Content-Type-Builder.read permission.';
      } else if (healthResponse.status === 403) {
        connectionError = 'API token lacks permissions. Please create a Custom token with Content-Type-Builder.read and Content-Manager.read permissions.';
      } else {
        connectionError = `Connection failed: ${healthResponse.status}`;
      }
    } catch (error) {
      connectionError = 'Could not connect to Strapi instance. Please check your base URL.';
    }

    // If primary health check failed, try a basic content endpoint as fallback
    if (!connectionWorking) {
      try {
        const fallbackResponse = await fetch(`${cleanUrl}/api/blog-posts?pagination[limit]=1`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${api_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (fallbackResponse.ok) {
          connectionWorking = true;
          connectionError = ''; // Clear error if fallback works
        }
      } catch (error) {
        // Fallback failed, keep original error
      }
    }

    if (!connectionWorking) {
      return NextResponse.json(
        { error: connectionError },
        { status: 401 }
      );
    }

    // Discover content types through multiple methods
    let discoveredTypes: any[] = [];

    // Method 1: Try to fetch content type schemas
    try {
      const schemaResponse = await fetch(`${cleanUrl}/api/content-type-builder/content-types`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${api_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (schemaResponse.ok) {
        const schemas = await schemaResponse.json();
        console.log('[CMS DISCOVERY] Found schemas via content-type-builder');
        
        if (schemas.data) {
          for (const [typeName, schema] of Object.entries(schemas.data)) {
            const typeInfo = schema as any;
            discoveredTypes.push({
              id: typeName,
              name: typeInfo.info?.displayName || typeName,
              description: typeInfo.info?.description || '',
              endpoint: typeName,
              kind: typeInfo.kind || 'collectionType'
            });
          }
        }
      }
    } catch (error) {
      console.log('[CMS DISCOVERY] Schema discovery failed, trying alternative method');
    }

    // Method 2: If schema discovery failed, try common endpoint patterns
    if (discoveredTypes.length === 0) {
      const commonPatterns = [
        { id: 'api::blog-post.blog-post', name: 'Blog Posts', endpoint: 'api/blog-posts' },
        { id: 'api::article.article', name: 'Articles', endpoint: 'api/articles' },
        { id: 'api::post.post', name: 'Posts', endpoint: 'api/posts' },
        { id: 'api::news.news', name: 'News', endpoint: 'api/news' },
        { id: 'api::content.content', name: 'Content', endpoint: 'api/content' }
      ];

      for (const pattern of commonPatterns) {
        try {
          const testResponse = await fetch(`${cleanUrl}/${pattern.endpoint}?pagination[limit]=1`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${api_token}`,
              'Content-Type': 'application/json',
            },
          });

          if (testResponse.ok) {
            const data = await testResponse.json();
            discoveredTypes.push({
              ...pattern,
              description: `Found ${data.meta?.pagination?.total || 0} entries`,
              kind: 'collectionType',
              verified: true
            });
            console.log('[CMS DISCOVERY] Verified endpoint:', pattern.endpoint);
          }
        } catch (error) {
          console.log('[CMS DISCOVERY] Failed to test:', pattern.endpoint);
        }
      }
    }

    // Method 3: Get entry counts for discovered types
    for (const type of discoveredTypes) {
      if (!type.verified) {
        try {
          const countResponse = await fetch(`${cleanUrl}/${type.endpoint}?pagination[limit]=1`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${api_token}`,
              'Content-Type': 'application/json',
            },
          });

          if (countResponse.ok) {
            const data = await countResponse.json();
            type.entryCount = data.meta?.pagination?.total || 0;
            type.description = `${type.entryCount} entries`;
            type.verified = true;
          }
        } catch (error) {
          type.verified = false;
          type.description = 'Could not verify';
        }
      }
    }

    // Filter to only verified types and sort by relevance
    const verifiedTypes = discoveredTypes
      .filter(type => type.verified)
      .sort((a, b) => {
        // Prioritize blog-related content types
        if (a.id.includes('blog') && !b.id.includes('blog')) return -1;
        if (!a.id.includes('blog') && b.id.includes('blog')) return 1;
        if (a.id.includes('article') && !b.id.includes('article')) return -1;
        if (!a.id.includes('article') && b.id.includes('article')) return 1;
        return (b.entryCount || 0) - (a.entryCount || 0);
      });

    console.log('[CMS DISCOVERY] Found', verifiedTypes.length, 'verified content types');

    if (verifiedTypes.length === 0) {
      return NextResponse.json(
        { 
          error: 'No accessible content types found. Please ensure your API token has proper permissions and your Strapi instance has content types configured.',
          discoveredTypes: []
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Found ${verifiedTypes.length} content type(s)`,
      discoveredTypes: verifiedTypes,
      recommended: verifiedTypes[0] // Return the most relevant one as recommended
    });

  } catch (error) {
    console.error('[CMS DISCOVERY] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error during content type discovery' },
      { status: 500 }
    );
  }
}