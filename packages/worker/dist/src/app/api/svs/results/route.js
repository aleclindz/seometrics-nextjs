"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const semantic_analyzer_1 = require("@/services/svs/semantic-analyzer");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        const siteUrl = searchParams.get('siteUrl');
        const pageUrl = searchParams.get('pageUrl');
        const limit = parseInt(searchParams.get('limit') || '10');
        const analysisId = searchParams.get('analysisId');
        if (!userToken) {
            return server_1.NextResponse.json({
                error: 'Missing required parameter: userToken'
            }, { status: 400 });
        }
        // Validate user exists
        const { data: user, error: userError } = await supabase
            .from('login_users')
            .select('id')
            .eq('token', userToken)
            .single();
        if (userError || !user) {
            return server_1.NextResponse.json({ error: 'Invalid user token' }, { status: 401 });
        }
        // Build query
        let query = supabase
            .from('svs_analyses')
            .select(`
        id,
        site_url,
        page_url,
        overall_svs_score,
        entity_coverage_score,
        semantic_variety_score,
        qa_utility_score,
        citation_evidence_score,
        clarity_simplicity_score,
        topic_depth_score,
        structure_schema_score,
        analysis_data,
        analysis_type,
        content_length,
        processing_time_ms,
        analyzed_at,
        created_at
      `)
            .eq('user_token', userToken);
        // Apply filters
        if (analysisId) {
            query = query.eq('id', analysisId);
        }
        else {
            if (siteUrl) {
                query = query.eq('site_url', siteUrl);
            }
            if (pageUrl) {
                query = query.eq('page_url', pageUrl);
            }
            // Order by most recent and limit
            query = query
                .order('analyzed_at', { ascending: false })
                .limit(Math.min(limit, 50)); // Cap at 50 results
        }
        const { data: analyses, error: queryError } = await query;
        if (queryError) {
            console.error('[SVS RESULTS] Query failed:', queryError);
            return server_1.NextResponse.json({
                error: 'Failed to fetch SVS results'
            }, { status: 500 });
        }
        if (!analyses || analyses.length === 0) {
            return server_1.NextResponse.json({
                success: true,
                data: {
                    analyses: [],
                    total_count: 0,
                    message: 'No SVS analyses found'
                }
            });
        }
        // If single analysis requested, also fetch recommendations
        if (analysisId && analyses.length > 0) {
            const { data: recommendations } = await supabase
                .from('svs_recommendations')
                .select('*')
                .eq('svs_analysis_id', analysisId)
                .order('priority', { ascending: false })
                .order('potential_points', { ascending: false });
            const analysis = analyses[0];
            const enrichedAnalysis = {
                ...analysis,
                grade: semantic_analyzer_1.SemanticAnalyzer.getSVSGrade(analysis.overall_svs_score),
                recommendations: recommendations || [],
                component_breakdown: {
                    entity_coverage: {
                        score: analysis.entity_coverage_score,
                        max_score: 20,
                        percentage: Math.round((analysis.entity_coverage_score / 20) * 100)
                    },
                    semantic_variety: {
                        score: analysis.semantic_variety_score,
                        max_score: 15,
                        percentage: Math.round((analysis.semantic_variety_score / 15) * 100)
                    },
                    qa_utility: {
                        score: analysis.qa_utility_score,
                        max_score: 15,
                        percentage: Math.round((analysis.qa_utility_score / 15) * 100)
                    },
                    citation_evidence: {
                        score: analysis.citation_evidence_score,
                        max_score: 15,
                        percentage: Math.round((analysis.citation_evidence_score / 15) * 100)
                    },
                    clarity_simplicity: {
                        score: analysis.clarity_simplicity_score,
                        max_score: 10,
                        percentage: Math.round((analysis.clarity_simplicity_score / 10) * 100)
                    },
                    topic_depth: {
                        score: analysis.topic_depth_score,
                        max_score: 15,
                        percentage: Math.round((analysis.topic_depth_score / 15) * 100)
                    },
                    structure_schema: {
                        score: analysis.structure_schema_score,
                        max_score: 10,
                        percentage: Math.round((analysis.structure_schema_score / 10) * 100)
                    }
                }
            };
            return server_1.NextResponse.json({
                success: true,
                data: {
                    analysis: enrichedAnalysis
                }
            });
        }
        // For multiple analyses, return summary format
        const enrichedAnalyses = analyses.map(analysis => ({
            id: analysis.id,
            site_url: analysis.site_url,
            page_url: analysis.page_url,
            svs_score: analysis.overall_svs_score,
            grade: semantic_analyzer_1.SemanticAnalyzer.getSVSGrade(analysis.overall_svs_score),
            component_scores: {
                entity_coverage: analysis.entity_coverage_score,
                semantic_variety: analysis.semantic_variety_score,
                qa_utility: analysis.qa_utility_score,
                citation_evidence: analysis.citation_evidence_score,
                clarity_simplicity: analysis.clarity_simplicity_score,
                topic_depth: analysis.topic_depth_score,
                structure_schema: analysis.structure_schema_score
            },
            analysis_type: analysis.analysis_type,
            content_length: analysis.content_length,
            analyzed_at: analysis.analyzed_at,
            created_at: analysis.created_at
        }));
        // Calculate summary statistics
        const totalAnalyses = enrichedAnalyses.length;
        const averageScore = totalAnalyses > 0 ?
            Math.round(enrichedAnalyses.reduce((sum, a) => sum + a.svs_score, 0) / totalAnalyses) : 0;
        const scoreDistribution = {
            excellent: enrichedAnalyses.filter(a => a.svs_score >= 85).length,
            good: enrichedAnalyses.filter(a => a.svs_score >= 70 && a.svs_score < 85).length,
            average: enrichedAnalyses.filter(a => a.svs_score >= 55 && a.svs_score < 70).length,
            poor: enrichedAnalyses.filter(a => a.svs_score < 55).length
        };
        return server_1.NextResponse.json({
            success: true,
            data: {
                analyses: enrichedAnalyses,
                total_count: totalAnalyses,
                summary: {
                    average_score: averageScore,
                    highest_score: totalAnalyses > 0 ? Math.max(...enrichedAnalyses.map(a => a.svs_score)) : 0,
                    lowest_score: totalAnalyses > 0 ? Math.min(...enrichedAnalyses.map(a => a.svs_score)) : 0,
                    score_distribution: scoreDistribution,
                    most_recent: enrichedAnalyses[0]?.analyzed_at || null
                },
                filters: {
                    user_token: userToken,
                    site_url: siteUrl,
                    page_url: pageUrl,
                    limit
                }
            }
        });
    }
    catch (error) {
        console.error('[SVS RESULTS] Unexpected error:', error);
        return server_1.NextResponse.json({
            error: 'Internal server error while fetching SVS results'
        }, { status: 500 });
    }
}
// POST endpoint for bulk operations (like marking recommendations as implemented)
async function POST(request) {
    try {
        const body = await request.json();
        const { userToken, action, data } = body;
        if (!userToken || !action) {
            return server_1.NextResponse.json({
                error: 'Missing required parameters: userToken and action'
            }, { status: 400 });
        }
        // Validate user exists
        const { data: user, error: userError } = await supabase
            .from('login_users')
            .select('id')
            .eq('token', userToken)
            .single();
        if (userError || !user) {
            return server_1.NextResponse.json({ error: 'Invalid user token' }, { status: 401 });
        }
        switch (action) {
            case 'update_recommendation_status':
                const { recommendationIds, status } = data;
                if (!recommendationIds || !Array.isArray(recommendationIds) || !status) {
                    return server_1.NextResponse.json({
                        error: 'Invalid data for update_recommendation_status'
                    }, { status: 400 });
                }
                const updateData = {
                    status,
                    updated_at: new Date().toISOString()
                };
                if (status === 'implemented') {
                    updateData.implemented_at = new Date().toISOString();
                }
                const { data: updatedRecs, error: updateError } = await supabase
                    .from('svs_recommendations')
                    .update(updateData)
                    .in('id', recommendationIds)
                    .eq('user_token', userToken)
                    .select();
                if (updateError) {
                    return server_1.NextResponse.json({
                        error: 'Failed to update recommendation status'
                    }, { status: 500 });
                }
                return server_1.NextResponse.json({
                    success: true,
                    data: {
                        updated_recommendations: updatedRecs?.length || 0,
                        message: `Updated ${updatedRecs?.length || 0} recommendations to ${status}`
                    }
                });
            case 'delete_analysis':
                const { analysisId } = data;
                if (!analysisId) {
                    return server_1.NextResponse.json({
                        error: 'analysisId required for delete_analysis'
                    }, { status: 400 });
                }
                // Delete analysis (recommendations will be deleted automatically via CASCADE)
                const { error: deleteError } = await supabase
                    .from('svs_analyses')
                    .delete()
                    .eq('id', analysisId)
                    .eq('user_token', userToken);
                if (deleteError) {
                    return server_1.NextResponse.json({
                        error: 'Failed to delete analysis'
                    }, { status: 500 });
                }
                return server_1.NextResponse.json({
                    success: true,
                    data: {
                        message: 'Analysis deleted successfully'
                    }
                });
            default:
                return server_1.NextResponse.json({
                    error: `Unknown action: ${action}`
                }, { status: 400 });
        }
    }
    catch (error) {
        console.error('[SVS RESULTS POST] Unexpected error:', error);
        return server_1.NextResponse.json({
            error: 'Internal server error during SVS results operation'
        }, { status: 500 });
    }
}
