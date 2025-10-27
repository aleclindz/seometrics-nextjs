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

    // Normalize URL (add https if missing)
    const normUrl = site_url.startsWith('http://') || site_url.startsWith('https://')
      ? site_url
      : `https://${site_url}`;

    console.log('[WEBSITE ANALYZE] Starting analysis for:', site_url);

    // Step 1: Scrape the homepage and key pages
    const pages: Array<{ url: string; content: string; title: string }> = [];
    const candidates = [
      normUrl,
      `${normUrl.replace(/\/$/, '')}/about`
    ].slice(0, Math.max(1, Math.min(max_pages, 2)));

    // Scrape sequentially with delays to avoid concurrent request limits
    for (const url of candidates) {
      try {
        console.log('[WEBSITE ANALYZE] Scraping:', url);
        const page = await scrapeUrl(url, { timeoutMs: 2500 });
        const md = page.markdown || '';
        if (md && md.length > 120) {
          pages.push({
            url: page.url,
            content: md.substring(0, 1800),
            title: page.metadata?.title || 'Unknown'
          });
        }

        // Add 2-second delay between requests to prevent concurrent limit issues
        if (candidates.indexOf(url) < candidates.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (e) {
        console.log('[WEBSITE ANALYZE] Failed to scrape:', url);
      }
    }

    if (pages.length === 0) {
      // Return a minimal analysis payload indicating blank site
      return NextResponse.json({
        success: true,
        data: {
          site_url: normUrl,
          pages_analyzed: 0,
          analysis: {
            business_model: 'No content detected (site may be blank or not live)',
            target_audience: [],
            services_products: [],
            industry: 'Unknown',
            website_type: 'Unknown',
            blank_site: true
          },
          scraped_pages: []
        }
      });
    }

    // Step 2: Analyze content with OpenAI
    const analysisPrompt = `
Analyze this website content and extract key business intelligence:

Website: ${site_url}
Pages analyzed: ${pages.length}

Content:
${pages.map(p => `=== ${p.title} (${p.url}) ===\n${p.content}`).join('\n\n')}

Please provide a structured analysis in this JSON format. Return ONLY raw JSON with no code fences, no backticks, and no extra text:
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

    try {
      console.log('[WEBSITE ANALYZE][LLM] model=gpt-4o-mini', { userPreview: analysisPrompt.slice(0, 300) });
    } catch {}
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a business analyst specializing in website analysis for SEO strategy. Always return ONLY valid JSON with no code fences.'
        },
        { role: 'user', content: analysisPrompt }
      ],
      temperature: 0.2,
      max_tokens: 900
    });

    try {
      const usage: any = (completion as any).usage || {};
      console.log('[WEBSITE ANALYZE][LLM] finish_reason=', completion.choices?.[0]?.finish_reason || 'n/a', 'usage=', usage);
    } catch {}

    let analysis;
    try {
      let content = completion.choices[0]?.message?.content || '{}';
      // Strip code fences if present
      content = content.trim();
      if (content.startsWith('```')) {
        content = content.replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '').trim();
      }
      // Extract JSON substring if any extra prose
      const firstBrace = content.indexOf('{');
      const lastBrace = content.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        content = content.slice(firstBrace, lastBrace + 1);
      }
      analysis = JSON.parse(content);
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
