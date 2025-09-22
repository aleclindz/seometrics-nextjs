import { NextRequest, NextResponse } from 'next/server';
import { scrapeUrl } from '@/services/crawl/firecrawl-client';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { site_url, max_pages = 5 } = await request.json();

    if (!site_url) {
      return NextResponse.json({
        success: false,
        error: 'site_url is required'
      }, { status: 400 });
    }

    console.log('[WEBSITE ANALYZE] Starting analysis for:', site_url);

    // Step 1: Scrape the homepage and key pages
    const pages = [];
    const urlsToScrape = [
      site_url,
      `${site_url}/about`,
      `${site_url}/services`,
      `${site_url}/products`,
      `${site_url}/pricing`
    ].slice(0, max_pages);

    for (const url of urlsToScrape) {
      try {
        console.log('[WEBSITE ANALYZE] Scraping:', url);
        const page = await scrapeUrl(url);
        if (page.markdown && page.markdown.length > 100) {
          pages.push({
            url: page.url,
            content: page.markdown.substring(0, 3000), // Limit content for API
            title: page.metadata?.title || 'Unknown'
          });
        }
      } catch (error) {
        console.log('[WEBSITE ANALYZE] Failed to scrape:', url, error);
        // Continue with other pages
      }
    }

    if (pages.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Could not scrape any content from the website'
      }, { status: 400 });
    }

    // Step 2: Analyze content with OpenAI
    const analysisPrompt = `
Analyze this website content and extract key business intelligence:

Website: ${site_url}
Pages analyzed: ${pages.length}

Content:
${pages.map(p => `=== ${p.title} (${p.url}) ===\n${p.content}`).join('\n\n')}

Please provide a structured analysis in this JSON format:
{
  "business_model": "Brief description of what the business does",
  "target_audience": ["primary audience", "secondary audience"],
  "services_products": ["service 1", "service 2", "product 1"],
  "value_propositions": ["key benefit 1", "key benefit 2"],
  "industry": "Industry category",
  "competitors_mentioned": ["competitor 1", "competitor 2"],
  "existing_content_themes": ["theme 1", "theme 2"],
  "website_type": "SaaS|E-commerce|Service Business|Blog|Corporate",
  "technical_stack": "WordPress|React|Static|Custom",
  "content_gaps": ["potential topic 1", "potential topic 2"],
  "primary_keywords_used": ["keyword 1", "keyword 2"],
  "tone_and_style": "Professional|Casual|Technical|Friendly"
}

Focus on extracting concrete, actionable information for SEO strategy development.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a business analyst specializing in website analysis for SEO strategy. Always return valid JSON.'
        },
        { role: 'user', content: analysisPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1500
    });

    let analysis;
    try {
      analysis = JSON.parse(completion.choices[0]?.message?.content || '{}');
    } catch (parseError) {
      console.error('[WEBSITE ANALYZE] Failed to parse OpenAI response:', parseError);
      // Fallback analysis
      analysis = {
        business_model: "Website analysis completed but could not extract detailed information",
        target_audience: ["General audience"],
        services_products: ["Not identified"],
        industry: "Unknown",
        website_type: "Unknown"
      };
    }

    console.log('[WEBSITE ANALYZE] Analysis completed for:', site_url);

    return NextResponse.json({
      success: true,
      data: {
        site_url,
        pages_analyzed: pages.length,
        analysis,
        scraped_pages: pages.map(p => ({ url: p.url, title: p.title }))
      }
    });

  } catch (error) {
    console.error('[WEBSITE ANALYZE] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze website'
    }, { status: 500 });
  }
}