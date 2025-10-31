import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  detectProgrammaticPatterns,
  extractExplicitTemplate,
  validateTemplateAndLists,
  type ProgrammaticPattern
} from '@/services/strategy/programmatic-pattern-detector';
import {
  generateProgrammaticBriefs,
  type ProgrammaticBriefConfig
} from '@/services/strategy/programmatic-brief-generator';
import {
  extractProgrammaticIntentFromConversation,
  isConfirmationMessage,
  type ConversationMessage
} from '@/services/strategy/conversation-intent-extractor';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

interface ProgrammaticBriefsRequest {
  userToken: string;
  websiteToken?: string;
  domain?: string;

  // Automatic detection mode
  user_message?: string; // User's natural language request
  auto_detect?: boolean; // Enable automatic pattern detection
  conversation_id?: string; // For conversation context extraction

  // Manual specification mode
  pattern_type?: ProgrammaticPattern;
  template?: string;
  term_lists?: Record<string, string[]>;

  // Configuration
  max_briefs?: number;
  deduplicate?: boolean;
  parent_cluster?: string | null;
}

/**
 * Programmatic SEO Brief Generation API
 *
 * Supports two modes:
 * 1. Automatic detection: Provide user_message and let AI detect patterns
 * 2. Manual specification: Provide template and term_lists explicitly
 *
 * POST /api/agent/briefs/generate-programmatic
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ProgrammaticBriefsRequest;
    const {
      userToken,
      websiteToken,
      domain,
      user_message,
      auto_detect = true,
      conversation_id,
      pattern_type,
      template,
      term_lists,
      max_briefs = 100,
      deduplicate = true,
      parent_cluster = null
    } = body;

    // Validate required fields
    if (!userToken) {
      return NextResponse.json(
        { success: false, error: 'userToken is required' },
        { status: 400 }
      );
    }

    if (!websiteToken && !domain) {
      return NextResponse.json(
        { success: false, error: 'websiteToken or domain is required' },
        { status: 400 }
      );
    }

    // Resolve website token from domain if needed
    let effectiveWebsiteToken = websiteToken || '';
    if (!effectiveWebsiteToken && domain) {
      const cleanedDomain = domain.replace(/^sc-domain:/, '').replace(/^https?:\/\//, '').replace(/\/$/, '');

      const { data: site, error } = await supabase
        .from('websites')
        .select('website_token')
        .eq('user_token', userToken)
        .or(`domain.eq.${cleanedDomain},cleaned_domain.eq.${cleanedDomain}`)
        .maybeSingle();

      if (error || !site) {
        return NextResponse.json(
          { success: false, error: 'Website not found' },
          { status: 404 }
        );
      }

      effectiveWebsiteToken = site.website_token;
    }

    // MODE 1: Automatic detection from user message
    if (auto_detect && user_message) {
      console.log('[PROGRAMMATIC API] Auto-detecting patterns from message');

      const detection = detectProgrammaticPatterns(user_message, domain);

      // FALLBACK: If simple pattern detection fails, try extracting from conversation context
      if ((!detection.detected || detection.patterns.length === 0) && conversation_id) {
        console.log('[PROGRAMMATIC API] Pattern detection failed, trying conversation context extraction');

        // Check if message is a simple confirmation
        const isConfirmation = isConfirmationMessage(user_message);
        console.log('[PROGRAMMATIC API] Is confirmation message:', isConfirmation);

        // Fetch recent conversation messages
        const { data: conversationMessages, error: convError } = await supabase
          .from('agent_conversations')
          .select('message_role, message_content, created_at')
          .eq('conversation_id', conversation_id)
          .order('message_order', { ascending: true })
          .limit(15);

        if (convError) {
          console.error('[PROGRAMMATIC API] Error fetching conversation:', convError);
        } else if (conversationMessages && conversationMessages.length > 0) {
          console.log('[PROGRAMMATIC API] Analyzing conversation with', conversationMessages.length, 'messages');

          // Format messages for intent extraction
          const formattedMessages: ConversationMessage[] = conversationMessages.map(msg => ({
            role: msg.message_role as 'user' | 'assistant',
            content: msg.message_content || '',
            created_at: msg.created_at
          }));

          // Use LLM to extract intent from conversation
          const intent = await extractProgrammaticIntentFromConversation(formattedMessages, domain);

          console.log('[PROGRAMMATIC API] Conversation intent extraction result:', {
            detected: intent.detected,
            confidence: intent.confidence,
            reasoning: intent.reasoning
          });

          // If LLM detected programmatic intent with reasonable confidence
          if (intent.detected && intent.confidence >= 0.7 && intent.template && intent.term_lists) {
            console.log('[PROGRAMMATIC API] Using extracted intent from conversation');

            const config: ProgrammaticBriefConfig = {
              template: intent.template,
              term_lists: intent.term_lists,
              pattern_type: 'custom',
              website_token: effectiveWebsiteToken,
              user_token: userToken,
              max_briefs,
              deduplicate,
              parent_cluster
            };

            const result = await generateProgrammaticBriefs(config);

            return NextResponse.json({
              success: result.success,
              briefs: result.briefs,
              total_generated: result.total_generated,
              skipped_duplicates: result.skipped_duplicates,
              permutation_group_id: result.permutation_group_id,
              pattern_detected: {
                type: 'conversation-extracted',
                template: intent.template,
                confidence: intent.confidence,
                explanation: intent.reasoning || 'Extracted from conversation context'
              },
              error: result.error
            });
          }
        }

        // If we still can't detect patterns, return helpful error
        return NextResponse.json({
          success: false,
          error: 'No programmatic SEO patterns detected in message or conversation',
          suggestion: 'Try providing a comma-separated list (e.g., "Miami, Tampa, Orlando") or explicitly specify: "Create briefs with template \'Best {product} for {location}\'"'
        }, { status: 400 });
      }

      // If simple detection succeeded, use the detected pattern
      if (!detection.detected || detection.patterns.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No programmatic SEO patterns detected in message',
          suggestion: 'Try providing a comma-separated list (e.g., "Miami, Tampa, Orlando") or use an explicit template'
        }, { status: 400 });
      }

      // Use the highest confidence pattern
      const bestPattern = detection.patterns[0];
      console.log('[PROGRAMMATIC API] Detected pattern:', {
        type: bestPattern.pattern_type,
        confidence: bestPattern.confidence,
        estimated: bestPattern.estimated_briefs
      });

      // Check if explicit template was also provided
      const explicitTemplate = extractExplicitTemplate(user_message);

      const config: ProgrammaticBriefConfig = {
        template: explicitTemplate || bestPattern.template,
        term_lists: bestPattern.term_lists,
        pattern_type: bestPattern.pattern_type,
        website_token: effectiveWebsiteToken,
        user_token: userToken,
        max_briefs,
        deduplicate,
        parent_cluster
      };

      const result = await generateProgrammaticBriefs(config);

      return NextResponse.json({
        success: result.success,
        briefs: result.briefs,
        total_generated: result.total_generated,
        skipped_duplicates: result.skipped_duplicates,
        permutation_group_id: result.permutation_group_id,
        pattern_detected: {
          type: bestPattern.pattern_type,
          template: config.template,
          confidence: bestPattern.confidence,
          explanation: bestPattern.explanation
        },
        error: result.error
      });
    }

    // MODE 2: Manual specification with explicit template and term lists
    if (template && term_lists) {
      console.log('[PROGRAMMATIC API] Using manual template and term lists');

      // Validate template and term lists match
      const validation = validateTemplateAndLists(template, term_lists);

      if (!validation.valid) {
        return NextResponse.json({
          success: false,
          error: 'Template validation failed',
          errors: validation.errors
        }, { status: 400 });
      }

      const config: ProgrammaticBriefConfig = {
        template,
        term_lists,
        pattern_type: pattern_type || 'custom',
        website_token: effectiveWebsiteToken,
        user_token: userToken,
        max_briefs,
        deduplicate,
        parent_cluster
      };

      const result = await generateProgrammaticBriefs(config);

      return NextResponse.json({
        success: result.success,
        briefs: result.briefs,
        total_generated: result.total_generated,
        skipped_duplicates: result.skipped_duplicates,
        permutation_group_id: result.permutation_group_id,
        error: result.error
      });
    }

    // Neither mode was properly configured
    return NextResponse.json({
      success: false,
      error: 'Invalid request: provide either user_message (auto mode) or template+term_lists (manual mode)'
    }, { status: 400 });

  } catch (error) {
    console.error('[PROGRAMMATIC API] Error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

/**
 * GET endpoint to retrieve programmatic brief groups
 * Useful for seeing all briefs generated in a single batch
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const websiteToken = searchParams.get('websiteToken');
    const groupId = searchParams.get('permutation_group_id');

    if (!userToken || !websiteToken) {
      return NextResponse.json(
        { success: false, error: 'userToken and websiteToken are required' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('article_briefs')
      .select('*')
      .eq('user_token', userToken)
      .eq('website_token', websiteToken);

    // Filter by permutation group if provided
    if (groupId) {
      // Search in notes array for the group ID
      query = query.contains('notes', [groupId]);
    }

    const { data: briefs, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Group by permutation_group_id if present in notes
    const grouped: Record<string, any[]> = {};
    briefs?.forEach(brief => {
      const notes = brief.notes || [];
      const groupNote = notes.find((n: string) => n.includes('Permutation group:'));

      if (groupNote) {
        const groupId = groupNote.split(':')[1]?.trim();
        if (groupId) {
          if (!grouped[groupId]) {
            grouped[groupId] = [];
          }
          grouped[groupId].push(brief);
        }
      }
    });

    return NextResponse.json({
      success: true,
      briefs: briefs || [],
      groups: grouped,
      total_count: briefs?.length || 0
    });

  } catch (error) {
    console.error('[PROGRAMMATIC API GET] Error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
