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
        console.log('[STRAPI TEST] Successfully fetched schemas:', Object.keys(discoveredSchemas?.data || {}));
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
    
    // Try to discover working content type endpoints instead of hardcoded ones
    const contentTypePatterns = [
      contentType, // User provided (e.g., api::blog-post::blog-post)
      'api/blog-posts', // Common REST endpoint
      'api/articles', // Common alternative
      'api/posts', // Simple posts
      'api/blog-post', // Singular form
      'api/article', // Singular article
      'api/news', // News content
      'api/content' // Generic content
    ];
    
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
        return {
          success: false,
          message: `No content types found. Your Strapi might not have any of these common content types:\n\n${contentTypePatterns.join(', ')}\n\nPlease check your Strapi Content-Type Builder for available content types.`,
          details: { 
            status: 404, 
            error: 'No content types found',
            testedEndpoints: contentTypePatterns
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
            schemas: discoveredSchemas
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
            schemas: discoveredSchemas
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
      message: workingEndpoint ? 
        `Connection successful! Full read and write access confirmed.\n\nDiscovered working endpoint: ${workingEndpoint}` :
        'Connection successful! Full read and write access confirmed.',
      details: { 
        readAccess: true, 
        writeAccess: true, 
        contentType: workingEndpoint || contentType,
        discoveredEndpoint: workingEndpoint,
        userEmail: userData.email || userData.username,
        testEntryCreated: true,
        schemas: discoveredSchemas // Include schema data for storage
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