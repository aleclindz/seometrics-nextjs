"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        if (!userToken) {
            return server_1.NextResponse.json({ error: 'Missing userToken parameter' }, { status: 400 });
        }
        console.log('[WEBSITES API] Fetching websites for user:', userToken);
        // Get user's websites
        const { data: websites, error } = await supabase
            .from('websites')
            .select('id, domain, website_token, created_at, is_managed, is_excluded_from_sync, attribution_enabled')
            .eq('user_token', userToken)
            .order('created_at', { ascending: false });
        if (error) {
            console.error('[WEBSITES API] Database error:', error);
            return server_1.NextResponse.json({ error: 'Failed to fetch websites' }, { status: 500 });
        }
        console.log('[WEBSITES API] Found websites:', websites?.length || 0);
        return server_1.NextResponse.json({
            success: true,
            websites: websites || []
        });
    }
    catch (error) {
        console.error('[WEBSITES API] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
async function PUT(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        const body = await request.json();
        const { websiteId, is_managed, attribution_enabled } = body;
        if (!userToken || !websiteId) {
            return server_1.NextResponse.json({ error: 'Missing required parameters: userToken, websiteId' }, { status: 400 });
        }
        // Validate parameters if provided
        if (is_managed !== undefined && typeof is_managed !== 'boolean') {
            return server_1.NextResponse.json({ error: 'is_managed must be a boolean' }, { status: 400 });
        }
        if (attribution_enabled !== undefined && typeof attribution_enabled !== 'boolean') {
            return server_1.NextResponse.json({ error: 'attribution_enabled must be a boolean' }, { status: 400 });
        }
        console.log('[WEBSITES API] Updating website status:', { websiteId, is_managed, attribution_enabled });
        // Verify the website belongs to the user
        const { data: website, error: websiteError } = await supabase
            .from('websites')
            .select('id, domain')
            .eq('website_token', websiteId)
            .eq('user_token', userToken)
            .single();
        if (websiteError || !website) {
            return server_1.NextResponse.json({ error: 'Website not found or access denied' }, { status: 404 });
        }
        // If setting to managed, check plan limits
        if (is_managed === true) {
            // Get user's current plan and managed website count
            const { data: userPlan, error: planError } = await supabase
                .from('user_plans')
                .select('tier')
                .eq('user_token', userToken)
                .eq('status', 'active')
                .single();
            const currentPlan = userPlan?.tier || 'free';
            // Count currently managed websites
            const { count: managedCount } = await supabase
                .from('websites')
                .select('*', { count: 'exact' })
                .eq('user_token', userToken)
                .eq('is_managed', true)
                .neq('website_token', websiteId); // Exclude current website from count
            const planLimits = {
                free: 1, // Free plan: 1 managed website (with attribution)
                starter: 1, // Starter plan: 1 managed website
                pro: 5, // Pro plan: 5 managed websites
                enterprise: -1 // Enterprise: unlimited
            };
            const maxAllowed = planLimits[currentPlan] || 1;
            if (maxAllowed !== -1 && (managedCount || 0) >= maxAllowed) {
                let upgradeMessage = 'Contact support to increase your website limit';
                if (currentPlan === 'free') {
                    upgradeMessage = 'Upgrade to Starter plan ($29/month) to manage more websites and remove attribution';
                }
                else if (currentPlan === 'starter') {
                    upgradeMessage = 'Upgrade to Pro plan ($79/month) to manage up to 5 websites';
                }
                else if (currentPlan === 'pro') {
                    upgradeMessage = 'Upgrade to Enterprise plan for unlimited managed websites';
                }
                return server_1.NextResponse.json({
                    error: `You have reached your managed website limit (${maxAllowed} ${maxAllowed === 1 ? 'site' : 'sites'}). ${upgradeMessage}`,
                    currentPlan,
                    maxAllowed,
                    currentCount: managedCount
                }, { status: 403 });
            }
        }
        // Build update object dynamically based on provided fields
        const updateData = {};
        if (is_managed !== undefined) {
            updateData.is_managed = is_managed;
        }
        if (attribution_enabled !== undefined) {
            updateData.attribution_enabled = attribution_enabled;
        }
        if (Object.keys(updateData).length === 0) {
            return server_1.NextResponse.json({ error: 'No valid update fields provided' }, { status: 400 });
        }
        // Update the website
        const { error: updateError } = await supabase
            .from('websites')
            .update(updateData)
            .eq('website_token', websiteId)
            .eq('user_token', userToken);
        if (updateError) {
            console.error('[WEBSITES API] Update error:', updateError);
            return server_1.NextResponse.json({ error: 'Failed to update website status' }, { status: 500 });
        }
        console.log('[WEBSITES API] Updated website status successfully:', updateData);
        // Build response message
        let message = 'Website updated successfully';
        if (is_managed !== undefined) {
            message = `Website ${is_managed ? 'added to' : 'removed from'} managed websites`;
        }
        if (attribution_enabled !== undefined) {
            if (is_managed !== undefined) {
                message += ` and attribution ${attribution_enabled ? 'enabled' : 'disabled'}`;
            }
            else {
                message = `Website attribution ${attribution_enabled ? 'enabled' : 'disabled'}`;
            }
        }
        return server_1.NextResponse.json({
            success: true,
            message,
            website: {
                id: websiteId,
                domain: website.domain,
                ...updateData
            }
        });
    }
    catch (error) {
        console.error('[WEBSITES API] PUT Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        const websiteId = searchParams.get('websiteId');
        if (!userToken || !websiteId) {
            return server_1.NextResponse.json({ error: 'Missing required parameters: userToken, websiteId' }, { status: 400 });
        }
        console.log('[WEBSITES API] Hard deleting website:', websiteId);
        // Verify the website belongs to the user and get domain for exclusion list
        const { data: website, error: websiteError } = await supabase
            .from('websites')
            .select('id, domain')
            .eq('website_token', websiteId)
            .eq('user_token', userToken)
            .single();
        if (websiteError || !website) {
            return server_1.NextResponse.json({ error: 'Website not found or access denied' }, { status: 404 });
        }
        // Start a transaction-like operation
        // 1. Add domain to excluded_domains table to prevent GSC re-import
        const { error: excludeError } = await supabase
            .from('excluded_domains')
            .insert({
            user_token: userToken,
            domain: website.domain
        });
        // Don't fail if domain already exists in excluded list
        if (excludeError && !excludeError.code?.includes('23505')) { // 23505 is unique violation
            console.error('[WEBSITES API] Failed to add to excluded domains:', excludeError);
        }
        // 2. Delete related articles first (cascade delete)
        const { error: articlesDeleteError } = await supabase
            .from('articles')
            .delete()
            .eq('website_token', websiteId)
            .eq('user_token', userToken);
        if (articlesDeleteError) {
            console.error('[WEBSITES API] Failed to delete related articles:', articlesDeleteError);
            // Continue with website deletion even if articles deletion fails
        }
        // 3. Hard delete the website record
        const { error: deleteError } = await supabase
            .from('websites')
            .delete()
            .eq('website_token', websiteId)
            .eq('user_token', userToken);
        if (deleteError) {
            console.error('[WEBSITES API] Delete error:', deleteError);
            return server_1.NextResponse.json({ error: 'Failed to remove website' }, { status: 500 });
        }
        console.log('[WEBSITES API] Website hard deleted successfully');
        return server_1.NextResponse.json({
            success: true,
            message: `Website "${website.domain}" permanently removed from SEOAgent. It will not be re-imported from GSC.`,
            website: {
                id: websiteId,
                domain: website.domain
            }
        });
    }
    catch (error) {
        console.error('[WEBSITES API] DELETE Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
