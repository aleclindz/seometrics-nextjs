import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      cms_type,
      base_url,
      api_token,
      content_type,
      connection_id,
      userToken
    } = body;

    if (!cms_type || !base_url || !api_token) {
      return NextResponse.json(
        { error: 'Missing required fields: cms_type, base_url, api_token' },
        { status: 400 }
      );
    }

    console.log('[CMS TEST] Testing connection to:', base_url, 'Type:', cms_type);

    let testResult = { success: false, message: '', details: {} };

    if (cms_type === 'strapi') {
      testResult = await testStrapiConnection(base_url, api_token, content_type);
    } else {
      return NextResponse.json(
        { error: `CMS type '${cms_type}' is not yet supported` },
        { status: 400 }
      );
    }

    // If we have a connection_id, update the status in the database
    if (connection_id && userToken) {
      await updateConnectionStatus(connection_id, userToken, testResult.success, testResult.message);
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
    // Test 1: Check if Strapi instance is accessible
    console.log('[STRAPI TEST] Testing basic connectivity...');
    
    const healthResponse = await fetch(`${cleanUrl}/api/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!healthResponse.ok) {
      const errorText = await healthResponse.text();
      console.log('[STRAPI TEST] Health check failed:', healthResponse.status, errorText);
      
      if (healthResponse.status === 401) {
        return {
          success: false,
          message: 'Authentication failed. Please check your API token.',
          details: { status: 401, error: 'Unauthorized' }
        };
      } else if (healthResponse.status === 404) {
        return {
          success: false,
          message: 'Strapi instance not found. Please check your base URL.',
          details: { status: 404, error: 'Not Found' }
        };
      } else {
        return {
          success: false,
          message: `Connection failed with status ${healthResponse.status}`,
          details: { status: healthResponse.status, error: errorText }
        };
      }
    }

    const userData = await healthResponse.json();
    console.log('[STRAPI TEST] Basic connectivity successful, user:', userData.email || userData.username);

    // Test 2: Check if the content type exists and we can access it
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

    const contentData = await contentTypeResponse.json();
    console.log('[STRAPI TEST] Content type access successful, found items:', contentData.data?.length || 0);

    // Test 3: Try to create a test entry (dry run)
    console.log('[STRAPI TEST] Testing write permissions...');
    
    const testPayload = {
      data: {
        title: 'SEOMetrics Test Article - Please Delete',
        content: 'This is a test article created by SEOMetrics to verify write permissions. Please delete this entry.',
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
          message: 'Connection successful, but write permissions are limited. You may only be able to read content.',
          details: { 
            readAccess: true, 
            writeAccess: false, 
            contentType, 
            userEmail: userData.email || userData.username 
          }
        };
      } else {
        return {
          success: true, // Basic connection works
          message: 'Connection successful, but there may be issues with content creation. Please verify your content type structure.',
          details: { 
            readAccess: true, 
            writeAccess: false, 
            contentType,
            writeError: errorText,
            userEmail: userData.email || userData.username 
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
      message: 'Connection successful! Full read and write access confirmed.',
      details: { 
        readAccess: true, 
        writeAccess: true, 
        contentType,
        userEmail: userData.email || userData.username,
        testEntryCreated: true
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

async function updateConnectionStatus(connectionId: number, userToken: string, success: boolean, message: string) {
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
  } catch (error) {
    console.error('[CMS TEST] Error updating connection status:', error);
  }
}