import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const { userToken, siteUrl, testPrompt } = await request.json();

    if (!userToken || !siteUrl) {
      return NextResponse.json({ error: 'Missing userToken or siteUrl' }, { status: 400 });
    }

    console.log(`[SEO AGENT TEST] Testing agent analysis for: ${siteUrl}`);

    // 1. Fetch current technical SEO data
    const technicalData = await fetchTechnicalSEOData(userToken, siteUrl);

    // 2. Test AI agent's ability to analyze and explain issues
    const agentAnalysis = await testAgentAnalysis(technicalData, testPrompt || "What SEO issues do you see with my website?");

    // 3. Validate that agent detected real issues
    const validationResults = await validateAgentDetection(technicalData, agentAnalysis);

    return NextResponse.json({
      success: true,
      siteUrl,
      testPrompt: testPrompt || "What SEO issues do you see with my website?",
      technicalData: {
        urlInspections: technicalData.urlInspections?.length || 0,
        sitemapStatus: technicalData.sitemap?.status || 'missing',
        robotsStatus: technicalData.robots?.exists ? 'exists' : 'missing',
        schemaGenerations: technicalData.schemaGenerations?.length || 0
      },
      agentResponse: agentAnalysis.response,
      agentTokensUsed: agentAnalysis.tokensUsed,
      validation: validationResults,
      testResults: {
        detectedIssues: validationResults.detectedIssues.length,
        missedIssues: validationResults.missedIssues.length,
        accuracy: validationResults.accuracy,
        overallGrade: validationResults.overallGrade
      }
    });

  } catch (error) {
    console.error('[SEO AGENT TEST] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to test agent analysis'
    }, { status: 500 });
  }
}

async function fetchTechnicalSEOData(userToken: string, siteUrl: string) {
  // Fetch URL inspections
  const { data: urlInspections } = await supabase
    .from('url_inspections')
    .select('*')
    .eq('user_token', userToken)
    .eq('site_url', siteUrl)
    .order('inspected_at', { ascending: false });

  // Fetch sitemap data
  const { data: sitemaps } = await supabase
    .from('sitemap_submissions')
    .select('*')
    .eq('user_token', userToken)
    .eq('site_url', siteUrl)
    .limit(1);

  // Fetch robots analysis
  const { data: robots } = await supabase
    .from('robots_analyses')
    .select('*')
    .eq('user_token', userToken)
    .eq('site_url', siteUrl)
    .single();

  // Fetch schema generations
  const { data: schemaGenerations } = await supabase
    .from('schema_generations')
    .select('*')
    .ilike('page_url', `${siteUrl}%`)
    .order('generated_at', { ascending: false });

  return {
    urlInspections: urlInspections || [],
    sitemap: sitemaps?.[0] || null,
    robots: robots || null,
    schemaGenerations: schemaGenerations || []
  };
}

async function testAgentAnalysis(technicalData: any, prompt: string) {
  const systemPrompt = `You are an SEO agent analyzing technical SEO issues for a website. 

Based on the following technical SEO data, provide a comprehensive analysis:

URL INSPECTIONS:
${JSON.stringify(technicalData.urlInspections, null, 2)}

SITEMAP STATUS:
${JSON.stringify(technicalData.sitemap, null, 2)}

ROBOTS.TXT STATUS:
${JSON.stringify(technicalData.robots, null, 2)}

SCHEMA MARKUP STATUS:
${JSON.stringify(technicalData.schemaGenerations, null, 2)}

Please identify and explain:
1. Critical SEO issues found
2. Impact of each issue on search performance  
3. Specific pages affected
4. Recommended actions to fix issues
5. Priority level for each fix

Be specific and reference actual data from the inspections.`;

  const completion = await openai.chat.completions.create({
    // Log prompt details
    try {
      console.log('[AGENT TEST][LLM] model=gpt-4o-mini', { systemPreview: systemPrompt.slice(0, 300), userPreview: prompt.slice(0, 200) });
    } catch {}
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ],
    temperature: 0.1,
  });

  return {
    response: completion.choices[0].message.content,
    tokensUsed: completion.usage?.total_tokens || 0
  };
}

async function validateAgentDetection(technicalData: any, agentAnalysis: any) {
  const actualIssues = [];
  
  // Identify actual issues in the data
  if (technicalData.urlInspections) {
    for (const inspection of technicalData.urlInspections) {
      if (inspection.index_status === 'FAIL' || inspection.index_status === 'PARTIAL') {
        actualIssues.push({
          type: 'INDEXING_ISSUE',
          url: inspection.inspected_url,
          details: inspection.index_status_description,
          severity: inspection.index_status === 'FAIL' ? 'high' : 'medium'
        });
      }
      
      if (!inspection.mobile_friendly) {
        actualIssues.push({
          type: 'MOBILE_ISSUE',
          url: inspection.inspected_url,
          details: 'Page is not mobile-friendly',
          severity: 'medium'
        });
      }
    }
  }

  if (!technicalData.sitemap) {
    actualIssues.push({
      type: 'MISSING_SITEMAP',
      url: 'sitemap',
      details: 'No sitemap submitted to Google Search Console',
      severity: 'high'
    });
  }

  if (!technicalData.robots || !technicalData.robots.exists) {
    actualIssues.push({
      type: 'MISSING_ROBOTS',
      url: 'robots.txt',
      details: 'robots.txt file missing or inaccessible',
      severity: 'medium'  
    });
  }

  if (technicalData.schemaGenerations) {
    for (const schema of technicalData.schemaGenerations) {
      if (schema.schemas_generated === 0) {
        actualIssues.push({
          type: 'MISSING_SCHEMA',
          url: schema.page_url,
          details: 'Page lacks structured data markup',
          severity: 'medium'
        });
      }
    }
  }

  // Check which issues the agent detected
  const agentText = agentAnalysis.response?.toLowerCase() || '';
  const detectedIssues = [];
  const missedIssues = [];

  for (const issue of actualIssues) {
    const detected = checkIfAgentDetectedIssue(agentText, issue);
    if (detected) {
      detectedIssues.push(issue);
    } else {
      missedIssues.push(issue);
    }
  }

  const accuracy = actualIssues.length > 0 ? (detectedIssues.length / actualIssues.length) * 100 : 100;
  
  let overallGrade = 'F';
  if (accuracy >= 90) overallGrade = 'A';
  else if (accuracy >= 80) overallGrade = 'B';
  else if (accuracy >= 70) overallGrade = 'C';
  else if (accuracy >= 60) overallGrade = 'D';

  return {
    actualIssues,
    detectedIssues,
    missedIssues,
    accuracy: Math.round(accuracy),
    overallGrade
  };
}

function checkIfAgentDetectedIssue(agentText: string, issue: any): boolean {
  const keywords: Record<string, string[]> = {
    'INDEXING_ISSUE': ['index', 'crawl', 'blocked', 'not found', '404', 'server error', 'redirect'],
    'MOBILE_ISSUE': ['mobile', 'responsive', 'mobile-friendly', 'usability'],
    'MISSING_SITEMAP': ['sitemap', 'xml', 'submit', 'google search console'],
    'MISSING_ROBOTS': ['robots.txt', 'robots', 'crawl directive'],
    'MISSING_SCHEMA': ['schema', 'structured data', 'markup', 'rich snippet']
  };

  const issueKeywords = keywords[issue.type] || [];
  return issueKeywords.some(keyword => agentText.includes(keyword));
}

export async function GET() {
  return NextResponse.json({
    description: 'Test AI agent analysis of technical SEO issues',
    endpoint: 'POST /api/test-seo/agent-analysis',
    parameters: {
      userToken: 'User authentication token',
      siteUrl: 'Website URL to analyze', 
      testPrompt: 'Optional custom prompt (default: "What SEO issues do you see with my website?")'
    },
    testFlow: [
      '1. Fetch technical SEO data from database',
      '2. Send data to AI agent for analysis', 
      '3. Validate agent detected real issues',
      '4. Return accuracy score and detailed results'
    ]
  });
}
