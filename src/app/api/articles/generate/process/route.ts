import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { EnhancedArticleGenerator, EnhancedArticleRequest } from '@/services/content/enhanced-article-generator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userToken, articleId } = body || {};
    if (!userToken || !articleId) {
      return NextResponse.json({ success: false, error: 'userToken and articleId are required' }, { status: 400 });
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
      return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
    }

    // Set status generating
    await supabase.from('article_queue').update({ status: 'generating', updated_at: new Date().toISOString() }).eq('id', articleId);

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

    const generator = new EnhancedArticleGenerator();
    const req: EnhancedArticleRequest = {
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
    const stripHtml = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
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
      return NextResponse.json({ success: false, error: 'Failed to update article' }, { status: 500 });
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

    return NextResponse.json({ success: true, articleId, status: 'generated' });
  } catch (error: any) {
    console.error('[ARTICLES PROCESS] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Processing failed' }, { status: 500 });
  }
}

