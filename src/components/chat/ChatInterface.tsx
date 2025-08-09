'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatSidebar } from './ChatSidebar';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { InterfaceToggle } from '../navigation/InterfaceToggle';
import { useAuth } from '@/contexts/auth';
import { OpenAIFunctionClient } from '@/services/chat/openai-function-client';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'function_call';
  content: string;
  functionCall?: {
    name: string;
    arguments: any;
    result?: any;
  };
  timestamp: Date;
  isTyping?: boolean;
}

interface Site {
  id: string;
  url: string;
  name: string;
  gscStatus: 'connected' | 'pending' | 'error' | 'none';
  cmsStatus: 'connected' | 'pending' | 'error' | 'none';
  smartjsStatus: 'active' | 'inactive' | 'error';
  lastSync?: Date;
  metrics?: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
  performanceHistory?: any[];
}

interface ChatThread {
  id: string;
  siteId: string;
  title: string;
  lastMessage?: string;
  updatedAt: Date;
}

export function ChatInterface() {
  const { user } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [currentThread, setCurrentThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openaiClient, setOpenaiClient] = useState<OpenAIFunctionClient | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize OpenAI client (now handled server-side)
  useEffect(() => {
    // OpenAI API calls are now handled server-side for security
    setOpenaiClient({ initialized: true } as any);
  }, []);

  // Load user sites
  useEffect(() => {
    const loadSites = async () => {
      if (!user) return;

      try {
        setSitesLoading(true);
        // Get user token from auth context
        if (!user?.token) {
          throw new Error('No user token available');
        }
        const userToken = user.token;

        const sitesResponse = await fetch(`/api/chat/sites?userToken=${userToken}`);
        if (!sitesResponse.ok) {
          throw new Error('Failed to fetch sites');
        }

        const { sites: fetchedSites } = await sitesResponse.json();
        
        // Convert lastSync strings back to Date objects 
        const processedSites = fetchedSites.map((site: any) => ({
          ...site,
          lastSync: site.lastSync ? new Date(site.lastSync) : undefined
        }));
        
        setSites(processedSites);

        // Auto-select first site if available and no site is selected
        if (processedSites.length > 0 && !selectedSite) {
          setSelectedSite(processedSites[0]);
        }
      } catch (error) {
        console.error('Error loading sites:', error);
      } finally {
        setSitesLoading(false);
      }
    };

    loadSites();
  }, [user, selectedSite]);

  // Load or create thread when site is selected
  useEffect(() => {
    const loadOrCreateThread = async () => {
      if (!selectedSite || !user) return;

      try {
        // Get user token from auth context
        if (!user?.token) return;
        const userToken = user.token;

        // Try to get existing thread for this site
        const threadsResponse = await fetch(`/api/chat/threads?userToken=${userToken}&siteId=${selectedSite.id}`);
        if (threadsResponse.ok) {
          const { threads } = await threadsResponse.json();
          
          if (threads.length > 0) {
            // Use the most recent thread
            const thread = threads[0];
            setCurrentThread(thread);
            await loadThreadMessages(thread.id);
          } else {
            // Create new thread
            await createNewThread();
          }
        }
      } catch (error) {
        console.error('Error loading/creating thread:', error);
        // Create a default thread to continue
        await createNewThread();
      }
    };

    loadOrCreateThread();
  }, [selectedSite, user]);

  const createNewThread = async () => {
    if (!selectedSite || !user) return;

    try {
      // Get user token from auth context
      if (!user?.token) return;
      const userToken = user.token;

      const response = await fetch('/api/chat/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken,
          siteId: selectedSite.id,
          title: `Chat for ${selectedSite.name}`,
          lastMessage: ''
        })
      });

      if (response.ok) {
        const { thread } = await response.json();
        setCurrentThread(thread);
        
        // Set welcome message
        const welcomeMessage: ChatMessage = {
          id: '1',
          type: 'assistant',
          content: `I&apos;m your SEO assistant for **${selectedSite.name}**. I can analyze your technical SEO issues, review your GSC performance data, generate optimized content, and automatically fix common SEO problems. What SEO challenge can I help you solve?`,
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('Error creating thread:', error);
    }
  };

  const loadThreadMessages = async (threadId: string) => {
    try {
      // Get user token from auth context
      if (!user?.token) return;
      const userToken = user.token;

      const response = await fetch(`/api/chat/messages?userToken=${userToken}&threadId=${threadId}`);
      if (response.ok) {
        const { messages: threadMessages } = await response.json();
        
        const formattedMessages: ChatMessage[] = threadMessages.map((msg: any) => ({
          id: msg.id,
          type: msg.message_type,
          content: msg.content,
          functionCall: msg.function_call,
          timestamp: new Date(msg.created_at)
        }));

        if (formattedMessages.length === 0) {
          // No messages in thread, add welcome message
          const welcomeMessage: ChatMessage = {
            id: '1',
            type: 'assistant',
            content: `I&apos;m your SEO assistant for **${selectedSite?.name}**. I can analyze your technical SEO issues, review your GSC performance data, generate optimized content, and automatically fix common SEO problems. What SEO challenge can I help you solve?`,
            timestamp: new Date()
          };
          setMessages([welcomeMessage]);
        } else {
          setMessages(formattedMessages);
        }
      }
    } catch (error) {
      console.error('Error loading thread messages:', error);
    }
  };

  const saveMessage = async (message: ChatMessage) => {
    if (!currentThread || !user) return;

    try {
      // Get user token from auth context
      if (!user?.token) return;
      const userToken = user.token;

      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken,
          threadId: currentThread.id,
          type: message.type,
          content: message.content,
          functionCall: message.functionCall
        })
      });

      // Update thread with last message
      await fetch('/api/chat/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken,
          threadId: currentThread.id,
          siteId: selectedSite?.id,
          title: currentThread.title,
          lastMessage: message.content.substring(0, 100)
        })
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !openaiClient || !selectedSite) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    await saveMessage(userMessage);
    setIsLoading(true);

    try {
      // Build chat context from previous messages with current site context
      const chatContext = {
        history: messages.map(msg => ({
          role: msg.type === 'user' ? 'user' as const : 'assistant' as const,
          content: msg.content,
          function_call: msg.functionCall
        })),
        siteContext: {
          selectedSite: selectedSite.url,
          currentSiteData: selectedSite,
          userSites: sites.map(site => ({
            id: site.id,
            url: site.url,
            name: site.name
          }))
        }
      };

      // Send message to server-side OpenAI API
      const aiResponse = await fetch('/api/chat/ai-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken: user?.token,
          message: content,
          chatContext
        })
      });

      if (!aiResponse.ok) {
        throw new Error('Failed to get AI response');
      }

      const response = await aiResponse.json();

      // Create assistant message
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: response.functionCall ? 'function_call' : 'assistant',
        content: response.content,
        functionCall: response.functionCall,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      await saveMessage(assistantMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: 'I&apos;m experiencing some technical difficulties. Please try again in a moment.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      await saveMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#101014] text-white overflow-hidden">
      {/* Interface Toggle */}
      <InterfaceToggle />
      
      {/* Animated Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] -translate-x-1/2 -translate-y-1/2 bg-[#5E6AD2] opacity-10 blur-[100px] rounded-full pointer-events-none"></div>
      </div>

      {/* Sidebar */}
      <ChatSidebar 
        sites={sites}
        selectedSite={selectedSite}
        onSiteSelect={setSelectedSite}
        sitesLoading={sitesLoading}
        collapsed={sidebarCollapsed} 
        onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col relative z-10 transition-all duration-300 ${
        sidebarCollapsed ? 'ml-16' : 'ml-64'
      }`}>
        {/* Header */}
        <div className="h-16 border-b border-white/10 flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-md hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-sm font-medium">SEO Assistant</span>
          </div>
          {/* Removed notification and settings buttons for simplified SEO-focused interface */}
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-[#5E6AD2] flex items-center justify-center">
              <span className="text-sm font-medium">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <MessageList 
            messages={messages} 
            isLoading={isLoading} 
          />
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-white/10 px-6 py-4">
          <MessageInput 
            onSendMessage={handleSendMessage}
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  );
}