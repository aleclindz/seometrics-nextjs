'use client';

import React from 'react';

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

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.type === 'user';
    const isSystem = message.type === 'system';
    const isFunctionCall = message.type === 'function_call';

    return (
      <div key={message.id} className={`flex mb-6 ${isUser ? 'justify-end' : ''}`}>
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-[#5E6AD2] flex items-center justify-center mr-4 flex-shrink-0">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
        
        <div className={`max-w-3xl ${isUser ? 'order-1' : ''}`}>
          {/* Message bubble */}
          <div className={`rounded-lg p-4 ${
            isUser 
              ? 'bg-[#5E6AD2]/20 text-gray-100' 
              : isSystem
                ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-100'
                : isFunctionCall
                  ? 'bg-purple-500/20 border border-purple-500/30 text-purple-100'
                  : 'bg-[#1E1E26] text-gray-300'
          }`}>
            {/* Function call header */}
            {isFunctionCall && message.functionCall && (
              <div className="mb-3 pb-3 border-b border-purple-500/30">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  <span className="font-medium text-sm">Function Call: {message.functionCall.name}</span>
                </div>
                {message.functionCall.arguments && (
                  <div className="mt-2 text-xs font-mono bg-black/20 rounded p-2">
                    {JSON.stringify(message.functionCall.arguments, null, 2)}
                  </div>
                )}
              </div>
            )}
            
            {/* Message content */}
            <div className="prose prose-invert max-w-none">
              {message.content.split('\n').map((line, index) => (
                <p key={index} className="mb-2 last:mb-0">
                  {line}
                </p>
              ))}
            </div>

            {/* Function call result */}
            {isFunctionCall && message.functionCall?.result && (
              <div className="mt-3 pt-3 border-t border-purple-500/30">
                <div className="text-xs font-medium mb-2">Result:</div>
                <div className="text-xs font-mono bg-black/20 rounded p-2">
                  {JSON.stringify(message.functionCall.result, null, 2)}
                </div>
              </div>
            )}
          </div>
          
          {/* Timestamp */}
          <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : ''}`}>
            {formatTime(message.timestamp)}
          </div>
        </div>

        {isUser && (
          <div className="w-8 h-8 rounded-full bg-[#2A2A35] flex items-center justify-center ml-4 flex-shrink-0 order-2">
            <span className="text-sm font-medium">U</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-0">
      {messages.map(renderMessage)}
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="flex mb-6">
          <div className="w-8 h-8 rounded-full bg-[#5E6AD2] flex items-center justify-center mr-4 flex-shrink-0">
            <svg className="w-5 h-5 animate-pulse" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="bg-[#1E1E26] rounded-lg p-4 max-w-3xl">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}