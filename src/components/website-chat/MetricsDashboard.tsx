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
  impressions: {
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
    comingSoon: boolean;
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
    comingSoon: boolean;
  };
}

export default function MetricsDashboard({ domain, userToken }: MetricsDashboardProps) {
  const [metrics, setMetrics] = useState<MetricsData>({
    impressions: { value: 0, change: 0, trend: 'neutral' },
    clicks: { value: 0, change: 0, trend: 'neutral' },
    backlinks: { value: 0, change: 0, trend: 'neutral', comingSoon: true },
    techSeoScore: { value: 87, maxValue: 100, change: 12, trend: 'up' },
    geoVisibility: { value: 0, change: 0, trend: 'neutral', comingSoon: true }
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGSCMetrics();
  }, [domain, userToken]);

  const fetchGSCMetrics = async () => {
    if (!domain || !userToken) return;

    try {
      setLoading(true);
      
      // Calculate date range (last 28 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 28);
      
      // Calculate previous period (28 days before that) for comparison
      const prevEndDate = new Date(startDate);
      const prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 28);

      // Format dates for API
      const formatDate = (date: Date) => date.toISOString().split('T')[0];

      // Fetch current period data
      const currentResponse = await fetch('/api/gsc/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteUrl: `https://${domain}`,
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          userToken
        })
      });

      // Fetch previous period data for comparison
      const prevResponse = await fetch('/api/gsc/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteUrl: `https://${domain}`,
          startDate: formatDate(prevStartDate),
          endDate: formatDate(prevEndDate),
          userToken
        })
      });

      if (currentResponse.ok) {
        const currentData = await currentResponse.json();
        let prevData = null;
        
        if (prevResponse.ok) {
          prevData = await prevResponse.json();
        }

        if (currentData.success && currentData.data) {
          const current = currentData.data.total;
          const previous = prevData?.success && prevData?.data ? prevData.data.total : null;

          // Calculate changes
          const calculateChange = (current: number, previous: number | null) => {
            if (!previous || previous === 0) return 0;
            return Math.round(((current - previous) / previous) * 100);
          };

          const getTrend = (change: number): 'up' | 'down' | 'neutral' => {
            if (change > 0) return 'up';
            if (change < 0) return 'down';
            return 'neutral';
          };

          const impressionsChange = calculateChange(current.impressions, previous?.impressions);
          const clicksChange = calculateChange(current.clicks, previous?.clicks);

          setMetrics(prev => ({
            ...prev,
            impressions: {
              value: current.impressions || 0,
              change: impressionsChange,
              trend: getTrend(impressionsChange)
            },
            clicks: {
              value: current.clicks || 0,
              change: clicksChange,
              trend: getTrend(clicksChange)
            }
          }));
        }
      } else if (currentResponse.status === 404) {
        // No GSC connection found - this is expected for some sites
        console.log('No GSC connection found for domain:', domain);
      }
    } catch (error) {
      console.error('Error fetching GSC metrics:', error);
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
            {/* Impressions */}
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <div className="text-right">
                <div className="flex items-center gap-1">
                  {loading ? (
                    <div className="animate-pulse bg-gray-200 h-4 w-12 rounded"></div>
                  ) : (
                    <>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatNumber(metrics.impressions.value)}
                      </span>
                      {getTrendIcon(metrics.impressions.trend)}
                      <span className={`text-xs ${getTrendColor(metrics.impressions.trend)}`}>
                        {metrics.impressions.change > 0 ? '+' : ''}{metrics.impressions.change}%
                      </span>
                    </>
                  )}
                </div>
                <div className="text-xs text-gray-500">Impressions</div>
              </div>
            </div>

            {/* Clicks */}
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

            {/* Backlinks */}
            <div className="flex items-center gap-2">
              <Link className="h-4 w-4 text-purple-500" />
              <div className="text-right">
                <div className="flex items-center gap-1">
                  {metrics.backlinks.comingSoon ? (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                      Coming Soon
                    </span>
                  ) : (
                    <>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatNumber(metrics.backlinks.value)}
                      </span>
                      {getTrendIcon(metrics.backlinks.trend)}
                      <span className={`text-xs ${getTrendColor(metrics.backlinks.trend)}`}>
                        {metrics.backlinks.change > 0 ? '+' : ''}{metrics.backlinks.change}%
                      </span>
                    </>
                  )}
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
                  {metrics.geoVisibility.comingSoon ? (
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                      Coming Soon
                    </span>
                  ) : (
                    <>
                      <span className="text-sm font-semibold text-gray-900">
                        {metrics.geoVisibility.value}%
                      </span>
                      {getTrendIcon(metrics.geoVisibility.trend)}
                      <span className={`text-xs ${getTrendColor(metrics.geoVisibility.trend)}`}>
                        {metrics.geoVisibility.change > 0 ? '+' : ''}{metrics.geoVisibility.change}%
                      </span>
                    </>
                  )}
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