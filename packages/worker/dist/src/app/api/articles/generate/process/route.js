"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maxDuration = exports.dynamic = exports.runtime = void 0;
exports.POST = POST;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const enhanced_article_generator_1 = require("@/services/content/enhanced-article-generator");
exports.runtime = 'nodejs';
exports.dynamic = 'force-dynamic';
exports.maxDuration = 60;
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function POST(request) {
    try {
        const body = await request.json();
        const { userToken, articleId } = body || {};
        if (!userToken || !articleId) {
            return server_1.NextResponse.json({ success: false, error: 'userToken and articleId are required' }, { status: 400 });
        }
        // Fetch the queued article with website join
        const { data: article, error: fetchError } = await supabase
            .from('article_queue')
            .select(`
        *,
        websites:website_id (
          id,
          domain
        )
      `)
            .eq('id', articleId)
            .eq('user_token', userToken)
            .maybeSingle();
        if (fetchError || !article) {
            return server_1.NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
        }
        // Set status generating (only if currently pending or generation_failed)
        const { data: genLock, error: genErr } = await supabase
            .from('article_queue')
            .update({ status: 'generating', updated_at: new Date().toISOString() })
            .eq('id', articleId)
            .in('status', ['pending', 'generation_failed'])
            .select('id')
            .maybeSingle();
        // If no row was updated, another worker may be processing or it's already generated
        if (genErr) {
            console.error('[ARTICLES PROCESS] Status update error:', genErr);
        }
        else if (!genLock) {
            const { data: current } = await supabase
                .from('article_queue')
                .select('status')
                .eq('id', articleId)
                .maybeSingle();
            return server_1.NextResponse.json({ success: true, articleId, status: current?.status || 'unknown' });
        }
        // Log start
        await supabase.from('article_generation_logs').insert({
            article_queue_id: articleId,
            step: 'content_generation',
            status: 'started',
            input_data: {
                targetKeywords: article.target_keywords || [],
                tone: 'professional',
                contentLength: 'medium',
                articleType: 'blog',
                includeImages: false,
                includeCitations: false
            }
        });
        const generator = new enhanced_article_generator_1.EnhancedArticleGenerator();
        const req = {
            title: article.title,
            keywords: article.target_keywords || [],
            websiteDomain: article.websites?.domain,
            contentLength: 'medium',
            tone: 'professional',
            articleType: 'blog',
            includeCitations: false,
            referenceStyle: 'link',
            includeImages: false,
            numImages: 0,
            imageProvider: 'openai',
            imageStyle: 'clean, modern, web illustration, professional'
        };
        const start = Date.now();
        const result = await generator.generateComprehensiveArticle(req);
        const genSeconds = Math.round((Date.now() - start) / 1000);
        // Compute minimal metrics (reuse helpers via simple inline)
        const stripHtml = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const wordCount = stripHtml(result.content).split(/\s+/).filter(Boolean).length;
        // Update queue row
        const { error: updateError } = await supabase
            .from('article_queue')
            .update({
            article_content: result.content,
            meta_title: result.metaTitle,
            meta_description: result.metaDescription,
            content_outline: result.contentOutline,
            word_count: wordCount,
            generation_time_seconds: genSeconds,
            status: 'generated',
            updated_at: new Date().toISOString()
        })
            .eq('id', articleId);
        if (updateError) {
            return server_1.NextResponse.json({ success: false, error: 'Failed to update article' }, { status: 500 });
        }
        // Log completion
        await supabase.from('article_generation_logs').insert({
            article_queue_id: articleId,
            step: 'content_generation',
            status: 'completed',
            duration_seconds: genSeconds,
            output_data: {
                wordCount,
                hasMetaTitle: !!result.metaTitle,
                hasMetaDescription: !!result.metaDescription,
                hasContentOutline: !!result.contentOutline,
                imagesCount: 0
            }
        });
        return server_1.NextResponse.json({ success: true, articleId, status: 'generated' });
    }
    catch (error) {
        console.error('[ARTICLES PROCESS] Error:', error);
        return server_1.NextResponse.json({ success: false, error: error.message || 'Processing failed' }, { status: 500 });
    }
}
