import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Edge Runtime configuration
export const runtime = 'edge';

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
      includeImages = true
    } = body;

    if (!userToken || !articleId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userToken, articleId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[GENERATE EDGE] Starting generation for article:', articleId);

    // Get the article from queue
    const { data: article, error: fetchError } = await supabase
      .from('article_queue')
      .select(`
        *,
        websites:website_id (
          domain
        )
      `)
      .eq('id', articleId)
      .eq('user_token', userToken)
      .single();

    if (fetchError || !article) {
      return new Response(
        JSON.stringify({ error: 'Article not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check quota before starting generation (skip if tables don't exist in development)
    try {
      const quotaCheck = await checkQuota(supabase, userToken, article.websites?.id);
      if (!quotaCheck.allowed && quotaCheck.limit > 0) {
        await supabase
          .from('article_queue')
          .update({
            status: 'failed',
            error_message: `Quota exceeded: You have reached your monthly limit of ${quotaCheck.limit} articles. Current usage: ${quotaCheck.currentUsage}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', articleId);

        return new Response(JSON.stringify({
          error: 'Quota exceeded',
          message: `You have reached your monthly limit of ${quotaCheck.limit} articles. Current usage: ${quotaCheck.currentUsage}`,
          quota: quotaCheck
        }), { status: 429, headers: { 'Content-Type': 'application/json' } });
      }
    } catch (quotaError) {
      console.log('[GENERATE EDGE] Quota check failed (likely missing tables), continuing without quota check:', quotaError);
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
          includeImages
        }
      });

    const generationStartTime = Date.now();

    try {
      // Generate comprehensive article content with all SEO metadata
      const generationResult = await generateComprehensiveArticle({
        title: article.title,
        keywords: targetKeywords,
        websiteDomain: article.websites?.domain,
        websiteDescription: undefined,
        contentLength,
        tone
      });

      // Calculate metrics
      const wordCount = generationResult.content.split(/\s+/).length;
      const qualityScore = calculateQualityScore(generationResult.content, targetKeywords);
      const readabilityScore = calculateReadabilityScore(generationResult.content);
      const seoScore = calculateSeoScore(generationResult.content, targetKeywords, article.title);

      const generationTime = Math.round((Date.now() - generationStartTime) / 1000);

      // Update article with generated content and SEO metadata
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
            metaDescriptionLength: generationResult.metaDescription?.length || 0
          }
        });

      // Track usage after successful generation (optional if tables don't exist)
      try {
        await trackUsage(supabase, userToken, 'article', article.websites?.id);
      } catch (trackingError) {
        console.log('[GENERATE EDGE] Usage tracking failed (likely missing tables):', trackingError);
      }

      console.log('[GENERATE EDGE] Article generated successfully:', articleId);

      // Get quota info for response (optional)
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
          word_count: wordCount,
          quality_score: qualityScore,
          readability_score: readabilityScore,
          seo_score: seoScore,
          generation_time: generationTime
        },
        ...(quotaInfo && { quota: quotaInfo })
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (generationError) {
      console.error('[GENERATE EDGE] Generation failed:', generationError);

      // Update status to failed
      await supabase
        .from('article_queue')
        .update({
          status: 'failed',
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

// Real OpenAI GPT-4 content generation
async function generateComprehensiveArticle({
  title,
  keywords,
  websiteDomain,
  websiteDescription,
  contentLength,
  tone
}: {
  title: string;
  keywords: string[];
  websiteDomain?: string;
  websiteDescription?: string;
  contentLength: string;
  tone: string;
}) {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  console.log('[GENERATE EDGE] Generating comprehensive article with SEO metadata for:', title);

  // Single comprehensive prompt to generate all required content and metadata
  let stylePrompt = '';
  switch (tone) {
    case 'casual':
      stylePrompt = 'Use a conversational, friendly tone with personal examples and relatable language.';
      break;
    case 'technical':
      stylePrompt = 'Use precise, technical language with detailed explanations and industry-specific terminology.';
      break;
    case 'professional':
    default:
      stylePrompt = 'Use a professional, authoritative tone that builds trust and demonstrates expertise.';
  }

  const wordTarget = contentLength === 'short' ? 800 : contentLength === 'long' ? 2000 : 1200;
  
  const comprehensivePrompt = `Create a complete SEO article package for: "${title}"

  TARGET KEYWORDS: ${keywords.join(', ')}
  WEBSITE: ${websiteDomain || 'general business'}
  TONE: ${stylePrompt}
  WORD COUNT: Approximately ${wordTarget} words

  RESPOND WITH THIS EXACT JSON FORMAT:
  {
    "metaTitle": "SEO-optimized title (50-60 characters, include primary keyword)",
    "metaDescription": "Compelling meta description (150-160 characters, include primary keyword and call-to-action)",
    "contentOutline": {
      "introduction": "Brief intro summary",
      "mainSections": ["Section 1 title", "Section 2 title", "Section 3 title", "etc"],
      "conclusion": "Brief conclusion summary",
      "faq": ["FAQ question 1", "FAQ question 2", "etc"]
    },
    "content": "FULL ARTICLE CONTENT HERE"
  }

  ARTICLE CONTENT REQUIREMENTS:
  1. KEY TAKEAWAYS (5-7 bullet points with <ul><li> tags)
  2. INTRODUCTION (engaging hook with primary keyword)
  3. MAIN CONTENT (6-8 sections with <h2> headings, include target keywords naturally)
  4. FAQ SECTION (5 questions with <h3> and detailed <p> answers)
  5. CONCLUSION (compelling call-to-action)

  CONTENT SPECIFICATIONS:
  - ${stylePrompt}
  - Include target keywords naturally (1-2% density)
  - Use HTML formatting: <h2> for main sections, <h3> for subsections, <strong> for emphasis
  - Include bullet points with <ul><li> tags where helpful
  - Write 2-3 detailed paragraphs for each main section
  - Include actionable insights and practical examples
  - End with compelling conclusion mentioning ${websiteDomain || 'the topic'}
  - FAQ questions should address common user concerns with long-tail keywords
  - Key takeaways should be specific and actionable

  META TITLE REQUIREMENTS:
  - 50-60 characters total
  - Include primary keyword: "${keywords[0]}"
  - Compelling and click-worthy
  - Different from main article title

  META DESCRIPTION REQUIREMENTS:
  - 150-160 characters total
  - Include primary keyword: "${keywords[0]}"
  - Include a call-to-action
  - Summarize the article's value proposition

  CONTENT OUTLINE REQUIREMENTS:
  - Extract main section headings from the article
  - Include 5 FAQ questions that will be answered
  - Brief summaries for intro and conclusion

  Return ONLY the JSON response, no additional text.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert SEO content writer and strategist. You create comprehensive article packages with optimized metadata. Always respond with valid JSON in the exact format requested.' 
        },
        { role: 'user', content: comprehensivePrompt }
      ],
      temperature: 0.1,
      max_tokens: 4500
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const aiResponse = data.choices[0].message.content || '';
  
  try {
    // Parse the JSON response
    const parsedResult = JSON.parse(aiResponse);
    
    return {
      content: parsedResult.content,
      metaTitle: parsedResult.metaTitle,
      metaDescription: parsedResult.metaDescription,
      contentOutline: parsedResult.contentOutline
    };
  } catch (parseError) {
    console.error('[GENERATE EDGE] Failed to parse AI response as JSON:', parseError);
    console.error('[GENERATE EDGE] AI Response:', aiResponse);
    
    // Fallback: Extract content and generate basic metadata
    const content = aiResponse;
    const metaTitle = title.length <= 60 ? title : title.substring(0, 57) + '...';
    const metaDescription = `Learn about ${keywords[0]} in this comprehensive guide. Discover actionable insights and best practices.`;
    const contentOutline = {
      introduction: "Introduction to the topic",
      mainSections: ["Main Content Section 1", "Main Content Section 2", "Main Content Section 3"],
      conclusion: "Conclusion and next steps",
      faq: ["Common question 1", "Common question 2", "Common question 3"]
    };
    
    return {
      content,
      metaTitle,
      metaDescription,
      contentOutline
    };
  }
}

// Simple quality scoring algorithm
function calculateQualityScore(content: string, keywords: string[]): number {
  let score = 7.0; // Base score
  
  const wordCount = content.split(/\s+/).length;
  if (wordCount < 300) score -= 2.0;
  else if (wordCount > 2000) score += 1.0;
  
  // Check keyword usage
  const contentLower = content.toLowerCase();
  keywords.forEach(keyword => {
    const keywordCount = (contentLower.match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
    if (keywordCount > 0 && keywordCount < 10) score += 0.5;
  });
  
  // Check for headings
  const headingCount = (content.match(/^#{1,6}\s/gm) || []).length;
  if (headingCount >= 3) score += 0.5;
  
  return Math.min(10, Math.max(1, score));
}

function calculateReadabilityScore(content: string): number {
  // Simple readability score (Flesch Reading Ease approximation)
  const sentences = content.split(/[.!?]+/).length;
  const words = content.split(/\s+/).length;
  const syllables = content.split(/[aeiouAEIOU]/).length;
  
  if (sentences === 0 || words === 0) return 50;
  
  const avgWordsPerSentence = words / sentences;
  const avgSyllablesPerWord = syllables / words;
  
  const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
  return Math.min(100, Math.max(0, Math.round(score)));
}

function calculateSeoScore(content: string, keywords: string[], title: string): number {
  let score = 6.0; // Base score
  
  const contentLower = content.toLowerCase();
  const titleLower = title.toLowerCase();
  
  // Check if primary keyword is in title
  if (keywords.length > 0 && titleLower.includes(keywords[0].toLowerCase())) {
    score += 1.0;
  }
  
  // Check keyword density
  keywords.forEach(keyword => {
    const keywordCount = (contentLower.match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
    const wordCount = content.split(/\s+/).length;
    const density = (keywordCount / wordCount) * 100;
    
    if (density >= 0.5 && density <= 3.0) score += 0.5;
  });
  
  // Check for meta elements (headings, lists)
  if (content.includes('##')) score += 0.5;
  if (content.includes('- **') || content.includes('1. **')) score += 0.5;
  
  return Math.min(10, Math.max(1, score));
}

// Helper function to check quota
async function checkQuota(supabase: any, userToken: string, siteId?: number) {
  try {
    // Get user plan
    const { data: userPlan, error: planError } = await supabase
      .from('user_plans')
      .select('*')
      .eq('user_token', userToken)
      .single();

    if (planError || !userPlan) {
      return { allowed: false, currentUsage: 0, limit: 0, remaining: 0, tier: 'starter' };
    }

    // Check if subscription is active
    if (userPlan.status !== 'active') {
      return { allowed: false, currentUsage: 0, limit: 0, remaining: 0, tier: userPlan.tier };
    }

    // Get current usage for this month
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
      tier: userPlan.tier
    };
  } catch (error) {
    console.error('Error checking quota:', error);
    return { allowed: false, currentUsage: 0, limit: 0, remaining: 0, tier: 'starter' };
  }
}

// Helper function to track usage
async function trackUsage(supabase: any, userToken: string, resourceType: string, siteId?: number) {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Check if record exists
    const { data: existing } = await supabase
      .from('usage_tracking')
      .select('id, count')
      .eq('user_token', userToken)
      .eq('resource_type', resourceType)
      .eq('month_year', currentMonth)
      .maybeSingle();

    if (existing) {
      // Update existing record
      await supabase
        .from('usage_tracking')
        .update({ count: existing.count + 1 })
        .eq('id', existing.id);
    } else {
      // Create new record
      await supabase
        .from('usage_tracking')
        .insert({
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