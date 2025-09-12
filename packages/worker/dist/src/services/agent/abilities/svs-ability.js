"use strict";
/**
 * SVS (Semantic Visibility Score) Ability
 *
 * Handles all SVS-related functions including:
 * - Semantic analysis of content
 * - SVS score calculation
 * - Content optimization for SVS
 * - SVS-optimized content generation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SVSAbility = void 0;
const base_ability_1 = require("./base-ability");
const semantic_analyzer_1 = require("../../svs/semantic-analyzer");
const svs_optimized_content_1 = require("../../svs/svs-optimized-content");
class SVSAbility extends base_ability_1.BaseAbility {
    semanticAnalyzer;
    contentGenerator;
    getFunctionNames() {
        return [
            'analyze_svs',
            'generate_svs_optimized_content',
            'optimize_content_for_svs',
            'get_svs_recommendations',
            'analyze_svs_opportunities',
            'batch_generate_svs_content'
        ];
    }
    async executeFunction(name, args) {
        switch (name) {
            case 'analyze_svs':
                return await this.analyzeSVS(args);
            case 'generate_svs_optimized_content':
                return await this.generateSVSOptimizedContent(args);
            case 'optimize_content_for_svs':
                return await this.optimizeContentForSVS(args);
            case 'get_svs_recommendations':
                return await this.getSVSRecommendations(args);
            case 'analyze_svs_opportunities':
                return await this.analyzeSVSOpportunities(args);
            case 'batch_generate_svs_content':
                return await this.batchGenerateSVSContent(args);
            default:
                return this.error(`Unknown SVS function: ${name}`);
        }
    }
    /**
     * Initialize SVS services with OpenAI API key
     */
    async initializeSVSServices() {
        if (!this.semanticAnalyzer) {
            // Get OpenAI API key from environment
            const openaiApiKey = process.env.OPENAI_API_KEY;
            if (!openaiApiKey) {
                throw new Error('OpenAI API key not found in environment');
            }
            this.semanticAnalyzer = new semantic_analyzer_1.SemanticAnalyzer(openaiApiKey);
            this.contentGenerator = new svs_optimized_content_1.SVSOptimizedContentGenerator(openaiApiKey);
        }
    }
    /**
     * Analyze content for SVS score
     */
    async analyzeSVS(args) {
        try {
            await this.initializeSVSServices();
            const input = {
                content: args.content,
                url: args.url,
                html: args.html,
                target_topic: args.target_topic,
                industry: args.industry
            };
            const result = await this.semanticAnalyzer.analyzeSVS(input);
            return this.success({
                analysis: result,
                summary: {
                    overall_score: result.overall_svs_score,
                    recommendations_count: result.analysis_data.recommendations.length,
                    high_priority_issues: result.analysis_data.recommendations.filter(r => r.priority === 'high' || r.priority === 'critical').length
                }
            });
        }
        catch (error) {
            return this.error('Failed to analyze SVS', error);
        }
    }
    /**
     * Generate SVS-optimized content
     */
    async generateSVSOptimizedContent(args) {
        try {
            await this.initializeSVSServices();
            const request = {
                title: args.title,
                keywords: args.keywords,
                websiteDomain: args.website_domain,
                targetTopic: args.target_topic,
                industry: args.industry,
                contentLength: args.content_length || 'medium',
                tone: args.tone || 'professional',
                targetSVSScore: args.target_svs_score || 85
            };
            const result = await this.contentGenerator.generateSVSOptimizedArticle(request);
            return this.success({
                content: result,
                summary: {
                    estimated_svs_score: result.estimatedSVSScore,
                    word_count: result.wordCount,
                    optimizations_count: Object.keys(result.svsOptimizations).length,
                    recommendations_count: result.svsRecommendations.length
                }
            });
        }
        catch (error) {
            return this.error('Failed to generate SVS-optimized content', error);
        }
    }
    /**
     * Optimize existing content for better SVS score
     */
    async optimizeContentForSVS(args) {
        try {
            await this.initializeSVSServices();
            // First analyze current content
            const analysisInput = {
                content: args.content,
                url: args.current_url || '',
                target_topic: args.title
            };
            const currentAnalysis = await this.semanticAnalyzer.analyzeSVS(analysisInput);
            // Then get optimization opportunities
            const opportunities = await this.contentGenerator.analyzeSVSOpportunities(args.content, args.title, args.keywords);
            return this.success({
                current_svs_score: currentAnalysis.overall_svs_score,
                target_svs_score: args.target_svs_score || 85,
                optimization_opportunities: opportunities,
                recommendations: currentAnalysis.analysis_data.recommendations,
                potential_improvements: opportunities.improvements
            });
        }
        catch (error) {
            return this.error('Failed to optimize content for SVS', error);
        }
    }
    /**
     * Get SVS improvement recommendations for content
     */
    async getSVSRecommendations(args) {
        try {
            await this.initializeSVSServices();
            const input = {
                content: args.content,
                url: args.url
            };
            const analysis = await this.semanticAnalyzer.analyzeSVS(input);
            // Filter recommendations by focus areas if specified
            let recommendations = analysis.analysis_data.recommendations;
            if (args.focus_areas && args.focus_areas.length > 0) {
                recommendations = recommendations.filter(rec => args.focus_areas.some(area => rec.category.toLowerCase().includes(area.toLowerCase())));
            }
            // Sort by priority and potential points
            recommendations.sort((a, b) => {
                const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                const aPriority = priorityOrder[a.priority];
                const bPriority = priorityOrder[b.priority];
                if (aPriority !== bPriority)
                    return bPriority - aPriority;
                return b.potential_points - a.potential_points;
            });
            return this.success({
                current_score: analysis.overall_svs_score,
                recommendations: recommendations.slice(0, 10), // Top 10 recommendations
                component_scores: analysis.component_scores,
                quick_wins: recommendations.filter(rec => rec.implementation_type === 'auto_fixable' && rec.priority === 'high').slice(0, 3)
            });
        }
        catch (error) {
            return this.error('Failed to get SVS recommendations', error);
        }
    }
    /**
     * Analyze SVS opportunities for existing content
     */
    async analyzeSVSOpportunities(args) {
        try {
            await this.initializeSVSServices();
            const opportunities = await this.contentGenerator.analyzeSVSOpportunities(args.content, args.title, args.keywords);
            return this.success(opportunities);
        }
        catch (error) {
            return this.error('Failed to analyze SVS opportunities', error);
        }
    }
    /**
     * Generate multiple pieces of SVS-optimized content in batch
     */
    async batchGenerateSVSContent(args) {
        try {
            await this.initializeSVSServices();
            const requests = args.requests.map(req => ({
                title: req.title,
                keywords: req.keywords,
                websiteDomain: req.website_domain,
                targetTopic: req.target_topic,
                industry: req.industry,
                contentLength: args.default_settings?.content_length || 'medium',
                tone: args.default_settings?.tone || 'professional',
                targetSVSScore: args.default_settings?.target_svs_score || 85
            }));
            const results = await this.contentGenerator.generateBatch(requests);
            return this.success({
                generated_count: results.length,
                results: results,
                average_svs_score: results.reduce((sum, result) => sum + result.estimatedSVSScore, 0) / results.length,
                total_word_count: results.reduce((sum, result) => sum + result.wordCount, 0)
            });
        }
        catch (error) {
            return this.error('Failed to batch generate SVS content', error);
        }
    }
}
exports.SVSAbility = SVSAbility;
