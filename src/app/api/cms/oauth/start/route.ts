import { NextRequest } from 'next/server';
import { CMSManager } from '@/lib/cms/cms-manager';
import { CMSType } from '@/lib/cms/types';

// Edge Runtime for better performance
export const runtime = 'edge';

const cmsManager = new CMSManager();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, userId, siteUrl } = body;

    if (!type || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type, userId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!cmsManager.getSupportedProviders().includes(type as CMSType)) {
      return new Response(
        JSON.stringify({ error: `Unsupported CMS type: ${type}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // For WordPress and Shopify, siteUrl is required
    if ((type === 'wordpress' || type === 'shopify') && !siteUrl) {
      return new Response(
        JSON.stringify({ error: `Site URL is required for ${type}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const redirectUri = `${request.headers.get('origin')}/api/cms/oauth/callback/${type}`;
    
    const { authUrl, state } = await cmsManager.startOAuthFlow(
      type as CMSType,
      userId,
      redirectUri,
      siteUrl
    );

    console.log(`[CMS OAUTH] Started ${type} OAuth flow for user ${userId}`);

    return new Response(JSON.stringify({
      success: true,
      authUrl,
      state,
    }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('[CMS OAUTH] Failed to start OAuth flow:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to start OAuth flow',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}