"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const ActionItemService_1 = require("@/lib/ActionItemService");
const supabase_js_1 = require("@supabase/supabase-js");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function POST(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        const siteUrl = searchParams.get('siteUrl');
        const force = searchParams.get('force') === 'true';
        console.log('[ACTION ITEMS VERIFY] Starting verification process');
        let whereClause = supabase
            .from('seo_action_items')
            .select('*')
            .eq('status', 'completed')
            .in('verification_status', ['pending', 'needs_recheck']);
        if (userToken && siteUrl) {
            whereClause = whereClause
                .eq('user_token', userToken)
                .eq('site_url', siteUrl);
        }
        if (!force) {
            // Only check items that are due for verification
            whereClause = whereClause.lte('next_check_at', new Date().toISOString());
        }
        const { data: pendingItems, error } = await whereClause;
        if (error) {
            console.error('[ACTION ITEMS VERIFY] Error fetching pending items:', error);
            return server_1.NextResponse.json({
                success: false,
                error: 'Failed to fetch pending verification items'
            }, { status: 500 });
        }
        if (!pendingItems || pendingItems.length === 0) {
            return server_1.NextResponse.json({
                success: true,
                message: 'No items pending verification',
                verified: 0,
                failed: 0
            });
        }
        console.log(`[ACTION ITEMS VERIFY] Found ${pendingItems.length} items to verify`);
        const results = {
            verified: 0,
            failed: 0,
            errors: []
        };
        // Process each item
        for (const item of pendingItems) {
            try {
                console.log(`[ACTION ITEMS VERIFY] Verifying item: ${item.title}`);
                const isVerified = await ActionItemService_1.ActionItemService.verifyCompletion(item.id);
                if (isVerified) {
                    results.verified++;
                    console.log(`[ACTION ITEMS VERIFY] ✅ Verified: ${item.title}`);
                }
                else {
                    results.failed++;
                    console.log(`[ACTION ITEMS VERIFY] ❌ Failed verification: ${item.title}`);
                }
                // Add a small delay to avoid overwhelming APIs
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            catch (itemError) {
                results.errors.push(`Failed to verify "${item.title}": ${itemError.message}`);
                console.error(`[ACTION ITEMS VERIFY] Error verifying item ${item.id}:`, itemError);
            }
        }
        return server_1.NextResponse.json({
            success: true,
            totalChecked: pendingItems.length,
            verified: results.verified,
            failed: results.failed,
            errors: results.errors,
            message: `Verification complete: ${results.verified} verified, ${results.failed} failed`
        });
    }
    catch (error) {
        console.error('[ACTION ITEMS VERIFY] Error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: 'Failed to run verification process'
        }, { status: 500 });
    }
}
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        const siteUrl = searchParams.get('siteUrl');
        console.log('[ACTION ITEMS VERIFY] Getting verification status');
        // Get items pending verification
        let query = supabase
            .from('seo_action_items')
            .select('id, title, status, verification_status, next_check_at, verification_attempts, completed_at')
            .eq('status', 'completed');
        if (userToken && siteUrl) {
            query = query
                .eq('user_token', userToken)
                .eq('site_url', siteUrl);
        }
        const { data: pendingItems, error } = await query
            .order('next_check_at', { ascending: true });
        if (error) {
            console.error('[ACTION ITEMS VERIFY] Error fetching verification status:', error);
            return server_1.NextResponse.json({
                success: false,
                error: 'Failed to fetch verification status'
            }, { status: 500 });
        }
        const now = new Date();
        const dueForCheck = pendingItems?.filter(item => item.next_check_at && new Date(item.next_check_at) <= now) || [];
        const pendingVerification = pendingItems?.filter(item => item.verification_status === 'pending') || [];
        const needsRecheck = pendingItems?.filter(item => item.verification_status === 'needs_recheck') || [];
        return server_1.NextResponse.json({
            success: true,
            summary: {
                totalPending: pendingItems?.length || 0,
                dueForCheck: dueForCheck.length,
                pendingVerification: pendingVerification.length,
                needsRecheck: needsRecheck.length
            },
            items: {
                dueForCheck,
                pendingVerification,
                needsRecheck
            }
        });
    }
    catch (error) {
        console.error('[ACTION ITEMS VERIFY] Error getting status:', error);
        return server_1.NextResponse.json({
            success: false,
            error: 'Failed to get verification status'
        }, { status: 500 });
    }
}
