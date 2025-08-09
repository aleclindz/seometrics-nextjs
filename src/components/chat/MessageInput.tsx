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

  // Removed file upload, voice input, and suggestions functionality for simplified SEO-focused experience

  return (
    <div className="relative">
      <div className="bg-[#1E1E26] border border-white/10 rounded-lg p-3">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder="Ask me about your website's SEO status, issues, or optimization recommendations..."
          disabled={disabled}
          className="w-full bg-transparent outline-none resize-none text-gray-300 placeholder-gray-500 min-h-[2.5rem] max-h-[120px]"
          rows={1}
        />
        
        <div className="flex justify-end items-center mt-2">
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