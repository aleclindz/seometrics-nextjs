import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SemanticAnalyzer, SVSAnalysisInput } from '@/services/svs/semantic-analyzer';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface BulkAnalyzeRequest {
  userToken: string;
  websiteToken?: string;
  siteUrl: string;
  pageUrls: string[];
  targetTopic?: string;
  industry?: string;
  analysisType?: 'full' | 'page' | 'content_only';
  maxConcurrent?: number; // Maximum number of concurrent analyses
}

export async function POST(request: NextRequest) {
  try {
    const body: BulkAnalyzeRequest = await request.json();
    const { 
      userToken, 
      websiteToken,
      siteUrl, 
      pageUrls,
      targetTopic, 
      industry,
      analysisType = 'page',
      maxConcurrent = 3
    } = body;

    if (!userToken || !siteUrl || !pageUrls || !Array.isArray(pageUrls)) {
      return NextResponse.json({ 
        error: 'Missing required parameters: userToken, siteUrl, and pageUrls array' 
      }, { status: 400 });
    }

    if (pageUrls.length === 0) {
      return NextResponse.json({ 
        error: 'pageUrls array cannot be empty' 
      }, { status: 400 });
    }

    if (pageUrls.length > 20) {
      return NextResponse.json({ 
        error: 'Maximum 20 pages per bulk analysis request' 
      }, { status: 400 });
    }

    console.log(`[SVS BULK] Starting bulk analysis for ${pageUrls.length} pages`);

    // Validate user exists
    const { data: user, error: userError } = await supabase
      .from('login_users')
      .select('id, email')
      .eq('token', userToken)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid user token' }, { status: 401 });
    }

    // Initialize analyzer
    const analyzer = new SemanticAnalyzer(process.env.OPENAI_API_KEY!);
    
    // Process pages in batches to avoid overwhelming the system
    const results = [];
    const errors = [];
    const batchSize = Math.min(maxConcurrent, 3);
    
    for (let i = 0; i < pageUrls.length; i += batchSize) {
      const batch = pageUrls.slice(i, i + batchSize);
      console.log(`[SVS BULK] Processing batch ${Math.floor(i / batchSize) + 1}, pages ${i + 1}-${Math.min(i + batchSize, pageUrls.length)}`);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (pageUrl) => {
        try {
          return await analyzeSinglePage({
            userToken,
            websiteToken,
            siteUrl,
            pageUrl,
            targetTopic,
            industry,
            analysisType,
            analyzer
          });
        } catch (error) {
          console.error(`[SVS BULK] Failed to analyze ${pageUrl}:`, error);
          return {
            pageUrl,
            error: error instanceof Error ? error.message : 'Unknown error',
            success: false
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        const pageUrl = batch[index];
        
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            results.push(result.value);
          } else {
            errors.push({
              pageUrl,
              error: result.value.error || 'Analysis failed'
            });
          }
        } else {
          errors.push({
            pageUrl,
            error: result.reason?.message || 'Promise rejected'
          });
        }
      });

      // Small delay between batches to be respectful
      if (i + batchSize < pageUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Calculate summary statistics
    const successfulAnalyses = results.filter(r => r.success);
    const overallStats = calculateBulkStats(successfulAnalyses);

    console.log(`[SVS BULK] Completed: ${successfulAnalyses.length} successful, ${errors.length} failed`);

    return NextResponse.json({
      success: true,
      data: {
        total_requested: pageUrls.length,
        successful_analyses: successfulAnalyses.length,
        failed_analyses: errors.length,
        results: successfulAnalyses,
        errors: errors.length > 0 ? errors : undefined,
        summary: overallStats,
        site_url: siteUrl,
        analysis_type: analysisType,
        completed_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[SVS BULK] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error during bulk SVS analysis' 
    }, { status: 500 });
  }
}

/**
 * Analyze a single page and save results to database
 */
async function analyzeSinglePage({
  userToken,
  websiteToken,
  siteUrl,
  pageUrl,
  targetTopic,
  industry,
  analysisType,
  analyzer
}: {
  userToken: string;
  websiteToken?: string;
  siteUrl: string;
  pageUrl: string;
  targetTopic?: string;
  industry?: string;
  analysisType: string;
  analyzer: SemanticAnalyzer;
}) {
  try {
    // Validate URL format
    if (!pageUrl.startsWith('http')) {
      throw new Error('Invalid URL format. Must start with http:// or https://');
    }

    // Fetch content
    const { content, html, error: fetchError } = await fetchPageContent(pageUrl);
    
    if (fetchError || !content) {
      throw new Error(fetchError || 'Failed to fetch page content');
    }

    // Prepare analysis input
    const analysisInput: SVSAnalysisInput = {
      content,
      url: pageUrl,
      html,
      target_topic: targetTopic,
      industry
    };

    // Run analysis
    const analysisResult = await analyzer.analyzeSVS(analysisInput);

    // Save to database
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('svs_analyses')
      .insert({
        user_token: userToken,
        website_token: websiteToken,
        site_url: siteUrl,
        page_url: pageUrl,
        overall_svs_score: analysisResult.overall_svs_score,
        entity_coverage_score: analysisResult.component_scores.entity_coverage,
        semantic_variety_score: analysisResult.component_scores.semantic_variety,
        qa_utility_score: analysisResult.component_scores.qa_utility,
        citation_evidence_score: analysisResult.component_scores.citation_evidence,
        clarity_simplicity_score: analysisResult.component_scores.clarity_simplicity,
        topic_depth_score: analysisResult.component_scores.topic_depth,
        structure_schema_score: analysisResult.component_scores.structure_schema,
        analysis_data: analysisResult.analysis_data,
        analysis_type: analysisType,
        content_length: analysisResult.content_length,
        processing_time_ms: analysisResult.processing_time_ms
      })
      .select()
      .single();

    if (saveError) {
      throw new Error(`Failed to save analysis: ${saveError.message}`);
    }

    return {
      success: true,
      pageUrl,
      analysis_id: savedAnalysis.id,
      svs_score: analysisResult.overall_svs_score,
      grade: SemanticAnalyzer.getSVSGrade(analysisResult.overall_svs_score),
      component_scores: analysisResult.component_scores,
      content_length: analysisResult.content_length,
      processing_time: analysisResult.processing_time_ms,
      recommendations_count: analysisResult.analysis_data.recommendations.length
    };

  } catch (error) {
    console.error(`[SVS BULK] Single page analysis failed for ${pageUrl}:`, error);
    return {
      success: false,
      pageUrl,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Fetch content from a webpage (simplified version for bulk processing)
 */
async function fetchPageContent(url: string): Promise<{
  content?: string;
  html?: string;
  error?: string;
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout for bulk

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SEOAgent-SVS-Bulk/1.0 (+https://seoagent.com/semantic-analysis)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    const content = extractTextContent(html);
    
    if (!content || content.trim().length < 50) {
      return { error: 'Page content too short' };
    }

    return { content, html };

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { error: 'Timeout' };
    }
    return { error: 'Fetch failed' };
  }
}

/**
 * Extract clean text content from HTML (simplified version)
 */
function extractTextContent(html: string): string {
  try {
    // Remove script, style, and noscript elements
    let cleaned = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    cleaned = cleaned.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
    
    // Remove HTML comments
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
    
    // Remove all HTML tags
    cleaned = cleaned.replace(/<[^>]+>/g, ' ');
    
    // Convert common entities and clean whitespace
    cleaned = cleaned
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    
    return cleaned;
  } catch (error) {
    return '';
  }
}

/**
 * Calculate summary statistics for bulk analysis results
 */
function calculateBulkStats(results: any[]) {
  if (results.length === 0) {
    return {
      average_svs_score: 0,
      highest_score: 0,
      lowest_score: 0,
      score_distribution: { excellent: 0, good: 0, average: 0, poor: 0 },
      component_averages: {},
      top_performers: [],
      needs_attention: []
    };
  }

  const scores = results.map(r => r.svs_score);
  const averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  const highestScore = Math.max(...scores);
  const lowestScore = Math.min(...scores);

  const scoreDistribution = {
    excellent: results.filter(r => r.svs_score >= 85).length,
    good: results.filter(r => r.svs_score >= 70 && r.svs_score < 85).length,
    average: results.filter(r => r.svs_score >= 55 && r.svs_score < 70).length,
    poor: results.filter(r => r.svs_score < 55).length
  };

  // Calculate component averages
  const componentAverages = {
    entity_coverage: Math.round(results.reduce((sum, r) => sum + r.component_scores.entity_coverage, 0) / results.length),
    semantic_variety: Math.round(results.reduce((sum, r) => sum + r.component_scores.semantic_variety, 0) / results.length),
    qa_utility: Math.round(results.reduce((sum, r) => sum + r.component_scores.qa_utility, 0) / results.length),
    citation_evidence: Math.round(results.reduce((sum, r) => sum + r.component_scores.citation_evidence, 0) / results.length),
    clarity_simplicity: Math.round(results.reduce((sum, r) => sum + r.component_scores.clarity_simplicity, 0) / results.length),
    topic_depth: Math.round(results.reduce((sum, r) => sum + r.component_scores.topic_depth, 0) / results.length),
    structure_schema: Math.round(results.reduce((sum, r) => sum + r.component_scores.structure_schema, 0) / results.length)
  };

  // Top performers (top 3 scores)
  const topPerformers = results
    .sort((a, b) => b.svs_score - a.svs_score)
    .slice(0, 3)
    .map(r => ({
      pageUrl: r.pageUrl,
      svs_score: r.svs_score,
      grade: r.grade
    }));

  // Pages needing attention (bottom 3 scores)
  const needsAttention = results
    .sort((a, b) => a.svs_score - b.svs_score)
    .slice(0, 3)
    .map(r => ({
      pageUrl: r.pageUrl,
      svs_score: r.svs_score,
      grade: r.grade,
      recommendations_count: r.recommendations_count || 0
    }));

  return {
    average_svs_score: averageScore,
    highest_score: highestScore,
    lowest_score: lowestScore,
    score_distribution: scoreDistribution,
    component_averages: componentAverages,
    top_performers: topPerformers,
    needs_attention: needsAttention
  };
}

// GET endpoint for API documentation
export async function GET() {
  return NextResponse.json({
    name: 'SVS Bulk Analysis API',
    description: 'Analyze multiple pages for Semantic Visibility Score (SVS) in bulk',
    endpoint: 'POST /api/svs/bulk-analyze',
    parameters: {
      userToken: 'User authentication token (required)',
      siteUrl: 'Website base URL (required)',
      pageUrls: 'Array of specific page URLs to analyze (required, max 20)',
      targetTopic: 'Main topic/keyword focus (optional)',
      industry: 'Industry for benchmark comparison (optional)',
      analysisType: '"full", "page", or "content_only" (default: "page")',
      maxConcurrent: 'Maximum concurrent analyses (default: 3, max: 5)'
    },
    constraints: {
      max_pages_per_request: 20,
      max_concurrent_analyses: 3,
      timeout_per_page: '10 seconds',
      batch_delay: '1 second between batches'
    },
    response_format: {
      total_requested: 'Number of pages requested',
      successful_analyses: 'Number of successful analyses',
      failed_analyses: 'Number of failed analyses',
      results: 'Array of successful analysis results',
      errors: 'Array of failed analyses with error messages',
      summary: 'Overall statistics and insights'
    }
  });
}