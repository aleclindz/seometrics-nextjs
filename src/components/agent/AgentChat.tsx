'use client'

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Lightbulb,
  Zap
} from 'lucide-react';
import { OpenAIFunctionClient } from '@/services/chat/openai-function-client';

interface AgentChatProps {
  userToken: string;
  selectedSite?: string;
  userSites?: Array<{ id: string; url: string; name: string; }>;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  functionCall?: {
    name: string;
    arguments: any;
    result?: any;
  };
}

export default function AgentChat({ userToken, selectedSite, userSites }: AgentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [client, setClient] = useState<OpenAIFunctionClient | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize OpenAI client
    const openaiClient = new OpenAIFunctionClient(process.env.NEXT_PUBLIC_OPENAI_API_KEY!);
    setClient(openaiClient);

    // Add welcome message
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: `👋 Hi! I'm your SEO Agent assistant. I can help you with:

🔍 **Technical SEO**: Crawl sites, fix issues, optimize performance
📝 **Content Strategy**: Generate articles, analyze gaps, optimize existing content  
🤖 **Automation**: Set up workflows, schedule tasks, monitor progress
📊 **Analytics**: Check GSC data, analyze performance, track improvements

What would you like to work on today?`,
      timestamp: new Date()
    };
    
    setMessages([welcomeMessage]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!input.trim() || !client || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const context = {
        history: messages.map(m => ({
          role: m.role,
          content: m.content,
          function_call: m.functionCall
        })),
        siteContext: {
          selectedSite,
          userSites
        },
        userToken
      };

      const response = await client.sendMessage(input, context);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        functionCall: response.functionCall
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '❌ Sorry, I encountered an error processing your request. Please try again.',
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

  const getFunctionIcon = (functionName: string) => {
    if (functionName.includes('idea')) return <Lightbulb className="h-4 w-4" />;
    if (functionName.includes('action') || functionName.includes('run')) return <Zap className="h-4 w-4" />;
    if (functionName.includes('crawl') || functionName.includes('technical')) return <CheckCircle className="h-4 w-4" />;
    return <Bot className="h-4 w-4" />;
  };

  const formatFunctionResult = (functionCall: any) => {
    if (!functionCall.result) return null;

    return (
      <div className="mt-2 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
        <div className="flex items-center gap-2 mb-2">
          {getFunctionIcon(functionCall.name)}
          <span className="font-medium text-sm">
            {functionCall.name.replace(/_/g, ' ')}
          </span>
          <Badge variant={functionCall.result.success ? 'default' : 'destructive'}>
            {functionCall.result.success ? 'Success' : 'Error'}
          </Badge>
        </div>
        
        {functionCall.result.success && functionCall.result.data && (
          <div className="text-sm text-gray-600">
            {typeof functionCall.result.data === 'object' ? (
              <pre className="whitespace-pre-wrap font-mono text-xs">
                {JSON.stringify(functionCall.result.data, null, 2)}
              </pre>
            ) : (
              functionCall.result.data
            )}
          </div>
        )}
        
        {functionCall.result.error && (
          <div className="text-sm text-red-600">
            Error: {functionCall.result.error}
          </div>
        )}
      </div>
    );
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';
    
    return (
      <div
        key={message.id}
        className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        {!isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <Bot className="h-4 w-4 text-blue-600" />
          </div>
        )}
        
        <div className={`max-w-[80%] ${isUser ? 'order-first' : ''}`}>
          <div
            className={`px-4 py-2 rounded-lg whitespace-pre-wrap ${
              isUser
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            {message.content}
          </div>
          
          {message.functionCall && formatFunctionResult(message.functionCall)}
          
          <div className="text-xs text-gray-400 mt-1">
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
        
        {isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <User className="h-4 w-4 text-gray-600" />
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          SEO Agent Chat
          {selectedSite && (
            <Badge variant="outline" className="ml-2">
              {selectedSite}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.map(renderMessage)}
          
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Bot className="h-4 w-4 text-blue-600" />
              </div>
              <div className="bg-gray-100 px-4 py-2 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about your SEO strategy, create ideas, or run actions..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInput('Show me recent activity summary')}
            disabled={isLoading}
          >
            Recent Activity
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInput('List my open ideas')}
            disabled={isLoading}
          >
            Open Ideas
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInput('Check what actions are running')}
            disabled={isLoading}
          >
            Active Tasks
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}