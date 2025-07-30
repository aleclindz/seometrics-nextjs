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

  // Initialize OpenAI client
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (apiKey) {
      setOpenaiClient(new OpenAIFunctionClient(apiKey));
    } else {
      console.warn('OpenAI API key not found. Chat functionality will be limited.');
    }
  }, []);

  // Load user sites
  useEffect(() => {
    const loadSites = async () => {
      if (!user) return;

      try {
        setSitesLoading(true);
        // Get user token from auth - matching Dashboard.tsx approach
        const response = await fetch('/api/auth/get-token');
        if (!response.ok) {
          throw new Error('Failed to get user token');
        }
        
        const { userToken } = await response.json();

        const sitesResponse = await fetch(`/api/chat/sites?userToken=${userToken}`);
        if (!sitesResponse.ok) {
          throw new Error('Failed to fetch sites');
        }

        const { sites: fetchedSites } = await sitesResponse.json();
        setSites(fetchedSites);

        // Auto-select first site if available and no site is selected
        if (fetchedSites.length > 0 && !selectedSite) {
          setSelectedSite(fetchedSites[0]);
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
        // Get user token from auth
        const tokenResponse = await fetch('/api/auth/get-token');
        if (!tokenResponse.ok) return;
        
        const { userToken } = await tokenResponse.json();

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
      // Get user token from auth
      const tokenResponse = await fetch('/api/auth/get-token');
      if (!tokenResponse.ok) return;
      
      const { userToken } = await tokenResponse.json();

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
          content: `Hi! I&apos;m your SEO assistant for **${selectedSite.name}**. I can help you audit your site, analyze GSC performance, generate content, and optimize your SEO. What would you like to do first?`,
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
      // Get user token from auth
      const tokenResponse = await fetch('/api/auth/get-token');
      if (!tokenResponse.ok) return;
      
      const { userToken } = await tokenResponse.json();

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
            content: `Hi! I&apos;m your SEO assistant for **${selectedSite?.name}**. I can help you audit your site, analyze GSC performance, generate content, and optimize your SEO. What would you like to do first?`,
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
      // Get user token from auth
      const tokenResponse = await fetch('/api/auth/get-token');
      if (!tokenResponse.ok) return;
      
      const { userToken } = await tokenResponse.json();

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

      // Send message to OpenAI with function calling
      const response = await openaiClient.sendMessage(content, chatContext);

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
          <div className="flex items-center space-x-3">
            <button className="p-2 rounded-md hover:bg-white/10 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <button className="p-2 rounded-md hover:bg-white/10 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
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