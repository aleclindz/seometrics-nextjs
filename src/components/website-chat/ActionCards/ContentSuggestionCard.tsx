'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Lightbulb, 
  TrendingUp, 
  Users, 
  Target 
} from 'lucide-react';

interface ContentSuggestionCardProps {
  title: string;
  description: string;
  keywords: string[];
  searchVolume?: number;
  difficulty?: number;
  intent: 'informational' | 'commercial' | 'transactional' | 'navigational';
  estimatedTraffic?: number;
  onAccept?: () => void;
  onDismiss?: () => void;
}

export default function ContentSuggestionCard({ 
  title, 
  description, 
  keywords,
  searchVolume,
  difficulty,
  intent,
  estimatedTraffic,
  onAccept,
  onDismiss
}: ContentSuggestionCardProps) {

  const getIntentColor = () => {
    switch (intent) {
      case 'informational': return 'bg-blue-100 text-blue-800';
      case 'commercial': return 'bg-green-100 text-green-800';
      case 'transactional': return 'bg-purple-100 text-purple-800';
      case 'navigational': return 'bg-orange-100 text-orange-800';
    }
  };

  const getDifficultyColor = () => {
    if (!difficulty) return 'bg-gray-100 text-gray-800';
    if (difficulty <= 30) return 'bg-green-100 text-green-800';
    if (difficulty <= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getDifficultyText = () => {
    if (!difficulty) return 'Unknown';
    if (difficulty <= 30) return 'Easy';
    if (difficulty <= 60) return 'Medium';
    return 'Hard';
  };

  return (
    <Card className="p-4 mt-3 bg-yellow-50 border-yellow-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          <h4 className="font-semibold text-gray-900">{title}</h4>
        </div>
        <Badge className={getIntentColor()}>
          {intent.charAt(0).toUpperCase() + intent.slice(1)}
        </Badge>
      </div>
      
      <p className="text-gray-600 text-sm mb-4">{description}</p>
      
      {/* Keywords */}
      <div className="mb-4">
        <h5 className="text-xs font-medium text-gray-500 mb-2">Target Keywords</h5>
        <div className="flex flex-wrap gap-1">
          {keywords.map((keyword, index) => (
            <Badge 
              key={index} 
              variant="outline" 
              className="text-xs bg-white"
            >
              {keyword}
            </Badge>
          ))}
        </div>
      </div>
      
      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
        {searchVolume && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="font-medium text-gray-900">
              {searchVolume.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Monthly searches</div>
          </div>
        )}
        
        {difficulty && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-orange-600 mb-1">
              <Target className="h-4 w-4" />
            </div>
            <div className="font-medium text-gray-900">
              <Badge className={getDifficultyColor()}>
                {getDifficultyText()}
              </Badge>
            </div>
            <div className="text-xs text-gray-500">Difficulty</div>
          </div>
        )}
        
        {estimatedTraffic && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
              <Users className="h-4 w-4" />
            </div>
            <div className="font-medium text-gray-900">
              {estimatedTraffic.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Est. monthly traffic</div>
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div className="flex gap-2">
        {onAccept && (
          <Button 
            size="sm" 
            onClick={onAccept}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Create Content
          </Button>
        )}
        {onDismiss && (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onDismiss}
          >
            Maybe Later
          </Button>
        )}
      </div>
    </Card>
  );
}