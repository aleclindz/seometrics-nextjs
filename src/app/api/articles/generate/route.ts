import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use Node.js runtime for longer timeout support (needed for OpenAI API calls)
export const runtime = 'nodejs';

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
            status: 'generation_failed',
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

  const wordTarget = contentLength === 'short' ? 600 : contentLength === 'long' ? 1200 : 800; // Reduced targets
  
  const comprehensivePrompt = `Write a complete SEO article for: "${title}"

TARGET KEYWORDS: ${keywords.join(', ')}
TONE: ${stylePrompt}
WORD COUNT: ${wordTarget} words

RESPOND WITH VALID JSON:
{
  "metaTitle": "SEO title (50-60 chars with main keyword)",
  "metaDescription": "Meta description (150-160 chars with call-to-action)",
  "contentOutline": {
    "mainSections": ["Section 1", "Section 2", "Section 3", "Section 4"],
    "conclusion": "Brief summary"
  },
  "content": "FULL HTML ARTICLE CONTENT"
}

ARTICLE STRUCTURE (Follow this exact format):
1. TL;DR Summary (2-3 bullet points in a callout box)
2. Introduction with hook + problem statement + article preview
3. Definition section (What is [main topic]?)
4. Why it matters/Benefits section
5. Step-by-step guide or methodology
6. Real-world examples with specific details
7. Best practices and tips
8. Common mistakes to avoid
9. FAQ section (3-4 questions with H3 tags)
10. Conclusion with clear call-to-action

CONTENT QUALITY REQUIREMENTS:
- Start with <div class="tldr-box"><h3>TL;DR</h3><ul> for summary
- Use specific examples, numbers, and data points
- Include actionable advice in every section
- Break complex concepts into digestible chunks
- Use transition phrases between sections
- Include semantic keywords naturally
- Add internal linking opportunities with placeholder text like [internal link: related topic]

FORMAT REQUIREMENTS:
- Use HTML: <h2>, <h3>, <p>, <strong>, <ul>, <li>, <em>
- Bold important terms and key concepts
- Use numbered lists for steps, bullet lists for benefits
- Include 2-3 paragraphs per section with clear topic sentences
- Write in an engaging, ${tone === 'professional' ? 'authoritative yet accessible' : tone === 'casual' ? 'conversational and relatable' : 'precise and technical'} style

ENGAGEMENT ELEMENTS:
- Use rhetorical questions to hook readers
- Include specific statistics or data when relevant
- Add practical examples that readers can relate to
- Create scannable content with clear headings
- End each major section with a key takeaway

META REQUIREMENTS:
- Title: 50-60 characters, include "${keywords[0] || title.split(' ')[0]}"
- Description: 150-160 characters, compelling, include primary keyword and call-to-action

Return ONLY valid JSON, no additional text.`;

  let response;
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Faster and cheaper than gpt-4
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert SEO content writer who creates high-quality, comprehensive articles similar to top-performing content from SurferSEO and industry leaders. Focus on actionable advice, real examples, clear structure, and engaging writing that provides genuine value to readers. Always respond with valid JSON only.' 
          },
          { role: 'user', content: comprehensivePrompt }
        ],
        temperature: 0.2,
        max_tokens: 3000 // Reduced for faster generation
      }),
      signal: AbortSignal.timeout(25000) // 25-second timeout to stay under Vercel limit
    });
  } catch (fetchError: any) {
    if (fetchError.name === 'AbortError' || fetchError.message?.includes('timeout')) {
      throw new Error('Article generation timed out. Please try again with shorter content or simpler requirements.');
    }
    throw new Error(`OpenAI API connection error: ${fetchError.message}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
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