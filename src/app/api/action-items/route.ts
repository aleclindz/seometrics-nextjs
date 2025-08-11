import { NextRequest, NextResponse } from 'next/server';
import { ActionItemService } from '@/lib/ActionItemService';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const siteUrl = searchParams.get('siteUrl');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const severity = searchParams.get('severity');
    const limit = searchParams.get('limit');

    if (!userToken || !siteUrl) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing userToken or siteUrl' 
      }, { status: 400 });
    }

    console.log(`[ACTION ITEMS API] Fetching action items for ${siteUrl}`);

    // Parse filters
    const statusFilter = status ? status.split(',') as any[] : undefined;
    const limitNumber = limit ? parseInt(limit) : undefined;

    const actionItems = await ActionItemService.getActionItems(userToken, siteUrl, {
      status: statusFilter,
      category: category as any,
      severity: severity as any,
      limit: limitNumber
    });

    return NextResponse.json({
      success: true,
      actionItems,
      count: actionItems.length
    });

  } catch (error) {
    console.error('[ACTION ITEMS API] Error fetching action items:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch action items'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userToken, siteUrl, action } = body;

    if (!userToken || !siteUrl) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing userToken or siteUrl' 
      }, { status: 400 });
    }

    console.log(`[ACTION ITEMS API] Processing action: ${action} for ${siteUrl}`);

    switch (action) {
      case 'detect_issues':
        return await handleDetectIssues(userToken, siteUrl);
      
      case 'create_action_item':
        return await handleCreateActionItem(userToken, siteUrl, body.issue);
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('[ACTION ITEMS API] Error processing request:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process request'
    }, { status: 500 });
  }
}

async function handleDetectIssues(userToken: string, siteUrl: string) {
  try {
    console.log(`[ACTION ITEMS API] Detecting issues for ${siteUrl}`);
    
    // Detect all issues
    const detectedIssues = await ActionItemService.detectIssues(userToken, siteUrl);
    
    // Create action items for each detected issue
    const createdActionItems = [];
    for (const issue of detectedIssues) {
      const actionItem = await ActionItemService.createActionItem(userToken, siteUrl, issue);
      if (actionItem) {
        createdActionItems.push(actionItem);
      }
    }

    return NextResponse.json({
      success: true,
      detectedIssues: detectedIssues.length,
      createdActionItems: createdActionItems.length,
      actionItems: createdActionItems,
      message: `Detected ${detectedIssues.length} issues, created ${createdActionItems.length} action items`
    });

  } catch (error) {
    console.error('[ACTION ITEMS API] Error detecting issues:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to detect issues'
    }, { status: 500 });
  }
}

async function handleCreateActionItem(userToken: string, siteUrl: string, issue: any) {
  try {
    if (!issue) {
      return NextResponse.json({
        success: false,
        error: 'Issue details are required'
      }, { status: 400 });
    }

    console.log(`[ACTION ITEMS API] Creating action item: ${issue.title}`);
    
    const actionItem = await ActionItemService.createActionItem(userToken, siteUrl, issue);
    
    if (!actionItem) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create action item'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      actionItem,
      message: 'Action item created successfully'
    });

  } catch (error) {
    console.error('[ACTION ITEMS API] Error creating action item:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create action item'
    }, { status: 500 });
  }
}