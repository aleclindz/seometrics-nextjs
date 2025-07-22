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
    // Only auto-scroll if the user is near the bottom to avoid interrupting reading
    const messagesContainer = messagesEndRef.current?.parentElement;
    if (messagesContainer) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      if (isNearBottom) {
        scrollToBottom();
      }
    }
  }, [messages]);

  function getWelcomeMessage(context: string): string {
    switch (context) {
      case 'cms-setup':
        return "👋 **Welcome to the SEOMetrics CMS Setup Assistant!**\n\nI'm here to help you connect your Strapi CMS for automated article publishing.\n\n**Quick Start Questions:**\n• \"Where can I find my Strapi base URL?\"\n• \"How do I get my API token?\"\n• \"What content type should I use?\"\n• \"Help me troubleshoot connection issues\"\n\n**What I can help with:**\n✅ Strapi configuration and setup\n✅ API token creation and permissions\n✅ Content type structure recommendations\n✅ Connection troubleshooting\n✅ Publishing workflow explanations\n\nJust ask me anything about setting up your CMS! 🚀";
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
      // Base URL questions
      if (lowerInput.includes('base url') || lowerInput.includes('strapi url') || lowerInput.includes('where') && (lowerInput.includes('url') || lowerInput.includes('strapi'))) {
        return "**Finding your Strapi Base URL:**\n\nYour Strapi base URL is where your Strapi admin panel is hosted. Common examples:\n\n• **Local development**: `http://localhost:1337`\n• **Heroku**: `https://your-app-name.herokuapp.com`\n• **Vercel/Netlify**: `https://your-strapi-deploy.vercel.app`\n• **DigitalOcean**: `https://your-droplet-ip:1337`\n• **Custom domain**: `https://cms.yourdomain.com`\n\n**How to find it:**\n1. Check where you can access your Strapi admin panel\n2. Copy the URL up to the domain (don&apos;t include `/admin`)\n3. Make sure it starts with `https://` for production\n\n**For SEOMetrics.ai specifically**, if you&apos;re setting up Strapi for your website, you&apos;ll need to deploy Strapi somewhere first and use that URL.";
      }

      // API Token questions
      if (lowerInput.includes('api token') || lowerInput.includes('token')) {
        return "**Getting your Strapi API Token:**\n\n**Step-by-step:**\n1. Open your Strapi admin panel\n2. Go to Settings → API Tokens (in the left sidebar)\n3. Click 'Create new API Token'\n4. **Important settings:**\n   - Name: 'SEOMetrics Integration'\n   - Description: 'For automated article publishing'\n   - Token duration: 'Unlimited' (recommended)\n   - Token type: 'Full Access'\n\n5. Click 'Save' and copy the token immediately\n6. Store it securely - you won&apos;t see it again!\n\n**Security tip:** The token gives full access to your Strapi, so keep it secret.";
      }
      
      // Content Type questions
      if (lowerInput.includes('content type') || lowerInput.includes('api::') || lowerInput.includes('article type')) {
        return "**Strapi Content Type Identifiers:**\n\nContent types follow this format: `api::[singular-name]::[singular-name]`\n\n**Common examples:**\n• `api::article::article` - for articles\n• `api::blog-post::blog-post` - for blog posts  \n• `api::post::post` - for posts\n• `api::news::news` - for news items\n\n**How to find yours:**\n1. In Strapi admin, go to Content-Type Builder\n2. Look at your collection types\n3. The API ID shown there is what you need\n4. Add `api::` prefix and `::` + the same name as suffix\n\n**For SEOMetrics:** We recommend creating an 'article' content type with fields for title, content, slug, and meta description.";
      }
      
      // Connection/Testing questions
      if (lowerInput.includes('connection') || lowerInput.includes('test') || lowerInput.includes('not working') || lowerInput.includes('error')) {
        return "**Common CMS Connection Issues:**\n\n**1. URL Problems:**\n• Use `https://` for production (not `http://`)\n• Remove trailing slashes: `https://cms.com` not `https://cms.com/`\n• Don&apos;t include `/admin` in the base URL\n\n**2. CORS Issues:**\n• Your Strapi must allow requests from `seometrics.ai`\n• Check Strapi&apos;s `config/middlewares.js` CORS settings\n\n**3. API Token Issues:**\n• Ensure token type is 'Full Access'\n• Token must not be expired\n• Copy token exactly (no extra spaces)\n\n**4. Content Type Issues:**\n• Verify the exact content type identifier\n• Make sure the content type exists and is published\n\n**Our test checks:** connectivity, authentication, read/write permissions, and content type access.";
      }
      
      // Publishing workflow questions  
      if (lowerInput.includes('publish') || lowerInput.includes('article') || lowerInput.includes('content') || lowerInput.includes('workflow')) {
        return "**SEOMetrics Publishing Workflow:**\n\n**What happens when we publish:**\n1. **Content Generation**: GPT-4 creates SEO-optimized articles\n2. **Quality Checks**: We verify word count, readability, and SEO score\n3. **Image Generation**: DALL-E creates relevant featured images\n4. **Internal Linking**: We suggest relevant internal links\n5. **Strapi Publishing**: Content is sent to your CMS\n\n**Article Structure:**\n• SEO-optimized title and meta description\n• Structured content with proper headings\n• Keyword optimization\n• Internal and external links\n• Featured image and alt text\n\n**Publication Status:**\n• Articles are initially saved as 'draft' for your review\n• You can publish them manually in Strapi\n• Future versions will support auto-publishing";
      }

      // SEOMetrics specific questions
      if (lowerInput.includes('seometrics') || lowerInput.includes('this site') || lowerInput.includes('your website')) {
        return "**About SEOMetrics.ai CMS Integration:**\n\n**What we do:**\n• Generate high-quality, SEO-optimized articles for your website\n• Automatically publish to your Strapi CMS\n• Create internal linking strategies\n• Generate featured images with DALL-E\n• Track content performance\n\n**Requirements for your Strapi:**\n• Article content type with fields: title, content, slug, metaDescription\n• API token with full access\n• CORS configured to allow seometrics.ai\n• Published content type (not just draft)\n\n**Supported CMS:** Currently Strapi v4+, with WordPress and Webflow coming soon.";
      }

      // Setup help
      if (lowerInput.includes('help') || lowerInput.includes('start') || lowerInput.includes('setup') || lowerInput.includes('how')) {
        return "**CMS Setup Help for SEOMetrics:**\n\n**Quick Start Checklist:**\n✓ Deploy Strapi somewhere (Heroku, DigitalOcean, etc.)\n✓ Create an 'article' content type with title, content, slug fields\n✓ Generate a Full Access API token\n✓ Configure CORS to allow seometrics.ai\n✓ Test the connection here\n\n**Need specific help with:**\n• \"Where is my base URL?\" - Finding your Strapi URL\n• \"How to get API token?\" - Step-by-step token creation\n• \"Content type setup\" - Creating the right structure\n• \"Connection failing\" - Troubleshooting issues\n\n**Don&apos;t have Strapi yet?** You&apos;ll need to set it up first. Check the Strapi documentation for deployment guides.";
      }
    }
    
    // Fallback with more helpful suggestions
    return "I&apos;m your **CMS Setup Specialist** for SEOMetrics.ai! 🚀\n\nI can help you with:\n\n**Common Questions:**\n• \"Where can I find my Strapi base URL?\"\n• \"How do I get my API token?\"\n• \"What content type should I use?\"\n• \"Why is my connection failing?\"\n• \"How does publishing work?\"\n\n**Ask me anything about:**\n• Strapi setup and configuration\n• API tokens and authentication  \n• Content type structure\n• Connection troubleshooting\n• SEOMetrics publishing workflow\n\nWhat would you like to know?";
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