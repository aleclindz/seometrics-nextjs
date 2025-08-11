import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { AlertTriangle, Clock, CheckCircle, Zap, ArrowRight } from 'lucide-react';
import { useState } from 'react';

interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'completed';
  impact: 'High' | 'Medium' | 'Low';
  estimatedTime: string;
  automated: boolean;
}

interface ActionItemsProps {
  websiteId: string;
}

export function ActionItems({ websiteId }: ActionItemsProps) {
  const [actionItems, setActionItems] = useState<ActionItem[]>([
    {
      id: '1',
      title: 'Optimize page load speed',
      description: 'Compress images and minify CSS/JS files',
      priority: 'high',
      status: 'pending',
      impact: 'High',
      estimatedTime: '2 hours',
      automated: true
    },
    {
      id: '2',
      title: 'Update meta descriptions',
      description: '12 pages missing optimized meta descriptions',
      priority: 'medium',
      status: 'pending',
      impact: 'Medium',
      estimatedTime: '1 hour',
      automated: true
    },
    {
      id: '3',
      title: 'Fix broken internal links',
      description: '3 broken internal links found',
      priority: 'high',
      status: 'in-progress',
      impact: 'Medium',
      estimatedTime: '30 min',
      automated: false
    },
    {
      id: '4',
      title: 'Add schema markup',
      description: 'Implement structured data for articles',
      priority: 'medium',
      status: 'pending',
      impact: 'Medium',
      estimatedTime: '3 hours',
      automated: true
    },
    {
      id: '5',
      title: 'Improve mobile responsiveness',
      description: 'Header navigation issues on mobile',
      priority: 'low',
      status: 'completed',
      impact: 'Low',
      estimatedTime: '1 hour',
      automated: false
    }
  ]);

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'low':
        return 'border-green-200 bg-green-50';
      default:
        return '';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'in-progress':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      default:
        return null;
    }
  };

  const handleAutomate = (itemId: string) => {
    setActionItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, status: 'in-progress' }
          : item
      )
    );
  };

  const pendingItems = actionItems.filter(item => item.status === 'pending');
  const inProgressItems = actionItems.filter(item => item.status === 'in-progress');
  const completedItems = actionItems.filter(item => item.status === 'completed');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          Action Items
          <Badge variant="outline">{pendingItems.length} pending</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pending Items */}
        {pendingItems.map((item) => (
          <div
            key={item.id}
            className={`p-3 border rounded-lg ${getPriorityColor(item.priority)}`}
          >
            <div className="flex items-start gap-3">
              <Checkbox className="mt-1" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  {getPriorityIcon(item.priority)}
                  <h4 className="font-medium">{item.title}</h4>
                  {item.automated && (
                    <Badge variant="outline" className="text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      Auto
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{item.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Impact: {item.impact}</span>
                    <span>Est: {item.estimatedTime}</span>
                  </div>
                  {item.automated && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleAutomate(item.id)}
                    >
                      Automate
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* In Progress Items */}
        {inProgressItems.length > 0 && (
          <div className="space-y-2">
            <h5 className="font-medium text-sm text-muted-foreground">In Progress</h5>
            {inProgressItems.map((item) => (
              <div key={item.id} className="p-3 border rounded-lg bg-blue-50 border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <div className="flex-1">
                    <h4 className="font-medium">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  {getStatusBadge(item.status)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Completed Items */}
        {completedItems.length > 0 && (
          <div className="space-y-2">
            <h5 className="font-medium text-sm text-muted-foreground">Recently Completed</h5>
            {completedItems.slice(0, 2).map((item) => (
              <div key={item.id} className="p-3 border rounded-lg bg-green-50 border-green-200 opacity-75">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div className="flex-1">
                    <h4 className="font-medium line-through">{item.title}</h4>
                  </div>
                  {getStatusBadge(item.status)}
                </div>
              </div>
            ))}
          </div>
        )}

        <Button variant="outline" className="w-full mt-4">
          View All Tasks
        </Button>
      </CardContent>
    </Card>
  );
}