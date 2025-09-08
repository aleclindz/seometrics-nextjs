'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import TechnicalFixCard from './ActionCards/TechnicalFixCard';
import ContentSuggestionCard from './ActionCards/ContentSuggestionCard';
import ProgressCard from './ActionCards/ProgressCard';
import { getSmartJSStatus } from '@/lib/seoagent-js-status';
import { 
  Send, 
  Bot, 
  User, 
  Loader2,
  Sparkles,
  Zap,
  Target
} from 'lucide-react';

interface ChatInterfaceProps {
  userToken: string;
  selectedSite?: string;
  userSites?: Array<{ id: string; url: string; name: string; }>;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  actionCard?: {
    type: 'technical-fix' | 'content-suggestion' | 'progress';
    data: any;
  };
  functionCall?: {
    name: string;
    arguments: any;
    result?: any;
  };
}

export default function ChatInterface({ userToken, selectedSite, userSites }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [websiteToken, setWebsiteToken] = useState<string | null>(null);
  const [brainstormModalOpen, setBrainstormModalOpen] = useState(false);
  const [brainstormIdeas, setBrainstormIdeas] = useState<any[]>([]);
  const [selectedIdeas, setSelectedIdeas] = useState<Record<number, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize with setup-aware welcome message
    initializeChat();
  }, [selectedSite, userToken]);

  const initializeChat = async () => {
    if (!selectedSite || !userToken) return;

    setIsLoadingHistory(true);

    try {
      // First, resolve domain to websiteToken
      console.log('[CHAT INIT] Resolving websiteToken for domain:', selectedSite);
      let lookupToken = selectedSite; // Default fallback
      
      try {
        const tokenResponse = await fetch(`/api/websites/token-lookup?userToken=${userToken}&domain=${encodeURIComponent(selectedSite)}`);
        
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          if (tokenData.success && tokenData.websiteToken) {
            console.log('[CHAT INIT] Resolved websiteToken:', tokenData.websiteToken);
            lookupToken = tokenData.websiteToken;
            setWebsiteToken(tokenData.websiteToken);
          }
        }
      } catch (tokenError) {
        console.log('[CHAT INIT] Token lookup failed, using domain as fallback:', tokenError);
      }
      
      // Try to load existing conversation history for this website
      console.log('[CHAT INIT] Loading conversation history for websiteToken:', lookupToken);
      const historyResponse = await fetch(`/api/agent/conversations?userToken=${userToken}&websiteToken=${encodeURIComponent(lookupToken)}&limit=10`);
      
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        console.log('[CHAT INIT] History response:', historyData);
        
        if (historyData.success && historyData.conversations && historyData.conversations.length > 0) {
          // Found existing conversation - load the most recent one
          const recentConversation = historyData.conversations[0];
          setConversationId(recentConversation.conversation_id);
          
          console.log('[CHAT INIT] Loading full conversation:', recentConversation.conversation_id);
          // Get full conversation messages
          const conversationResponse = await fetch(`/api/agent/conversations?userToken=${userToken}&websiteToken=${encodeURIComponent(lookupToken)}&conversationId=${recentConversation.conversation_id}`);
          
          if (conversationResponse.ok) {
            const conversationData = await conversationResponse.json();
            console.log('[CHAT INIT] Full conversation data:', conversationData);
            
            if (conversationData.success && conversationData.conversation && conversationData.conversation.messages.length > 0) {
              // Convert database messages to ChatMessage format
              const loadedMessages: ChatMessage[] = conversationData.conversation.messages.map((msg: any) => ({
                id: msg.id,
                role: msg.message_role,
                content: msg.message_content,
                timestamp: new Date(msg.created_at),
                functionCall: msg.function_call,
                actionCard: msg.action_card
              }));
              
              console.log('[CHAT INIT] Loaded messages:', loadedMessages.length);
              setMessages(loadedMessages);
              setIsLoadingHistory(false);
              return; // Exit early - we loaded existing conversation
            }
          }
        }
      }
    } catch (error) {
      console.error('[CHAT INIT] Error loading conversation history:', error);
      // Continue with welcome message if history loading fails
    }

    // No existing conversation found or error loading - show welcome message
    // Check setup status first
    let setupMessage = '';
    try {
      // Check GSC connection
      const gscResponse = await fetch(`/api/gsc/connection?userToken=${userToken}`);
      let gscConnected = false;
      if (gscResponse.ok) {
        const gscData = await gscResponse.json();
        gscConnected = gscData.connected;
      }

      // Check SEOAgent.js status using the simple status function
      const seoagentjsStatus = getSmartJSStatus(selectedSite);
      const seoagentjsInstalled = seoagentjsStatus === 'active';

      // Create setup-aware welcome message
      if (!gscConnected || !seoagentjsInstalled) {
        setupMessage = `\n\n🔧 **Setup Required**: I notice you need to complete some setup steps to unlock my full capabilities:`;
        if (!gscConnected) {
          setupMessage += `\n• ❌ **Google Search Console**: Not connected - I need this for performance data`;
        } else {
          setupMessage += `\n• ✅ **Google Search Console**: Connected`;
        }
        if (!seoagentjsInstalled) {
          setupMessage += `\n• ❌ **SEOAgent.js**: Not installed - I need this for automated technical SEO fixes`;
        } else {
          setupMessage += `\n• ✅ **SEOAgent.js**: Active and running`;
        }
        setupMessage += `\n\n💡 **Complete your setup above** to enable powerful automation features. I can help with basic analysis for now, but the real magic happens when everything is connected!`;
      } else {
        setupMessage = `\n\n✅ **Fully Setup**: Excellent! Your Google Search Console and SEOAgent.js are connected. I have full access to automate your SEO.`;
      }
    } catch (error) {
      console.error('Error checking setup status:', error);
    }

    // Generate new conversation ID for new conversation
    const newConversationId = crypto.randomUUID();
    setConversationId(newConversationId);

    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: `🚀 **Welcome to your SEO Command Center!**

I&apos;m your AI SEO agent for **${selectedSite}**. I can help you with:

**🔍 Technical SEO** - Fix crawl issues, optimize page speed, manage sitemaps
**📝 Content Strategy** - Generate articles, find keyword opportunities, optimize existing content  
**🤖 Automation** - Set up monitoring, schedule tasks, create workflows
**📊 Performance** - Analyze GSC data, track rankings, measure improvements${setupMessage}

**Quick commands to try:**
• *"Check my website's technical SEO status"*
• *"Generate 5 blog topic ideas for [keyword]"*  
• *"What SEO issues should I fix first?"*
• *"Show me my top performing content"*

What would you like to work on first?`,
      timestamp: new Date()
    };
    
    setMessages([welcomeMessage]);
    setIsLoadingHistory(false);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input.trim(),
          userToken: userToken,
          selectedSite: selectedSite,
          websiteToken: websiteToken || selectedSite, // Use resolved websiteToken
          conversationHistory: messages.slice(-10), // Last 10 messages for context
          conversationId: conversationId // Include conversation ID for persistence
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Update conversation ID if provided (for new conversations)
        if (data.conversationId && data.conversationId !== conversationId) {
          setConversationId(data.conversationId);
        }

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
          functionCall: data.functionCall,
          actionCard: data.actionCard
        };
        
        setMessages(prev => [...prev, assistantMessage]);

        // If the assistant executed a keyword strategy update, notify listeners to refresh strategy
        if (data.functionCall && data.functionCall.result && data.functionCall.result.success) {
          const fname = data.functionCall.name || '';
          if (fname === 'KEYWORDS_add_keywords' || fname === 'update_keyword_strategy') {
            window.dispatchEvent(new CustomEvent('seoagent:strategy-updated', { detail: { site: selectedSite } }));
          }
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '❌ Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderActionCard = (actionCard: any) => {
    switch (actionCard.type) {
      case 'technical-fix':
        return (
          <TechnicalFixCard
            title={actionCard.data.title}
            description={actionCard.data.description}
            status={actionCard.data.status}
            beforeAfter={actionCard.data.beforeAfter}
            affectedPages={actionCard.data.affectedPages}
            links={actionCard.data.links}
          />
        );
      case 'content-suggestion':
        return (
          <ContentSuggestionCard
            title={actionCard.data.title}
            description={actionCard.data.description}
            keywords={actionCard.data.keywords}
            searchVolume={actionCard.data.searchVolume}
            difficulty={actionCard.data.difficulty}
            intent={actionCard.data.intent}
            estimatedTraffic={actionCard.data.estimatedTraffic}
            onAccept={actionCard.data.onAccept}
            onDismiss={actionCard.data.onDismiss}
          />
        );
      case 'progress':
        return (
          <ProgressCard
            title={actionCard.data.title}
            description={actionCard.data.description}
            progress={actionCard.data.progress}
            status={actionCard.data.status}
            estimatedTime={actionCard.data.estimatedTime}
            currentStep={actionCard.data.currentStep}
            totalSteps={actionCard.data.totalSteps}
            currentStepIndex={actionCard.data.currentStepIndex}
            onPause={actionCard.data.onPause}
            onResume={actionCard.data.onResume}
            onCancel={actionCard.data.onCancel}
          />
        );
      default:
        return null;
    }
  };

  // Brainstorm Details Modal helpers
  const openBrainstormModal = (ideas: any[]) => {
    setBrainstormIdeas(ideas || []);
    const initial: Record<number, boolean> = {};
    ideas?.forEach((_: any, idx: number) => { initial[idx] = true; });
    setSelectedIdeas(initial);
    setBrainstormModalOpen(true);
  };

  const closeBrainstormModal = () => {
    setBrainstormModalOpen(false);
  };

  const copyBrainstormToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(brainstormIdeas, null, 2));
    } catch (e) {
      console.error('Copy failed:', e);
    }
  };

  const saveSelectedKeywords = async () => {
    const selected = brainstormIdeas
      .map((k, idx) => ({ k, idx }))
      .filter(({ idx }) => selectedIdeas[idx])
      .map(({ k }) => ({
        keyword: k.keyword,
        keyword_type: 'long_tail',
        topic_cluster: k.suggested_topic_cluster || undefined
      }));

    if (selected.length === 0) {
      setBrainstormModalOpen(false);
      return;
    }

    try {
      const resp = await fetch('/api/keyword-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken,
          domain: selectedSite,
          keywords: selected
        })
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Failed to save keywords');
      }
      // Notify listeners (Strategy tab) and close
      window.dispatchEvent(new CustomEvent('seoagent:strategy-updated', { detail: { site: selectedSite } }));
      setBrainstormModalOpen(false);
    } catch (e) {
      console.error('Failed to save keywords:', e);
    }
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';
    
    return (
      <div key={message.id} className={`mb-4 ${isUser ? 'ml-12' : 'mr-12'}`}>
        <div className="flex gap-3 items-start">
          {/* Avatar */}
          {!isUser && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
          )}
          {isUser && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
              <User className="h-4 w-4 text-gray-600" />
            </div>
          )}
          
          {/* Message Content */}
          <div className="flex-1 min-w-0">
            {isUser ? (
              /* User message with container background */
              <div className="bg-gray-100 rounded-lg px-3 py-2 inline-block max-w-full">
                <div className="whitespace-pre-wrap text-gray-900">{message.content}</div>
              </div>
            ) : (
              /* Assistant message without container background */
              <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-strong:text-gray-900 prose-p:text-gray-900 prose-li:text-gray-900 prose-p:leading-relaxed">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            )}
            
            {/* Action Card */}
            {message.actionCard && (
              <div className="mt-3">
                {renderActionCard(message.actionCard)}
              </div>
            )}
            
            {/* Function Call Result */}
            {message.functionCall && message.functionCall.result && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-sm text-gray-700">
                    {message.functionCall.name.replace(/_/g, ' ')}
                  </span>
                  <Badge variant={message.functionCall.result.success ? 'default' : 'destructive'}>
                    {message.functionCall.result.success ? 'Success' : 'Error'}
                  </Badge>
                </div>
                {message.functionCall.result.success && message.functionCall.name.includes('brainstorm') ? (
                  <div className="text-sm text-gray-600">
                    Generated keyword ideas. <button className="underline" onClick={() => openBrainstormModal(
                      message.functionCall.result.data?.generated_keywords || message.functionCall.result.generated_keywords || []
                    )}>View details</button>
                  </div>
                ) : (
                  message.functionCall.result.success && message.functionCall.result.data && (
                    <div className="text-sm text-gray-600">
                      {typeof message.functionCall.result.data === 'string' 
                        ? message.functionCall.result.data
                        : JSON.stringify(message.functionCall.result.data, null, 2)
                      }
                    </div>
                  )
                )}
              </div>
            )}
            
            {/* Timestamp */}
            <div className="text-xs text-gray-400 mt-1">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="h-full flex flex-col bg-white/95 backdrop-blur-sm border-0 shadow-sm">
      <CardContent className="flex-1 flex flex-col min-h-0 p-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {isLoadingHistory && (
            <div className="mb-4 mr-12">
              <div className="flex gap-3 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    <span className="text-gray-500">Loading conversation history...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {!isLoadingHistory && messages.map(renderMessage)}
          
          {isLoading && (
            <div className="mb-4 mr-12">
              <div className="flex gap-3 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    <span className="text-gray-500">Thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input Area */}
        <div className="border-t border-gray-100 bg-gray-50/50 p-6 flex-shrink-0">
          {/* Input */}
          <div className="flex gap-3 mb-4">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about your SEO strategy, technical fixes, or content ideas..."
              disabled={isLoading}
              className="flex-1 border-gray-200 bg-white"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
        </div>

        {/* Brainstorm Details Modal */}
        {brainstormModalOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="font-semibold">Keyword Ideas</div>
                <div className="flex items-center gap-2">
                  <button onClick={copyBrainstormToClipboard} className="text-sm px-2 py-1 border rounded hover:bg-gray-50">Copy</button>
                  <button onClick={closeBrainstormModal} className="text-sm px-2 py-1 border rounded hover:bg-gray-50">✕</button>
                </div>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                {brainstormIdeas.length === 0 ? (
                  <div className="text-sm text-gray-500">No ideas to display.</div>
                ) : (
                  <div className="space-y-2">
                    {brainstormIdeas.map((idea: any, idx: number) => (
                      <label key={idx} className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={!!selectedIdeas[idx]}
                          onChange={(e) => setSelectedIdeas(prev => ({ ...prev, [idx]: e.target.checked }))}
                        />
                        <div>
                          <div className="font-medium text-gray-900">{idea.keyword}</div>
                          <div className="text-xs text-gray-600">
                            {(idea.search_intent || 'unknown')} {idea.suggested_topic_cluster ? `• cluster: ${idea.suggested_topic_cluster}` : ''}
                          </div>
                          {idea.rationale && (
                            <div className="text-xs text-gray-500 mt-1">{idea.rationale}</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-4 py-3 border-t flex items-center justify-end gap-2">
                <button onClick={closeBrainstormModal} className="text-sm px-3 py-2 border rounded hover:bg-gray-50">Cancel</button>
                <button onClick={saveSelectedKeywords} className="text-sm px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Save</button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
