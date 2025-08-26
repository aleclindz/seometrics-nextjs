'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Mic, 
  MicOff,
  Paperclip,
  Sparkles,
  Target,
  Zap,
  ArrowUp
} from 'lucide-react';

interface ChatInputBarProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

interface Suggestion {
  id: string;
  text: string;
  category: 'technical' | 'content' | 'analysis';
  icon: React.ReactNode;
}

export default function ChatInputBar({ 
  value, 
  onChange, 
  onSend, 
  disabled = false,
  placeholder = "Ask me about your SEO strategy, technical fixes, or content ideas..."
}: ChatInputBarProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickSuggestions: Suggestion[] = [
    {
      id: '1',
      text: 'Scan my website for technical SEO issues',
      category: 'technical',
      icon: <Target className="h-3 w-3" />
    },
    {
      id: '2',
      text: 'Generate 5 blog topic ideas for my niche',
      category: 'content',
      icon: <Sparkles className="h-3 w-3" />
    },
    {
      id: '3',
      text: 'Show me my GSC performance summary',
      category: 'analysis',
      icon: <Zap className="h-3 w-3" />
    },
    {
      id: '4',
      text: 'Fix missing meta descriptions on my pages',
      category: 'technical',
      icon: <Target className="h-3 w-3" />
    },
    {
      id: '5',
      text: 'Create content cluster for [keyword]',
      category: 'content',
      icon: <Sparkles className="h-3 w-3" />
    },
    {
      id: '6',
      text: 'Analyze my top performing content',
      category: 'analysis',
      icon: <Zap className="h-3 w-3" />
    }
  ];

  useEffect(() => {
    if (value.length > 0) {
      // Filter suggestions based on input
      const filtered = quickSuggestions.filter(suggestion =>
        suggestion.text.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 3);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions(quickSuggestions.slice(0, 3));
      setShowSuggestions(false);
    }
  }, [value]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) {
        onSend();
      }
    }
    
    if (e.key === 'ArrowUp' && value === '') {
      e.preventDefault();
      setShowSuggestions(!showSuggestions);
    }
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    onChange(suggestion.text);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleVoiceInput = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
      };
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onChange(value + (value ? ' ' : '') + transcript);
      };
      
      recognition.onerror = () => {
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.start();
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'technical': return 'bg-blue-100 text-blue-700';
      case 'content': return 'bg-green-100 text-green-700';
      case 'analysis': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="relative">
      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs text-gray-500 font-medium mb-2 px-2">Suggested actions</div>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className={`flex items-center justify-center w-6 h-6 rounded ${getCategoryColor(suggestion.category)}`}>
                  {suggestion.icon}
                </div>
                <div className="flex-1">
                  <span className="text-sm text-gray-900">{suggestion.text}</span>
                </div>
                <Badge variant="outline" className="text-xs capitalize">
                  {suggestion.category}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="flex gap-3 items-end">
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setShowSuggestions(suggestions.length > 0)}
            placeholder={placeholder}
            disabled={disabled}
            className="pr-20 border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          {/* Input Actions */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {/* Voice Input */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
              onClick={handleVoiceInput}
              disabled={disabled}
            >
              {isListening ? (
                <MicOff className="h-3 w-3 text-red-500" />
              ) : (
                <Mic className="h-3 w-3" />
              )}
            </Button>
            
            {/* Suggestions Toggle */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
              onClick={() => setShowSuggestions(!showSuggestions)}
              disabled={disabled}
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {/* Send Button */}
        <Button
          onClick={onSend}
          disabled={!value.trim() || disabled}
          size="icon"
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-sm h-10 w-10"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Quick Actions */}
      {!showSuggestions && value === '' && (
        <div className="flex gap-2 mt-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange('Scan my website for technical SEO issues')}
            disabled={disabled}
            className="bg-white hover:bg-gray-50 text-xs"
          >
            <Target className="h-3 w-3 mr-1" />
            Technical Audit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange('Generate content ideas for my niche')}
            disabled={disabled}
            className="bg-white hover:bg-gray-50 text-xs"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Content Ideas
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange('Show me my GSC performance summary')}
            disabled={disabled}
            className="bg-white hover:bg-gray-50 text-xs"
          >
            <Zap className="h-3 w-3 mr-1" />
            Performance
          </Button>
        </div>
      )}
    </div>
  );
}