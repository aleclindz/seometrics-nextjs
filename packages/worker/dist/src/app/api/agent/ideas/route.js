"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
exports.POST = POST;
exports.PUT = PUT;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
exports.dynamic = 'force-dynamic';
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
// GET /api/agent/ideas - List ideas with optional filtering
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        const siteUrl = searchParams.get('siteUrl');
        const ideaId = searchParams.get('ideaId');
        const status = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '50');
        if (!userToken) {
            return server_1.NextResponse.json({ error: 'User token required' }, { status: 401 });
        }
        let query = supabase
            .from('agent_ideas')
            .select('*')
            .eq('user_token', userToken)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (siteUrl)
            query = query.eq('site_url', siteUrl);
        if (ideaId)
            query = query.eq('id', ideaId);
        if (status)
            query = query.eq('status', status);
        const { data: ideas, error } = await query;
        if (error) {
            console.error('[AGENT IDEAS] Query error:', error);
            return server_1.NextResponse.json({ error: 'Failed to fetch ideas' }, { status: 500 });
        }
        return server_1.NextResponse.json({ success: true, ideas });
    }
    catch (error) {
        console.error('[AGENT IDEAS] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
// POST /api/agent/ideas - Create a new idea
async function POST(request) {
    try {
        const body = await request.json();
        const { userToken, siteUrl, title, hypothesis, evidence, iceScore, tags } = body;
        if (!userToken || !siteUrl || !title) {
            return server_1.NextResponse.json({ error: 'Missing required fields: userToken, siteUrl, title' }, { status: 400 });
        }
        const { data: idea, error } = await supabase
            .from('agent_ideas')
            .insert({
            user_token: userToken,
            site_url: siteUrl,
            title,
            hypothesis: hypothesis || null,
            evidence: evidence || {},
            ice_score: iceScore || null,
            tags: tags || [],
            status: 'open'
        })
            .select()
            .single();
        if (error) {
            console.error('[AGENT IDEAS] Insert error:', error);
            return server_1.NextResponse.json({ error: 'Failed to create idea' }, { status: 500 });
        }
        // Log the event (trigger will handle this automatically)
        console.log(`[AGENT IDEAS] Created idea ${idea.id}: ${title}`);
        return server_1.NextResponse.json({
            success: true,
            idea,
            message: `Idea "${title}" created and added to backlog`
        });
    }
    catch (error) {
        console.error('[AGENT IDEAS] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
// PUT /api/agent/ideas - Update idea status or details
async function PUT(request) {
    try {
        const body = await request.json();
        const { ideaId, userToken, status, updates } = body;
        if (!ideaId || !userToken) {
            return server_1.NextResponse.json({ error: 'Missing required fields: ideaId, userToken' }, { status: 400 });
        }
        // Verify ownership
        const { data: existingIdea, error: fetchError } = await supabase
            .from('agent_ideas')
            .select('*')
            .eq('id', ideaId)
            .eq('user_token', userToken)
            .single();
        if (fetchError || !existingIdea) {
            return server_1.NextResponse.json({ error: 'Idea not found' }, { status: 404 });
        }
        // Prepare update data
        const updateData = { updated_at: new Date().toISOString() };
        if (status) {
            updateData.status = status;
            // Set timestamp fields based on status
            if (status === 'adopted')
                updateData.adopted_at = new Date().toISOString();
            if (status === 'done')
                updateData.completed_at = new Date().toISOString();
            if (status === 'rejected')
                updateData.rejected_at = new Date().toISOString();
        }
        // Add any additional updates
        if (updates) {
            Object.assign(updateData, updates);
        }
        const { data: updatedIdea, error: updateError } = await supabase
            .from('agent_ideas')
            .update(updateData)
            .eq('id', ideaId)
            .eq('user_token', userToken)
            .select()
            .single();
        if (updateError) {
            console.error('[AGENT IDEAS] Update error:', updateError);
            return server_1.NextResponse.json({ error: 'Failed to update idea' }, { status: 500 });
        }
        return server_1.NextResponse.json({
            success: true,
            idea: updatedIdea,
            message: `Idea updated successfully`
        });
    }
    catch (error) {
        console.error('[AGENT IDEAS] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
