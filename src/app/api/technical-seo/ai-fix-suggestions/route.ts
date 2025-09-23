import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { getPromptManager } from '@/prompts';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { issueType, description, url, severity, rawData } = await request.json();

    if (!issueType || !description || !url) {
      return NextResponse.json({ error: 'Missing required parameters: issueType, description, url' }, { status: 400 });
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

    // Log prompt details
    try {
      console.log('[AI FIX][LLM] model=gpt-4o-mini', { systemPreview: getPromptManager().getPrompt('technical-seo', 'TECHNICAL_SEO_FIX_EXPERT').slice(0, 300), userPreview: prompt.slice(0, 300) });
    } catch {}

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: getPromptManager().getPrompt('technical-seo', 'TECHNICAL_SEO_FIX_EXPERT')
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    try {
      const usage: any = (completion as any).usage || {};
      console.log('[AI FIX][LLM] finish_reason=', completion.choices?.[0]?.finish_reason || 'n/a', 'usage=', usage);
    } catch {}

    const suggestion = completion.choices[0]?.message?.content || 'Unable to generate suggestion';

    return NextResponse.json({
      success: true,
      data: {
        issueType,
        url,
        severity,
        suggestion,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[AI FIX SUGGESTIONS] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI fix suggestion' }, 
      { status: 500 }
    );
  }
}
