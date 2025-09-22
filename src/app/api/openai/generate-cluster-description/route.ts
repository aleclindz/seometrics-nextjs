import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { clusterName, keywords } = await request.json();

    if (!clusterName || !keywords || !Array.isArray(keywords)) {
      return NextResponse.json(
        { error: 'Cluster name and keywords array are required' },
        { status: 400 }
      );
    }

    const keywordsList = keywords.join(', ');

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an SEO strategist creating concise, professional descriptions for topic clusters. Each description should be 1-2 sentences that explain the strategic purpose and value of the cluster for content marketing and SEO."
        },
        {
          role: "user",
          content: `Create a strategic description for the topic cluster "${clusterName}" which includes these keywords: ${keywordsList}. The description should explain how this cluster helps with SEO strategy and content planning.`
        }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const description = completion.choices[0]?.message?.content?.trim();

    if (!description) {
      throw new Error('No description generated');
    }

    return NextResponse.json({
      description,
      clusterName,
      keywordCount: keywords.length
    });

  } catch (error) {
    console.error('OpenAI description generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate cluster description' },
      { status: 500 }
    );
  }
}