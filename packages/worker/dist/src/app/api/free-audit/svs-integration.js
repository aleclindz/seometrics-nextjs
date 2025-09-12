"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSVSAnalysis = runSVSAnalysis;
// SVS Integration for Free Audit System
const semantic_analyzer_1 = require("@/services/svs/semantic-analyzer");
// SVS (Semantic Visibility Score) analysis function
async function runSVSAnalysis(websiteUrl) {
    try {
        console.log(`[SVS] Running Semantic Visibility Score analysis for: ${websiteUrl}`);
        // Fetch page content
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        const response = await fetch(websiteUrl, {
            headers: {
                'User-Agent': 'SEOAgent-Free-Audit-SVS/1.0 (+https://seoagent.com/free-audit)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            signal: controller.signal
        });
        clearTimeout(timeout);
        if (!response.ok) {
            console.log(`[SVS] Failed to fetch content: HTTP ${response.status}`);
            return null;
        }
        const html = await response.text();
        // Extract text content from HTML
        const content = extractSVSContent(html);
        if (!content || content.trim().length < 200) {
            console.log(`[SVS] Content too short for meaningful analysis: ${content?.length || 0} chars`);
            return null;
        }
        // Run SVS analysis
        const analyzer = new semantic_analyzer_1.SemanticAnalyzer(process.env.OPENAI_API_KEY);
        const analysisResult = await analyzer.analyzeSVS({
            content,
            url: websiteUrl,
            html
        });
        console.log(`[SVS] Analysis completed - Score: ${analysisResult.overall_svs_score}/100`);
        return {
            overall_svs_score: analysisResult.overall_svs_score,
            grade: semantic_analyzer_1.SemanticAnalyzer.getSVSGrade(analysisResult.overall_svs_score),
            component_scores: analysisResult.component_scores,
            analysis_data: analysisResult.analysis_data
        };
    }
    catch (error) {
        console.error('[SVS] Analysis failed:', error);
        // Return null instead of throwing to prevent breaking the entire audit
        return null;
    }
}
// Helper function to extract clean text content for SVS analysis
function extractSVSContent(html) {
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
