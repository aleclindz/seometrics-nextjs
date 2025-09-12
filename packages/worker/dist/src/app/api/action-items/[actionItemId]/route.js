"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.PUT = PUT;
exports.POST = POST;
const server_1 = require("next/server");
const ActionItemService_1 = require("@/lib/ActionItemService");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
async function PUT(request, { params }) {
    try {
        const body = await request.json();
        const { actionItemId } = params;
        if (!actionItemId) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Action item ID is required'
            }, { status: 400 });
        }
        console.log(`[ACTION ITEMS API] Updating action item: ${actionItemId}`);
        const updatedActionItem = await ActionItemService_1.ActionItemService.updateActionItem(actionItemId, body);
        if (!updatedActionItem) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Failed to update action item'
            }, { status: 500 });
        }
        return server_1.NextResponse.json({
            success: true,
            actionItem: updatedActionItem,
            message: 'Action item updated successfully'
        });
    }
    catch (error) {
        console.error('[ACTION ITEMS API] Error updating action item:', error);
        return server_1.NextResponse.json({
            success: false,
            error: 'Failed to update action item'
        }, { status: 500 });
    }
}
async function POST(request, { params }) {
    try {
        const body = await request.json();
        const { actionItemId } = params;
        const { action } = body;
        if (!actionItemId) {
            return server_1.NextResponse.json({
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
                return server_1.NextResponse.json({
                    success: false,
                    error: 'Unknown action'
                }, { status: 400 });
        }
    }
    catch (error) {
        console.error('[ACTION ITEMS API] Error processing action:', error);
        return server_1.NextResponse.json({
            success: false,
            error: 'Failed to process action'
        }, { status: 500 });
    }
}
async function handleVerifyCompletion(actionItemId) {
    try {
        console.log(`[ACTION ITEMS API] Verifying completion for: ${actionItemId}`);
        const isVerified = await ActionItemService_1.ActionItemService.verifyCompletion(actionItemId);
        return server_1.NextResponse.json({
            success: true,
            verified: isVerified,
            message: isVerified ? 'Action item verified as completed' : 'Action item needs additional work'
        });
    }
    catch (error) {
        console.error('[ACTION ITEMS API] Error verifying completion:', error);
        return server_1.NextResponse.json({
            success: false,
            error: 'Failed to verify completion'
        }, { status: 500 });
    }
}
async function handleMarkCompleted(actionItemId, body) {
    try {
        console.log(`[ACTION ITEMS API] Marking completed: ${actionItemId}`);
        const updates = {
            status: 'completed',
            fix_type: body.fixType,
            fix_details: body.fixDetails
        };
        const updatedActionItem = await ActionItemService_1.ActionItemService.updateActionItem(actionItemId, updates);
        if (!updatedActionItem) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Failed to mark action item as completed'
            }, { status: 500 });
        }
        return server_1.NextResponse.json({
            success: true,
            actionItem: updatedActionItem,
            message: 'Action item marked as completed'
        });
    }
    catch (error) {
        console.error('[ACTION ITEMS API] Error marking completed:', error);
        return server_1.NextResponse.json({
            success: false,
            error: 'Failed to mark as completed'
        }, { status: 500 });
    }
}
async function handleDismiss(actionItemId, reason) {
    try {
        console.log(`[ACTION ITEMS API] Dismissing: ${actionItemId}`);
        const updates = {
            status: 'dismissed',
            metadata: { dismissReason: reason }
        };
        const updatedActionItem = await ActionItemService_1.ActionItemService.updateActionItem(actionItemId, updates);
        if (!updatedActionItem) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Failed to dismiss action item'
            }, { status: 500 });
        }
        return server_1.NextResponse.json({
            success: true,
            actionItem: updatedActionItem,
            message: 'Action item dismissed'
        });
    }
    catch (error) {
        console.error('[ACTION ITEMS API] Error dismissing action item:', error);
        return server_1.NextResponse.json({
            success: false,
            error: 'Failed to dismiss action item'
        }, { status: 500 });
    }
}
