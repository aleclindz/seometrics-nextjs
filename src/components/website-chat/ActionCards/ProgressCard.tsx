'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  Loader2,
  Pause,
  Play,
  X
} from 'lucide-react';

interface ProgressCardProps {
  title: string;
  description: string;
  progress: number;
  status: 'running' | 'paused' | 'queued';
  estimatedTime?: string;
  currentStep?: string;
  totalSteps?: number;
  currentStepIndex?: number;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
}

export default function ProgressCard({ 
  title, 
  description, 
  progress,
  status,
  estimatedTime,
  currentStep,
  totalSteps,
  currentStepIndex,
  onPause,
  onResume,
  onCancel
}: ProgressCardProps) {

  const getStatusColor = () => {
    switch (status) {
      case 'running': return 'bg-blue-50 border-blue-200';
      case 'paused': return 'bg-yellow-50 border-yellow-200';
      case 'queued': return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'running': 
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Running
          </Badge>
        );
      case 'paused': 
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Pause className="h-3 w-3 mr-1" />
            Paused
          </Badge>
        );
      case 'queued': 
        return (
          <Badge className="bg-gray-100 text-gray-800">
            <Clock className="h-3 w-3 mr-1" />
            Queued
          </Badge>
        );
    }
  };

  return (
    <Card className={`p-4 mt-3 ${getStatusColor()}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-500" />
          <h4 className="font-semibold text-gray-900">{title}</h4>
        </div>
        {getStatusBadge()}
      </div>
      
      <p className="text-gray-600 text-sm mb-4">{description}</p>
      
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-500">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              status === 'running' ? 'bg-blue-500' : 
              status === 'paused' ? 'bg-yellow-500' : 
              'bg-gray-400'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      {/* Current Step */}
      {currentStep && (
        <div className="mb-4 p-3 bg-white/50 rounded-lg border">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium text-gray-500">Current Step</span>
            {totalSteps && currentStepIndex && (
              <span className="text-xs text-gray-400">
                {currentStepIndex} of {totalSteps}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700">{currentStep}</p>
        </div>
      )}
      
      {/* Estimated Time */}
      {estimatedTime && (
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Clock className="h-4 w-4" />
          <span>Estimated time remaining: {estimatedTime}</span>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex gap-2">
        {status === 'running' && onPause && (
          <Button 
            size="sm" 
            variant="outline"
            onClick={onPause}
          >
            <Pause className="h-3 w-3 mr-1" />
            Pause
          </Button>
        )}
        
        {status === 'paused' && onResume && (
          <Button 
            size="sm"
            onClick={onResume}
          >
            <Play className="h-3 w-3 mr-1" />
            Resume
          </Button>
        )}
        
        {onCancel && (
          <Button 
            size="sm" 
            variant="outline"
            onClick={onCancel}
            className="text-red-600 hover:text-red-700"
          >
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
        )}
      </div>
    </Card>
  );
}