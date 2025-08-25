'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Pause, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  TrendingUp, 
  Lightbulb,
  Zap,
  BarChart3
} from 'lucide-react';

interface AgentDashboardProps {
  userToken: string;
  selectedSite?: string;
}

interface ActivitySummary {
  narrative: string;
  activity_counts: {
    total_events: number;
    completed_actions: number;
    new_ideas: number;
  };
  active_work: {
    summary: string;
    by_status: Record<string, number>;
  };
  upcoming_items: any[];
  top_ideas: any[];
  current_state: {
    needs_attention: number;
    total_active: number;
  };
}

interface AgentAction {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: number;
  site_url: string;
  created_at: string;
  scheduled_for?: string;
}

interface AgentIdea {
  id: string;
  title: string;
  status: string;
  ice_score?: number;
  site_url: string;
  created_at: string;
}

export default function AgentDashboard({ userToken, selectedSite }: AgentDashboardProps) {
  const [activitySummary, setActivitySummary] = useState<ActivitySummary | null>(null);
  const [recentActions, setRecentActions] = useState<AgentAction[]>([]);
  const [openIdeas, setOpenIdeas] = useState<AgentIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAgentData();
  }, [userToken, selectedSite]);

  const loadAgentData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load activity summary
      const summaryParams = new URLSearchParams({ userToken });
      if (selectedSite) summaryParams.append('siteUrl', selectedSite);
      
      const summaryResponse = await fetch(`/api/agent/summary?${summaryParams}`);
      const summaryData = await summaryResponse.json();
      
      if (summaryData.success) {
        setActivitySummary(summaryData.summary);
      }

      // Load recent actions
      const actionsParams = new URLSearchParams({ userToken, limit: '10' });
      if (selectedSite) actionsParams.append('siteUrl', selectedSite);
      
      const actionsResponse = await fetch(`/api/agent/actions?${actionsParams}`);
      const actionsData = await actionsResponse.json();
      
      if (actionsData.success) {
        setRecentActions(actionsData.actions);
      }

      // Load open ideas
      const ideasParams = new URLSearchParams({ userToken, status: 'open', limit: '5' });
      if (selectedSite) ideasParams.append('siteUrl', selectedSite);
      
      const ideasResponse = await fetch(`/api/agent/ideas?${ideasParams}`);
      const ideasData = await ideasResponse.json();
      
      if (ideasData.success) {
        setOpenIdeas(ideasData.ideas);
      }

    } catch (err) {
      console.error('Agent dashboard load error:', err);
      setError('Failed to load agent data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'running':
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'needs_verification':
        return 'bg-yellow-100 text-yellow-800';
      case 'queued':
      case 'scheduled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'verified':
        return <CheckCircle className="h-4 w-4" />;
      case 'running':
      case 'in_progress':
        return <Play className="h-4 w-4" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4" />;
      case 'needs_verification':
        return <Clock className="h-4 w-4" />;
      default:
        return <Pause className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Activity Summary */}
      {activitySummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Agent Activity Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">{activitySummary.narrative}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {activitySummary.activity_counts.completed_actions}
                </div>
                <div className="text-sm text-gray-500">Completed Actions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {activitySummary.current_state.total_active}
                </div>
                <div className="text-sm text-gray-500">Active Tasks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {activitySummary.activity_counts.new_ideas}
                </div>
                <div className="text-sm text-gray-500">New Ideas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {activitySummary.current_state.needs_attention}
                </div>
                <div className="text-sm text-gray-500">Need Attention</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="actions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="actions">Recent Actions</TabsTrigger>
          <TabsTrigger value="ideas">Open Ideas</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Recent Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No recent actions found</p>
              ) : (
                <div className="space-y-3">
                  {recentActions.map((action) => (
                    <div 
                      key={action.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(action.status)}
                        <div>
                          <div className="font-medium">{action.title}</div>
                          <div className="text-sm text-gray-500">
                            {action.type.replace(/_/g, ' ')} • {action.site_url}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(action.status)}>
                          {action.status.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          Priority: {action.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ideas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Open Ideas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {openIdeas.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No open ideas found</p>
              ) : (
                <div className="space-y-3">
                  {openIdeas.map((idea) => (
                    <div 
                      key={idea.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                        <div>
                          <div className="font-medium">{idea.title}</div>
                          <div className="text-sm text-gray-500">
                            {idea.site_url}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {idea.ice_score && (
                          <Badge variant="outline">
                            ICE: {idea.ice_score}
                          </Badge>
                        )}
                        <Button size="sm" variant="outline">
                          Adopt
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Upcoming Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(!activitySummary?.upcoming_items || activitySummary.upcoming_items.length === 0) ? (
                <p className="text-gray-500 text-center py-8">No upcoming tasks scheduled</p>
              ) : (
                <div className="space-y-3">
                  {activitySummary.upcoming_items.map((item) => (
                    <div 
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <div>
                          <div className="font-medium">{item.title}</div>
                          <div className="text-sm text-gray-500">
                            {item.type.replace(/_/g, ' ')}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-400">
                        {item.scheduled_for ? 
                          new Date(item.scheduled_for).toLocaleDateString() : 
                          'No schedule'
                        }
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}