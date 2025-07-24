import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
      return NextResponse.json(
        { error: 'Missing required fields: userToken, articleId' },
        { status: 400 }
      );
    }

    console.log('[GENERATE API] Starting generation for article:', articleId);

    // Get the article from queue
    const { data: article, error: fetchError } = await supabase
      .from('article_queue')
      .select(`
        *,
        websites:website_id (
          domain,
          description
        )
      `)
      .eq('id', articleId)
      .eq('user_token', userToken)
      .single();

    if (fetchError || !article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Check quota before starting generation
    const quotaCheck = await checkQuota(supabase, userToken, article.websites?.id);
    if (!quotaCheck.allowed) {
      await supabase
        .from('article_queue')
        .update({
          status: 'failed',
          error_message: `Quota exceeded: You have reached your monthly limit of ${quotaCheck.limit} articles. Current usage: ${quotaCheck.currentUsage}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', articleId);

      return NextResponse.json({
        error: 'Quota exceeded',
        message: `You have reached your monthly limit of ${quotaCheck.limit} articles. Current usage: ${quotaCheck.currentUsage}`,
        quota: quotaCheck
      }, { status: 429 });
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
      // Generate article content using GPT-4
      const articleContent = await generateArticleContent({
        title: article.title,
        keywords: targetKeywords,
        websiteDomain: article.websites?.domain,
        websiteDescription: article.websites?.description,
        contentLength,
        tone
      });

      // Calculate metrics
      const wordCount = articleContent.split(/\s+/).length;
      const qualityScore = calculateQualityScore(articleContent, targetKeywords);
      const readabilityScore = calculateReadabilityScore(articleContent);
      const seoScore = calculateSeoScore(articleContent, targetKeywords, article.title);

      const generationTime = Math.round((Date.now() - generationStartTime) / 1000);

      // Update article with generated content
      const { error: updateError } = await supabase
        .from('article_queue')
        .update({
          article_content: articleContent,
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
            seoScore
          }
        });

      // Track usage after successful generation
      await trackUsage(supabase, userToken, 'article', article.websites?.id);

      console.log('[GENERATE API] Article generated successfully:', articleId);

      return NextResponse.json({
        success: true,
        article: {
          id: articleId,
          content: articleContent,
          word_count: wordCount,
          quality_score: qualityScore,
          readability_score: readabilityScore,
          seo_score: seoScore,
          generation_time: generationTime
        },
        quota: await checkQuota(supabase, userToken, article.websites?.id)
      });

    } catch (generationError) {
      console.error('[GENERATE API] Generation failed:', generationError);

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

      return NextResponse.json(
        { error: 'Article generation failed' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[GENERATE API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Real OpenAI GPT-4 content generation
async function generateArticleContent({
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

  console.log('[GENERATE API] Generating real AI content for:', title);

  // Step 1: Generate article outline
  const outlinePrompt = `Write 6-8 compelling subheadings for an SEO-optimized article about: "${title}".
  
  Target keywords: ${keywords.join(', ')}
  Website: ${websiteDomain || 'general business'}
  Content style: ${tone}
  
  Create subheadings that:
  - Include target keywords naturally
  - Follow logical progression
  - Are engaging and informative
  - Work well for SEO
  
  Format as a numbered list.`;

  const outlineResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
          content: 'You are an expert SEO content writer who creates high-converting, search-optimized articles.' 
        },
        { role: 'user', content: outlinePrompt }
      ],
      temperature: 0.3,
      max_tokens: 500
    })
  });

  if (!outlineResponse.ok) {
    throw new Error(`OpenAI API error: ${outlineResponse.status}`);
  }

  const outlineData = await outlineResponse.json();
  const outline = outlineData.choices[0].message.content;

  // Step 2: Generate full article content
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
  
  const articlePrompt = `Write a comprehensive, SEO-optimized article of approximately ${wordTarget} words based on the following outline.

  Title: ${title}
  Target Keywords: ${keywords.join(', ')}
  Website Context: ${websiteDomain ? `This is for ${websiteDomain}` : 'General business context'}
  ${websiteDescription ? `Website Description: ${websiteDescription}` : ''}
  
  Writing Guidelines:
  - ${stylePrompt}
  - Write 2-3 detailed paragraphs for each section
  - Include target keywords naturally (1-2% density)
  - Use varied sentence structures and engaging language
  - Include actionable insights and practical tips
  - Add relevant examples and case studies where appropriate
  - Optimize for search engines while maintaining readability
  - Use HTML formatting: <h2> for main sections, <h3> for subsections, <strong> for emphasis
  - Include bullet points with <ul><li> tags where helpful
  - End with a compelling conclusion and call-to-action
  
  Article Outline:
  ${outline}

  Create content that provides real value to readers while being optimized for search engines.`;

  const articleResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
          content: 'You are an expert SEO content writer who creates detailed, engaging, high-converting articles that rank well in search engines.' 
        },
        { role: 'user', content: articlePrompt }
      ],
      temperature: 0.1,
      max_tokens: 4000
    })
  });

  if (!articleResponse.ok) {
    throw new Error(`OpenAI API error: ${articleResponse.status}`);
  }

  const articleData = await articleResponse.json();
  let article = articleData.choices[0].message.content || '';

  // Step 3: Add FAQ section for better SEO
  const faqPrompt = `Create 5 frequently asked questions about "${title}" that would be valuable for readers and SEO.

  Target Keywords: ${keywords.join(', ')}
  
  Format each FAQ as:
  <h3>Question here?</h3>
  <p>Detailed, helpful answer here.</p>
  
  Make questions that:
  - Address common user concerns
  - Include long-tail keywords
  - Provide genuine value
  - Are specific to the topic`;

  const faqResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
          content: 'You create helpful FAQ sections that improve user experience and SEO.' 
        },
        { role: 'user', content: faqPrompt }
      ],
      temperature: 0.2,
      max_tokens: 1000
    })
  });

  if (faqResponse.ok) {
    const faqData = await faqResponse.json();
    const faqs = faqData.choices[0].message.content;
    article += `\n\n<h2>Frequently Asked Questions</h2>\n${faqs}`;
  }

  // Step 4: Add key takeaways section
  const takeawaysPrompt = `Create 5-7 key takeaways for the article about "${title}".

  Make them:
  - Actionable and specific
  - Easy to remember
  - Include target keywords: ${keywords.join(', ')}
  - Provide genuine value
  
  Format as HTML bullet points with <ul><li> tags.`;

  const takeawaysResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
          content: 'You create concise, actionable key takeaways that summarize article value.' 
        },
        { role: 'user', content: takeawaysPrompt }
      ],
      temperature: 0.1,
      max_tokens: 500
    })
  });

  if (takeawaysResponse.ok) {
    const takeawaysData = await takeawaysResponse.json();
    const takeaways = takeawaysData.choices[0].message.content;
    article = `<h2>Key Takeaways</h2>\n${takeaways}\n\n` + article;
  }

  return article;
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