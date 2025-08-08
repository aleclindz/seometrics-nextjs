'use client';

import React, { useState, useRef, useEffect } from 'react';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSendMessage, disabled = false }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSubmit = () => {
    if (!message.trim() || disabled) return;
    
    onSendMessage(message.trim());
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileUpload = () => {
    // TODO: Implement file upload functionality
    console.log('File upload clicked');
  };

  const handleVoiceInput = () => {
    // TODO: Implement voice input functionality
    console.log('Voice input clicked');
  };

  // Suggested commands/prompts
  const suggestions = [
    'Connect my website to Google Search Console',
    'Show me the performance of my website',
    'Generate an SEO article about [topic]',
    'Sync my GSC data',
    'Check SEOAgent.js status for my site',
    'Help me optimize my content'
  ];

  const [showSuggestions, setShowSuggestions] = useState(false);

  return (
    <div className="relative">
      {/* Suggestions dropdown */}
      {showSuggestions && message.length === 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#1E1E26] border border-white/10 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          <div className="p-3 border-b border-white/10">
            <div className="text-xs font-medium text-gray-400 uppercase">Suggested Commands</div>
          </div>
          <div className="p-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => {
                  setMessage(suggestion);
                  setShowSuggestions(false);
                  textareaRef.current?.focus();
                }}
                className="w-full text-left p-2 text-sm text-gray-300 hover:bg-white/10 rounded transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[#1E1E26] border border-white/10 rounded-lg p-3">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder="Ask me anything about SEO, analytics, or content optimization..."
          disabled={disabled}
          className="w-full bg-transparent outline-none resize-none text-gray-300 placeholder-gray-500 min-h-[2.5rem] max-h-[120px]"
          rows={1}
        />
        
        <div className="flex justify-between items-center mt-2">
          <div className="flex space-x-2">
            {/* File upload */}
            <button 
              onClick={handleFileUpload}
              disabled={disabled}
              className="p-2 rounded hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Upload file"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            
            {/* Image upload */}
            <button 
              onClick={handleFileUpload}
              disabled={disabled}
              className="p-2 rounded hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Upload image"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            
            {/* Voice input */}
            <button 
              onClick={handleVoiceInput}
              disabled={disabled}
              className="p-2 rounded hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Voice input"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          </div>
          
          {/* Send button */}
          <button 
            onClick={handleSubmit}
            disabled={disabled || !message.trim()}
            className="bg-[#5E6AD2] hover:bg-[#5E6AD2]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md flex items-center transition-colors"
          >
            <span>Send</span>
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        
        {/* Character count and shortcuts */}
        <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
          <div className="flex items-center space-x-3">
            <span>Enter to send • Shift+Enter for new line</span>
          </div>
          <span className={message.length > 1000 ? 'text-yellow-500' : ''}>
            {message.length}/2000
          </span>
        </div>
      </div>
    </div>
  );
}