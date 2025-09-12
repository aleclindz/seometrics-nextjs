"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const semantic_analyzer_1 = require("@/services/svs/semantic-analyzer");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function POST(request) {
    try {
        const body = await request.json();
        const { userToken, websiteToken, siteUrl, pageUrl, targetTopic, industry, analysisType = 'full' } = body;
        if (!userToken || !siteUrl) {
            return server_1.NextResponse.json({
                error: 'Missing required parameters: userToken and siteUrl'
            }, { status: 400 });
        }
        console.log(`[SVS ANALYZE] Starting analysis for: ${pageUrl || siteUrl}`);
        // Validate user exists
        const { data: user, error: userError } = await supabase
            .from('login_users')
            .select('id, email')
            .eq('token', userToken)
            .single();
        if (userError || !user) {
            return server_1.NextResponse.json({ error: 'Invalid user token' }, { status: 401 });
        }
        // Determine URL to analyze
        const analyzeUrl = pageUrl || siteUrl;
        if (!analyzeUrl.startsWith('http')) {
            return server_1.NextResponse.json({
                error: 'Invalid URL format. Must start with http:// or https://'
            }, { status: 400 });
        }
        // Fetch content from the target URL
        const { content, html, error: fetchError } = await fetchPageContent(analyzeUrl);
        if (fetchError || !content) {
            return server_1.NextResponse.json({
                error: fetchError || 'Failed to fetch page content'
            }, { status: 400 });
        }
        // Prepare analysis input
        const analysisInput = {
            content,
            url: analyzeUrl,
            html,
            target_topic: targetTopic,
            industry
        };
        // Run SVS analysis
        const analyzer = new semantic_analyzer_1.SemanticAnalyzer(process.env.OPENAI_API_KEY);
        const analysisResult = await analyzer.analyzeSVS(analysisInput);
        // Store analysis results in database
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
            console.error('[SVS ANALYZE] Failed to save analysis:', saveError);
            return server_1.NextResponse.json({
                error: 'Failed to save analysis results'
            }, { status: 500 });
        }
        // Save recommendations separately
        if (analysisResult.analysis_data.recommendations.length > 0) {
            const recommendationsToInsert = analysisResult.analysis_data.recommendations.map(rec => ({
                svs_analysis_id: savedAnalysis.id,
                user_token: userToken,
                category: rec.category,
                priority: rec.priority,
                title: rec.title,
                description: rec.description,
                potential_points: rec.potential_points,
                implementation_type: rec.implementation_type,
                action_data: {}
            }));
            const { error: recError } = await supabase
                .from('svs_recommendations')
                .insert(recommendationsToInsert);
            if (recError) {
                console.error('[SVS ANALYZE] Failed to save recommendations:', recError);
            }
        }
        // Get industry benchmark for comparison (if available)
        const benchmark = industry ? await getBenchmark(industry, analysisType) : null;
        console.log(`[SVS ANALYZE] Completed analysis - Score: ${analysisResult.overall_svs_score}/100`);
        // Return comprehensive results
        return server_1.NextResponse.json({
            success: true,
            data: {
                analysis_id: savedAnalysis.id,
                svs_score: analysisResult.overall_svs_score,
                grade: semantic_analyzer_1.SemanticAnalyzer.getSVSGrade(analysisResult.overall_svs_score),
                component_scores: analysisResult.component_scores,
                analysis_data: analysisResult.analysis_data,
                benchmark_comparison: benchmark ? {
                    industry,
                    your_score: analysisResult.overall_svs_score,
                    industry_average: benchmark.avg_overall_score,
                    performance: analysisResult.overall_svs_score > benchmark.avg_overall_score ?
                        'above_average' : 'below_average',
                    percentile_estimate: calculatePercentile(analysisResult.overall_svs_score, benchmark.avg_overall_score)
                } : null,
                url_analyzed: analyzeUrl,
                content_stats: {
                    length: analysisResult.content_length,
                    processing_time: analysisResult.processing_time_ms
                },
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('[SVS ANALYZE] Unexpected error:', error);
        return server_1.NextResponse.json({
            error: 'Internal server error during SVS analysis'
        }, { status: 500 });
    }
}
/**
 * Fetch content from a webpage
 */
async function fetchPageContent(url) {
    try {
        console.log(`[SVS FETCH] Fetching content from: ${url}`);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'SEOAgent-SVS-Analyzer/1.0 (+https://seoagent.com/semantic-analysis)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'DNT': '1',
                'Connection': 'keep-alive'
            },
            signal: controller.signal
        });
        clearTimeout(timeout);
        if (!response.ok) {
            return { error: `Failed to fetch page: HTTP ${response.status}` };
        }
        const html = await response.text();
        // Extract text content from HTML (removing scripts, styles, etc.)
        const content = extractTextContent(html);
        if (!content || content.trim().length < 100) {
            return { error: 'Page content is too short or empty for meaningful analysis' };
        }
        return { content, html };
    }
    catch (error) {
        console.error('[SVS FETCH] Error fetching content:', error);
        if (error instanceof Error && error.name === 'AbortError') {
            return { error: 'Request timeout - page took too long to load' };
        }
        return { error: 'Failed to fetch page content' };
    }
}
/**
 * Extract clean text content from HTML
 */
function extractTextContent(html) {
    try {
        // Remove script and style elements
        let cleaned = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        cleaned = cleaned.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
        // Remove HTML comments
        cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
        // Convert common HTML entities
        cleaned = cleaned.replace(/&nbsp;/g, ' ');
        cleaned = cleaned.replace(/&amp;/g, '&');
        cleaned = cleaned.replace(/&lt;/g, '<');
        cleaned = cleaned.replace(/&gt;/g, '>');
        cleaned = cleaned.replace(/&quot;/g, '"');
        cleaned = cleaned.replace(/&#39;/g, "'");
        // Remove all HTML tags but preserve text content
        cleaned = cleaned.replace(/<[^>]+>/g, ' ');
        // Clean up whitespace
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        return cleaned;
    }
    catch (error) {
        console.error('[SVS] Text extraction failed:', error);
        return '';
    }
}
/**
 * Get industry benchmark data
 */
async function getBenchmark(industry, contentType = 'general') {
    try {
        const { data, error } = await supabase
            .from('svs_benchmarks')
            .select('*')
            .eq('industry', industry)
            .eq('content_type', contentType)
            .single();
        if (error || !data) {
            // Try to get general benchmark for the industry
            const { data: generalData } = await supabase
                .from('svs_benchmarks')
                .select('*')
                .eq('industry', industry)
                .eq('content_type', 'general')
                .single();
            return generalData;
        }
        return data;
    }
    catch (error) {
        console.error('[SVS] Benchmark fetch failed:', error);
        return null;
    }
}
/**
 * Calculate approximate percentile based on score and average
 */
function calculatePercentile(score, average) {
    // Simple approximation assuming normal distribution
    const standardDeviation = 15; // Estimated standard deviation for SVS scores
    const zScore = (score - average) / standardDeviation;
    // Convert z-score to percentile (approximation)
    if (zScore >= 2)
        return 98;
    if (zScore >= 1.5)
        return 93;
    if (zScore >= 1)
        return 84;
    if (zScore >= 0.5)
        return 69;
    if (zScore >= 0)
        return 50;
    if (zScore >= -0.5)
        return 31;
    if (zScore >= -1)
        return 16;
    if (zScore >= -1.5)
        return 7;
    if (zScore >= -2)
        return 2;
    return 1;
}
// GET endpoint for API documentation
async function GET() {
    return server_1.NextResponse.json({
        name: 'SVS Analysis API',
        description: 'Analyze content for Semantic Visibility Score (SVS) - how well content communicates meaning to AI search engines',
        endpoint: 'POST /api/svs/analyze',
        parameters: {
            userToken: 'User authentication token (required)',
            siteUrl: 'Website base URL (required)',
            pageUrl: 'Specific page URL to analyze (optional, defaults to siteUrl)',
            targetTopic: 'Main topic/keyword focus (optional)',
            industry: 'Industry for benchmark comparison (optional)',
            analysisType: 'Type of analysis: "full", "page", or "content_only" (default: "full")'
        },
        scoring_framework: {
            total_points: 100,
            components: {
                entity_coverage: '0-20 pts - Named entities and contextual relationships',
                semantic_variety: '0-15 pts - Natural language patterns and synonym usage',
                qa_utility: '0-15 pts - Question/answer patterns and citation-worthiness',
                citation_evidence: '0-15 pts - Stats, sources, and factual backing',
                clarity_simplicity: '0-10 pts - Readability and AI comprehensibility',
                topic_depth: '0-15 pts - Topical completeness and semantic coverage',
                structure_schema: '0-10 pts - HTML structure and schema markup'
            }
        },
        response_format: {
            analysis_id: 'Database ID of the analysis',
            svs_score: 'Overall score 0-100',
            grade: 'Letter grade (A+ to F) with label and color',
            component_scores: 'Individual scores for each component',
            analysis_data: 'Detailed findings and recommendations',
            benchmark_comparison: 'Industry comparison (if available)',
            recommendations: 'Actionable improvement suggestions'
        }
    });
}
