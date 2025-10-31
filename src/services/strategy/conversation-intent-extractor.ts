/**
 * Conversation Intent Extractor
 *
 * Uses LLM to analyze multi-turn conversations and extract programmatic SEO patterns.
 * Handles cases where users confirm previously suggested lists (e.g., "sure", "yes", "go ahead").
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export interface ExtractedProgrammaticIntent {
  detected: boolean;
  template?: string;
  term_lists?: Record<string, string[]>;
  confidence: number;
  reasoning?: string;
}

/**
 * Analyzes a conversation history to extract programmatic SEO patterns
 *
 * @param messages - Recent conversation messages (last 10-15 recommended)
 * @param domain - Optional website domain for context
 * @returns Extracted template and term lists with confidence score
 */
export async function extractProgrammaticIntentFromConversation(
  messages: ConversationMessage[],
  domain?: string
): Promise<ExtractedProgrammaticIntent> {

  if (!messages || messages.length === 0) {
    return {
      detected: false,
      confidence: 0,
      reasoning: 'No conversation messages provided'
    };
  }

  // Format conversation for LLM analysis
  const conversationText = messages
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n\n');

  const analysisPrompt = `You are an expert at analyzing conversations to extract programmatic SEO intent.

Analyze this conversation and determine if the user wants to create programmatic SEO content (articles that follow a template with variable terms).

CONVERSATION:
${conversationText}

${domain ? `WEBSITE DOMAIN: ${domain}` : ''}

TASK:
1. Determine if this conversation indicates the user wants programmatic SEO content
2. Extract the template pattern (e.g., "How to grow your {content} channel on YouTube using {location}")
3. Extract the term lists that should replace variables (e.g., {content: ['Gaming', 'Vlog', 'Music'], location: ['USA', 'UK', 'Canada']})

IMPORTANT PATTERNS TO RECOGNIZE:
- User confirms a previously suggested list (e.g., "sure", "yes", "go ahead", "looks good")
- User provides a template with variables in {curly braces}
- User mentions creating content for "different types/categories/locations"
- Assistant suggests specific items and user agrees

RESPONSE FORMAT (JSON):
{
  "detected": true/false,
  "template": "The template pattern with {variable} placeholders",
  "term_lists": {
    "variable_name": ["term1", "term2", "term3"],
    "another_variable": ["value1", "value2"]
  },
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of what you detected"
}

EXAMPLES:

Example 1 - Confirmation of Suggested List:
User: "I want programmatic SEO for different content creators"
Assistant: "Great! Here are types: Vloggers, Educators, Gaming Streamers. Locations: USA, UK, Canada"
User: "sure"

Response:
{
  "detected": true,
  "template": "How to grow your {content} channel on YouTube",
  "term_lists": {
    "content": ["Vloggers", "Educators", "Gaming Streamers"]
  },
  "confidence": 0.95,
  "reasoning": "User confirmed the assistant's suggested list of content creator types"
}

Example 2 - User Provides Template:
User: "Create briefs with template 'Best {product} for {location}' using smartphones in major cities"

Response:
{
  "detected": true,
  "template": "Best {product} for {location}",
  "term_lists": {
    "product": ["smartphones"],
    "location": ["major cities"]
  },
  "confidence": 0.85,
  "reasoning": "User explicitly provided template and mentioned product/location terms"
}

Example 3 - No Programmatic Intent:
User: "Write me a blog post about SEO"

Response:
{
  "detected": false,
  "confidence": 0.0,
  "reasoning": "User wants a single article, not programmatic content"
}

Now analyze the conversation above and respond with JSON only:`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at extracting structured data from conversations. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      temperature: 0.2, // Low temperature for consistent extraction
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    return {
      detected: result.detected || false,
      template: result.template,
      term_lists: result.term_lists,
      confidence: result.confidence || 0,
      reasoning: result.reasoning
    };

  } catch (error) {
    console.error('[CONVERSATION INTENT EXTRACTOR] Error:', error);
    return {
      detected: false,
      confidence: 0,
      reasoning: `Error analyzing conversation: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Simple check if a message is likely a confirmation
 */
export function isConfirmationMessage(message: string): boolean {
  const confirmationPatterns = [
    /^(sure|yes|yeah|yep|ok|okay|sounds good|looks good|let's do it|go ahead|proceed|correct|that's right|perfect)\.?$/i,
    /^(do it|go for it|make it happen|create them|generate them)\.?$/i
  ];

  const normalized = message.trim().toLowerCase();
  return confirmationPatterns.some(pattern => pattern.test(normalized));
}

/**
 * Check if conversation contains programmatic SEO indicators
 */
export function hasProactiveOpportunity(messages: ConversationMessage[]): boolean {
  const recentUserMessages = messages
    .filter(msg => msg.role === 'user')
    .slice(-3)
    .map(msg => msg.content.toLowerCase());

  const triggers = [
    'content ideas',
    'blog posts',
    'many articles',
    'scaling content',
    'different locations',
    'different products',
    'different categories',
    'different types',
    'programmatic',
    'bulk content',
    'automated content'
  ];

  return recentUserMessages.some(content =>
    triggers.some(trigger => content.includes(trigger))
  );
}
