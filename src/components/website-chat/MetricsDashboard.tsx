'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  MousePointer, 
  Link, 
  Settings, 
  Bot,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

interface MetricsDashboardProps {
  domain: string;
  userToken: string;
}

interface MetricsData {
  monthlyVisitors: {
    value: number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
  };
  clicks: {
    value: number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
  };
  backlinks: {
    value: number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
  };
  techSeoScore: {
    value: number;
    maxValue: number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
  };
  geoVisibility: {
    value: number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
  };
}

export default function MetricsDashboard({ domain, userToken }: MetricsDashboardProps) {
  const [metrics, setMetrics] = useState<MetricsData>({
    monthlyVisitors: { value: 12400, change: 15, trend: 'up' },
    clicks: { value: 8900, change: 8, trend: 'up' },
    backlinks: { value: 342, change: -2, trend: 'down' },
    techSeoScore: { value: 87, maxValue: 100, change: 12, trend: 'up' },
    geoVisibility: { value: 23, change: 45, trend: 'up' }
  });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    if (trend === 'up') return <ChevronUp className="h-3 w-3 text-green-500" />;
    if (trend === 'down') return <ChevronDown className="h-3 w-3 text-red-500" />;
    return null;
  };

  const getTrendColor = (trend: 'up' | 'down' | 'neutral') => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-sm">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Site Info */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              {domain.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">{domain}</h1>
              <p className="text-xs text-gray-500">SEO Performance</p>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="flex items-center gap-6">
            {/* Monthly Visitors */}
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatNumber(metrics.monthlyVisitors.value)}
                  </span>
                  {getTrendIcon(metrics.monthlyVisitors.trend)}
                  <span className={`text-xs ${getTrendColor(metrics.monthlyVisitors.trend)}`}>
                    {metrics.monthlyVisitors.change > 0 ? '+' : ''}{metrics.monthlyVisitors.change}%
                  </span>
                </div>
                <div className="text-xs text-gray-500">Visitors</div>
              </div>
            </div>

            {/* Clicks */}
            <div className="flex items-center gap-2">
              <MousePointer className="h-4 w-4 text-green-500" />
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatNumber(metrics.clicks.value)}
                  </span>
                  {getTrendIcon(metrics.clicks.trend)}
                  <span className={`text-xs ${getTrendColor(metrics.clicks.trend)}`}>
                    {metrics.clicks.change > 0 ? '+' : ''}{metrics.clicks.change}%
                  </span>
                </div>
                <div className="text-xs text-gray-500">Clicks</div>
              </div>
            </div>

            {/* Backlinks */}
            <div className="flex items-center gap-2">
              <Link className="h-4 w-4 text-purple-500" />
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatNumber(metrics.backlinks.value)}
                  </span>
                  {getTrendIcon(metrics.backlinks.trend)}
                  <span className={`text-xs ${getTrendColor(metrics.backlinks.trend)}`}>
                    {metrics.backlinks.change > 0 ? '+' : ''}{metrics.backlinks.change}%
                  </span>
                </div>
                <div className="text-xs text-gray-500">Backlinks</div>
              </div>
            </div>

            {/* Technical SEO Score */}
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-orange-500" />
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-gray-900">
                    {metrics.techSeoScore.value}/{metrics.techSeoScore.maxValue}
                  </span>
                  {getTrendIcon(metrics.techSeoScore.trend)}
                  <span className={`text-xs ${getTrendColor(metrics.techSeoScore.trend)}`}>
                    {metrics.techSeoScore.change > 0 ? '+' : ''}{metrics.techSeoScore.change}%
                  </span>
                </div>
                <div className="text-xs text-gray-500">Tech SEO</div>
              </div>
            </div>

            {/* GEO Visibility */}
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-indigo-500" />
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-gray-900">
                    {metrics.geoVisibility.value}%
                  </span>
                  {getTrendIcon(metrics.geoVisibility.trend)}
                  <span className={`text-xs ${getTrendColor(metrics.geoVisibility.trend)}`}>
                    {metrics.geoVisibility.change > 0 ? '+' : ''}{metrics.geoVisibility.change}%
                  </span>
                </div>
                <div className="text-xs text-gray-500">GEO Visibility</div>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <Badge 
            variant="outline" 
            className="bg-green-50 text-green-700 border-green-200"
          >
            Active
          </Badge>
        </div>
      </div>
    </Card>
  );
}