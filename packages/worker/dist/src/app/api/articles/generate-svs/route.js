"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const svs_optimized_content_1 = require("@/services/svs/svs-optimized-content");
const semantic_analyzer_1 = require("@/services/svs/semantic-analyzer");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function POST(request) {
    try {
        const body = await request.json();
        const { userToken, websiteToken, title, keywords, websiteDomain, targetTopic, industry, contentLength = 'medium', tone = 'professional', targetSVSScore = 80, performSVSAnalysis = true, saveToDatabase = true } = body;
        if (!userToken || !title || !keywords || keywords.length === 0) {
            return server_1.NextResponse.json({
                error: 'Missing required parameters: userToken, title, and keywords'
            }, { status: 400 });
        }
        console.log(`[SVS ARTICLE] Starting SVS-optimized generation: "${title}" (Target SVS: ${targetSVSScore})`);
        // Validate user exists
        const { data: user, error: userError } = await supabase
            .from('login_users')
            .select('id, email')
            .eq('token', userToken)
            .single();
        if (userError || !user) {
            return server_1.NextResponse.json({ error: 'Invalid user token' }, { status: 401 });
        }
        const generationStartTime = Date.now();
        // Generate SVS-optimized content
        const contentGenerator = new svs_optimized_content_1.SVSOptimizedContentGenerator(process.env.OPENAI_API_KEY);
        const contentRequest = {
            title,
            keywords,
            websiteDomain,
            targetTopic: targetTopic || title,
            industry,
            contentLength,
            tone,
            targetSVSScore
        };
        const generatedContent = await contentGenerator.generateSVSOptimizedArticle(contentRequest);
        const generationTime = Date.now() - generationStartTime;
        let actualSVSAnalysis = null;
        let svsAnalysisTime = 0;
        // Perform actual SVS analysis on generated content if requested
        if (performSVSAnalysis) {
            console.log(`[SVS ARTICLE] Running SVS analysis on generated content`);
            const analysisStartTime = Date.now();
            try {
                const analyzer = new semantic_analyzer_1.SemanticAnalyzer(process.env.OPENAI_API_KEY);
                actualSVSAnalysis = await analyzer.analyzeSVS({
                    content: generatedContent.content.replace(/<[^>]+>/g, ' '), // Strip HTML for analysis
                    url: websiteDomain ? `https://${websiteDomain}` : 'https://example.com',
                    html: generatedContent.content,
                    target_topic: targetTopic || title,
                    industry
                });
                svsAnalysisTime = Date.now() - analysisStartTime;
                console.log(`[SVS ARTICLE] SVS analysis completed: ${actualSVSAnalysis.overall_svs_score}/100 (estimated: ${generatedContent.estimatedSVSScore})`);
            }
            catch (analysisError) {
                console.error('[SVS ARTICLE] SVS analysis failed:', analysisError);
                // Continue without analysis rather than failing the entire generation
            }
        }
        let savedArticleId = null;
        // Save to database if requested
        if (saveToDatabase) {
            try {
                const { data: savedArticle, error: saveError } = await supabase
                    .from('articles')
                    .insert({
                    user_token: userToken,
                    website_token: websiteToken,
                    title: generatedContent.metaTitle || title,
                    slug: generateSlug(title),
                    content: generatedContent.content,
                    meta_description: generatedContent.metaDescription,
                    target_keywords: keywords,
                    word_count: generatedContent.wordCount,
                    status: 'draft',
                    // SVS-specific fields (add these to your schema if needed)
                    content_outline: generatedContent.contentOutline,
                    svs_optimizations: generatedContent.svsOptimizations,
                    estimated_svs_score: generatedContent.estimatedSVSScore,
                    actual_svs_score: actualSVSAnalysis?.overall_svs_score,
                    svs_component_scores: actualSVSAnalysis?.component_scores,
                    // Generation metadata
                    generation_method: 'svs_optimized',
                    generation_time_ms: generationTime,
                    svs_analysis_time_ms: svsAnalysisTime,
                    target_svs_score: targetSVSScore,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                    .select()
                    .single();
                if (saveError) {
                    console.error('[SVS ARTICLE] Failed to save article:', saveError);
                }
                else {
                    savedArticleId = savedArticle.id;
                    console.log(`[SVS ARTICLE] Article saved with ID: ${savedArticleId}`);
                    // Save SVS analysis separately if we have it
                    if (actualSVSAnalysis) {
                        try {
                            await supabase
                                .from('svs_analyses')
                                .insert({
                                user_token: userToken,
                                website_token: websiteToken,
                                site_url: websiteDomain ? `https://${websiteDomain}` : 'generated-content',
                                page_url: null, // This is generated content, not a live page
                                overall_svs_score: actualSVSAnalysis.overall_svs_score,
                                entity_coverage_score: actualSVSAnalysis.component_scores.entity_coverage,
                                semantic_variety_score: actualSVSAnalysis.component_scores.semantic_variety,
                                qa_utility_score: actualSVSAnalysis.component_scores.qa_utility,
                                citation_evidence_score: actualSVSAnalysis.component_scores.citation_evidence,
                                clarity_simplicity_score: actualSVSAnalysis.component_scores.clarity_simplicity,
                                topic_depth_score: actualSVSAnalysis.component_scores.topic_depth,
                                structure_schema_score: actualSVSAnalysis.component_scores.structure_schema,
                                analysis_data: actualSVSAnalysis.analysis_data,
                                analysis_type: 'generated_content',
                                content_length: generatedContent.wordCount,
                                processing_time_ms: svsAnalysisTime
                            });
                        }
                        catch (svsError) {
                            console.error('[SVS ARTICLE] Failed to save SVS analysis:', svsError);
                        }
                    }
                }
            }
            catch (error) {
                console.error('[SVS ARTICLE] Database operation failed:', error);
            }
        }
        const totalTime = Date.now() - generationStartTime;
        console.log(`[SVS ARTICLE] Generation completed in ${totalTime}ms`);
        // Return comprehensive results
        return server_1.NextResponse.json({
            success: true,
            data: {
                // Generated content
                title: generatedContent.metaTitle || title,
                content: generatedContent.content,
                metaDescription: generatedContent.metaDescription,
                contentOutline: generatedContent.contentOutline,
                wordCount: generatedContent.wordCount,
                // SVS optimization data
                svsOptimizations: generatedContent.svsOptimizations,
                estimatedSVSScore: generatedContent.estimatedSVSScore,
                svsRecommendations: generatedContent.svsRecommendations,
                // Actual SVS analysis (if performed)
                actualSVSAnalysis: actualSVSAnalysis ? {
                    overall_score: actualSVSAnalysis.overall_svs_score,
                    grade: semantic_analyzer_1.SemanticAnalyzer.getSVSGrade(actualSVSAnalysis.overall_svs_score),
                    component_scores: actualSVSAnalysis.component_scores,
                    recommendations: actualSVSAnalysis.analysis_data.recommendations.slice(0, 5),
                    accuracy: actualSVSAnalysis.overall_svs_score >= (targetSVSScore - 10) ? 'on_target' :
                        actualSVSAnalysis.overall_svs_score >= (targetSVSScore - 20) ? 'close' : 'needs_improvement'
                } : null,
                // Metadata
                savedArticleId,
                generationParams: {
                    targetSVSScore,
                    contentLength,
                    tone,
                    industry,
                    targetTopic: targetTopic || title
                },
                performance: {
                    generationTime: generationTime,
                    svsAnalysisTime: svsAnalysisTime,
                    totalTime: totalTime
                },
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('[SVS ARTICLE] Generation failed:', error);
        return server_1.NextResponse.json({
            error: 'Failed to generate SVS-optimized article',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
// Helper function to generate URL-friendly slug
function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .trim()
        .slice(0, 100); // Limit length
}
// GET endpoint for API documentation
async function GET() {
    return server_1.NextResponse.json({
        name: 'SVS-Optimized Article Generation API',
        description: 'Generate articles optimized for Semantic Visibility Score (SVS) - content that communicates effectively to AI search engines',
        endpoint: 'POST /api/articles/generate-svs',
        parameters: {
            userToken: 'User authentication token (required)',
            title: 'Article title (required)',
            keywords: 'Array of target keywords (required)',
            websiteToken: 'Website token for association (optional)',
            websiteDomain: 'Website domain for context (optional)',
            targetTopic: 'Main topic focus (optional, defaults to title)',
            industry: 'Industry context for optimization (optional)',
            contentLength: '"short" (800-1200), "medium" (1500-2500), "long" (3000-4500) - default: "medium"',
            tone: '"professional", "casual", "technical" - default: "professional"',
            targetSVSScore: 'Target SVS score 0-100 (default: 80)',
            performSVSAnalysis: 'Whether to analyze generated content (default: true)',
            saveToDatabase: 'Whether to save article to database (default: true)'
        },
        svs_optimizations: {
            entity_coverage: 'Named entities and contextual relationships',
            semantic_variety: 'Natural language patterns and synonyms',
            qa_utility: 'Question/answer sections and citation-worthy content',
            citation_evidence: 'Statistics, studies, and credible sources',
            clarity_simplicity: 'Readability and AI comprehensibility',
            topic_depth: 'Comprehensive coverage and subtopics',
            structure_schema: 'Proper HTML structure and schema markup'
        },
        response_format: {
            content: 'Generated article HTML content',
            svsOptimizations: 'Details of SVS-specific optimizations applied',
            estimatedSVSScore: 'AI estimate of SVS score before analysis',
            actualSVSAnalysis: 'Real SVS analysis results (if performed)',
            savedArticleId: 'Database ID if saved',
            performance: 'Generation and analysis timing data'
        }
    });
}
