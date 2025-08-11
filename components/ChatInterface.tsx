import { useState, useRef, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Avatar } from './ui/avatar';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Send, Bot, User, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface ChatInterfaceProps {
  websiteId: string;
}

export function ChatInterface({ websiteId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: "Hi! I'm your SEO Agent for techstartup.com. I've been analyzing your website and I'm ready to help you improve your search rankings. What would you like to work on today?",
      timestamp: new Date(),
      suggestions: [
        "Analyze my current SEO performance",
        "What are my biggest SEO opportunities?",
        "Help me improve my page speed",
        "Review my content strategy"
      ]
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: getAIResponse(inputValue),
        timestamp: new Date(),
        suggestions: getRelatedSuggestions(inputValue)
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="h-[700px] flex flex-col">
      <div className="p-4 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8 bg-primary">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </Avatar>
          <div>
            <h3 className="font-medium">SEO Agent</h3>
            <p className="text-sm text-muted-foreground">Your AI-powered SEO assistant</p>
          </div>
          <Badge variant="outline" className="ml-auto">
            <Sparkles className="h-3 w-3 mr-1" />
            AI Active
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-6">
          {messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : ''}`}>
              {message.type === 'assistant' && (
                <Avatar className="h-8 w-8 bg-primary shrink-0">
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </Avatar>
              )}
              
              <div className={`max-w-[80%] ${message.type === 'user' ? 'order-first' : ''}`}>
                <div className={`rounded-lg p-3 ${
                  message.type === 'user' 
                    ? 'bg-primary text-primary-foreground ml-auto' 
                    : 'bg-muted'
                }`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                
                {message.suggestions && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.suggestions.map((suggestion, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="text-xs"
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground mt-2">
                  {message.timestamp.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>

              {message.type === 'user' && (
                <Avatar className="h-8 w-8 bg-secondary shrink-0">
                  <User className="h-5 w-5 text-secondary-foreground" />
                </Avatar>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 bg-primary shrink-0">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </Avatar>
              <div className="bg-muted rounded-lg p-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-100"></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-200"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your SEO..."
            className="min-h-[44px] max-h-[120px] resize-none"
            disabled={isLoading}
          />
          <Button 
            onClick={handleSend} 
            disabled={!inputValue.trim() || isLoading}
            size="sm"
            className="px-3"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function getAIResponse(userInput: string): string {
  const responses = [
    "I've analyzed your website and found several optimization opportunities. Your page speed could be improved by optimizing images and reducing JavaScript bundle size. I can help you implement these changes automatically.",
    "Based on your current SEO performance, I recommend focusing on improving your meta descriptions and internal linking structure. Would you like me to generate optimized meta descriptions for your top pages?",
    "I notice your website has great content but could benefit from better keyword optimization. I can analyze your top competitors and suggest content improvements to help you rank higher.",
    "Your technical SEO looks good overall! I've identified a few minor issues with schema markup that we can fix to improve your search visibility. Shall I create a plan to address these?"
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

function getRelatedSuggestions(userInput: string): string[] {
  const suggestionSets = [
    [
      "Show me specific recommendations",
      "What's my SEO score?",
      "Implement these changes automatically"
    ],
    [
      "Analyze my competitors",
      "Generate meta descriptions",
      "Check for broken links"
    ],
    [
      "Review my content strategy",
      "Find keyword opportunities",
      "Optimize for mobile"
    ]
  ];
  
  return suggestionSets[Math.floor(Math.random() * suggestionSets.length)];
}