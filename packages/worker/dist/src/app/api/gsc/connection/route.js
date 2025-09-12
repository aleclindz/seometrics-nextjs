"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function GET(request) {
    try {
        console.log('[GSC CONNECTION] Checking connection status');
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        if (!userToken) {
            console.log('[GSC CONNECTION] No user token provided');
            return server_1.NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        // Get GSC connection
        console.log('[GSC CONNECTION] Looking for connection with userToken:', userToken);
        const { data: connection, error: connectionError } = await supabase
            .from('gsc_connections')
            .select('*')
            .eq('user_token', userToken)
            .eq('is_active', true)
            .single();
        if (connectionError || !connection) {
            console.log('[GSC CONNECTION] No active connection found. Error:', connectionError);
            console.log('[GSC CONNECTION] Checking all connections for this user...');
            // Check if any connection exists for this user (for debugging)
            const { data: allConnections, error: allError } = await supabase
                .from('gsc_connections')
                .select('*')
                .eq('user_token', userToken);
            console.log('[GSC CONNECTION] All connections for user:', allConnections, 'Error:', allError);
            // Update websites table gsc_status to 'none' when no connection
            await updateWebsiteGSCStatus(userToken, false);
            return server_1.NextResponse.json({
                connected: false,
                message: 'No Google Search Console connection found',
                debug: {
                    userToken,
                    connectionError: connectionError?.message,
                    totalConnections: allConnections?.length || 0
                }
            });
        }
        // Check if token is expired
        const now = new Date();
        const expiresAt = new Date(connection.expires_at);
        const isExpired = now >= expiresAt;
        // Get properties count
        const { count: propertiesCount } = await supabase
            .from('gsc_properties')
            .select('*', { count: 'exact', head: true })
            .eq('connection_id', connection.id)
            .eq('is_active', true);
        console.log('[GSC CONNECTION] Connection found for user token:', userToken);
        // Update websites table gsc_status to match connection status
        await updateWebsiteGSCStatus(userToken, !isExpired);
        return server_1.NextResponse.json({
            connected: true,
            connection: {
                id: connection.id,
                email: connection.email,
                connected_at: connection.created_at,
                last_sync_at: connection.last_sync_at,
                expires_at: connection.expires_at,
                is_expired: isExpired,
                properties_count: propertiesCount || 0,
                sync_errors: connection.sync_errors || []
            }
        });
    }
    catch (error) {
        console.error('[GSC CONNECTION] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Failed to check connection status' }, { status: 500 });
    }
}
async function DELETE(request) {
    try {
        console.log('[GSC CONNECTION] Disconnecting GSC');
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        if (!userToken) {
            console.log('[GSC CONNECTION] No user token provided');
            return server_1.NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        // Deactivate connection instead of deleting (to preserve data)
        const { error } = await supabase
            .from('gsc_connections')
            .update({ is_active: false })
            .eq('user_token', userToken);
        if (error) {
            console.error('[GSC CONNECTION] Error disconnecting:', error);
            return server_1.NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
        }
        // Also deactivate all properties
        await supabase
            .from('gsc_properties')
            .update({ is_active: false })
            .eq('user_token', userToken);
        console.log('[GSC CONNECTION] Successfully disconnected for user token:', userToken);
        return server_1.NextResponse.json({
            success: true,
            message: 'Google Search Console disconnected successfully'
        });
    }
    catch (error) {
        console.error('[GSC CONNECTION] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
    }
}
async function updateWebsiteGSCStatus(userToken, isConnected) {
    try {
        console.log('[GSC CONNECTION] Updating websites table gsc_status to:', isConnected ? 'connected' : 'none');
        await supabase
            .from('websites')
            .update({
            gsc_status: isConnected ? 'connected' : 'none',
            last_status_check: new Date().toISOString()
        })
            .eq('user_token', userToken);
        console.log('[GSC CONNECTION] Websites table gsc_status updated successfully');
    }
    catch (dbError) {
        console.error('[GSC CONNECTION] Failed to update websites table gsc_status:', dbError);
        // Don't throw - this is a secondary update
    }
}
