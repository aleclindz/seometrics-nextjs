import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let {
      cms_type,
      base_url,
      api_token,
      content_type,
      connection_id,
      userToken
    } = body;

    let actualApiToken = api_token;

    // If no api_token is provided but we have connection_id, fetch the token from database
    if (!api_token && connection_id && userToken) {
      console.log('[CMS TEST] Fetching API token from database for connection:', connection_id);
      
      const { data: connection, error: fetchError } = await supabase
        .from('cms_connections')
        .select('api_token, cms_type, base_url, content_type')
        .eq('id', connection_id)
        .eq('user_token', userToken)
        .single();

      if (fetchError || !connection) {
        return NextResponse.json(
          { error: 'Connection not found or access denied' },
          { status: 404 }
        );
      }

      actualApiToken = connection.api_token;
      // Also update the other fields from database if not provided
      if (!cms_type) cms_type = connection.cms_type;
      if (!base_url) base_url = connection.base_url;
      if (!content_type) content_type = connection.content_type;
    }

    if (!cms_type || !base_url || !actualApiToken) {
      return NextResponse.json(
        { error: 'Missing required fields: cms_type, base_url, api_token' },
        { status: 400 }
      );
    }

    console.log('[CMS TEST] Testing connection to:', base_url, 'Type:', cms_type);

    let testResult = { success: false, message: '', details: {} };

    if (cms_type === 'strapi') {
      testResult = await testStrapiConnection(base_url, actualApiToken, content_type);
    } else if (cms_type === 'wix') {
      testResult = await testWixConnection(base_url, actualApiToken, content_type);
    } else if (cms_type === 'wordpress') {
      testResult = await testWordPressConnection(base_url, actualApiToken, content_type);
    } else {
      return NextResponse.json(
        { error: `CMS type '${cms_type}' is not yet supported` },
        { status: 400 }
      );
    }

    // If we have a connection_id, update the status in the database
    if (connection_id && userToken) {
      await updateConnectionStatus(connection_id, userToken, testResult.success, testResult.message, (testResult.details as any)?.schemas);
    }

    // Update the websites table cms_status based on test result
    if (userToken && base_url) {
      await updateWebsiteCMSStatus(userToken, base_url, testResult.success);
    }

    if (testResult.success) {
      return NextResponse.json({
        success: true,
        message: testResult.message,
        details: testResult.details
      });
    } else {
      return NextResponse.json(
        { 
          error: testResult.message,
          details: testResult.details
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('[CMS TEST] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function categorizeContentType(displayName: string, attributes: any, fieldCount: number): string {
  const name = displayName.toLowerCase();
  
  if (fieldCount === 0) return 'empty';
  if (name.includes('blog') || name.includes('post') || name.includes('article')) return 'blog';
  if (name.includes('page') || name.includes('content')) return 'page';
  if (name.includes('user') || name.includes('author') || name.includes('profile')) return 'user';
  if (name.includes('category') || name.includes('tag') || name.includes('taxonomy')) return 'taxonomy';
  if (name.includes('media') || name.includes('image') || name.includes('file')) return 'media';
  if (name.includes('comment') || name.includes('review')) return 'interaction';
  
  return 'other';
}

function isSuitableForBlogging(attributes: any, fieldCount: number): number {
  if (fieldCount === 0) return 0; // Empty content types get lowest priority
  
  let score = 0;
  const attributeValues = Object.values(attributes);
  
  // High priority indicators
  if (attributeValues.some((attr: any) => attr.type === 'richtext')) score += 10;
  if (attributeValues.some((attr: any) => attr.type === 'text')) score += 7;
  if (attributeValues.some((attr: any) => attr.type === 'string' && attr.required)) score += 5;
  if (attributeValues.some((attr: any) => attr.type === 'uid')) score += 3;
  if (attributeValues.some((attr: any) => attr.type === 'media')) score += 3;
  
  // Field count bonus
  if (fieldCount >= 3) score += 5;
  else if (fieldCount >= 2) score += 2;
  else if (fieldCount === 1) score += 1;
  
  return score;
}

async function testWixConnection(siteId: string, apiToken: string, contentType: string = 'blog-posts') {
  try {
    console.log('[WIX TEST] Testing connection to Wix site:', siteId);
    
    // Test 1: Basic API connectivity with site info
    const siteInfoUrl = `https://www.wixapis.com/site-properties/v4/properties`;
    console.log('[WIX TEST] Testing basic connectivity...');
    
    const siteInfoResponse = await fetch(siteInfoUrl, {
      method: 'GET',
      headers: {
        'Authorization': apiToken.startsWith('Bearer ') ? apiToken : `Bearer ${apiToken}`,
        'wix-site-id': siteId,
        'Content-Type': 'application/json'
      }
    });

    if (!siteInfoResponse.ok) {
      const errorText = await siteInfoResponse.text();
      console.log('[WIX TEST] Site info failed:', siteInfoResponse.status, errorText);
      
      if (siteInfoResponse.status === 401) {
        return {
          success: false,
          message: 'Invalid API token. Please check your Wix API token and ensure it has proper permissions.',
          details: { status: 401, error: 'Unauthorized', tokenLength: apiToken.length }
        };
      } else if (siteInfoResponse.status === 403) {
        return {
          success: false,
          message: 'API token lacks permissions. Please ensure your token has Blog permissions enabled.',
          details: { status: 403, error: 'Forbidden' }
        };
      }
      
      return {
        success: false,
        message: `Connection failed with status ${siteInfoResponse.status}. Please verify your site ID and API token.`,
        details: { status: siteInfoResponse.status, error: errorText }
      };
    }

    const siteInfo = await siteInfoResponse.json();
    console.log('[WIX TEST] Site info retrieved successfully');

    // Test 2: Blog API access - Get blog info
    const blogInfoUrl = `https://www.wixapis.com/blog/v3/blogs`;
    console.log('[WIX TEST] Testing blog API access...');
    
    const blogResponse = await fetch(blogInfoUrl, {
      method: 'GET',
      headers: {
        'Authorization': apiToken.startsWith('Bearer ') ? apiToken : `Bearer ${apiToken}`,
        'wix-site-id': siteId,
        'Content-Type': 'application/json'
      }
    });

    if (!blogResponse.ok) {
      const errorText = await blogResponse.text();
      console.log('[WIX TEST] Blog API failed:', blogResponse.status, errorText);
      
      return {
        success: false,
        message: `Blog API access failed (${blogResponse.status}). Please ensure your site has a blog and your API token has Blog permissions.`,
        details: { 
          status: blogResponse.status, 
          error: errorText,
          siteInfo: siteInfo?.properties?.businessName || 'Unknown'
        }
      };
    }

    const blogData = await blogResponse.json();
    const blogs = blogData.blogs || [];
    console.log('[WIX TEST] Found blogs:', blogs.length);

    if (blogs.length === 0) {
      return {
        success: false,
        message: 'No blogs found on this Wix site. Please create a blog in your Wix dashboard first.',
        details: { 
          readAccess: true,
          writeAccess: false,
          siteInfo: siteInfo?.properties?.businessName || 'Unknown',
          blogsCount: 0
        }
      };
    }

    // Test 3: Post creation test (create draft)
    const primaryBlog = blogs[0];
    console.log('[WIX TEST] Testing post creation on blog:', primaryBlog.title);
    
    const testPostUrl = `https://www.wixapis.com/blog/v3/draft-posts`;
    const testPostData = {
      blogId: primaryBlog.id,
      title: 'SEOAgent Test Post - Safe to Delete',
      richContent: {
        nodes: [
          {
            type: 'PARAGRAPH',
            id: 'test-paragraph',
            nodes: [
              {
                type: 'TEXT',
                id: 'test-text',
                textData: {
                  text: 'This is a test post created by SEOAgent to verify blog API access. You can safely delete this post.'
                }
              }
            ]
          }
        ]
      }
    };

    const createResponse = await fetch(testPostUrl, {
      method: 'POST',
      headers: {
        'Authorization': apiToken.startsWith('Bearer ') ? apiToken : `Bearer ${apiToken}`,
        'wix-site-id': siteId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPostData)
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.log('[WIX TEST] Post creation failed:', createResponse.status, errorText);
      
      return {
        success: true, // Connection works but write access limited
        message: `Connection successful, but post creation failed (${createResponse.status}). You may have read-only access.`,
        details: {
          readAccess: true,
          writeAccess: false,
          siteInfo: siteInfo?.properties?.businessName || 'Unknown',
          blogsCount: blogs.length,
          primaryBlog: primaryBlog.title,
          writeError: errorText
        }
      };
    }

    const createdPost = await createResponse.json();
    console.log('[WIX TEST] Test post created successfully:', createdPost.draftPost?.id);

    // Clean up: Delete the test post
    if (createdPost.draftPost?.id) {
      try {
        const deleteUrl = `https://www.wixapis.com/blog/v3/draft-posts/${createdPost.draftPost.id}`;
        await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': apiToken.startsWith('Bearer ') ? apiToken : `Bearer ${apiToken}`,
            'wix-site-id': siteId
          }
        });
        console.log('[WIX TEST] Test post cleaned up');
      } catch (cleanupError) {
        console.log('[WIX TEST] Could not clean up test post:', cleanupError);
      }
    }

    return {
      success: true,
      message: `Connection successful! Full blog access confirmed for "${primaryBlog.title}".`,
      details: {
        readAccess: true,
        writeAccess: true,
        siteInfo: siteInfo?.properties?.businessName || 'Unknown',
        blogsCount: blogs.length,
        primaryBlog: {
          id: primaryBlog.id,
          title: primaryBlog.title,
          description: primaryBlog.description
        },
        discoveredContentTypes: [{
          uid: 'wix::blog-posts',
          apiID: 'blog-posts',
          displayName: 'Blog Posts',
          pluralName: 'blog-posts',
          singularName: 'blog-post',
          apiEndpoint: 'blog/v3/posts',
          fieldCount: 5, // title, richContent, excerpt, featuredMedia, etc.
          hasRichText: true,
          hasMedia: true,
          hasUID: true,
          hasString: true,
          hasText: true,
          hasRelation: false,
          hasDraftAndPublish: true,
          isEmpty: false,
          category: 'blog',
          suitableForBlogging: 26 // High score like Strapi blog posts
        }],
        contentTypesCount: 1
      }
    };

  } catch (error) {
    console.error('[WIX TEST] Connection test error:', error);
    return {
      success: false,
      message: 'Could not connect to Wix. Please check your site ID and API token.',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

async function testStrapiConnection(baseUrl: string, apiToken: string, contentType: string = 'api::article::article') {
  const cleanUrl = baseUrl.replace(/\/$/, '');
  
  try {
    // Test 0: Basic reachability test (no auth required)
    console.log('[STRAPI TEST] Testing basic reachability...');
    try {
      const pingResponse = await fetch(`${cleanUrl}/_health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      console.log('[STRAPI TEST] Health endpoint status:', pingResponse.status);
    } catch (pingError) {
      console.log('[STRAPI TEST] Health endpoint failed, trying main URL...');
      try {
        const mainResponse = await fetch(cleanUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        console.log('[STRAPI TEST] Main URL status:', mainResponse.status);
      } catch (mainError) {
        console.log('[STRAPI TEST] Main URL also failed:', mainError);
      }
    }

    // Test 0.5: Try to fetch content type schemas for better publishing
    console.log('[STRAPI TEST] Attempting to fetch content type schemas...');
    let discoveredSchemas = null;
    let discoveredContentTypes: any[] = [];
    try {
      const schemaResponse = await fetch(`${cleanUrl}/api/content-type-builder/content-types`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (schemaResponse.ok) {
        discoveredSchemas = await schemaResponse.json();
        console.log('[STRAPI TEST] Successfully fetched schemas');
        
        // Extract user-created content types (not plugins or admin types)
        if (discoveredSchemas?.data) {
          discoveredContentTypes = discoveredSchemas.data
            .filter((contentType: any) => 
              contentType.uid.startsWith('api::') && // User content types
              contentType.schema.visible !== false // Visible to API
              // Remove the attribute length filter to catch all user content types
            )
            .map((contentType: any) => {
              const attributes = contentType.schema.attributes || {};
              const fieldCount = Object.keys(attributes).length;
              
              return {
                uid: contentType.uid,
                apiID: contentType.apiID,
                displayName: contentType.schema.displayName,
                pluralName: contentType.schema.pluralName,
                singularName: contentType.schema.singularName,
                apiEndpoint: `api/${contentType.schema.pluralName}`,
                attributes: attributes,
                fieldCount: fieldCount,
                hasRichText: Object.values(attributes).some((attr: any) => attr.type === 'richtext'),
                hasMedia: Object.values(attributes).some((attr: any) => attr.type === 'media'),
                hasUID: Object.values(attributes).some((attr: any) => attr.type === 'uid'),
                hasString: Object.values(attributes).some((attr: any) => attr.type === 'string'),
                hasText: Object.values(attributes).some((attr: any) => attr.type === 'text'),
                hasRelation: Object.values(attributes).some((attr: any) => attr.type === 'relation'),
                hasDraftAndPublish: contentType.schema.draftAndPublish || false,
                isEmpty: fieldCount === 0,
                // Categorize content types for better user experience
                category: categorizeContentType(contentType.schema.displayName, attributes, fieldCount),
                suitableForBlogging: isSuitableForBlogging(attributes, fieldCount)
              };
            })
            // Sort by suitability for blogging, then by field count, then alphabetically
            .sort((a: any, b: any) => {
              if (a.suitableForBlogging !== b.suitableForBlogging) {
                return b.suitableForBlogging - a.suitableForBlogging;
              }
              if (a.fieldCount !== b.fieldCount) {
                return b.fieldCount - a.fieldCount;
              }
              return a.displayName.localeCompare(b.displayName);
            });
          
          console.log('[STRAPI TEST] Discovered user content types:', discoveredContentTypes.map(ct => ct.displayName));
        }
      } else {
        console.log('[STRAPI TEST] Schema discovery failed:', schemaResponse.status);
        // Try alternative admin endpoint
        const altSchemaResponse = await fetch(`${cleanUrl}/admin/content-type-builder/content-types`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (altSchemaResponse.ok) {
          discoveredSchemas = await altSchemaResponse.json();
          console.log('[STRAPI TEST] Successfully fetched schemas via admin endpoint');
          // Process schemas same way as above
          if (discoveredSchemas?.data) {
            discoveredContentTypes = discoveredSchemas.data
              .filter((contentType: any) => 
                contentType.uid.startsWith('api::') &&
                contentType.schema.visible !== false
                // Remove the attribute length filter here too
              )
              .map((contentType: any) => {
                const attributes = contentType.schema.attributes || {};
                const fieldCount = Object.keys(attributes).length;
                
                return {
                  uid: contentType.uid,
                  apiID: contentType.apiID,
                  displayName: contentType.schema.displayName,
                  pluralName: contentType.schema.pluralName,
                  singularName: contentType.schema.singularName,
                  apiEndpoint: `api/${contentType.schema.pluralName}`,
                  attributes: attributes,
                  fieldCount: fieldCount,
                  hasRichText: Object.values(attributes).some((attr: any) => attr.type === 'richtext'),
                  hasMedia: Object.values(attributes).some((attr: any) => attr.type === 'media'),
                  hasUID: Object.values(attributes).some((attr: any) => attr.type === 'uid'),
                  hasString: Object.values(attributes).some((attr: any) => attr.type === 'string'),
                  hasText: Object.values(attributes).some((attr: any) => attr.type === 'text'),
                  hasRelation: Object.values(attributes).some((attr: any) => attr.type === 'relation'),
                  hasDraftAndPublish: contentType.schema.draftAndPublish || false,
                  isEmpty: fieldCount === 0,
                  category: categorizeContentType(contentType.schema.displayName, attributes, fieldCount),
                  suitableForBlogging: isSuitableForBlogging(attributes, fieldCount)
                };
              })
              .sort((a: any, b: any) => {
                if (a.suitableForBlogging !== b.suitableForBlogging) {
                  return b.suitableForBlogging - a.suitableForBlogging;
                }
                if (a.fieldCount !== b.fieldCount) {
                  return b.fieldCount - a.fieldCount;
                }
                return a.displayName.localeCompare(b.displayName);
              });
          }
        }
      }
    } catch (schemaError) {
      console.log('[STRAPI TEST] Schema discovery error:', schemaError);
      // Not critical for basic connection test, continue
    }

    // Test 1: Check if Strapi instance is accessible
    console.log('[STRAPI TEST] Testing basic connectivity...');
    console.log('[STRAPI TEST] URL:', `${cleanUrl}/api/users/me`);
    console.log('[STRAPI TEST] Token length:', apiToken.length);
    console.log('[STRAPI TEST] Token preview:', apiToken.substring(0, 10) + '...');
    
    // Try to discover working content type endpoints, prioritizing discovered content types
    let contentTypePatterns: string[] = [];
    
    // First priority: Use discovered content types from schema
    if (discoveredContentTypes.length > 0) {
      contentTypePatterns = [
        ...discoveredContentTypes.map(ct => ct.apiEndpoint), // e.g., "api/blog-posts"
        ...discoveredContentTypes.map(ct => `api/${ct.apiID}`), // e.g., "api/blog-post"
      ];
      console.log('[STRAPI TEST] Using discovered content types:', contentTypePatterns);
    }
    
    // Add fallback patterns if no content types discovered or as additional options
    const fallbackPatterns = [
      contentType, // User provided (e.g., api::blog-post::blog-post)
      'api/blog-posts', // Common REST endpoint
      'api/articles', // Common alternative
      'api/posts', // Simple posts
      'api/blog-post', // Singular form
      'api/article', // Singular article
      'api/news', // News content
      'api/content', // Generic content
      'api/blogs', // Blogs plural
      'api/blog', // Blog singular
      'api/pages', // Pages
      'api/page' // Page singular
    ];
    
    // Combine discovered and fallback patterns, removing duplicates
    const allPatterns = contentTypePatterns.concat(fallbackPatterns);
    contentTypePatterns = Array.from(new Set(allPatterns));
    
    let healthResponse: Response | null = null;
    let testUrl: string = '';
    let workingEndpoint = null;
    
    console.log('[STRAPI TEST] Testing multiple content type patterns...');
    
    // Try each pattern until we find one that works
    for (const pattern of contentTypePatterns) {
      testUrl = `${cleanUrl}/${pattern}`;
      if (!pattern.startsWith('api/')) {
        testUrl = `${cleanUrl}/api/${pattern}`;
      }
      
      console.log('[STRAPI TEST] Trying endpoint:', testUrl);
      
      try {
        healthResponse = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (healthResponse.ok) {
          workingEndpoint = pattern;
          console.log('[STRAPI TEST] Found working endpoint:', testUrl);
          break;
        } else if (healthResponse.status === 401) {
          console.log('[STRAPI TEST] Authentication failed for:', testUrl);
          // Don't break on 401 - token might be wrong, but let's try other endpoints
        } else if (healthResponse.status === 404) {
          console.log('[STRAPI TEST] Endpoint not found:', testUrl);
          // Continue to next pattern
        } else {
          console.log('[STRAPI TEST] Unexpected status for:', testUrl, healthResponse.status);
        }
      } catch (error) {
        console.log('[STRAPI TEST] Network error for:', testUrl, error);
        continue;
      }
    }
    
    // If no content type worked, fall back to users/me as last resort
    if (!workingEndpoint) {
      testUrl = `${cleanUrl}/api/users/me`;
      console.log('[STRAPI TEST] No content endpoints worked, trying users/me as fallback:', testUrl);
      healthResponse = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      });
    }

    if (!healthResponse || !healthResponse.ok) {
      if (!healthResponse) {
        return {
          success: false,
          message: 'Could not connect to any Strapi endpoints. Please check your base URL and network connection.',
          details: { 
            error: 'No response received',
            testedEndpoints: contentTypePatterns
          }
        };
      }
      
      const errorText = await healthResponse.text();
      console.log('[STRAPI TEST] All endpoints failed. Last attempt status:', healthResponse.status, errorText);
      
      if (healthResponse.status === 401) {
        return {
          success: false,
          message: 'Authentication failed for all tested endpoints. Please check:\n\n1. API token is correct and copied exactly\n2. Token type is "Full Access" (not Read Only)\n3. Token is not expired\n4. Your Strapi version supports bearer token authentication\n\nTry recreating the API token in Strapi admin.',
          details: { 
            status: 401, 
            error: 'Unauthorized',
            testedEndpoints: contentTypePatterns,
            lastUrl: testUrl,
            tokenLength: apiToken.length,
            response: errorText
          }
        };
      } else if (healthResponse.status === 404) {
        const message = discoveredContentTypes.length > 0 ?
          `No accessible content types found. We discovered ${discoveredContentTypes.length} content type${discoveredContentTypes.length > 1 ? 's' : ''} (${discoveredContentTypes.map(ct => ct.displayName).join(', ')}) but none are accessible via API.\n\nPlease check your API token permissions in Strapi Settings > API Tokens.` :
          `No accessible content types found. Please ensure your API token has proper permissions and your Strapi instance has content types configured.\n\nTested endpoints: ${contentTypePatterns.slice(0, 5).join(', ')}${contentTypePatterns.length > 5 ? '...' : ''}`;
        
        return {
          success: false,
          message: message,
          details: { 
            status: 404, 
            error: 'No accessible content types found',
            testedEndpoints: contentTypePatterns,
            discoveredContentTypes: discoveredContentTypes,
            contentTypesCount: discoveredContentTypes.length
          }
        };
      } else {
        return {
          success: false,
          message: `Connection failed with status ${healthResponse.status}. Tested ${contentTypePatterns.length} different content type patterns.`,
          details: { 
            status: healthResponse.status, 
            error: errorText,
            testedEndpoints: contentTypePatterns
          }
        };
      }
    }

    const responseData = await healthResponse.json();
    console.log(`[STRAPI TEST] Authentication successful using endpoint: ${testUrl}`);
    
    // Check if we got content type data or user data
    let userData: any = {};
    let contentData = null;
    
    if (workingEndpoint && !testUrl.includes('/api/users/me')) {
      console.log('[STRAPI TEST] Content type access successful, found items:', responseData.data?.length || 0);
      contentData = responseData;
      // For content type endpoint, we don't get user info
      userData = { email: 'API Token User' };
    } else {
      console.log('[STRAPI TEST] Basic connectivity successful, user:', responseData.email || responseData.username);
      userData = responseData;
      
      // Now test content type separately since we used users/me
      console.log('[STRAPI TEST] Testing content type access...');
      
      const contentTypeResponse = await fetch(`${cleanUrl}/${contentType}?pagination[limit]=1`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!contentTypeResponse.ok) {
        const errorText = await contentTypeResponse.text();
        console.log('[STRAPI TEST] Content type test failed:', contentTypeResponse.status, errorText);
        
        if (contentTypeResponse.status === 403) {
          return {
            success: false,
            message: `Access denied to content type '${contentType}'. Please check your API token permissions.`,
            details: { status: 403, contentType, error: 'Forbidden' }
          };
        } else if (contentTypeResponse.status === 404) {
          return {
            success: false,
            message: `Content type '${contentType}' not found. Please check the content type identifier.`,
            details: { status: 404, contentType, error: 'Content type not found' }
          };
        } else {
          return {
            success: false,
            message: `Content type test failed with status ${contentTypeResponse.status}`,
            details: { status: contentTypeResponse.status, contentType, error: errorText }
          };
        }
      }

      contentData = await contentTypeResponse.json();
      console.log('[STRAPI TEST] Content type access successful, found items:', contentData.data?.length || 0);
    }

    // Test 3: Try to create a test entry (dry run)
    console.log('[STRAPI TEST] Testing write permissions...');
    
    const testPayload = {
      data: {
        title: 'SEOAgent Test Article - Please Delete',
        content: 'This is a test article created by SEOAgent to verify write permissions. Please delete this entry.',
        published: false
      }
    };

    const writeTestResponse = await fetch(`${cleanUrl}/${contentType}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    if (!writeTestResponse.ok) {
      const errorText = await writeTestResponse.text();
      console.log('[STRAPI TEST] Write test failed:', writeTestResponse.status, errorText);
      
      if (writeTestResponse.status === 403) {
        return {
          success: true, // Connection works, but limited permissions
          message: workingEndpoint ? 
            `Connection successful, but write permissions are limited. You may only be able to read content.\n\nDiscovered working endpoint: ${workingEndpoint}` :
            'Connection successful, but write permissions are limited. You may only be able to read content.',
          details: { 
            readAccess: true, 
            writeAccess: false, 
            contentType: workingEndpoint || contentType,
            discoveredEndpoint: workingEndpoint,
            userEmail: userData.email || userData.username,
            schemas: discoveredSchemas,
            discoveredContentTypes: discoveredContentTypes,
            contentTypesCount: discoveredContentTypes.length
          }
        };
      } else {
        return {
          success: true, // Basic connection works
          message: workingEndpoint ? 
            `Connection successful, but there may be issues with content creation. Please verify your content type structure.\n\nDiscovered working endpoint: ${workingEndpoint}` :
            'Connection successful, but there may be issues with content creation. Please verify your content type structure.',
          details: { 
            readAccess: true, 
            writeAccess: false, 
            contentType: workingEndpoint || contentType,
            discoveredEndpoint: workingEndpoint,
            writeError: errorText,
            userEmail: userData.email || userData.username,
            schemas: discoveredSchemas,
            discoveredContentTypes: discoveredContentTypes,
            contentTypesCount: discoveredContentTypes.length
          }
        };
      }
    }

    const createdContent = await writeTestResponse.json();
    console.log('[STRAPI TEST] Write test successful, created item ID:', createdContent.data?.id);

    // Clean up: Delete the test entry
    if (createdContent.data?.id) {
      try {
        await fetch(`${cleanUrl}/${contentType}/${createdContent.data.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
          },
        });
        console.log('[STRAPI TEST] Cleaned up test entry');
      } catch (cleanupError) {
        console.log('[STRAPI TEST] Could not clean up test entry:', cleanupError);
      }
    }

    return {
      success: true,
      message: discoveredContentTypes.length > 0 ?
        `Connection successful! Discovered ${discoveredContentTypes.length} content type${discoveredContentTypes.length > 1 ? 's' : ''}. Full read and write access confirmed.` :
        'Connection successful! Full read and write access confirmed.',
      details: { 
        readAccess: true, 
        writeAccess: true, 
        contentType: workingEndpoint || contentType,
        discoveredEndpoint: workingEndpoint,
        userEmail: userData.email || userData.username,
        testEntryCreated: true,
        schemas: discoveredSchemas, // Include schema data for storage
        discoveredContentTypes: discoveredContentTypes,
        contentTypesCount: discoveredContentTypes.length
      }
    };

  } catch (error) {
    console.error('[STRAPI TEST] Connection test error:', error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        success: false,
        message: 'Could not connect to the Strapi instance. Please check your base URL and internet connection.',
        details: { error: 'Network error' }
      };
    }
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown connection error',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

async function updateConnectionStatus(connectionId: number, userToken: string, success: boolean, message: string, schemas?: any) {
  try {
    const updateData = {
      status: success ? 'active' : 'error',
      error_message: success ? null : message,
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await supabase
      .from('cms_connections')
      .update(updateData)
      .eq('id', connectionId)
      .eq('user_token', userToken);

    console.log('[CMS TEST] Updated connection status:', connectionId, success ? 'active' : 'error');

    // Store discovered schemas if available
    if (schemas && success) {
      await storeContentSchemas(connectionId, schemas);
    }
  } catch (error) {
    console.error('[CMS TEST] Error updating connection status:', error);
  }
}

async function storeContentSchemas(connectionId: number, schemas: any) {
  try {
    console.log('[CMS TEST] Storing content schemas for connection:', connectionId);
    
    if (!schemas || !schemas.data) {
      console.log('[CMS TEST] No schema data to store');
      return;
    }

    const schemaEntries = Object.entries(schemas.data).map(([contentTypeName, schemaData]: [string, any]) => {
      // Process the schema to extract useful field information
      const fieldsConfig = processSchemaFields(schemaData);
      
      return {
        connection_id: connectionId,
        content_type_name: contentTypeName,
        schema_data: schemaData,
        fields_config: fieldsConfig,
        is_primary: contentTypeName.includes('blog') || contentTypeName.includes('article'), // Smart default
        last_discovered_at: new Date().toISOString()
      };
    });

    // Upsert schemas (update if exists, insert if new)
    for (const entry of schemaEntries) {
      await supabase
        .from('cms_content_schemas')
        .upsert(entry, {
          onConflict: 'connection_id,content_type_name'
        });
    }

    console.log('[CMS TEST] Stored', schemaEntries.length, 'content schemas');
  } catch (error) {
    console.error('[CMS TEST] Error storing content schemas:', error);
  }
}

function processSchemaFields(schemaData: any) {
  try {
    const fields = schemaData?.schema?.attributes || {};
    const processedFields: any = {};

    Object.entries(fields).forEach(([fieldName, fieldDef]: [string, any]) => {
      processedFields[fieldName] = {
        type: fieldDef.type,
        required: fieldDef.required || false,
        unique: fieldDef.unique || false,
        multiple: fieldDef.multiple || false,
        // Add more field properties as needed
        component: fieldDef.component,
        target: fieldDef.target,
        relation: fieldDef.relation
      };
    });

    return {
      attributes: processedFields,
      hasRichText: Object.values(fields).some((field: any) => field.type === 'richtext'),
      hasMedia: Object.values(fields).some((field: any) => field.type === 'media'),
      hasRelations: Object.values(fields).some((field: any) => field.type === 'relation'),
      fieldCount: Object.keys(fields).length
    };
  } catch (error) {
    console.error('[CMS TEST] Error processing schema fields:', error);
    return { attributes: {}, hasRichText: false, hasMedia: false, hasRelations: false, fieldCount: 0 };
  }
}

async function testWordPressConnection(siteUrl: string, applicationPassword: string, contentType: string = 'posts') {
  try {
    console.log('[WORDPRESS TEST] Testing WordPress connection to:', siteUrl);

    // Parse application password - should be in format "username:password"
    const parts = applicationPassword.split(':');
    if (parts.length !== 2) {
      return {
        success: false,
        message: 'Invalid application password format. Should be "username:password"',
        details: { error: 'Invalid format', expectedFormat: 'username:password' }
      };
    }

    const [username, password] = parts;
    const auth = btoa(`${username}:${password}`);
    const cleanUrl = siteUrl.replace(/\/$/, '');

    // Test 1: Basic WordPress REST API connectivity
    console.log('[WORDPRESS TEST] Testing basic connectivity...');
    const apiResponse = await fetch(`${cleanUrl}/wp-json/wp/v2/`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!apiResponse.ok) {
      if (apiResponse.status === 401) {
        return {
          success: false,
          message: 'Authentication failed. Please check your username and application password.',
          details: { status: 401, error: 'Unauthorized' }
        };
      } else if (apiResponse.status === 404) {
        return {
          success: false,
          message: 'WordPress REST API not found. Please ensure WordPress is installed and REST API is enabled.',
          details: { status: 404, error: 'REST API not found' }
        };
      }

      const errorText = await apiResponse.text();
      return {
        success: false,
        message: `WordPress connection failed with status ${apiResponse.status}`,
        details: { status: apiResponse.status, error: errorText }
      };
    }

    const apiInfo = await apiResponse.json();
    console.log('[WORDPRESS TEST] Basic connectivity successful');

    // Test 2: User authentication and permissions
    console.log('[WORDPRESS TEST] Testing user authentication...');
    const userResponse = await fetch(`${cleanUrl}/wp-json/wp/v2/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!userResponse.ok) {
      return {
        success: false,
        message: 'User authentication failed. Please check your application password.',
        details: { status: userResponse.status, error: 'User auth failed' }
      };
    }

    const userData = await userResponse.json();
    console.log('[WORDPRESS TEST] User authenticated:', userData.name || userData.username);

    // Test 3: Post access and permissions
    console.log('[WORDPRESS TEST] Testing post access...');
    const postsResponse = await fetch(`${cleanUrl}/wp-json/wp/v2/posts?per_page=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!postsResponse.ok) {
      return {
        success: false,
        message: 'Failed to access posts. Please check your user permissions.',
        details: { status: postsResponse.status, error: 'Posts access failed' }
      };
    }

    const posts = await postsResponse.json();
    console.log('[WORDPRESS TEST] Posts access successful, found:', posts.length, 'posts');

    // Test 4: Write permissions by creating a draft post
    console.log('[WORDPRESS TEST] Testing write permissions...');
    const testPost = {
      title: 'SEOAgent Test Post - Safe to Delete',
      content: 'This is a test post created by SEOAgent to verify write permissions. You can safely delete this post.',
      status: 'draft',
      meta: {
        _edit_lock: Math.floor(Date.now() / 1000) + ':1'
      }
    };

    const createResponse = await fetch(`${cleanUrl}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPost)
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.log('[WORDPRESS TEST] Post creation failed:', createResponse.status, errorText);

      return {
        success: true, // Connection works but write access limited
        message: `Connection successful, but post creation failed (${createResponse.status}). You may have read-only permissions.`,
        details: {
          readAccess: true,
          writeAccess: false,
          siteInfo: apiInfo.name || 'WordPress Site',
          userInfo: userData.name || userData.username,
          postsCount: posts.length,
          writeError: errorText
        }
      };
    }

    const createdPost = await createResponse.json();
    console.log('[WORDPRESS TEST] Test post created successfully:', createdPost.id);

    // Clean up: Delete the test post
    if (createdPost.id) {
      try {
        await fetch(`${cleanUrl}/wp-json/wp/v2/posts/${createdPost.id}?force=true`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
        });
        console.log('[WORDPRESS TEST] Test post cleaned up');
      } catch (cleanupError) {
        console.log('[WORDPRESS TEST] Could not clean up test post:', cleanupError);
      }
    }

    // Get categories for additional context
    let categories = [];
    try {
      const categoriesResponse = await fetch(`${cleanUrl}/wp-json/wp/v2/categories?per_page=10`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      });

      if (categoriesResponse.ok) {
        categories = await categoriesResponse.json();
      }
    } catch (categoriesError) {
      console.log('[WORDPRESS TEST] Could not fetch categories:', categoriesError);
    }

    return {
      success: true,
      message: `WordPress connection successful! Full read and write access confirmed for "${apiInfo.name || 'WordPress Site'}".`,
      details: {
        readAccess: true,
        writeAccess: true,
        siteInfo: {
          name: apiInfo.name || 'WordPress Site',
          description: apiInfo.description || '',
          url: cleanUrl,
          version: apiInfo.version || 'Unknown'
        },
        userInfo: {
          id: userData.id,
          name: userData.name || userData.username,
          email: userData.email,
          roles: userData.roles || []
        },
        postsCount: posts.length,
        categoriesCount: categories.length,
        discoveredContentTypes: [{
          uid: 'wp::posts::post',
          apiID: 'posts',
          displayName: 'Posts',
          pluralName: 'posts',
          singularName: 'post',
          apiEndpoint: 'wp-json/wp/v2/posts',
          fieldCount: 8, // title, content, excerpt, status, author, etc.
          hasRichText: true,
          hasMedia: true,
          hasUID: false,
          hasString: true,
          hasText: true,
          hasRelation: true,
          hasDraftAndPublish: true,
          isEmpty: false,
          category: 'blog',
          suitableForBlogging: 28 // High score for WordPress posts
        }],
        contentTypesCount: 1
      }
    };

  } catch (error) {
    console.error('[WORDPRESS TEST] Connection test error:', error);
    return {
      success: false,
      message: 'Could not connect to WordPress. Please check your site URL and application password.',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

async function updateWebsiteCMSStatus(userToken: string, baseUrl: string, success: boolean) {
  try {
    console.log('[CMS TEST] Updating websites table cms_status to:', success ? 'connected' : 'error');

    // Extract domain from base URL for matching
    const domain = baseUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');

    await supabase
      .from('websites')
      .update({
        cms_status: success ? 'connected' : 'error',
        last_status_check: new Date().toISOString()
      })
      .eq('user_token', userToken)
      .or(`domain.ilike.%${domain}%,cleaned_domain.ilike.%${domain}%`);

    console.log('[CMS TEST] Websites table cms_status updated successfully');
  } catch (dbError) {
    console.error('[CMS TEST] Failed to update websites table cms_status:', dbError);
    // Don't throw - this is a secondary update
  }
}