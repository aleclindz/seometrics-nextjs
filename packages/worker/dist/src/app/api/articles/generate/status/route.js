"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
exports.dynamic = 'force-dynamic';
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const articleId = Number(searchParams.get('articleId'));
        if (!articleId) {
            return server_1.NextResponse.json({ success: false, error: 'articleId required' }, { status: 400 });
        }
        const { data: article, error } = await supabase
            .from('article_queue')
            .select('id, title, status, updated_at, word_count, meta_title, meta_description')
            .eq('id', articleId)
            .maybeSingle();
        if (error || !article) {
            return server_1.NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
        }
        return server_1.NextResponse.json({ success: true, article });
    }
    catch (error) {
        console.error('[ARTICLES STATUS] Unexpected error:', error);
        return server_1.NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
