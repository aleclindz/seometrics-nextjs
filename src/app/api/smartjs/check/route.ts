import { NextRequest, NextResponse } from 'next/server';
import { checkSmartJSInstallation, getSimpleStatus } from '@/lib/seoagentjs-detection';
import { createClient } from '@supabase/supabase-js';
import { DomainQueryService } from '@/lib/database/DomainQueryService';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { websiteUrl, userToken } = await request.json();

    if (!websiteUrl) {
      return NextResponse.json(
        { error: 'Website URL is required' },
        { status: 400 }
      );
    }

    console.log('[SMARTJS CHECK] Testing installation for:', websiteUrl);
    const status = await checkSmartJSInstallation(websiteUrl);
    const simpleStatus = getSimpleStatus(status);

    // If userToken provided, update the database with the result
    if (userToken) {
      try {
        console.log('[SMARTJS CHECK] Updating seoagentjs_status to:', simpleStatus);
        
        // Find and update the website record
        const domain = websiteUrl.replace(/^https?:\/\//, '').replace(/^www\./, '');
        await supabase
          .from('websites')
          .update({ 
            seoagentjs_status: simpleStatus,
            last_status_check: new Date().toISOString()
          })
          .eq('user_token', userToken)
          .or(`domain.eq.${domain},domain.eq.sc-domain:${domain}`);
          
        console.log('[SMARTJS CHECK] Database updated successfully');
      } catch (dbError) {
        console.error('[SMARTJS CHECK] Database update failed:', dbError);
        // Continue - don't fail the test if DB update fails
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...status,
        status: simpleStatus
      }
    });

  } catch (error) {
    console.error('[SMARTJS CHECK] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const websiteUrl = searchParams.get('url');

  if (!websiteUrl) {
    return NextResponse.json(
      { error: 'Website URL is required' },
      { status: 400 }
    );
  }

  try {
    const status = await checkSmartJSInstallation(websiteUrl);
    const simpleStatus = getSimpleStatus(status);

    return NextResponse.json({
      success: true,
      data: {
        ...status,
        status: simpleStatus
      }
    });

  } catch (error) {
    console.error('[SMARTJS CHECK] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}