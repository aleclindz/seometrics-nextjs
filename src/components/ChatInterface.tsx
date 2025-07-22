'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  context?: string;
  placeholder?: string;
  title?: string;
}

export default function ChatInterface({ 
  context = 'general', 
  placeholder = 'Ask me anything...',
  title = 'AI Assistant'
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      type: 'assistant',
      content: getWelcomeMessage(context),
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function getWelcomeMessage(context: string): string {
    switch (context) {
      case 'cms-setup':
        return "Hi! I'm here to help you set up your CMS connection. I can answer questions about:\n\n• Finding your Strapi API token\n• Content type identifiers\n• Troubleshooting connection issues\n• Best practices for article publishing\n\nWhat would you like to know?";
      default:
        return "Hello! I'm your AI assistant. How can I help you today?";
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Simulate AI response for now
      setTimeout(() => {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: getContextualResponse(inputValue, context),
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Chat error:', error);
      setIsLoading(false);
    }
  };

  function getContextualResponse(input: string, context: string): string {
    const lowerInput = input.toLowerCase();
    
    if (context === 'cms-setup') {
      if (lowerInput.includes('api token') || lowerInput.includes('token')) {
        return "To get your Strapi API token:\n\n1. Log into your Strapi admin panel\n2. Go to Settings → API Tokens\n3. Click 'Create new API Token'\n4. Choose 'Full Access' type\n5. Copy the generated token\n\nMake sure to save it somewhere safe - you won&apos;t be able to see it again!";
      }
      
      if (lowerInput.includes('content type') || lowerInput.includes('api::')) {
        return "Content type identifiers in Strapi follow this format:\n\n`api::[collection-name]::[collection-name]`\n\nFor example:\n• `api::article::article` for articles\n• `api::blog-post::blog-post` for blog posts\n• `api::news::news` for news\n\nYou can find the exact identifier in your Strapi admin under Content-Type Builder.";
      }
      
      if (lowerInput.includes('connection') || lowerInput.includes('test')) {
        return "Common connection issues:\n\n• **URL format**: Make sure to include https:// and remove trailing slashes\n• **CORS**: Your Strapi must allow requests from this domain\n• **Token permissions**: Ensure your API token has read/write access\n• **Content type**: Verify the identifier matches exactly\n\nThe test will check connectivity, authentication, and write permissions.";
      }
      
      if (lowerInput.includes('publish') || lowerInput.includes('article')) {
        return "When publishing articles, SEOMetrics will:\n\n• Create entries in your specified content type\n• Include SEO-optimized titles and descriptions\n• Add internal linking suggestions\n• Generate featured images (if enabled)\n• Respect your content structure\n\nArticles are initially saved as drafts for review.";
      }
    }
    
    return "I understand you&apos;re asking about: " + input + "\n\nI'm a specialized assistant for CMS setup. Could you ask something more specific about:\n\n• API tokens and authentication\n• Content types and structure\n• Connection troubleshooting\n• Article publishing workflow";
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl h-full flex flex-col">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4v-4z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Online • Ask me anything
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.type === 'user'
                  ? 'bg-violet-600 text-white rounded-br-none'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">
                {message.content}
              </div>
              <div
                className={`text-xs mt-1 ${
                  message.type === 'user'
                    ? 'text-violet-200'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {message.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 rounded-bl-none">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  AI is typing...
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700/60">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            rows={2}
            className="w-full px-4 py-3 pr-12 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none disabled:opacity-50"
            style={{ 
              minHeight: '64px',
              maxHeight: '120px',
              height: 'auto'
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 120) + 'px';
            }}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="absolute right-2 bottom-2 w-8 h-8 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:hover:bg-violet-600 text-white rounded-lg flex items-center justify-center transition-colors"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </form>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Press Enter to send, Shift+Enter for new line
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            AI Assistant
          </p>
        </div>
      </div>
    </div>
  );
}