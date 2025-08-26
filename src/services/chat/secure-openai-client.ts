/**
 * Secure OpenAI Client - Server-Side Only
 * 
 * This client replaces the browser-exposed OpenAI client and provides:
 * - Server-side API key protection
 * - Multi-turn tool execution loop
 * - Token management and history trimming
 * - Dynamic tool exposure
 * - Model routing based on task type
 */

import { AgentMemory } from '../agent/agent-memory';

interface ChatContext {
  history: Array<{
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    tool_calls?: any[];
    tool_call_id?: string;
  }>;
  siteContext?: {
    selectedSite?: string;
    userSites?: Array<{ id: string; url: string; name: string; }>;
  };
  userToken?: string;
}

interface ChatResponse {
  content: string;
  toolResults?: Record<string, any>;
  steps?: number;
  model?: string;
}

interface SetupStatus {
  gscConnected: boolean;
  seoagentjsInstalled: boolean;
  hasAuditScore: boolean;
  isFullySetup: boolean;
}

export class SecureOpenAIClient {
  private agentMemory?: AgentMemory;

  constructor() {
    // No API key needed - server handles it
  }

  // Initialize agent memory for a specific website
  private initializeMemory(websiteToken: string, userToken: string) {
    if (!this.agentMemory || this.agentMemory['websiteToken'] !== websiteToken) {
      this.agentMemory = new AgentMemory(websiteToken, userToken);
    }
  }

  async sendMessage(message: string, context: ChatContext): Promise<ChatResponse> {
    try {
      const systemPrompt = await this.buildSystemPrompt(context);
      const availableTools = this.getAvailableTools(context);

      // Call our secure server endpoint
      const response = await fetch('/api/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          systemPrompt,
          history: context.history || [],
          userMessage: message,
          userToken: context.userToken,
          siteUrl: context.siteContext?.selectedSite,
          availableTools
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'LLM request failed');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'LLM processing failed');
      }

      return {
        content: result.content,
        toolResults: result.toolResults,
        steps: result.steps,
        model: result.model
      };

    } catch (error) {
      console.error('[SECURE OPENAI] Error:', error);
      return {
        content: "I'm experiencing some technical difficulties. Please try again in a moment."
      };
    }
  }

  private async buildSystemPrompt(context: ChatContext): Promise<string> {
    let prompt = `You are SEOAgent, an expert SEO assistant for SEOAgent.com. You help users with:

1. **Google Search Console Integration**: Connect websites, sync performance data, analyze search metrics
2. **Content Optimization**: Generate SEO articles, analyze content gaps, optimize existing pages
3. **Technical SEO**: Monitor SEOAgent.js performance, check website health, provide recommendations
4. **CMS Management**: Connect WordPress, Webflow, and other platforms for content publishing
5. **Performance Analytics**: Track rankings, traffic, and conversion metrics

**Available Functions**: You have access to powerful functions to help users. When a user asks to do something, use the appropriate function rather than just explaining how to do it.

**SEOAgent.js Integration**: The user's websites use SEOAgent.js for automatic meta tags and alt text generation. You can check its status and performance.

**Communication Style**: 
- Be helpful, concise, and action-oriented
- Offer to perform tasks using functions when appropriate
- Provide specific, actionable recommendations
- Use a friendly but professional tone`;

    // Add setup-aware guidance based on current status
    if (context.siteContext?.selectedSite && context.userToken) {
      const setupStatus = await this.checkSetupStatus(context.userToken, context.siteContext.selectedSite);
      
      if (setupStatus && !setupStatus.isFullySetup) {
        prompt += `\n\n**IMPORTANT - Setup Priority**: This user needs to complete their setup first. Focus on getting them connected:`;
        if (!setupStatus.gscConnected) {
          prompt += `\n- ❌ Google Search Console: Not connected - PRIORITY #1`;
        }
        if (!setupStatus.seoagentjsInstalled) {
          prompt += `\n- ❌ SEOAgent.js Script: Not installed - PRIORITY #2`;  
        }
        prompt += `\n- When users greet you or ask general questions, prioritize explaining the setup process`;
        prompt += `\n- Use functions like connect_gsc and get_site_status to help with setup`;
        prompt += `\n- Be encouraging and explain how these connections unlock powerful automation`;
      } else if (setupStatus && setupStatus.isFullySetup) {
        prompt += `\n\n**Setup Status**: ✅ Fully connected! GSC connected and SEOAgent.js installed. Focus on optimization and automation.`;
      }
    }

    if (context.siteContext?.userSites?.length) {
      prompt += `\n\n**User's Websites**:\n`;
      context.siteContext.userSites.forEach(site => {
        prompt += `- ${site.name} (${site.url})\n`;
      });
    }

    if (context.siteContext?.selectedSite) {
      prompt += `\n**Currently Selected Site**: ${context.siteContext.selectedSite}`;
    }

    // Add memory context if available
    if (context.siteContext?.selectedSite && context.userToken) {
      this.initializeMemory(context.siteContext.selectedSite, context.userToken);
      
      try {
        const websiteContext = await this.agentMemory?.getWebsiteContext();
        if (websiteContext && Object.keys(websiteContext).length > 0) {
          prompt += `\n\n**Website Context & Memory**:\n`;
          
          if (websiteContext.seo_focus?.length) {
            prompt += `- SEO Focus Areas: ${websiteContext.seo_focus.join(', ')}\n`;
          }
          
          if (websiteContext.content_style) {
            prompt += `- Content Style: ${websiteContext.content_style}\n`;
          }
          
          if (websiteContext.successful_keywords?.length) {
            prompt += `- Successful Keywords: ${websiteContext.successful_keywords.slice(0, 5).join(', ')}\n`;
          }
        }
      } catch (error) {
        console.log('[SECURE OPENAI] Memory context error:', error);
      }
    }

    return prompt;
  }

  private getAvailableTools(context: ChatContext): string[] {
    // Dynamic tool exposure based on setup status and context
    const baseTool = ['get_site_status', 'create_idea', 'adopt_idea'];
    
    if (!context.siteContext?.selectedSite) {
      return baseTool;
    }

    // Add tools based on setup status - this will be determined server-side
    return []; // Empty means show all tools
  }

  // Check setup status for dynamic tool filtering and prompt adaptation
  private async checkSetupStatus(userToken: string, siteUrl: string): Promise<SetupStatus | null> {
    try {
      // Use our existing server endpoint for setup checking
      const response = await fetch(`/api/agent/capabilities?userToken=${encodeURIComponent(userToken)}&siteUrl=${encodeURIComponent(siteUrl)}`);
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      if (data.success && data.setup) {
        return {
          gscConnected: data.setup.gscConnected || false,
          seoagentjsInstalled: data.setup.seoagentjsInstalled || false,
          hasAuditScore: data.setup.hasAuditScore || false,
          isFullySetup: (data.setup.gscConnected && data.setup.seoagentjsInstalled) || false
        };
      }

      return null;
    } catch (error) {
      console.error('[SECURE OPENAI] Setup check error:', error);
      return null;
    }
  }
}

// Browser environment helper
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

// Legacy compatibility - export interface
export { ChatContext };

// Function call result interface
export interface FunctionCallResult {
  success: boolean;
  data?: any;
  error?: string;
}