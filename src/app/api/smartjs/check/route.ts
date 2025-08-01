import { NextRequest, NextResponse } from 'next/server';
import { checkSmartJSInstallation, getSimpleStatus } from '@/lib/smartjs-detection';

export async function POST(request: NextRequest) {
  try {
    const { websiteUrl } = await request.json();

    if (!websiteUrl) {
      return NextResponse.json(
        { error: 'Website URL is required' },
        { status: 400 }
      );
    }

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