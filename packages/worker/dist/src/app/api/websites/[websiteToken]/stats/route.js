"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function GET(request, { params }) {
    try {
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        const { websiteToken } = params;
        if (!userToken) {
            return server_1.NextResponse.json({ error: 'User token required' }, { status: 401 });
        }
        if (!websiteToken) {
            return server_1.NextResponse.json({ error: 'Website token required' }, { status: 400 });
        }
        // Verify user owns this website
        const { data: website, error: websiteError } = await supabase
            .from('websites')
            .select('id, domain, website_token')
            .eq('website_token', websiteToken)
            .eq('user_token', userToken)
            .single();
        if (websiteError || !website) {
            return server_1.NextResponse.json({ error: 'Website not found or access denied' }, { status: 404 });
        }
        // Get meta tags count
        const { count: metaTagsCount, error: metaError } = await supabase
            .from('meta_tags')
            .select('*', { count: 'exact', head: true })
            .eq('website_token', websiteToken);
        // Get alt tags count  
        const { count: altTagsCount, error: altError } = await supabase
            .from('alt_tags')
            .select('*', { count: 'exact', head: true })
            .eq('website_token', websiteToken);
        if (metaError) {
            console.error('Error fetching meta tags count:', metaError);
        }
        if (altError) {
            console.error('Error fetching alt tags count:', altError);
        }
        return server_1.NextResponse.json({
            success: true,
            stats: {
                metaTagsCount: metaTagsCount || 0,
                altTagsCount: altTagsCount || 0,
                domain: website.domain
            }
        });
    }
    catch (error) {
        console.error('[WEBSITE STATS] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
