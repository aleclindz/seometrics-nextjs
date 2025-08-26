'use client'

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import WebsiteSetupModal from '@/components/WebsiteSetupModal';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Lightbulb,
  Zap,
  Settings
} from 'lucide-react';
// Removed OpenAIFunctionClient import - now using server API

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
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [websiteSetupData, setWebsiteSetupData] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Add welcome message with setup guidance
    const isFirstTime = !selectedSite || userSites?.length === 0;
    
    let welcomeContent = '';
    
    if (isFirstTime) {
      welcomeContent = `👋 **Welcome to SEO Agent!** 

I'm your AI-powered SEO assistant. To get started, I'll need you to connect your websites and tools:

🔗 **Quick Setup Required:**
- Connect Google Search Console
- Link your CMS (WordPress, Strapi, etc.)
- Add Smart.js tracking code
- Connect hosting provider

Click the **"Setup Website"** button below to configure everything in minutes.

Once set up, I can help you with:
🔍 **Technical SEO** • 📝 **Content Strategy** • 🤖 **Automation** • 📊 **Analytics**`;
    } else {
      welcomeContent = `👋 Hi! I'm your SEO Agent for **${selectedSite}**.

I can help you with:

🔍 **Technical SEO**: Crawl sites, fix issues, optimize performance
📝 **Content Strategy**: Generate articles, analyze gaps, optimize existing content  
🤖 **Automation**: Set up workflows, schedule tasks, monitor progress
📊 **Analytics**: Check GSC data, analyze performance, track improvements

Need to update your integrations? Use the **setup button** above.

What would you like to work on today?`;
    }
    
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: welcomeContent,
      timestamp: new Date()
    };
    
    setMessages([welcomeMessage]);
  }, [selectedSite, userSites]);

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
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = input;
    setInput('');
    setIsLoading(true);

    try {
      const chatContext = {
        history: messages.map(m => ({
          role: m.role,
          content: m.content,
          function_call: m.functionCall
        })),
        siteContext: {
          selectedSite,
          userSites
        }
      };

      const response = await fetch('/api/chat/ai-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userToken,
          message: messageText,
          chatContext
        })
      });

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
        functionCall: data.functionCall
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

  const openWebsiteSetup = () => {
    // Create mock website data for setup modal
    const websiteData = {
      id: selectedSite || 'new-website',
      url: selectedSite || '',
      name: selectedSite || 'New Website',
      gscStatus: 'none' as const,
      cmsStatus: 'none' as const, 
      smartjsStatus: 'inactive' as const,
      hostStatus: 'none' as const
    };
    
    setWebsiteSetupData(websiteData);
    setShowSetupModal(true);
  };

  const handleSetupComplete = (updates: any) => {
    // Handle setup completion - could refresh data or show success message
    console.log('Setup completed with updates:', updates);
    setShowSetupModal(false);
    
    // Add a success message to the chat
    const successMessage: ChatMessage = {
      id: `setup-success-${Date.now()}`,
      role: 'assistant',
      content: `✅ **Setup Complete!** 

Your website integrations have been updated. I can now help you with more advanced SEO tasks and automation.

What would you like to work on first?`,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, successMessage]);
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
            className={`px-4 py-2 rounded-lg ${
              isUser
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-900'
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
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            SEO Agent Chat
            {selectedSite && (
              <Badge variant="outline" className="ml-2">
                {selectedSite}
              </Badge>
            )}
          </div>
          <Button
            onClick={openWebsiteSetup}
            variant="outline"
            size="sm"
            className="ml-auto"
          >
            <Settings className="h-4 w-4 mr-1" />
            Setup Website
          </Button>
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
            className="bg-violet-600 hover:bg-violet-700 text-white"
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
      
      {/* Website Setup Modal */}
      {showSetupModal && websiteSetupData && (
        <WebsiteSetupModal
          isOpen={showSetupModal}
          onClose={() => setShowSetupModal(false)}
          website={websiteSetupData}
          onStatusUpdate={handleSetupComplete}
        />
      )}
    </Card>
  );
}