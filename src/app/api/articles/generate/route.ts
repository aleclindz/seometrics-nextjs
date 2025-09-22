import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { EnhancedArticleGenerator, EnhancedArticleRequest } from '@/services/content/enhanced-article-generator';
import { ArticleType } from '@/services/content/article-templates-service';
import { ImageProvider } from '@/services/content/image-generation-service';

// Use Node.js runtime for longer timeout support (needed for OpenAI API calls)
export const runtime = 'nodejs';
// Request a longer max duration on Vercel if available (falls back to default if not supported)
export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userToken,
      articleId,
      targetKeywords = [],
      contentLength = 'medium', // short, medium, long
      tone = 'professional', // professional, casual, technical
      includeImages = true,

      // NEW: Enhanced generation options
      articleType = 'blog' as ArticleType, // how_to | listicle | guide | faq | comparison | evergreen | blog
      includeCitations = true,
      referenceStyle = 'link', // link | apa
      numImages = 2,
      imageProvider = 'openai' as ImageProvider, // openai | stability | unsplash
      imageStyle = 'clean, modern, web illustration, professional'
    } = body;

    if (!userToken || !articleId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userToken, articleId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[GENERATE EDGE] Starting enhanced generation for article:', articleId, `(${articleType})`);

    // Helper: small sleep
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

    // Get the article from queue with retry to avoid read-after-write lag
    const fetchArticle = async () => {
      const { data, error } = await supabase
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
      return { data, error };
    };

    let articleFetch;
    let attempts = 0;
    const maxAttempts = 10; // ~1s total wait
    do {
      // eslint-disable-next-line no-await-in-loop
      articleFetch = await fetchArticle();
      if (articleFetch.data) break;
      // eslint-disable-next-line no-await-in-loop
      await sleep(120);
      attempts++;
    } while (attempts < maxAttempts);

    const article = articleFetch.data;
    if (!article) {
      console.error('[GENERATE EDGE] Article fetch failed:', articleFetch.error);
      return new Response(
        JSON.stringify({ error: 'Article not found (retry exhausted)' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // CRITICAL: Check subscription and quota - NO FREE TIER
    try {
      const quotaCheck = await checkQuota(supabase, userToken, article.websites?.id);

      if (!quotaCheck.allowed) {
        console.log('[GENERATE EDGE] Article generation blocked:', quotaCheck.error, quotaCheck.message);

        await supabase
          .from('article_queue')
          .update({
            status: 'generation_failed',
            error_message: quotaCheck.message || 'Subscription required for article generation',
            updated_at: new Date().toISOString()
          })
          .eq('id', articleId);

        // Return appropriate HTTP status based on error type
        const statusCode = quotaCheck.error === 'NO_PLAN' || quotaCheck.error === 'INACTIVE_PLAN' ? 402 : 429;

        return new Response(JSON.stringify({
          error: quotaCheck.error || 'Quota exceeded',
          message: quotaCheck.message || 'Article generation not allowed',
          quota: quotaCheck,
          upgrade_required: quotaCheck.error === 'NO_PLAN' || quotaCheck.error === 'INACTIVE_PLAN',
          pricing_tiers: {
            starter: { price: '$19/month', articles: '12/month (3/week)', description: 'Perfect for small blogs' },
            pro: { price: '$39/month', articles: '30/month (1/day)', description: 'Ideal for growing businesses' },
            scale: { price: '$99/month', articles: '90/month (3/day)', description: 'For high-volume content needs' }
          }
        }), { status: statusCode, headers: { 'Content-Type': 'application/json' } });
      }

      console.log('[GENERATE EDGE] Quota check passed:', {
        tier: quotaCheck.tier,
        usage: `${quotaCheck.currentUsage}/${quotaCheck.limit}`,
        remaining: quotaCheck.remaining
      });

    } catch (quotaError) {
      console.error('[GENERATE EDGE] Quota check system error:', quotaError);

      await supabase
        .from('article_queue')
        .update({
          status: 'generation_failed',
          error_message: 'Unable to verify subscription. Please try again.',
          updated_at: new Date().toISOString()
        })
        .eq('id', articleId);

      return new Response(JSON.stringify({
        error: 'SYSTEM_ERROR',
        message: 'Unable to verify subscription. Please try again or contact support.',
        retry: true
      }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    }

    // Update status to generating
    await supabase
      .from('article_queue')
      .update({
        status: 'generating',
        updated_at: new Date().toISOString()
      })
      .eq('id', articleId);

    // Log generation start
    await supabase
      .from('article_generation_logs')
      .insert({
        article_queue_id: articleId,
        step: 'content_generation',
        status: 'started',
        input_data: {
          targetKeywords,
          contentLength,
          tone,
          includeImages,
          articleType,
          includeCitations,
          referenceStyle,
          numImages,
          imageProvider,
          imageStyle
        }
      });

    const generationStartTime = Date.now();

    try {
      // === NEW: Enhanced article generation ===
      const generator = new EnhancedArticleGenerator();
      
      const enhancedRequest: EnhancedArticleRequest = {
        title: article.title,
        keywords: targetKeywords,
        websiteDomain: article.websites?.domain,
        // websiteDescription intentionally omitted; column may not exist
        contentLength: contentLength as 'short' | 'medium' | 'long',
        tone: tone as 'professional' | 'casual' | 'technical',
        articleType,
        includeCitations,
        referenceStyle: referenceStyle as 'link' | 'apa',
        includeImages,
        numImages,
        imageProvider,
        imageStyle
      };

      const generationResult = await generator.generateComprehensiveArticle(enhancedRequest);

      // === Calculate metrics ===
      const wordCount = stripHtml(generationResult.content).split(/\s+/).filter(Boolean).length;
      const qualityScore = calculateQualityScore(generationResult.content, targetKeywords, {
        citationsCount: generationResult.citations?.length || 0,
        hasSchema: !!generationResult.schemaJson,
        hasFaq: (generationResult.schemaJson?.['@type'] === 'FAQPage') || 
                (generationResult.schemaJson?.mainEntity?.['@type'] === 'FAQPage'),
        imagesCount: generationResult.images?.length || 0
      });
      const readabilityScore = calculateReadabilityScore(stripHtml(generationResult.content));
      const seoScore = calculateSeoScore(generationResult.content, targetKeywords, article.title);

      const generationTime = Math.round((Date.now() - generationStartTime) / 1000);

      // === Persist core fields (existing columns) ===
      const { error: updateError } = await supabase
        .from('article_queue')
        .update({
          article_content: generationResult.content,
          meta_title: generationResult.metaTitle,
          meta_description: generationResult.metaDescription,
          content_outline: generationResult.contentOutline,
          word_count: wordCount,
          quality_score: qualityScore,
          readability_score: readabilityScore,
          seo_score: seoScore,
          generation_time_seconds: generationTime,
          status: 'generated',
          updated_at: new Date().toISOString()
        })
        .eq('id', articleId);

      if (updateError) {
        throw new Error(`Failed to update article: ${updateError.message}`);
      }

      // === Best-effort: persist new fields if the table has them ===
      try {
        await supabase
          .from('article_queue')
          .update({
            article_type: articleType,
            slug: generationResult.slug,
            citations: generationResult.citations || null,
            images: generationResult.images || null,
            schema_json: generationResult.schemaJson || null
          })
          .eq('id', articleId);
      } catch (extendedFieldsError) {
        console.log('[GENERATE EDGE] Skipping extended fields (missing columns):', extendedFieldsError);
      }

      // Log successful generation
      await supabase
        .from('article_generation_logs')
        .insert({
          article_queue_id: articleId,
          step: 'content_generation',
          status: 'completed',
          duration_seconds: generationTime,
          output_data: {
            wordCount,
            qualityScore,
            readabilityScore,
            seoScore,
            hasMetaTitle: !!generationResult.metaTitle,
            hasMetaDescription: !!generationResult.metaDescription,
            hasContentOutline: !!generationResult.contentOutline,
            metaTitleLength: generationResult.metaTitle?.length || 0,
            metaDescriptionLength: generationResult.metaDescription?.length || 0,
            citationsCount: generationResult.citations?.length || 0,
            imagesCount: generationResult.images?.length || 0,
            schemaType: generationResult.schemaJson?.['@type'] || 'Article',
            articleType
          }
        });

      // Track usage (optional)
      try {
        await trackUsage(supabase, userToken, 'article', article.websites?.id);
      } catch (trackingError) {
        console.log('[GENERATE EDGE] Usage tracking failed (likely missing tables):', trackingError);
      }

      console.log('[GENERATE EDGE] Enhanced article generated successfully:', articleId, {
        wordCount,
        citations: generationResult.citations?.length || 0,
        images: generationResult.images?.length || 0,
        qualityScore,
        seoScore
      });

      // Quota info for response (optional)
      let quotaInfo = null;
      try {
        quotaInfo = await checkQuota(supabase, userToken, article.websites?.id);
      } catch (quotaError) {
        console.log('[GENERATE EDGE] Quota check for response failed:', quotaError);
      }

      return new Response(JSON.stringify({
        success: true,
        article: {
          id: articleId,
          content: generationResult.content,
          meta_title: generationResult.metaTitle,
          meta_description: generationResult.metaDescription,
          content_outline: generationResult.contentOutline,
          citations: generationResult.citations || [],
          images: generationResult.images || [],
          schema_json: generationResult.schemaJson || null,
          article_type: generationResult.articleType,
          slug: generationResult.slug,
          word_count: wordCount,
          quality_score: qualityScore,
          readability_score: readabilityScore,
          seo_score: seoScore,
          generation_time: generationTime
        },
        ...(quotaInfo && { quota: quotaInfo })
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (generationError: any) {
      console.error('[GENERATE EDGE] Enhanced generation failed:', generationError?.stack || generationError);

      // Update status to generation_failed
      await supabase
        .from('article_queue')
        .update({
          status: 'generation_failed',
          error_message: generationError instanceof Error ? generationError.message : 'Generation failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', articleId);

      // Log failure
      await supabase
        .from('article_generation_logs')
        .insert({
          article_queue_id: articleId,
          step: 'content_generation',
          status: 'failed',
          duration_seconds: Math.round((Date.now() - generationStartTime) / 1000),
          error_details: generationError instanceof Error ? generationError.message : 'Unknown error'
        });

      return new Response(
        JSON.stringify({ error: 'Article generation failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('[GENERATE EDGE] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// === ENHANCED SCORING FUNCTIONS ===

function calculateQualityScore(
  content: string, 
  keywords: string[], 
  extras?: { 
    citationsCount?: number; 
    hasSchema?: boolean; 
    hasFaq?: boolean; 
    imagesCount?: number; 
  }
): number {
  let score = 7.0;

  const plainText = stripHtml(content);
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  
  // Word count scoring
  if (wordCount < 700) score -= 1.0;
  else if (wordCount > 1200) score += 0.5;
  if (wordCount > 2000) score += 0.5;

  // Keyword presence and density
  const contentLower = plainText.toLowerCase();
  keywords.forEach(keyword => {
    const keywordCount = (contentLower.match(new RegExp(keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    if (keywordCount > 0 && keywordCount < 12) score += 0.3;
  });

  // Structure scoring
  const h2Count = (content.match(/<h2/gi) || []).length;
  const h3Count = (content.match(/<h3/gi) || []).length;
  if (h2Count >= 3) score += 0.4;
  if (h3Count >= 3) score += 0.2;

  // Internal linking
  const internalLinks = (content.match(/\[internal link:/gi) || []).length;
  if (internalLinks >= 2) score += 0.2;

  // Image quality
  const imageCount = (content.match(/<img /gi) || []).length;
  const altCount = (content.match(/alt="/gi) || []).length;
  if (imageCount > 0 && altCount >= imageCount) score += 0.3;

  // Enhanced scoring factors
  if (extras?.citationsCount && extras.citationsCount >= 2) score += 0.6;
  if (extras?.hasSchema) score += 0.3;
  if (extras?.hasFaq) score += 0.2;
  if (extras?.imagesCount && extras.imagesCount >= 2) score += 0.2;

  return Math.min(10, Math.max(1, Number(score.toFixed(2))));
}

function calculateReadabilityScore(content: string): number {
  const sentences = content.split(/[.!?]+/).filter(Boolean).length || 1;
  const words = content.split(/\s+/).filter(Boolean).length || 1;
  const syllables = content.split(/[aeiouAEIOU]/).length; // rough approximation
  
  const avgWordsPerSentence = words / sentences;
  const avgSyllablesPerWord = syllables / words;
  
  const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
  return Math.min(100, Math.max(0, Math.round(score)));
}

function calculateSeoScore(content: string, keywords: string[], title: string): number {
  let score = 6.0;
  const contentLower = stripHtml(content).toLowerCase();
  const titleLower = title.toLowerCase();

  // Primary keyword in title
  if (keywords.length > 0 && titleLower.includes(keywords[0].toLowerCase())) {
    score += 1.0;
  }

  // Keyword density
  const wordCount = stripHtml(content).split(/\s+/).filter(Boolean).length || 1;
  keywords.forEach(keyword => {
    const keywordCount = (contentLower.match(new RegExp(keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    const density = (keywordCount / wordCount) * 100;
    if (density >= 0.3 && density <= 2.5) score += 0.4;
  });

  // Structure elements
  if ((content.match(/<h2/gi) || []).length >= 3) score += 0.3;
  if ((content.match(/<ul|<ol/gi) || []).length >= 2) score += 0.3;

  return Math.min(10, Math.max(1, Number(score.toFixed(2))));
}

// === EXISTING HELPER FUNCTIONS ===

async function checkQuota(supabase: any, userToken: string, siteId?: number) {
  try {
    const { data: userPlan, error: planError } = await supabase
      .from('user_plans')
      .select('*')
      .eq('user_token', userToken)
      .single();

    // CRITICAL: No free tier for article generation - must have paid plan
    if (planError || !userPlan) {
      return {
        allowed: false,
        currentUsage: 0,
        limit: 0,
        remaining: 0,
        tier: null,
        error: 'NO_PLAN',
        message: 'Article generation requires a paid plan. Please upgrade to Starter ($19/month), Pro ($39/month), or Scale ($99/month).'
      };
    }

    // Must have active subscription (not trial, cancelled, or past_due)
    if (userPlan.status !== 'active') {
      const statusMessages = {
        'trial': 'Your trial has ended. Please upgrade to continue generating articles.',
        'cancelled': 'Your subscription was cancelled. Please reactivate to continue generating articles.',
        'past_due': 'Your subscription payment is past due. Please update your payment method to continue.',
        'incomplete': 'Please complete your subscription setup to start generating articles.'
      };

      return {
        allowed: false,
        currentUsage: 0,
        limit: userPlan.posts_allowed || 0,
        remaining: 0,
        tier: userPlan.tier,
        error: 'INACTIVE_PLAN',
        message: statusMessages[userPlan.status] || 'Your subscription is inactive. Please contact support.'
      };
    }

    // Valid tiers: starter (12 articles), pro (30 articles), scale (90 articles)
    const validTiers = ['starter', 'pro', 'scale'];
    if (!validTiers.includes(userPlan.tier)) {
      return {
        allowed: false,
        currentUsage: 0,
        limit: 0,
        remaining: 0,
        tier: userPlan.tier,
        error: 'INVALID_TIER',
        message: 'Invalid subscription tier. Please contact support.'
      };
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('count')
      .eq('user_token', userToken)
      .eq('resource_type', 'article')
      .eq('month_year', currentMonth);

    const currentUsage = usage?.reduce((sum: number, item: any) => sum + item.count, 0) || 0;
    const limit = userPlan.posts_allowed;
    const allowed = limit === -1 || currentUsage < limit;
    const remaining = limit === -1 ? Infinity : Math.max(0, limit - currentUsage);

    return {
      allowed,
      currentUsage,
      limit,
      remaining,
      tier: userPlan.tier,
      error: allowed ? null : 'QUOTA_EXCEEDED',
      message: allowed ? null : `You have reached your monthly limit of ${limit} articles. Current usage: ${currentUsage}. Upgrade to a higher tier for more articles.`
    };
  } catch (error) {
    console.error('Error checking quota:', error);
    return {
      allowed: false,
      currentUsage: 0,
      limit: 0,
      remaining: 0,
      tier: null,
      error: 'SYSTEM_ERROR',
      message: 'Unable to verify subscription. Please try again or contact support.'
    };
  }
}

async function trackUsage(supabase: any, userToken: string, resourceType: string, siteId?: number) {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: existing } = await supabase
      .from('usage_tracking')
      .select('id, count')
      .eq('user_token', userToken)
      .eq('resource_type', resourceType)
      .eq('month_year', currentMonth)
      .maybeSingle();

    if (existing) {
      await supabase.from('usage_tracking').update({ count: existing.count + 1 }).eq('id', existing.id);
    } else {
      await supabase.from('usage_tracking').insert({
        user_token: userToken,
        site_id: siteId || null,
        resource_type: resourceType,
        month_year: currentMonth,
        count: 1
      });
    }
  } catch (error) {
    console.error('Error tracking usage:', error);
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
