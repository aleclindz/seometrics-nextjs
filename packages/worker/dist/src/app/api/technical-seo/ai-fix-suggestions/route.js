"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.POST = POST;
const server_1 = require("next/server");
const openai_1 = require("openai");
const prompts_1 = require("@/prompts");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
const openai = new openai_1.OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
async function POST(request) {
    try {
        const { issueType, description, url, severity, rawData } = await request.json();
        if (!issueType || !description || !url) {
            return server_1.NextResponse.json({ error: 'Missing required parameters: issueType, description, url' }, { status: 400 });
        }
        // Create a detailed prompt for fix suggestions
        const prompt = `You are SEOAgent's Technical SEO expert. A website has the following technical SEO issue:

**Issue Type:** ${issueType}
**Severity:** ${severity}
**URL:** ${url}
**Description:** ${description}
**Raw Data:** ${rawData ? JSON.stringify(rawData, null, 2) : 'Not available'}

Provide a clear, actionable fix that the user can copy and give to their developer or AI website builder. Format your response as:

**Problem:** [Brief explanation of why this is an issue]
**Solution:** [Step-by-step fix instructions]
**Code/Settings:** [Specific code examples or settings to change]
**Priority:** [How urgent this fix is]

Keep it concise, technical but understandable, and focused on actionable steps.`;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: (0, prompts_1.getPromptManager)().getPrompt('technical-seo', 'TECHNICAL_SEO_FIX_EXPERT')
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 500,
            temperature: 0.3,
        });
        const suggestion = completion.choices[0]?.message?.content || 'Unable to generate suggestion';
        return server_1.NextResponse.json({
            success: true,
            data: {
                issueType,
                url,
                severity,
                suggestion,
                generatedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('[AI FIX SUGGESTIONS] Error:', error);
        return server_1.NextResponse.json({ error: 'Failed to generate AI fix suggestion' }, { status: 500 });
    }
}
