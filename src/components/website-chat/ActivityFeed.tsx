'use client';

import { useState, useEffect } from 'react';
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
  Link,
  AlertTriangle
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'completed' | 'progress' | 'idea' | 'error';
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
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [domain, userToken]);

  const fetchActivities = async () => {
    if (!domain || !userToken) return;

    try {
      setLoading(true);
      
      // Fetch recent activities from the agent system
      const response = await fetch(`/api/agent/activities?userToken=${userToken}&siteUrl=https://${domain}&limit=20`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.activities && data.activities.length > 0) {
          const mappedActivities = data.activities.map(mapAgentDataToActivity);
          
          // Filter out generic "executed_function" activities
          const filteredActivities = mappedActivities.filter((activity: any) => 
            activity.title !== 'Executed Function' && 
            !activity.description.includes('Executed executed function operation')
          );
          
          setActivities(filteredActivities);
        } else {
          // No activities found
          setActivities([]);
        }
      } else {
        console.warn('Failed to fetch activities:', await response.text());
        setActivities([]);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const mapAgentDataToActivity = (item: any): ActivityItem => {
    // Handle different data sources based on source_table
    switch (item.source_table) {
      case 'seo_monitoring_events':
        return mapSEOEventToActivity(item);
      case 'system_logs':
        return mapSystemLogToActivity(item);
      case 'agent_events':
        return mapAgentEventToActivity(item);
      case 'agent_actions':
        return mapAgentActionToActivity(item);
      case 'agent_ideas':
        return mapAgentIdeaToActivity(item);
      default:
        // Fallback for legacy data without source_table
        return mapLegacyDataToActivity(item);
    }
  };

  const mapSEOEventToActivity = (item: any): ActivityItem => {
    const severityIcons: { [key: string]: string } = {
      critical: '🚨',
      warning: '⚠️',
      info: 'ℹ️'
    };
    
    const categoryEmojis: { [key: string]: string } = {
      indexability: '🔍',
      content: '📝',
      technical: '🔧',
      structure: '🏗️'
    };

    return {
      id: item.id,
      type: item.severity === 'critical' ? 'error' : item.auto_fixed ? 'completed' : 'progress',
      title: `${severityIcons[item.severity] || '•'} ${item.title}`,
      description: item.description || `SEO ${item.category} issue detected`,
      timestamp: new Date(item.detected_at || item.created_at),
      details: {
        metadata: {
          severity: item.severity,
          category: item.category,
          source: item.source,
          autoFixed: item.auto_fixed,
          fixApplied: item.fix_applied,
          pageUrl: item.page_url,
          ...item.metadata
        }
      }
    };
  };

  const mapSystemLogToActivity = (item: any): ActivityItem => {
    const logTypeDisplays: { [key: string]: { title: string; description: string } } = {
      cron_sitemap_regeneration: {
        title: '🗺️ Sitemap Regenerated',
        description: 'Automated sitemap generation completed'
      },
      cron_gsc_sync: {
        title: '📊 GSC Data Synced',
        description: 'Google Search Console data updated'
      }
    };

    const display = logTypeDisplays[item.log_type] || {
      title: '⚙️ System Task',
      description: item.message || 'Automated system task completed'
    };

    return {
      id: item.id,
      type: 'completed',
      title: display.title,
      description: display.description,
      timestamp: new Date(item.created_at),
      details: {
        metadata: {
          logType: item.log_type,
          message: item.message,
          ...item.metadata
        }
      }
    };
  };

  const mapAgentEventToActivity = (item: any): ActivityItem => {
    return {
      id: item.id,
      type: mapEventToType(item.event_type, item.new_state),
      title: item.event_data?.title || formatEventTitle(item.event_type),
      description: item.event_data?.description || formatEventDescription(item.event_type, item.event_data),
      timestamp: new Date(item.created_at),
      details: item.event_data?.details || undefined
    };
  };

  const mapAgentActionToActivity = (item: any): ActivityItem => {
    return {
      id: item.id,
      type: mapActionStatusToType(item.status),
      title: item.title,
      description: item.description,
      timestamp: new Date(item.updated_at || item.created_at),
      details: item.payload ? { metadata: item.payload } : undefined
    };
  };

  const mapAgentIdeaToActivity = (item: any): ActivityItem => {
    return {
      id: item.id,
      type: 'idea',
      title: item.title,
      description: item.hypothesis,
      timestamp: new Date(item.updated_at || item.created_at),
      details: {
        metadata: {
          iceScore: item.ice_score,
          priority: item.priority,
          estimatedEffort: item.estimated_effort,
          tags: item.tags
        }
      }
    };
  };

  const mapLegacyDataToActivity = (item: any): ActivityItem => {
    // Handle legacy data without source_table
    if (item.event_type) {
      return mapAgentEventToActivity(item);
    } else if (item.action_type) {
      return mapAgentActionToActivity(item);
    } else {
      return mapAgentIdeaToActivity(item);
    }
  };

  const mapEventToType = (eventType: string, newState: string): ActivityItem['type'] => {
    if (eventType.includes('completed') || newState === 'completed') return 'completed';
    if (eventType.includes('progress') || eventType.includes('started') || newState === 'running') return 'progress';
    return 'idea';
  };

  const mapActionStatusToType = (status: string): ActivityItem['type'] => {
    if (status === 'completed') return 'completed';
    if (status === 'running' || status === 'queued') return 'progress';
    return 'idea';
  };

  const formatEventTitle = (eventType: string): string => {
    return eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatEventDescription = (eventType: string, eventData: any): string => {
    if (eventData?.description) return eventData.description;
    
    switch (eventType) {
      case 'action_status_changed':
        return `Action status changed to ${eventData?.new_state || 'unknown'}`;
      case 'idea_created':
        return 'New SEO improvement idea generated';
      case 'technical_fix_applied':
        return `Technical SEO fix applied${eventData?.pages ? ` to ${eventData.pages} pages` : ''}`;
      default:
        return `Agent activity: ${eventType}`;
    }
  };

  const getMockActivities = (): ActivityItem[] => [
    {
      id: '1',
      type: 'idea',
      title: 'SEO opportunities detected',
      description: 'Potential improvements identified for your website',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      details: {
        metadata: {
          suggestions: 3,
          impact: 'Medium',
          effort: 'Low'
        }
      }
    },
    {
      id: '2',
      type: 'completed',
      title: 'Website connected successfully',
      description: 'Your website is now being monitored for SEO opportunities',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      details: {
        links: [
          { label: 'View Setup', url: '#', type: 'external' }
        ]
      }
    }
  ];

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
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
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
      case 'error':
        return <Badge className="bg-red-100 text-red-800 border-red-200">🚨 Issue</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">• Activity</Badge>;
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
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-3 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-4 h-4 bg-gray-200 rounded mt-1"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">No activities yet</div>
            <div className="text-sm text-gray-500">
              Start using the chat to see your SEO activities here
            </div>
          </div>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}