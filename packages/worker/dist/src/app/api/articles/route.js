"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        if (!userToken) {
            return server_1.NextResponse.json({ error: 'User token is required' }, { status: 400 });
        }
        console.log('[ARTICLES API] Fetching articles for user:', userToken);
        // Get articles from article_queue table (the new article system)
        const { data: articles, error } = await supabase
            .from('article_queue')
            .select(`
        id,
        title,
        slug,
        status,
        created_at,
        updated_at,
        published_at,
        word_count,
        quality_score,
        seo_score,
        readability_score,
        target_keywords,
        website_id,
        websites:website_id (
          domain
        ),
        cms_connections:cms_connection_id (
          connection_name,
          cms_type
        )
      `)
            .eq('user_token', userToken)
            .order('created_at', { ascending: false });
        if (error) {
            console.error('[ARTICLES API] Database error:', error);
            return server_1.NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
        }
        console.log('[ARTICLES API] Found articles:', articles?.length || 0);
        return server_1.NextResponse.json({
            success: true,
            articles: articles || []
        });
    }
    catch (error) {
        console.error('[ARTICLES API] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
async function POST(request) {
    try {
        const body = await request.json();
        const { userToken, websiteId, cmsConnectionId, title, targetKeywords, contentOutline } = body;
        if (!userToken || !websiteId || !title) {
            return server_1.NextResponse.json({ error: 'Missing required fields: userToken, websiteId, title' }, { status: 400 });
        }
        console.log('[ARTICLES API] Creating new article:', { title, websiteId });
        // Create slug from title
        const slug = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        // Insert into article_queue
        const { data: article, error } = await supabase
            .from('article_queue')
            .insert({
            user_token: userToken,
            website_id: websiteId,
            cms_connection_id: cmsConnectionId,
            title,
            slug,
            target_keywords: targetKeywords || [],
            content_outline: contentOutline || {},
            status: 'pending'
        })
            .select()
            .single();
        if (error) {
            console.error('[ARTICLES API] Insert error:', error);
            return server_1.NextResponse.json({ error: 'Failed to create article' }, { status: 500 });
        }
        console.log('[ARTICLES API] Article created successfully:', article.id);
        return server_1.NextResponse.json({
            success: true,
            article
        });
    }
    catch (error) {
        console.error('[ARTICLES API] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
