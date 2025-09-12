"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const ActionItemService_1 = require("@/lib/ActionItemService");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        const siteUrl = searchParams.get('siteUrl');
        const status = searchParams.get('status');
        const category = searchParams.get('category');
        const severity = searchParams.get('severity');
        const limit = searchParams.get('limit');
        if (!userToken || !siteUrl) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Missing userToken or siteUrl'
            }, { status: 400 });
        }
        console.log(`[ACTION ITEMS API] Fetching action items for ${siteUrl}`);
        // Parse filters
        const statusFilter = status ? status.split(',') : undefined;
        const limitNumber = limit ? parseInt(limit) : undefined;
        const actionItems = await ActionItemService_1.ActionItemService.getActionItems(userToken, siteUrl, {
            status: statusFilter,
            category: category,
            severity: severity,
            limit: limitNumber
        });
        return server_1.NextResponse.json({
            success: true,
            actionItems,
            count: actionItems.length
        });
    }
    catch (error) {
        console.error('[ACTION ITEMS API] Error fetching action items:', error);
        return server_1.NextResponse.json({
            success: false,
            error: 'Failed to fetch action items'
        }, { status: 500 });
    }
}
async function POST(request) {
    try {
        const body = await request.json();
        const { userToken, siteUrl, action } = body;
        if (!userToken || !siteUrl) {
            return server_1.NextResponse.json({
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
                return server_1.NextResponse.json({
                    success: false,
                    error: 'Unknown action'
                }, { status: 400 });
        }
    }
    catch (error) {
        console.error('[ACTION ITEMS API] Error processing request:', error);
        return server_1.NextResponse.json({
            success: false,
            error: 'Failed to process request'
        }, { status: 500 });
    }
}
async function handleDetectIssues(userToken, siteUrl) {
    try {
        console.log(`[ACTION ITEMS API] Detecting issues for ${siteUrl}`);
        // Detect all issues
        const detectedIssues = await ActionItemService_1.ActionItemService.detectIssues(userToken, siteUrl);
        // Create action items for each detected issue
        const createdActionItems = [];
        for (const issue of detectedIssues) {
            const actionItem = await ActionItemService_1.ActionItemService.createActionItem(userToken, siteUrl, issue);
            if (actionItem) {
                createdActionItems.push(actionItem);
            }
        }
        return server_1.NextResponse.json({
            success: true,
            detectedIssues: detectedIssues.length,
            createdActionItems: createdActionItems.length,
            actionItems: createdActionItems,
            message: `Detected ${detectedIssues.length} issues, created ${createdActionItems.length} action items`
        });
    }
    catch (error) {
        console.error('[ACTION ITEMS API] Error detecting issues:', error);
        return server_1.NextResponse.json({
            success: false,
            error: 'Failed to detect issues'
        }, { status: 500 });
    }
}
async function handleCreateActionItem(userToken, siteUrl, issue) {
    try {
        if (!issue) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Issue details are required'
            }, { status: 400 });
        }
        console.log(`[ACTION ITEMS API] Creating action item: ${issue.title}`);
        const actionItem = await ActionItemService_1.ActionItemService.createActionItem(userToken, siteUrl, issue);
        if (!actionItem) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Failed to create action item'
            }, { status: 500 });
        }
        return server_1.NextResponse.json({
            success: true,
            actionItem,
            message: 'Action item created successfully'
        });
    }
    catch (error) {
        console.error('[ACTION ITEMS API] Error creating action item:', error);
        return server_1.NextResponse.json({
            success: false,
            error: 'Failed to create action item'
        }, { status: 500 });
    }
}
