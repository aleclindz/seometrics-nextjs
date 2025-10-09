'use client';

/**
 * Strategy Tab V2 - Redesigned with Master Discovery Integration
 *
 * Features:
 * - Strategy status checking and onboarding flow
 * - Cluster hierarchy with pillar/supporting articles
 * - Section mapping visualization
 * - Article brief generation from discovery
 */

import { useState, useEffect } from 'react';
import {
  Sparkles,
  Loader2,
  Target,
  FileText,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Plus,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import StrategyOnboardingModal from './StrategyOnboardingModal';

interface StrategyTabV2Props {
  websiteToken: string;
  domain: string;
}

interface StrategyStatus {
  initialized: boolean;
  clusterCount: number;
  pillarCount: number;
  supportingCount: number;
  lastDiscoveryAt?: string;
}

interface Cluster {
  id: number;
  clusterName: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  notes?: string;
  pillarCount: number;
  supportingCount: number;
  totalArticles: number;
  articles?: Article[];
}

interface Article {
  id: number;
  discoveryArticleId: string;
  role: 'PILLAR' | 'SUPPORTING';
  title: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  linksTo?: string[];
  sectionMap?: SectionMapping[];
  articleBriefId?: number;
  articleQueueId?: number;
}

interface SectionMapping {
  type: 'H2' | 'FAQ';
  heading: string;
  absorbs: string[];
}

export default function StrategyTabV2({ websiteToken, domain }: StrategyTabV2Props) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StrategyStatus | null>(null);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [expandedClusters, setExpandedClusters] = useState<Record<number, boolean>>({});
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStrategyStatus();
  }, [websiteToken]);

  const loadStrategyStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/strategy/status?websiteToken=${websiteToken}`);
      if (!response.ok) throw new Error('Failed to load strategy status');

      const data = await response.json();
      setStatus(data);

      // If strategy is initialized, load clusters
      if (data.initialized) {
        await loadClusters();
      } else {
        setOnboardingOpen(true);
      }
    } catch (error) {
      console.error('Error loading strategy status:', error);
      setError(error instanceof Error ? error.message : 'Failed to load strategy');
    } finally {
      setLoading(false);
    }
  };

  const loadClusters = async () => {
    try {
      const response = await fetch(`/api/strategy/clusters?websiteToken=${websiteToken}`);
      if (!response.ok) throw new Error('Failed to load clusters');

      const data = await response.json();
      setClusters(data.clusters || []);
    } catch (error) {
      console.error('Error loading clusters:', error);
      setError(error instanceof Error ? error.message : 'Failed to load clusters');
    }
  };

  const loadClusterArticles = async (clusterId: number) => {
    try {
      const response = await fetch(
        `/api/strategy/clusters?websiteToken=${websiteToken}&clusterId=${clusterId}`
      );
      if (!response.ok) throw new Error('Failed to load cluster articles');

      const data = await response.json();
      const updatedCluster = data.clusters.find((c: Cluster) => c.id === clusterId);

      if (updatedCluster) {
        setClusters(prev =>
          prev.map(c => (c.id === clusterId ? updatedCluster : c))
        );
      }
    } catch (error) {
      console.error('Error loading cluster articles:', error);
    }
  };

  const toggleCluster = (clusterId: number) => {
    const isExpanded = expandedClusters[clusterId];

    setExpandedClusters(prev => ({
      ...prev,
      [clusterId]: !isExpanded
    }));

    // Load articles if expanding and not already loaded
    if (!isExpanded) {
      const cluster = clusters.find(c => c.id === clusterId);
      if (cluster && !cluster.articles) {
        loadClusterArticles(clusterId);
      }
    }
  };

  const handleOnboardingComplete = () => {
    setOnboardingOpen(false);
    loadStrategyStatus();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-red-900 mb-1">Error Loading Strategy</h3>
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={loadStrategyStatus}
            className="mt-3 text-sm text-red-700 underline hover:text-red-800"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Show onboarding if not initialized
  if (!status?.initialized) {
    return (
      <>
        <div className="bg-white border rounded-lg p-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-2">Initialize Your SEO Strategy</h3>
          <p className="text-gray-600 mb-6">
            Let&apos;s build a comprehensive content strategy with topic clusters, pillar articles, and supporting content.
          </p>
          <button
            onClick={() => setOnboardingOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            <Sparkles className="w-5 h-5" />
            Start Strategy Discovery
          </button>
        </div>

        <StrategyOnboardingModal
          isOpen={onboardingOpen}
          onClose={() => setOnboardingOpen(false)}
          websiteToken={websiteToken}
          domain={domain}
          onComplete={handleOnboardingComplete}
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Content Strategy</h2>
          <p className="text-gray-600 text-sm mt-1">
            Strategic content plan with {status.clusterCount} topic clusters
          </p>
        </div>
        <button
          onClick={loadStrategyStatus}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{status.clusterCount}</p>
              <p className="text-sm text-gray-600">Topic Clusters</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{status.pillarCount}</p>
              <p className="text-sm text-gray-600">Pillar Articles</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{status.supportingCount}</p>
              <p className="text-sm text-gray-600">Supporting Articles</p>
            </div>
          </div>
        </div>
      </div>

      {/* Clusters */}
      <div className="space-y-4">
        {clusters.length === 0 ? (
          <div className="bg-white border rounded-lg p-8 text-center">
            <p className="text-gray-600">No clusters found. Try refreshing or re-running discovery.</p>
          </div>
        ) : (
          clusters.map((cluster, index) => (
            <ClusterCard
              key={cluster.id}
              cluster={cluster}
              index={index}
              expanded={!!expandedClusters[cluster.id]}
              onToggle={() => toggleCluster(cluster.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Cluster Card Component
// ============================================================================

function ClusterCard({
  cluster,
  index,
  expanded,
  onToggle
}: {
  cluster: Cluster;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const themes = [
    { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-100', iconColor: 'text-blue-600' },
    { bg: 'bg-green-50', border: 'border-green-200', icon: 'bg-green-100', iconColor: 'text-green-600' },
    { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'bg-purple-100', iconColor: 'text-purple-600' },
    { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'bg-amber-100', iconColor: 'text-amber-600' },
    { bg: 'bg-rose-50', border: 'border-rose-200', icon: 'bg-rose-100', iconColor: 'text-rose-600' }
  ];

  const theme = themes[index % themes.length];

  return (
    <div className={`bg-white border ${theme.border} rounded-lg overflow-hidden`}>
      {/* Cluster Header */}
      <button
        onClick={onToggle}
        className="w-full p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors text-left"
      >
        <div className="flex items-center gap-4 flex-1">
          <div className={`p-3 rounded-lg ${theme.icon}`}>
            <Target className={`w-5 h-5 ${theme.iconColor}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-gray-900">{cluster.clusterName}</h3>
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                {cluster.totalArticles} article{cluster.totalArticles !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>
                <strong>{cluster.pillarCount}</strong> pillar{cluster.pillarCount !== 1 ? 's' : ''}
              </span>
              <span>
                <strong>{cluster.supportingCount}</strong> supporting
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500">{cluster.primaryKeyword}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500" />
          )}
        </div>
      </button>

      {/* Articles List */}
      {expanded && cluster.articles && (
        <div className="px-6 pb-6 border-t">
          <div className="pt-4 space-y-3">
            {cluster.articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Article Card Component
// ============================================================================

function ArticleCard({ article }: { article: Article }) {
  const [expanded, setExpanded] = useState(false);
  const isPillar = article.role === 'PILLAR';

  return (
    <div
      className={`border rounded-lg p-4 ${
        isPillar ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
      }`}
    >
      {/* Article Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs font-semibold px-2 py-1 rounded ${
                isPillar
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-white'
              }`}
            >
              {article.role}
            </span>
            {article.articleBriefId && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                Brief Created
              </span>
            )}
            {article.articleQueueId && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                In Queue
              </span>
            )}
          </div>
          <h4 className="font-medium text-gray-900">{article.title}</h4>
          <p className="text-sm text-gray-600 mt-1">
            Primary: <strong>{article.primaryKeyword}</strong>
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          {expanded ? 'Hide' : 'Details'}
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Secondary Keywords */}
      {article.secondaryKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {article.secondaryKeywords.slice(0, expanded ? undefined : 3).map((kw, idx) => (
            <span
              key={idx}
              className="text-xs bg-white border border-gray-300 text-gray-700 px-2 py-0.5 rounded"
            >
              {kw}
            </span>
          ))}
          {!expanded && article.secondaryKeywords.length > 3 && (
            <span className="text-xs text-gray-500">
              +{article.secondaryKeywords.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t space-y-3">
          {/* Section Mapping (Pillar only) */}
          {isPillar && article.sectionMap && article.sectionMap.length > 0 && (
            <div>
              <h5 className="text-sm font-semibold mb-2">Section Mapping</h5>
              <div className="space-y-2">
                {article.sectionMap.map((section, idx) => (
                  <div key={idx} className="bg-white border border-blue-200 rounded p-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        {section.type}
                      </span>
                      <span className="text-sm font-medium">{section.heading}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 ml-2">
                      {section.absorbs.map((kw, kidx) => (
                        <span
                          key={kidx}
                          className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Links To (Supporting only) */}
          {!isPillar && article.linksTo && article.linksTo.length > 0 && (
            <div>
              <h5 className="text-sm font-semibold mb-2">Links to Pillars</h5>
              <div className="text-xs text-gray-600">
                {article.linksTo.map((linkId, idx) => (
                  <span key={idx} className="block">
                    → {linkId}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {!article.articleBriefId && (
              <button className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700">
                <Plus className="w-3 h-3 inline mr-1" />
                Create Brief
              </button>
            )}
            {article.articleBriefId && (
              <button className="text-xs px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50">
                <ExternalLink className="w-3 h-3 inline mr-1" />
                View Brief
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
