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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize with setup-aware welcome message
    initializeChat();
  }, [selectedSite, userToken]);

  const initializeChat = async () => {
    if (!selectedSite || !userToken) return;

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

      // Check SEOAgent.js status
      const smartjsResponse = await fetch('/api/smartjs/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          websiteUrl: selectedSite.startsWith('http') ? selectedSite : `https://${selectedSite}`
        })
      });
      let seoagentjsInstalled = false;
      if (smartjsResponse.ok) {
        const smartjsData = await smartjsResponse.json();
        seoagentjsInstalled = smartjsData.success && smartjsData.data.active;
      }

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
          conversationHistory: messages.slice(-10) // Last 10 messages for context
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
          functionCall: data.functionCall,
          actionCard: data.actionCard
        };
        
        setMessages(prev => [...prev, assistantMessage]);
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

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';
    
    return (
      <div
        key={message.id}
        className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'} mb-6`}
      >
        {!isUser && (
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm">
            <Bot className="h-5 w-5 text-white" />
          </div>
        )}
        
        <div className={`max-w-[85%] ${isUser ? 'order-first' : ''}`}>
          <div
            className={`px-4 py-3 rounded-2xl shadow-sm ${
              isUser
                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white ml-auto'
                : 'bg-white border border-gray-100'
            }`}
          >
            {isUser ? (
              <div className="whitespace-pre-wrap">{message.content}</div>
            ) : (
              <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-strong:text-gray-900 prose-p:text-gray-900 prose-li:text-gray-900">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            )}
          </div>
          
          {/* Action Card */}
          {message.actionCard && renderActionCard(message.actionCard)}
          
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
              
              {message.functionCall.result.success && message.functionCall.result.data && (
                <div className="text-sm text-gray-600">
                  {typeof message.functionCall.result.data === 'string' 
                    ? message.functionCall.result.data
                    : JSON.stringify(message.functionCall.result.data, null, 2)
                  }
                </div>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-400">
              {message.timestamp.toLocaleTimeString()}
            </span>
          </div>
        </div>
        
        {isUser && (
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shadow-sm">
            <User className="h-5 w-5 text-gray-600" />
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="h-full flex flex-col bg-white/95 backdrop-blur-sm border-0 shadow-sm">
      <CardContent className="flex-1 flex flex-col min-h-0 p-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {messages.map(renderMessage)}
          
          {isLoading && (
            <div className="flex gap-4 justify-start mb-6">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="text-gray-500">Thinking...</span>
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
      </CardContent>
    </Card>
  );
}