import { NextRequest, NextResponse } from 'next/server';
import { scrapeUrl } from '@/services/crawl/firecrawl-client';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { competitor_urls, focus_areas = [], user_business_context } = await request.json();

    if (!competitor_urls || !Array.isArray(competitor_urls) || competitor_urls.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'competitor_urls array is required'
      }, { status: 400 });
    }

    console.log('[COMPETITOR RESEARCH] Analyzing competitors:', competitor_urls);

    const competitorAnalysis = [];

    // Analyze each competitor
    for (const competitorUrl of competitor_urls.slice(0, 3)) { // Limit to 3 competitors
      try {
        console.log('[COMPETITOR RESEARCH] Scraping:', competitorUrl);

        // Scrape homepage and key pages
        const pages = [];
        const urlsToScrape = [
          competitorUrl,
          `${competitorUrl}/pricing`,
          `${competitorUrl}/features`,
          `${competitorUrl}/blog`
        ];

        for (const url of urlsToScrape.slice(0, 2)) { // Limit to 2 pages per competitor
          try {
            const page = await scrapeUrl(url);
            if (page.markdown && page.markdown.length > 100) {
              pages.push({
                url: page.url,
                content: page.markdown.substring(0, 2000), // Limit content
                title: page.metadata?.title || 'Unknown'
              });
            }
          } catch (error) {
            console.log('[COMPETITOR RESEARCH] Failed to scrape page:', url);
          }
        }

        if (pages.length === 0) {
          competitorAnalysis.push({
            url: competitorUrl,
            error: 'Could not scrape content',
            analysis: null
          });
          continue;
        }

        // Analyze competitor with OpenAI
        const analysisPrompt = `
Analyze this competitor website for SEO and positioning strategy:

Competitor: ${competitorUrl}
User's business context: ${user_business_context || 'Not provided'}
Focus areas: ${focus_areas.join(', ') || 'General analysis'}

Content:
${pages.map(p => `=== ${p.title} (${p.url}) ===\n${p.content}`).join('\n\n')}

Please provide a structured analysis in this JSON format:
{
  "business_model": "What the competitor does",
  "target_audience": ["audience 1", "audience 2"],
  "key_services": ["service 1", "service 2"],
  "value_propositions": ["unique selling point 1", "unique selling point 2"],
  "pricing_strategy": "Freemium|Subscription|One-time|Custom",
  "content_strategy": ["blog topics", "content themes"],
  "likely_keywords": ["keyword 1", "keyword 2", "keyword 3"],
  "positioning": "How they position themselves",
  "strengths": ["strength 1", "strength 2"],
  "potential_weaknesses": ["weakness 1", "weakness 2"],
  "content_gaps": ["topics they don't cover well"],
  "technical_approach": "Their technical/feature approach"
}

Focus on insights that would help develop a differentiated keyword and content strategy.`;

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are a competitive analyst specializing in SEO and digital marketing strategy. Always return valid JSON.'
            },
            { role: 'user', content: analysisPrompt }
          ],
          temperature: 0.3,
          max_tokens: 1200
        });

        let analysis;
        try {
          analysis = JSON.parse(completion.choices[0]?.message?.content || '{}');
        } catch (parseError) {
          console.error('[COMPETITOR RESEARCH] Failed to parse OpenAI response for:', competitorUrl);
          analysis = {
            business_model: "Analysis completed but could not extract detailed information",
            error: "JSON parsing failed"
          };
        }

        competitorAnalysis.push({
          url: competitorUrl,
          pages_analyzed: pages.length,
          analysis,
          scraped_pages: pages.map(p => ({ url: p.url, title: p.title }))
        });

      } catch (error) {
        console.error('[COMPETITOR RESEARCH] Error analyzing:', competitorUrl, error);
        competitorAnalysis.push({
          url: competitorUrl,
          error: 'Failed to analyze competitor',
          analysis: null
        });
      }
    }

    // Generate competitive insights
    const competitiveInsights = await generateCompetitiveInsights(competitorAnalysis, user_business_context);

    console.log('[COMPETITOR RESEARCH] Analysis completed for', competitor_urls.length, 'competitors');

    return NextResponse.json({
      success: true,
      data: {
        competitors_analyzed: competitorAnalysis.length,
        competitor_analysis: competitorAnalysis,
        competitive_insights: competitiveInsights
      }
    });

  } catch (error) {
    console.error('[COMPETITOR RESEARCH] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to research competitors'
    }, { status: 500 });
  }
}

async function generateCompetitiveInsights(competitorAnalysis: any[], userBusinessContext: string) {
  try {
    const validAnalyses = competitorAnalysis.filter(c => c.analysis && !c.error);

    if (validAnalyses.length === 0) {
      return {
        market_gaps: ["Unable to identify gaps due to analysis failures"],
        differentiation_opportunities: ["Focus on unique value proposition"],
        keyword_opportunities: ["Research industry-specific long-tail keywords"]
      };
    }

    const insightsPrompt = `
Based on the competitive analysis below, identify strategic opportunities:

User's business context: ${userBusinessContext || 'Not provided'}

Competitor analyses:
${validAnalyses.map(c => `
Competitor: ${c.url}
Business model: ${c.analysis.business_model}
Target audience: ${c.analysis.target_audience?.join(', ')}
Key services: ${c.analysis.key_services?.join(', ')}
Likely keywords: ${c.analysis.likely_keywords?.join(', ')}
Positioning: ${c.analysis.positioning}
Strengths: ${c.analysis.strengths?.join(', ')}
`).join('\n')}

Provide strategic insights in this JSON format:
{
  "market_gaps": ["gap 1", "gap 2", "gap 3"],
  "differentiation_opportunities": ["opportunity 1", "opportunity 2"],
  "keyword_opportunities": ["underexplored keyword theme 1", "keyword theme 2"],
  "content_opportunities": ["content type/topic competitors miss"],
  "positioning_advice": "How to position uniquely vs competitors"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a strategic consultant specializing in competitive positioning and SEO strategy. Always return valid JSON.'
        },
        { role: 'user', content: insightsPrompt }
      ],
      temperature: 0.4,
      max_tokens: 800
    });

    return JSON.parse(completion.choices[0]?.message?.content || '{}');
  } catch (error) {
    console.error('[COMPETITOR RESEARCH] Failed to generate insights:', error);
    return {
      market_gaps: ["Unable to generate insights"],
      differentiation_opportunities: ["Focus on unique strengths"],
      keyword_opportunities: ["Research niche-specific keywords"]
    };
  }
}