'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SVSScoreDisplay, SVSComponentScores, SVSRecommendations } from '@/components/ui/svs-score-display';

interface SVSAnalysis {
  id: string;
  overall_svs_score: number;
  grade: {
    grade: string;
    label: string;
    color: string;
  };
  component_scores: {
    entity_coverage: number;
    semantic_variety: number;
    qa_utility: number;
    citation_evidence: number;
    clarity_simplicity: number;
    topic_depth: number;
    structure_schema: number;
  };
  analysis_data: {
    recommendations: Array<{
      category: string;
      priority: string;
      title: string;
      description: string;
      potential_points: number;
    }>;
  };
  site_url: string;
  page_url?: string;
  analyzed_at: string;
}

interface SVSDashboardProps {
  userToken: string;
  selectedSite?: string;
  onAnalyzeNew?: () => void;
}

export function SVSDashboard({ userToken, selectedSite, onAnalyzeNew }: SVSDashboardProps) {
  const [analyses, setAnalyses] = useState<SVSAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<SVSAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'recommendations'>('overview');

  useEffect(() => {
    loadSVSAnalyses();
  }, [userToken, selectedSite]);

  const loadSVSAnalyses = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        userToken,
        limit: '10'
      });

      if (selectedSite) {
        params.append('siteUrl', selectedSite);
      }

      const response = await fetch(`/api/svs/results?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load SVS analyses');
      }

      if (result.success && result.data) {
        setAnalyses(result.data.analyses || []);
        if (result.data.analyses?.length > 0 && !selectedAnalysis) {
          setSelectedAnalysis(result.data.analyses[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load SVS analyses:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analyses');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeNewPage = async () => {
    if (!selectedSite) {
      alert('Please select a website first');
      return;
    }

    if (onAnalyzeNew) {
      onAnalyzeNew();
      return;
    }

    // Default implementation - open analyze modal/page
    const pageUrl = prompt('Enter the page URL to analyze:');
    if (!pageUrl) return;

    try {
      setLoading(true);
      const response = await fetch('/api/svs/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken,
          siteUrl: selectedSite,
          pageUrl: pageUrl.trim()
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Analysis failed');
      }

      if (result.success) {
        // Reload analyses to show the new one
        await loadSVSAnalyses();
      }
    } catch (err) {
      console.error('Analysis failed:', err);
      alert('Analysis failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  if (loading && analyses.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="text-center">
          <div className="text-red-400 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load SVS Data</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadSVSAnalyses}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="text-center">
          <div className="text-gray-400 text-4xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No SVS Analyses Yet</h3>
          <p className="text-gray-600 mb-6">
            Start analyzing your content to see how well it communicates meaning to AI search engines.
          </p>
          <button
            onClick={handleAnalyzeNewPage}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Run First SVS Analysis
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Semantic Visibility Score</h2>
          <p className="text-gray-600 mt-1">
            How well your content communicates meaning to AI search engines
          </p>
        </div>
        <button
          onClick={handleAnalyzeNewPage}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Analyze New Page
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Analysis List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">Recent Analyses</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {analyses.map((analysis, index) => (
                <motion.div
                  key={analysis.id}
                  className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                    selectedAnalysis?.id === analysis.id 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedAnalysis(analysis)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: analysis.grade.color }}
                      />
                      <span className="font-medium text-sm text-gray-900">
                        {analysis.overall_svs_score}/100
                      </span>
                      <span className="text-xs text-gray-500">
                        {analysis.grade.grade}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 truncate mb-1">
                    {analysis.page_url || analysis.site_url}
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    {new Date(analysis.analyzed_at).toLocaleDateString()}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Analysis Details */}
        <div className="lg:col-span-2">
          {selectedAnalysis && (
            <div className="space-y-6">
              {/* Score Display */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-4 lg:space-y-0 lg:space-x-8">
                  <div className="flex-shrink-0">
                    <SVSScoreDisplay
                      score={selectedAnalysis.overall_svs_score}
                      grade={selectedAnalysis.grade}
                      size="large"
                      animated={true}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Analysis Results
                    </h3>
                    <div className="text-sm text-gray-600 mb-4 break-all">
                      <strong>URL:</strong> {selectedAnalysis.page_url || selectedAnalysis.site_url}
                    </div>
                    <div className="text-sm text-gray-500">
                      Analyzed on {new Date(selectedAnalysis.analyzed_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="bg-white rounded-lg shadow">
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-8 px-6">
                    {[
                      { id: 'overview', label: 'Overview' },
                      { id: 'details', label: 'Component Breakdown' },
                      { id: 'recommendations', label: 'Recommendations' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === tab.id
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>

                <div className="p-6">
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {Object.entries(selectedAnalysis.component_scores).map(([key, value]) => (
                          <div key={key} className="text-center">
                            <div className="text-2xl font-bold text-gray-900">{value}</div>
                            <div className="text-sm text-gray-500 capitalize">
                              {key.replace('_', ' ')}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">What is SVS?</h4>
                        <p className="text-sm text-gray-600">
                          Semantic Visibility Score measures how well your content communicates meaning 
                          to AI search engines like ChatGPT, Claude, and Perplexity. Unlike traditional 
                          SEO metrics focused on keywords, SVS evaluates semantic understanding, entity 
                          relationships, and content structure.
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'details' && (
                    <SVSComponentScores
                      scores={selectedAnalysis.component_scores}
                      animated={true}
                    />
                  )}

                  {activeTab === 'recommendations' && (
                    <SVSRecommendations
                      recommendations={selectedAnalysis.analysis_data.recommendations}
                      animated={true}
                      onImplement={(rec) => {
                        alert(`Implementation guidance for: ${rec.title}\n\n${rec.description}`);
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}