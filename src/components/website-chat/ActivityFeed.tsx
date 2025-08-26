'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  Clock, 
  Lightbulb, 
  ChevronDown, 
  ChevronUp,
  ExternalLink,
  Code,
  FileText,
  Link
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'completed' | 'progress' | 'idea';
  title: string;
  description: string;
  timestamp: Date;
  details?: {
    beforeAfter?: {
      before: string;
      after: string;
    };
    links?: Array<{
      label: string;
      url: string;
      type: 'gsc' | 'external' | 'proof';
    }>;
    metadata?: Record<string, any>;
  };
  expanded?: boolean;
}

interface ActivityFeedProps {
  domain: string;
  userToken: string;
}

export default function ActivityFeed({ domain, userToken }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([
    {
      id: '1',
      type: 'completed',
      title: 'Fixed missing meta descriptions',
      description: 'Added meta descriptions to 12 pages',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      details: {
        beforeAfter: {
          before: '<meta name="description" content="">',
          after: '<meta name="description" content="Complete guide to SEO optimization...">'
        },
        links: [
          { label: 'View in GSC', url: '#', type: 'gsc' },
          { label: 'See Changes', url: '#', type: 'proof' }
        ]
      }
    },
    {
      id: '2', 
      type: 'progress',
      title: 'Weekly website crawl',
      description: 'Scanning 247 pages for technical issues',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      details: {
        metadata: {
          progress: 65,
          totalPages: 247,
          issuesFound: 8
        }
      }
    },
    {
      id: '3',
      type: 'completed',
      title: 'Submitted XML sitemap',
      description: 'New sitemap with 189 URLs submitted to GSC',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      details: {
        links: [
          { label: 'View Sitemap', url: '#', type: 'external' },
          { label: 'GSC Status', url: '#', type: 'gsc' }
        ]
      }
    },
    {
      id: '4',
      type: 'idea',
      title: 'Content cluster opportunity',
      description: 'Create pillar content around "email marketing automation"',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      details: {
        metadata: {
          keywordVolume: 12100,
          difficulty: 45,
          relatedTopics: ['email sequences', 'marketing funnels', 'automation tools']
        }
      }
    },
    {
      id: '5',
      type: 'progress',
      title: 'Generating blog article',
      description: 'Writing "10 Email Marketing Strategies for 2024"',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
      details: {
        metadata: {
          progress: 80,
          targetWords: 2500,
          currentWords: 2100
        }
      }
    }
  ]);

  const toggleExpanded = (id: string) => {
    setActivities(prev => prev.map(activity => 
      activity.id === id 
        ? { ...activity, expanded: !activity.expanded }
        : activity
    ));
  };

  const getTypeIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'idea':
        return <Lightbulb className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getTypeBadge = (type: ActivityItem['type']) => {
    switch (type) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">✅ Done</Badge>;
      case 'progress':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">🔄 In Progress</Badge>;
      case 'idea':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">💡 Idea</Badge>;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const groupedActivities = {
    completed: activities.filter(a => a.type === 'completed'),
    progress: activities.filter(a => a.type === 'progress'),
    ideas: activities.filter(a => a.type === 'idea')
  };

  const renderActivityDetails = (activity: ActivityItem) => {
    if (!activity.expanded || !activity.details) return null;

    return (
      <div className="mt-3 pt-3 border-t border-gray-100">
        {/* Before/After Diff */}
        {activity.details.beforeAfter && (
          <div className="mb-3">
            <h5 className="text-xs font-medium text-gray-500 mb-2">Changes Made</h5>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="bg-red-50 border border-red-100 rounded p-2">
                <div className="text-red-600 font-medium mb-1">Before:</div>
                <code className="text-red-800">{activity.details.beforeAfter.before}</code>
              </div>
              <div className="bg-green-50 border border-green-100 rounded p-2">
                <div className="text-green-600 font-medium mb-1">After:</div>
                <code className="text-green-800">{activity.details.beforeAfter.after}</code>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {activity.details.metadata?.progress && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{activity.details.metadata.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${activity.details.metadata.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Metadata */}
        {activity.details.metadata && (
          <div className="mb-3">
            {Object.entries(activity.details.metadata)
              .filter(([key]) => key !== 'progress')
              .map(([key, value]) => (
                <div key={key} className="flex justify-between text-xs py-1">
                  <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <span className="text-gray-900 font-medium">
                    {Array.isArray(value) ? value.join(', ') : value}
                  </span>
                </div>
              ))}
          </div>
        )}

        {/* Links */}
        {activity.details.links && (
          <div className="flex gap-2 flex-wrap">
            {activity.details.links.map((link, index) => (
              <Button key={index} variant="outline" size="sm" className="h-7 text-xs">
                <ExternalLink className="h-3 w-3 mr-1" />
                {link.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Activity Feed</CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto">
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="border border-gray-100 rounded-lg p-3 hover:shadow-sm transition-shadow">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {getTypeIcon(activity.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    {getTypeBadge(activity.type)}
                    <span className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp)}</span>
                  </div>
                  
                  <h4 className="text-sm font-medium text-gray-900 mb-1">{activity.title}</h4>
                  <p className="text-xs text-gray-600 mb-2">{activity.description}</p>
                  
                  {activity.details && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
                      onClick={() => toggleExpanded(activity.id)}
                    >
                      {activity.expanded ? (
                        <>
                          <ChevronUp className="h-3 w-3 mr-1" />
                          Hide details
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3 mr-1" />
                          Show details
                        </>
                      )}
                    </Button>
                  )}
                  
                  {renderActivityDetails(activity)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}