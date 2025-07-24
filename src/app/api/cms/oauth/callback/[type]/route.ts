import { NextRequest } from 'next/server';
import { CMSManager } from '@/lib/cms/cms-manager';
import { CMSType } from '@/lib/cms/types';

const cmsManager = new CMSManager();

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const type = params.type as CMSType;
    
    // Get parameters from query string
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const userId = searchParams.get('user_id'); // We'll need to pass this in the redirect URI

    // Handle OAuth errors
    if (error) {
      console.error(`[CMS OAUTH] ${type} OAuth error:`, error);
      return new Response(
        `<html><body><script>
          window.parent.postMessage({
            type: 'cms_oauth_error',
            cmsType: '${type}',
            error: '${error}'
          }, '*');
          window.close();
        </script></body></html>`,
        { 
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    if (!code || !state) {
      return new Response(
        `<html><body><script>
          window.parent.postMessage({
            type: 'cms_oauth_error',
            cmsType: '${type}',
            error: 'Missing authorization code or state'
          }, '*');
          window.close();
        </script></body></html>`,
        { 
          status: 400,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    // For WordPress, handle the different callback format
    if (type === 'wordpress') {
      const siteUrl = searchParams.get('site_url');
      const userLogin = searchParams.get('user_login');
      const password = searchParams.get('password');

      if (siteUrl && userLogin && password) {
        // WordPress callback with credentials
        const redirectUri = `${request.url}?site_url=${siteUrl}&user_login=${userLogin}&password=${password}`;
        
        // Extract userId from state or get from session
        // For now, we'll expect it to be embedded in the callback
        const storedUserId = userId || 'temp-user'; // TODO: Get from session/state
        
        const result = await cmsManager.completeOAuthFlow(
          type,
          'wordpress-credentials', // Not used for WordPress
          state,
          storedUserId
        );

        return new Response(
          `<html><body><script>
            window.parent.postMessage({
              type: 'cms_oauth_complete',
              cmsType: '${type}',
              success: ${result.success},
              ${result.success ? `connection: ${JSON.stringify(result.connection)}` : `error: '${result.error}'`}
            }, '*');
            window.close();
          </script></body></html>`,
          { 
            status: 200,
            headers: { 'Content-Type': 'text/html' }
          }
        );
      }
    }

    // Standard OAuth callback for Webflow and Shopify
    if (!userId) {
      return new Response(
        `<html><body><script>
          window.parent.postMessage({
            type: 'cms_oauth_error',
            cmsType: '${type}',
            error: 'User ID is required'
          }, '*');
          window.close();
        </script></body></html>`,
        { 
          status: 400,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    console.log(`[CMS OAUTH] Processing ${type} callback for user ${userId}`);

    const result = await cmsManager.completeOAuthFlow(
      type,
      code,
      state,
      userId
    );

    // Return HTML that posts a message to parent window and closes
    return new Response(
      `<html><body><script>
        window.parent.postMessage({
          type: 'cms_oauth_complete',
          cmsType: '${type}',
          success: ${result.success},
          ${result.success ? `connection: ${JSON.stringify(result.connection)}` : `error: '${result.error}'`}
        }, '*');
        window.close();
      </script></body></html>`,
      { 
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    );

  } catch (error) {
    console.error(`[CMS OAUTH] Callback processing failed for ${params.type}:`, error);
    
    return new Response(
      `<html><body><script>
        window.parent.postMessage({
          type: 'cms_oauth_error',
          cmsType: '${params.type}',
          error: '${error instanceof Error ? error.message : 'OAuth callback failed'}'
        }, '*');
        window.close();
      </script></body></html>`,
      { 
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}