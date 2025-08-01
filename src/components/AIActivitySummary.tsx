'use client';

import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';

interface ActivitySummaryData {
  summary: string;
  periodStart: string;
  periodEnd: string;
  activityCount: number;
  generatedAt: string;
  cached: boolean;
}

interface Props {
  userToken: string;
  siteUrl: string;
  className?: string;
  websiteStatus?: {
    gscConnected: boolean;
    seoagentjsInstalled: boolean;
    hasAuditScore: boolean;
    criticalIssues: number;
    mobileFriendly: number;
    withSchema: number;
    totalPages: number;
  };
}

export default function AIActivitySummary({ userToken, siteUrl, className = '', websiteStatus }: Props) {
  const [data, setData] = useState<ActivitySummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActivitySummary();
  }, [userToken, siteUrl]);

  const fetchActivitySummary = async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetch('/api/technical-seo/activity-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userToken,
          siteUrl,
          forceRefresh,
          sinceDays: 7,
          websiteStatus
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch activity summary');
      }

      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Failed to generate summary');
      }
    } catch (error) {
      console.error('Error fetching activity summary:', error);
      setError(error instanceof Error ? error.message : 'Failed to load activity summary');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchActivitySummary(true);
  };

  const formatTimePeriod = () => {
    if (!data) return '';
    
    const start = new Date(data.periodStart);
    const end = new Date(data.periodEnd);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) return 'today';
    if (diffDays <= 7) return 'this week';
    if (diffDays <= 14) return 'the past two weeks';
    return `the past ${Math.ceil(diffDays / 7)} weeks`;
  };

  const getSummaryIcon = () => {
    if (!data) return <Sparkles className="h-5 w-5 text-violet-500" />;
    
    if (data.activityCount === 0) {
      return <Info className="h-5 w-5 text-blue-500" />;
    } else if (data.activityCount >= 10) {
      return <TrendingUp className="h-5 w-5 text-green-500" />;
    } else {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
  };

  const getBorderColor = () => {
    if (!data) return 'border-gray-200';
    
    if (data.activityCount === 0) {
      return 'border-blue-200';
    } else if (data.activityCount >= 10) {
      return 'border-green-200';
    } else {
      return 'border-green-200';
    }
  };

  const getBackgroundColor = () => {
    if (!data) return 'bg-gray-50';
    
    if (data.activityCount === 0) {
      return 'bg-blue-50';
    } else if (data.activityCount >= 10) {
      return 'bg-green-50';
    } else {
      return 'bg-green-50';
    }
  };

  if (loading) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="animate-spin">
            <RefreshCw className="h-5 w-5 text-gray-400" />
          </div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm font-medium text-red-800">Failed to load activity summary</p>
              <p className="text-xs text-red-600">{error}</p>
            </div>
          </div>
          <button
            onClick={() => fetchActivitySummary()}
            className="text-red-600 hover:text-red-800 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className={`${getBackgroundColor()} border ${getBorderColor()} rounded-lg p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {getSummaryIcon()}
          <div className="flex-1 min-w-0">
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-800 leading-relaxed whitespace-pre-line m-0">
                {data.summary}
              </p>
            </div>
            
            {expanded && (
              <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>Generated {new Date(data.generatedAt).toLocaleString()}</span>
                  </div>
                  {data.cached && (
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="h-3 w-3" />
                      <span>Cached result</span>
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  Period: {formatTimePeriod()} • {data.activityCount} activities tracked
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            title="Refresh summary"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title={expanded ? 'Show less' : 'Show details'}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {data.activityCount > 0 && !expanded && (
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {data.activityCount} SEO improvements {formatTimePeriod()}
          </div>
          <button
            onClick={() => setExpanded(true)}
            className="text-xs text-violet-600 hover:text-violet-800 font-medium"
          >
            View details
          </button>
        </div>
      )}
    </div>
  );
}