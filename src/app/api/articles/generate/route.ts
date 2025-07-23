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
        }
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

// Mock GPT-4 content generation (replace with actual OpenAI API call)
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
  // This is a mock implementation. In production, you would call OpenAI API here
  console.log('[GENERATE API] Generating content for:', title);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  const wordTarget = contentLength === 'short' ? 500 : contentLength === 'long' ? 1500 : 1000;
  const keywordText = keywords.length > 0 ? keywords.join(', ') : 'your topic';

  return `# ${title}

## Introduction

In today&apos;s digital landscape, understanding ${keywordText} has become crucial for businesses and individuals alike. This comprehensive guide will explore the key aspects of ${keywords[0] || 'this topic'}, providing you with actionable insights and practical strategies.

## Understanding ${keywords[0] || 'The Basics'}

When it comes to ${keywordText}, there are several fundamental principles that form the foundation of success. Let&apos;s dive deep into these core concepts and explore how they can be applied effectively.

### Key Components

1. **Strategic Planning**: Every successful ${keywords[0] || 'initiative'} begins with proper planning and goal setting.
2. **Implementation**: Putting theory into practice with proven methodologies.
3. **Optimization**: Continuous improvement based on data and results.
4. **Measurement**: Tracking progress and ROI to ensure success.

## Best Practices for ${keywords[0] || 'Success'}

Here are the proven strategies that top performers use to excel in ${keywordText}:

### 1. Data-Driven Approach
Making decisions based on solid data rather than assumptions is crucial. This involves collecting relevant metrics, analyzing trends, and adapting strategies accordingly.

### 2. User-Centered Focus
Always prioritize the end user experience. Understanding your audience&apos;s needs, preferences, and pain points will guide better decision-making.

### 3. Continuous Learning
The landscape is constantly evolving. Staying updated with the latest trends, tools, and techniques ensures you remain competitive.

## Common Mistakes to Avoid

Even experienced professionals can fall into these traps:

- **Neglecting mobile optimization**: With mobile-first indexing, this is no longer optional
- **Ignoring analytics**: Data provides valuable insights that can&apos;t be ignored
- **Focusing only on short-term gains**: Sustainable growth requires long-term thinking
- **Underestimating the importance of quality content**: Content remains king in digital marketing

## Advanced Strategies

For those ready to take their ${keywords[0] || 'efforts'} to the next level:

### Automation and AI Integration
Leveraging artificial intelligence and automation tools can significantly improve efficiency and results. Consider implementing:

- Automated reporting systems
- AI-powered content optimization
- Predictive analytics for better forecasting
- Chatbots for improved customer service

### Personalization at Scale
Creating personalized experiences for your audience while managing resources effectively requires:

- Segmentation strategies
- Dynamic content delivery
- Behavioral targeting
- A/B testing for optimization

## Implementation Guide

Ready to put these insights into action? Follow this step-by-step guide:

1. **Assessment**: Evaluate your current situation and identify gaps
2. **Strategy Development**: Create a comprehensive plan based on your findings
3. **Resource Allocation**: Determine budget, timeline, and team requirements
4. **Execution**: Implement your strategy systematically
5. **Monitoring**: Track progress and adjust as needed
6. **Optimization**: Continuously refine your approach based on results

## Measuring Success

Key performance indicators (KPIs) to track:

- **Engagement Metrics**: Time on page, bounce rate, social shares
- **Conversion Metrics**: Lead generation, sales, ROI
- **Technical Metrics**: Page load speed, mobile responsiveness
- **SEO Metrics**: Organic traffic, keyword rankings, backlinks

## Future Trends and Considerations

The landscape of ${keywordText} continues to evolve. Stay ahead by preparing for:

- Increased focus on user privacy and data protection
- Growing importance of voice search optimization
- Enhanced role of artificial intelligence in decision-making
- Greater emphasis on sustainable and ethical practices

## Conclusion

Mastering ${keywordText} requires a combination of strategic thinking, practical implementation, and continuous optimization. By following the best practices outlined in this guide and avoiding common pitfalls, you&apos;ll be well-positioned for success.

Remember that success in ${keywords[0] || 'this field'} doesn&apos;t happen overnight. It requires patience, persistence, and a commitment to continuous learning and improvement.

## Ready to Get Started?

If you&apos;re looking to implement these strategies for your business, consider partnering with experts who can help you navigate the complexities and achieve your goals more efficiently.

**Key takeaways:**
- Start with a solid foundation of understanding
- Focus on user experience and data-driven decisions
- Avoid common mistakes that can derail your progress
- Implement advanced strategies when you&apos;re ready
- Continuously measure and optimize your approach

Take action today and start implementing these strategies to see real results in your ${keywords[0] || 'efforts'}.`;
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