/**
 * Conversation Analysis Service
 * Analyzes chat conversations to automatically extract user preferences and update agent memory
 */

import { AgentMemory, MemoryType } from './agent-memory';

export interface ConversationMessage {
  id: string;
  user_token: string;
  thread_id: string;
  message_type: 'user' | 'assistant' | 'system' | 'function_call';
  content: string;
  function_call?: any;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ConversationInsight {
  type: MemoryType;
  key: string;
  value: any;
  confidence: number;
  source: 'explicit' | 'implicit' | 'feedback';
  message_id: string;
}

export class ConversationAnalyzer {
  constructor(
    private websiteToken: string,
    private userToken: string,
    private agentMemory: AgentMemory
  ) {}

  /**
   * Analyze a conversation thread and extract insights
   */
  async analyzeConversation(messages: ConversationMessage[]): Promise<ConversationInsight[]> {
    const insights: ConversationInsight[] = [];

    for (const message of messages) {
      if (message.message_type === 'user') {
        // Analyze user messages for preferences and feedback
        const userInsights = await this.analyzeUserMessage(message);
        insights.push(...userInsights);
      } else if (message.message_type === 'assistant') {
        // Analyze assistant messages for successful patterns
        const assistantInsights = await this.analyzeAssistantMessage(message, messages);
        insights.push(...assistantInsights);
      }
    }

    return insights;
  }

  /**
   * Analyze user message for preferences, feedback, and context
   */
  private async analyzeUserMessage(message: ConversationMessage): Promise<ConversationInsight[]> {
    const insights: ConversationInsight[] = [];
    const content = message.content.toLowerCase();

    // Explicit Preferences Detection
    const preferencePatterns = [
      // Content style preferences
      {
        patterns: [/i prefer (.*?) article/gi, /make it more (.*?)/, /write in a (.*?) tone/gi],
        type: 'preferences' as MemoryType,
        key: 'content_style',
        extractor: (match: RegExpMatchArray) => match[1]?.trim()
      },
      
      // Article length preferences
      {
        patterns: [/(\d+)\s*words?/gi, /(longer|shorter|brief|detailed)/gi],
        type: 'preferences' as MemoryType,
        key: 'preferred_article_length',
        extractor: (match: RegExpMatchArray) => {
          if (/\d+/.test(match[0])) {
            return parseInt(match[0].match(/\d+/)?.[0] || '1500');
          } else if (match[1]) {
            const preference = match[1].toLowerCase();
            return preference === 'longer' || preference === 'detailed' ? 2000 : 800;
          }
          return null;
        }
      },

      // Target audience preferences
      {
        patterns: [/target audience is (.*?)/, /writing for (.*?) people/, /audience: (.*)/gi],
        type: 'context' as MemoryType,
        key: 'target_audience',
        extractor: (match: RegExpMatchArray) => match[1]?.trim()
      },

      // Business type context
      {
        patterns: [/(my|our) business is (.*?)/, /(i|we) run a (.*?)/, /business type: (.*)/gi],
        type: 'context' as MemoryType,
        key: 'business_type',
        extractor: (match: RegExpMatchArray) => match[2] || match[1]?.trim()
      },

      // SEO focus areas
      {
        patterns: [/focus on (.*?) seo/gi, /prioritize (.*?)/, /main seo goal is (.*)/gi],
        type: 'context' as MemoryType,
        key: 'seo_focus',
        extractor: (match: RegExpMatchArray) => [match[1]?.trim()]
      }
    ];

    // Apply pattern matching
    for (const patternGroup of preferencePatterns) {
      for (const pattern of patternGroup.patterns) {
        const matches = content.match(pattern);
        if (matches) {
          for (const match of matches) {
            const execResult = pattern.exec(content);
            if (execResult) {
              const value = patternGroup.extractor(execResult);
              if (value) {
                insights.push({
                  type: patternGroup.type,
                  key: patternGroup.key,
                  value: { [patternGroup.key]: value },
                  confidence: 0.9,
                  source: 'explicit',
                  message_id: message.id
                });
              }
            }
          }
        }
      }
    }

    // Feedback Detection
    const feedbackPatterns = [
      // Positive feedback
      {
        patterns: [/that worked/, /perfect/, /exactly what i wanted/, /great job/, /love it/gi],
        type: 'strategies' as MemoryType,
        key: 'successful_strategies',
        value: 'positive_user_feedback',
        confidence: 0.8
      },

      // Negative feedback
      {
        patterns: [/that didn&apos;t work/, /not what i wanted/, /try again/, /that&apos;s wrong/, /doesn&apos;t help/gi],
        type: 'strategies' as MemoryType,
        key: 'failed_approaches',
        value: 'negative_user_feedback',
        confidence: 0.8
      }
    ];

    for (const feedback of feedbackPatterns) {
      for (const pattern of feedback.patterns) {
        if (pattern.test(content)) {
          insights.push({
            type: feedback.type,
            key: feedback.key,
            value: { [feedback.key]: [feedback.value] },
            confidence: feedback.confidence,
            source: 'feedback',
            message_id: message.id
          });
        }
      }
    }

    return insights;
  }

  /**
   * Analyze assistant message for successful patterns
   */
  private async analyzeAssistantMessage(
    message: ConversationMessage,
    allMessages: ConversationMessage[]
  ): Promise<ConversationInsight[]> {
    const insights: ConversationInsight[] = [];
    
    // Check if this assistant message was followed by positive user feedback
    const messageIndex = allMessages.findIndex(msg => msg.id === message.id);
    const nextUserMessage = allMessages
      .slice(messageIndex + 1)
      .find(msg => msg.message_type === 'user');

    if (nextUserMessage) {
      const feedback = nextUserMessage.content.toLowerCase();
      const isPositive = /thanks?|perfect|great|exactly|good|helpful|love/.test(feedback);
      const isNegative = /no|wrong|didn&apos;t work|not right|try again/.test(feedback);

      if (isPositive) {
        // Extract successful patterns from the assistant message
        if (message.function_call) {
          insights.push({
            type: 'patterns',
            key: `${message.function_call.name}_success`,
            value: {
              context: message.function_call.arguments,
              user_feedback: 'positive'
            },
            confidence: 0.9,
            source: 'feedback',
            message_id: message.id
          });
        }
      } else if (isNegative) {
        // Record failed patterns
        if (message.function_call) {
          insights.push({
            type: 'patterns',
            key: `${message.function_call.name}_failure`,
            value: {
              context: message.function_call.arguments,
              user_feedback: 'negative'
            },
            confidence: 0.9,
            source: 'feedback',
            message_id: message.id
          });
        }
      }
    }

    return insights;
  }

  /**
   * Apply insights to agent memory
   */
  async applyInsights(insights: ConversationInsight[]): Promise<number> {
    let appliedCount = 0;

    for (const insight of insights) {
      try {
        const success = await this.agentMemory.storeMemory(
          insight.type,
          insight.key,
          insight.value,
          {
            confidenceScore: insight.confidence,
            metadata: {
              source: insight.source,
              message_id: insight.message_id,
              extracted_at: new Date().toISOString()
            }
          }
        );

        if (success) {
          appliedCount++;
          console.log(`[CONVERSATION ANALYZER] Applied insight: ${insight.type}.${insight.key}`);
        }
      } catch (error) {
        console.error(`[CONVERSATION ANALYZER] Error applying insight:`, error);
      }
    }

    return appliedCount;
  }

  /**
   * Analyze entire conversation thread and update memory
   */
  async analyzeAndUpdateMemory(messages: ConversationMessage[]): Promise<{
    insights: ConversationInsight[];
    appliedCount: number;
  }> {
    try {
      // Extract insights from conversation
      const insights = await this.analyzeConversation(messages);
      
      // Apply high-confidence insights to memory
      const highConfidenceInsights = insights.filter(insight => insight.confidence >= 0.7);
      const appliedCount = await this.applyInsights(highConfidenceInsights);

      return {
        insights,
        appliedCount
      };
    } catch (error) {
      console.error('[CONVERSATION ANALYZER] Error in analyzeAndUpdateMemory:', error);
      return {
        insights: [],
        appliedCount: 0
      };
    }
  }

  /**
   * Get conversation analysis summary
   */
  async getAnalysisSummary(threadId: string): Promise<{
    totalInsights: number;
    appliedInsights: number;
    preferenceUpdates: number;
    feedbackCount: number;
    lastAnalyzed: string;
  }> {
    // This would typically query a conversation analysis log table
    // For now, return a summary based on current memory state
    const contextMemories = await this.agentMemory.getMemoriesByType('context');
    const preferenceMemories = await this.agentMemory.getMemoriesByType('preferences');
    const strategiesMemories = await this.agentMemory.getMemoriesByType('strategies');

    return {
      totalInsights: contextMemories.length + preferenceMemories.length + strategiesMemories.length,
      appliedInsights: contextMemories.length + preferenceMemories.length,
      preferenceUpdates: preferenceMemories.length,
      feedbackCount: strategiesMemories.length,
      lastAnalyzed: new Date().toISOString()
    };
  }
}