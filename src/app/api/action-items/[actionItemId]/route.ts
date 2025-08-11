import { NextRequest, NextResponse } from 'next/server';
import { ActionItemService } from '@/lib/ActionItemService';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { actionItemId: string } }
) {
  try {
    const body = await request.json();
    const { actionItemId } = params;

    if (!actionItemId) {
      return NextResponse.json({
        success: false,
        error: 'Action item ID is required'
      }, { status: 400 });
    }

    console.log(`[ACTION ITEMS API] Updating action item: ${actionItemId}`);

    const updatedActionItem = await ActionItemService.updateActionItem(actionItemId, body);

    if (!updatedActionItem) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update action item'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      actionItem: updatedActionItem,
      message: 'Action item updated successfully'
    });

  } catch (error) {
    console.error('[ACTION ITEMS API] Error updating action item:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update action item'
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { actionItemId: string } }
) {
  try {
    const body = await request.json();
    const { actionItemId } = params;
    const { action } = body;

    if (!actionItemId) {
      return NextResponse.json({
        success: false,
        error: 'Action item ID is required'
      }, { status: 400 });
    }

    console.log(`[ACTION ITEMS API] Processing action: ${action} for item: ${actionItemId}`);

    switch (action) {
      case 'verify_completion':
        return await handleVerifyCompletion(actionItemId);
      
      case 'mark_completed':
        return await handleMarkCompleted(actionItemId, body);
      
      case 'dismiss':
        return await handleDismiss(actionItemId, body.reason);
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('[ACTION ITEMS API] Error processing action:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process action'
    }, { status: 500 });
  }
}

async function handleVerifyCompletion(actionItemId: string) {
  try {
    console.log(`[ACTION ITEMS API] Verifying completion for: ${actionItemId}`);
    
    const isVerified = await ActionItemService.verifyCompletion(actionItemId);
    
    return NextResponse.json({
      success: true,
      verified: isVerified,
      message: isVerified ? 'Action item verified as completed' : 'Action item needs additional work'
    });

  } catch (error) {
    console.error('[ACTION ITEMS API] Error verifying completion:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to verify completion'
    }, { status: 500 });
  }
}

async function handleMarkCompleted(actionItemId: string, body: any) {
  try {
    console.log(`[ACTION ITEMS API] Marking completed: ${actionItemId}`);
    
    const updates = {
      status: 'completed' as const,
      fix_type: body.fixType,
      fix_details: body.fixDetails
    };

    const updatedActionItem = await ActionItemService.updateActionItem(actionItemId, updates);
    
    if (!updatedActionItem) {
      return NextResponse.json({
        success: false,
        error: 'Failed to mark action item as completed'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      actionItem: updatedActionItem,
      message: 'Action item marked as completed'
    });

  } catch (error) {
    console.error('[ACTION ITEMS API] Error marking completed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to mark as completed'
    }, { status: 500 });
  }
}

async function handleDismiss(actionItemId: string, reason?: string) {
  try {
    console.log(`[ACTION ITEMS API] Dismissing: ${actionItemId}`);
    
    const updates = {
      status: 'dismissed' as const,
      metadata: { dismissReason: reason }
    };

    const updatedActionItem = await ActionItemService.updateActionItem(actionItemId, updates);
    
    if (!updatedActionItem) {
      return NextResponse.json({
        success: false,
        error: 'Failed to dismiss action item'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      actionItem: updatedActionItem,
      message: 'Action item dismissed'
    });

  } catch (error) {
    console.error('[ACTION ITEMS API] Error dismissing action item:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to dismiss action item'
    }, { status: 500 });
  }
}