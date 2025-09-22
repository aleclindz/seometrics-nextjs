import { NextRequest, NextResponse } from 'next/server';
import { scrapeUrl } from '@/services/crawl/firecrawl-client';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const {
      user_website_analysis,
      competitor_analysis,
      topic_clusters,
      focus_content_types = ['blog', 'guides', 'comparisons']
    } = await request.json();

    if (!user_website_analysis || !competitor_analysis) {
      return NextResponse.json({
        success: false,
        error: 'user_website_analysis and competitor_analysis are required'
      }, { status: 400 });
    }

    console.log('[CONTENT GAP ANALYSIS] Analyzing content gaps for:', user_website_analysis.site_url);

    // Crawl user's existing content (blog/resources pages)
    const userContent = await crawlExistingContent(user_website_analysis.site_url);

    // Analyze competitor content themes
    const competitorContentThemes = extractContentThemes(competitor_analysis);

    // Generate comprehensive gap analysis
    const gapAnalysisPrompt = `
Perform a comprehensive content gap analysis to identify high-impact content opportunities.

USER WEBSITE ANALYSIS:
Business Model: ${user_website_analysis.business_model}
Industry: ${user_website_analysis.industry}
Target Audience: ${user_website_analysis.target_audience?.join(', ')}
Services/Products: ${user_website_analysis.services_products?.join(', ')}
Existing Content Themes: ${user_website_analysis.existing_content_themes?.join(', ')}

EXISTING USER CONTENT:
${userContent.map(content => `- ${content.title} (${content.url})`).join('\n')}

COMPETITOR CONTENT INSIGHTS:
${competitor_analysis.map((comp: any) => `
Competitor: ${comp.url}
Content Strategy: ${comp.analysis?.content_strategy?.join(', ')}
Key Services: ${comp.analysis?.key_services?.join(', ')}
Likely Keywords: ${comp.analysis?.likely_keywords?.join(', ')}
Content Gaps They Have: ${comp.analysis?.content_gaps?.join(', ')}
`).join('\n')}

COMPETITOR CONTENT THEMES:
${competitorContentThemes.join(', ')}

${topic_clusters ? `
PLANNED TOPIC CLUSTERS:
${topic_clusters.map((cluster: any) => `
Cluster: ${cluster.cluster_name}
Description: ${cluster.description}
Keywords: ${cluster.keywords?.map((k: any) => k.keyword).join(', ')}
`).join('\n')}
` : ''}

FOCUS CONTENT TYPES: ${focus_content_types.join(', ')}

Identify specific content gaps and opportunities in this JSON format:

{
  "content_gaps": [
    {
      "gap_type": "missing_topic",
      "opportunity_title": "Complete Guide to Local SEO for Small Businesses",
      "gap_description": "Competitors cover general SEO but miss local SEO specifics",
      "target_keywords": ["local SEO", "local business SEO", "Google My Business"],
      "content_type": "pillar_page",
      "priority": "high",
      "competitive_advantage": "First comprehensive local SEO guide in industry",
      "estimated_traffic": "5000-8000 monthly",
      "difficulty": "medium",
      "why_competitors_miss": "Focus on general SEO, overlook local businesses"
    }
  ],
  "underexplored_topics": [
    {
      "topic": "SEO for voice search",
      "opportunity": "Growing trend, minimal competitor coverage",
      "potential_keywords": ["voice search SEO", "optimize for voice"],
      "content_angles": ["technical implementation", "keyword research for voice"]
    }
  ],
  "content_format_gaps": [
    {
      "format": "interactive_tools",
      "description": "Competitors lack interactive SEO tools/calculators",
      "examples": ["SEO audit calculator", "keyword difficulty checker"],
      "implementation_effort": "medium"
    }
  ],
  "competitive_advantages": [
    {
      "advantage": "deeper_technical_focus",
      "description": "Competitors focus on basics, opportunity for advanced content",
      "content_ideas": ["Technical SEO auditing", "JavaScript SEO", "Core Web Vitals"]
    }
  ],
  "seasonal_opportunities": [
    {
      "season": "Q4",
      "opportunity": "Holiday SEO preparation guides",
      "timing": "Publish in September-October",
      "keywords": ["holiday SEO", "ecommerce holiday optimization"]
    }
  ],
  "analysis_summary": {
    "total_gaps_identified": 15,
    "high_priority_gaps": 5,
    "quick_win_opportunities": 8,
    "long_term_strategic_content": 2,
    "competitive_moat_potential": "Strong - technical depth + multi-CMS focus"
  }
}

Focus on:
1. Topics competitors completely miss or cover poorly
2. Content formats competitors don't use (tools, calculators, interactive guides)
3. Deeper, more technical angles on topics competitors cover superficially
4. Industry-specific angles competitors generalize
5. Emerging trends competitors haven't adopted yet
6. Content that leverages your unique business advantages`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a content strategist specializing in competitive content analysis and gap identification. Always return valid JSON with actionable, specific content opportunities.'
        },
        { role: 'user', content: gapAnalysisPrompt }
      ],
      temperature: 0.3,
      max_tokens: 4000
    });

    let gapAnalysis;
    try {
      gapAnalysis = JSON.parse(completion.choices[0]?.message?.content || '{}');
    } catch (parseError) {
      console.error('[CONTENT GAP ANALYSIS] Failed to parse OpenAI response:', parseError);
      return NextResponse.json({
        success: false,
        error: 'Failed to generate content gap analysis - invalid response format'
      }, { status: 500 });
    }

    // Generate actionable content recommendations
    const contentRecommendations = await generateContentRecommendations(gapAnalysis, user_website_analysis);

    console.log('[CONTENT GAP ANALYSIS] Identified', gapAnalysis.content_gaps?.length || 0, 'content gaps');

    return NextResponse.json({
      success: true,
      data: {
        gap_analysis: gapAnalysis,
        content_recommendations: contentRecommendations,
        user_existing_content: userContent.length,
        competitors_analyzed: competitor_analysis.length,
        generated_at: new Date().toISOString(),
        methodology: {
          analysis_scope: "Content themes, keyword coverage, format gaps, competitive positioning",
          data_sources: "User website crawl, competitor analysis, keyword research",
          recommendation_basis: "Gap identification + business context + SEO opportunity"
        }
      }
    });

  } catch (error) {
    console.error('[CONTENT GAP ANALYSIS] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to perform content gap analysis'
    }, { status: 500 });
  }
}

async function crawlExistingContent(siteUrl: string) {
  const contentUrls = [
    `${siteUrl}/blog`,
    `${siteUrl}/resources`,
    `${siteUrl}/guides`,
    `${siteUrl}/articles`,
    `${siteUrl}/knowledge-base`
  ];

  const existingContent = [];

  for (const url of contentUrls.slice(0, 3)) { // Limit to prevent long delays
    try {
      console.log('[CONTENT GAP ANALYSIS] Crawling existing content:', url);
      const page = await scrapeUrl(url);

      if (page.markdown && page.markdown.length > 200) {
        // Extract article titles from content listings
        const articleTitles = extractArticleTitles(page.markdown);

        existingContent.push({
          url: page.url,
          title: page.metadata?.title || 'Content Section',
          content_preview: page.markdown.substring(0, 500),
          article_titles: articleTitles
        });
      }
    } catch (error) {
      console.log('[CONTENT GAP ANALYSIS] Failed to crawl content section:', url);
    }
  }

  return existingContent;
}

function extractArticleTitles(markdown: string): string[] {
  // Extract potential article titles from markdown content
  const titles = [];

  // Look for markdown headers
  const headerMatches = markdown.match(/#{1,3}\s+(.+?)$/gm);
  if (headerMatches) {
    titles.push(...headerMatches.map(h => h.replace(/#{1,3}\s+/, '').trim()));
  }

  // Look for link text (articles often listed as links)
  const linkMatches = markdown.match(/\[([^\]]+)\]/g);
  if (linkMatches) {
    titles.push(...linkMatches.map(l => l.replace(/\[|\]/g, '').trim()));
  }

  // Remove duplicates and filter out very short/generic titles
  return Array.from(new Set(titles))
    .filter(title => title.length > 10 && title.length < 100)
    .slice(0, 10); // Limit to most relevant titles
}

function extractContentThemes(competitorAnalysis: any[]): string[] {
  const themes = [];

  for (const competitor of competitorAnalysis) {
    if (competitor.analysis?.content_strategy) {
      themes.push(...competitor.analysis.content_strategy);
    }
    if (competitor.analysis?.likely_keywords) {
      themes.push(...competitor.analysis.likely_keywords);
    }
  }

  // Remove duplicates and return unique themes
  return Array.from(new Set(themes)).filter(theme => theme && theme.length > 0);
}

async function generateContentRecommendations(gapAnalysis: any, businessContext: any) {
  try {
    const recommendationPrompt = `
Based on this content gap analysis, create specific, actionable content recommendations:

IDENTIFIED GAPS:
${gapAnalysis.content_gaps?.map((gap: any) => `- ${gap.opportunity_title}: ${gap.gap_description}`).join('\n')}

BUSINESS CONTEXT:
Industry: ${businessContext.industry}
Business Model: ${businessContext.business_model}
Target Audience: ${businessContext.target_audience?.join(', ')}

Create prioritized content recommendations in this JSON format:
{
  "immediate_actions": [
    {
      "content_title": "Complete Technical SEO Audit Checklist",
      "content_type": "interactive_guide",
      "time_to_create": "2 weeks",
      "expected_impact": "high",
      "target_keywords": ["technical SEO audit", "SEO checklist"],
      "next_steps": ["Research existing checklists", "Create interactive version", "Add downloadable PDF"]
    }
  ],
  "30_day_plan": [],
  "90_day_plan": [],
  "content_calendar_integration": "These recommendations can be integrated into existing topic clusters for cohesive strategy"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a content strategist creating actionable content recommendations. Always return valid JSON with specific, implementable advice.'
        },
        { role: 'user', content: recommendationPrompt }
      ],
      temperature: 0.4,
      max_tokens: 1500
    });

    return JSON.parse(completion.choices[0]?.message?.content || '{}');
  } catch (error) {
    console.error('[CONTENT GAP ANALYSIS] Failed to generate recommendations:', error);
    return {
      immediate_actions: [],
      error: "Could not generate detailed recommendations"
    };
  }
}