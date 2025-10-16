import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { EnhancedArticleGenerator, EnhancedArticleRequest } from '@/services/content/enhanced-article-generator';
import { trackUsage } from '@/lib/usage-tracking';

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
          domain,
          website_token
        )
      `)
      .eq('id', articleId)
      .eq('user_token', userToken)
      .maybeSingle();

    if (fetchError || !article) {
      return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
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
    } else if (!genLock) {
      const { data: current } = await supabase
        .from('article_queue')
        .select('status')
        .eq('id', articleId)
        .maybeSingle();
      return NextResponse.json({ success: true, articleId, status: current?.status || 'unknown' });
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

    const generator = new EnhancedArticleGenerator();

    // Compute effective target keywords from cluster if missing
    let effectiveKeywords: string[] = Array.isArray(article.target_keywords) ? article.target_keywords : [];
    let matchedClusterName: string | null = null;
    if (!effectiveKeywords || effectiveKeywords.length === 0) {
      try {
        const websiteToken = (article as any)?.websites?.website_token;
        if (websiteToken) {
          const norm = (s: string) => String(s || '')
            .toLowerCase()
            .replace(/&/g, 'and')
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          const titleNorm = norm(article.title);
          const { data: kw } = await supabase
            .from('website_keywords')
            .select('keyword, topic_cluster')
            .eq('website_token', websiteToken);
          if (kw && kw.length > 0) {
            const clusters: Record<string, { name: string; keywords: string[] }> = {};
            for (const row of kw) {
              const cName = row.topic_cluster || 'uncategorized';
              const cNorm = norm(cName);
              clusters[cNorm] = clusters[cNorm] || { name: cName, keywords: [] };
              if (row.keyword) clusters[cNorm].keywords.push(row.keyword);
            }
            let match = clusters[titleNorm];
            if (!match) {
              const candidates = Object.keys(clusters).filter(c => titleNorm.includes(c) || c.includes(titleNorm));
              if (candidates.length > 0) match = clusters[candidates[0]];
            }
            if (!match) {
              const words = new Set(titleNorm.split(' ').filter(w => w.length > 3));
              let best = { key: '', score: 0 };
              for (const [key] of Object.entries(clusters)) {
                const kWords = key.split(' ');
                const score = kWords.reduce((acc, w) => acc + (words.has(w) ? 1 : 0), 0);
                if (score > best.score) best = { key, score };
              }
              if (best.score > 0) match = clusters[best.key];
            }
            if (match) {
              effectiveKeywords = Array.from(new Set(match.keywords.map((s: string) => s.toLowerCase()))).slice(0, 6);
              matchedClusterName = match.name;
              await supabase.from('article_queue').update({ target_keywords: effectiveKeywords }).eq('id', articleId);
              // Try to persist topic cluster if column exists (ignore errors if not)
              try { await supabase.from('article_queue').update({ topic_cluster: matchedClusterName }).eq('id', articleId); } catch {}
            }
          }
        }
      } catch {}
    }

    // Heuristic article type from title
    const titleLc = String(article.title || '').toLowerCase();
    const heuristicType = titleLc.startsWith('how to') || titleLc.includes('how to') ? 'how_to'
      : (titleLc.includes('faq') || titleLc.includes('questions')) ? 'faq'
      : (titleLc.includes(' vs ') || titleLc.includes('versus') || titleLc.includes('comparison')) ? 'comparison'
      : (/(^|\s)(top|best|\d{1,2})\b/.test(titleLc)) ? 'listicle'
      : 'blog';

    const req: EnhancedArticleRequest = {
      title: article.title,
      keywords: effectiveKeywords || [],
      websiteDomain: (article as any)?.websites?.domain,
      contentLength: 'medium',
      tone: 'professional',
      articleType: heuristicType as any,
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

    // Track usage for article generation
    try {
      const siteId = (article as any)?.websites?.id;
      await trackUsage(userToken, 'article', siteId);
      console.log(`[ARTICLES PROCESS] Usage tracked for article ${articleId}`);
    } catch (trackingError) {
      console.error('[ARTICLES PROCESS] Usage tracking failed:', trackingError);
      // Don't fail the request if tracking fails
    }

    // Trigger callback if conversationId exists in content_outline
    const websiteToken = (article as any)?.websites?.website_token;
    const conversationId = article.content_outline?.conversationId;

    if (conversationId && websiteToken) {
      console.log('[ARTICLE PROCESS] Triggering generation complete callback');

      // Fire-and-forget callback
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/agent/callback/article-generation-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken,
          websiteToken,
          conversationId,
          articleId,
          title: article.title,
          wordCount,
          status: 'generated'
        })
      }).catch(err => {
        console.error('[ARTICLE PROCESS] Callback failed (non-blocking):', err);
      });
    }

    // Track keyword mentions in the generated content
    if (websiteToken && effectiveKeywords.length > 0) {
      try {
        const contentLower = stripHtml(result.content).toLowerCase();
        const titleLower = (result.metaTitle || article.title || '').toLowerCase();

        for (const keyword of effectiveKeywords) {
          const keywordLower = keyword.toLowerCase();

          // Count mentions in content
          const contentMentions = (contentLower.match(new RegExp(keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;

          // Determine mention type (primary if in title, otherwise secondary)
          const mentionType = titleLower.includes(keywordLower) ? 'primary' : 'secondary';

          // Find locations (simplified - just check title, first paragraph, headings)
          const locations: string[] = [];
          if (titleLower.includes(keywordLower)) locations.push('title');
          if (result.metaTitle?.toLowerCase().includes(keywordLower)) locations.push('meta_title');
          if (result.metaDescription?.toLowerCase().includes(keywordLower)) locations.push('meta_description');
          if (contentMentions > 0) locations.push('body');

          // Only track if keyword was actually mentioned
          if (contentMentions > 0 || locations.length > 0) {
            await supabase.from('keyword_mentions').insert({
              article_queue_id: articleId,
              website_token: websiteToken,
              keyword: keyword,
              mention_count: contentMentions,
              mention_type: mentionType,
              locations: locations
            });
          }
        }

        console.log(`[KEYWORD TRACKING] Tracked ${effectiveKeywords.length} keywords for article ${articleId}`);

        // Calculate keyword coverage score
        const { data: mentions } = await supabase
          .from('keyword_mentions')
          .select('keyword, mention_count')
          .eq('article_queue_id', articleId);

        if (mentions && mentions.length > 0) {
          const totalKeywords = effectiveKeywords.length;
          const mentionedKeywords = mentions.filter(m => m.mention_count > 0).length;
          const coverageScore = totalKeywords > 0 ? (mentionedKeywords / totalKeywords) * 100 : 0;

          // Update article_queue with coverage score
          await supabase
            .from('article_queue')
            .update({ keyword_coverage_score: Math.round(coverageScore * 100) / 100 })
            .eq('id', articleId);

          console.log(`[KEYWORD TRACKING] Coverage score: ${coverageScore.toFixed(1)}% (${mentionedKeywords}/${totalKeywords} keywords)`);
        }
      } catch (trackError) {
        console.error('[KEYWORD TRACKING] Failed to track keyword mentions:', trackError);
        // Don't fail the whole request if keyword tracking fails
      }
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
        imagesCount: 0,
        keywordsTracked: effectiveKeywords.length
      }
    });

    return NextResponse.json({ success: true, articleId, status: 'generated' });
  } catch (error: any) {
    console.error('[ARTICLES PROCESS] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Processing failed' }, { status: 500 });
  }
}
