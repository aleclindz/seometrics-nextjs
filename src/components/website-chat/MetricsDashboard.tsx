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
  clicks: {
    value: number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
  };
  indexing: {
    indexed: number;
    total: number;
    percentage: number;
  };
  backlinks: {
    comingSoon: boolean;
  };
  techScore: {
    score: number;
    maxScore: number;
    percentage: number;
    trend: 'up' | 'down' | 'neutral';
  };
  geoVisibility: {
    comingSoon: boolean;
  };
}

export default function MetricsDashboard({ domain, userToken }: MetricsDashboardProps) {
  const [metrics, setMetrics] = useState<MetricsData>({
    clicks: { value: 0, change: 0, trend: 'neutral' },
    indexing: { indexed: 0, total: 0, percentage: 0 },
    backlinks: { comingSoon: true },
    techScore: { score: 0, maxScore: 100, percentage: 0, trend: 'neutral' },
    geoVisibility: { comingSoon: true }
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, [domain, userToken]);

  const fetchMetrics = async () => {
    if (!domain || !userToken) return;

    try {
      setLoading(true);
      
      const siteUrl = domain.startsWith('http') ? domain : `https://${domain}`;
      
      const response = await fetch('/api/website/metrics-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteUrl,
          userToken
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.data) {
          setMetrics(data.data);
        }
      } else {
        console.log('Error fetching metrics:', await response.text());
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

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
    <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-sm rounded-xl">
      <div className="px-6 py-4">
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
            {/* Clicks (GSC 28-day) */}
            <div className="flex items-center gap-2">
              <MousePointer className="h-4 w-4 text-green-500" />
              <div className="text-right">
                <div className="flex items-center gap-1">
                  {loading ? (
                    <div className="animate-pulse bg-gray-200 h-4 w-12 rounded"></div>
                  ) : (
                    <>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatNumber(metrics.clicks.value)}
                      </span>
                      {getTrendIcon(metrics.clicks.trend)}
                      <span className={`text-xs ${getTrendColor(metrics.clicks.trend)}`}>
                        {metrics.clicks.change > 0 ? '+' : ''}{metrics.clicks.change}%
                      </span>
                    </>
                  )}
                </div>
                <div className="text-xs text-gray-500">Clicks</div>
              </div>
            </div>

            {/* Indexed Pages / Total Crawlable */}
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <div className="text-right">
                <div className="flex items-center gap-1">
                  {loading ? (
                    <div className="animate-pulse bg-gray-200 h-4 w-12 rounded"></div>
                  ) : (
                    <span className="text-sm font-semibold text-gray-900">
                      {metrics.indexing.indexed}/{metrics.indexing.total}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500">Indexed</div>
              </div>
            </div>

            {/* Tech Score */}
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-orange-500" />
              <div className="text-right">
                <div className="flex items-center gap-1">
                  {loading ? (
                    <div className="animate-pulse bg-gray-200 h-4 w-12 rounded"></div>
                  ) : (
                    <>
                      <span className="text-sm font-semibold text-gray-900">
                        {metrics.techScore.score}/100
                      </span>
                      {getTrendIcon(metrics.techScore.trend)}
                      <span className={`text-xs ${getTrendColor(metrics.techScore.trend)}`}>
                        {metrics.techScore.percentage}%
                      </span>
                    </>
                  )}
                </div>
                <div className="text-xs text-gray-500">Tech Score</div>
              </div>
            </div>

            {/* Backlinks */}
            <div className="flex items-center gap-2">
              <Link className="h-4 w-4 text-purple-500" />
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                    Coming Soon
                  </span>
                </div>
                <div className="text-xs text-gray-500">Backlinks</div>
              </div>
            </div>

            {/* GEO Visibility */}
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-indigo-500" />
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                    Coming Soon
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