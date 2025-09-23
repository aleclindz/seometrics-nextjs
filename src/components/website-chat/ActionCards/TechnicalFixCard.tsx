'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  ExternalLink, 
  Code, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import { useState } from 'react';

interface TechnicalFixCardProps {
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | 'failed';
  beforeAfter?: {
    before: string;
    after: string;
  };
  affectedPages?: number;
  links?: Array<{
    label: string;
    url: string;
  }>;
}

export default function TechnicalFixCard({ 
  title, 
  description, 
  status, 
  beforeAfter,
  affectedPages,
  links 
}: TechnicalFixCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getStatusColor = () => {
    switch (status) {
      case 'completed': return 'bg-green-50 border-green-200';
      case 'in-progress': return 'bg-blue-50 border-blue-200';
      case 'failed': return 'bg-red-50 border-red-200';
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'completed': 
        return <Badge className="bg-green-100 text-green-800">✅ Completed</Badge>;
      case 'in-progress': 
        return <Badge className="bg-blue-100 text-blue-800">🔄 In Progress</Badge>;
      case 'failed': 
        return <Badge className="bg-red-100 text-red-800">❌ Failed</Badge>;
    }
  };

  return (
    <Card className={`p-4 mt-3 ${getStatusColor()}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <h4 className="font-semibold text-gray-900">{title}</h4>
        </div>
        {getStatusBadge()}
      </div>
      
      <p className="text-gray-600 text-sm mb-3">{description}</p>
      
      {affectedPages && (
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
          <span>📄 {affectedPages} pages affected</span>
        </div>
      )}
      
      {beforeAfter && (
        <div className="mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-8 px-2 text-sm"
          >
            <Code className="h-4 w-4 mr-2" />
            {expanded ? 'Hide' : 'Show'} code changes
            {expanded ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
          </Button>
          
          {expanded && (
            <div className="mt-3 space-y-2">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-red-700 font-medium text-sm mb-2">Before:</div>
                <code className="text-red-800 text-xs font-mono block bg-red-100 p-2 rounded">
                  {beforeAfter.before}
                </code>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="text-green-700 font-medium text-sm mb-2">After:</div>
                <code className="text-green-800 text-xs font-mono block bg-green-100 p-2 rounded">
                  {beforeAfter.after}
                </code>
              </div>
            </div>
          )}
        </div>
      )}
      
      {links && links.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {links.map((link, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="h-8 text-xs bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.open(link.url, '_blank');
                }
              }}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              {link.label}
            </Button>
          ))}
        </div>
      )}
    </Card>
  );
}
