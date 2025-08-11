import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { TrendingUp, TrendingDown, Search, Users, MousePointer, Eye } from 'lucide-react';
import { useState } from 'react';

interface SEODashboardProps {
  websiteId: string;
}

export function SEODashboard({ websiteId }: SEODashboardProps) {
  const [dateFilter, setDateFilter] = useState('30d');

  const dateFilterOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '6m', label: 'Last 6 months' },
    { value: '1y', label: 'Last year' }
  ];

  const metrics = [
    {
      title: 'SEO Score',
      value: 78,
      change: +5,
      icon: Search,
      type: 'score'
    },
    {
      title: 'Organic Traffic',
      value: '12.4K',
      change: +12,
      icon: Users,
      type: 'traffic'
    },
    {
      title: 'Click Rate',
      value: '3.2%',
      change: -0.3,
      icon: MousePointer,
      type: 'percentage'
    },
    {
      title: 'Impressions',
      value: '45.2K',
      change: +8,
      icon: Eye,
      type: 'number'
    }
  ];



  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">SEO Performance</CardTitle>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dateFilterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          const isPositive = metric.change > 0;
          
          return (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">{metric.title}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-medium">{metric.value}</span>
                    <span className={`flex items-center gap-1 text-sm ${
                      isPositive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {isPositive ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {Math.abs(metric.change)}%
                    </span>
                  </div>
                </div>
              </div>
              {metric.type === 'score' && (
                <div className="w-16">
                  <Progress value={metric.value} className="h-2" />
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}