'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { SVSScoreDisplay } from './svs-score-display';

interface SVSAuditWidgetProps {
  svsScore?: number;
  svsGrade?: {
    grade: string;
    label: string;
    color: string;
  };
  svsComponentScores?: {
    entity_coverage: number;
    semantic_variety: number;
    qa_utility: number;
    citation_evidence: number;
    clarity_simplicity: number;
    topic_depth: number;
    structure_schema: number;
  };
  svsRecommendations?: Array<{
    category: string;
    priority: string;
    title: string;
    description: string;
    potential_points: number;
  }>;
  websiteUrl: string;
  showUpgradePrompt?: boolean;
}

export function SVSAuditWidget({
  svsScore,
  svsGrade,
  svsComponentScores,
  svsRecommendations,
  websiteUrl,
  showUpgradePrompt = false
}: SVSAuditWidgetProps) {
  // If no SVS data, show placeholder/upgrade prompt
  if (!svsScore || !svsGrade) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">🤖</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Semantic Visibility Score (SVS)
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            See how well your content communicates meaning to AI search engines like ChatGPT and Claude.
          </p>
          
          {showUpgradePrompt ? (
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
              Upgrade for SVS Analysis
            </button>
          ) : (
            <div className="text-xs text-gray-500">
              SVS analysis unavailable for this page
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="bg-white rounded-lg border border-gray-200 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">🤖</div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Semantic Visibility Score
            </h3>
            <p className="text-blue-100 text-sm">
              AI Search Engine Optimization
            </p>
          </div>
        </div>
      </div>

      {/* Score Display */}
      <div className="p-6">
        <div className="flex flex-col lg:flex-row items-center space-y-4 lg:space-y-0 lg:space-x-8">
          <div className="flex-shrink-0">
            <SVSScoreDisplay
              score={svsScore}
              grade={svsGrade}
              size="medium"
              animated={true}
            />
          </div>
          
          <div className="flex-1 text-center lg:text-left">
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Your content scores <strong>{svsScore}/100</strong> for semantic visibility.
                This measures how effectively your content communicates meaning to AI search engines.
              </p>
            </div>
            
            {/* Component Summary */}
            {svsComponentScores && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Entity Coverage:</span>
                  <span className="font-medium">{svsComponentScores.entity_coverage}/20</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Semantic Variety:</span>
                  <span className="font-medium">{svsComponentScores.semantic_variety}/15</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Q&A Utility:</span>
                  <span className="font-medium">{svsComponentScores.qa_utility}/15</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Citation Evidence:</span>
                  <span className="font-medium">{svsComponentScores.citation_evidence}/15</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Recommendations */}
        {svsRecommendations && svsRecommendations.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">
              Top SVS Improvements
            </h4>
            <div className="space-y-2">
              {svsRecommendations.slice(0, 3).map((rec, index) => (
                <motion.div
                  key={index}
                  className="flex items-start space-x-3 text-sm"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 + 0.5 }}
                >
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-600">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-gray-900">
                        {rec.title}
                      </span>
                      <span className="text-xs text-green-600 font-medium">
                        +{rec.potential_points} pts
                      </span>
                    </div>
                    <p className="text-gray-600">
                      {rec.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* What is SVS? */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
              What is Semantic Visibility Score? 
              <span className="ml-1 group-open:rotate-90 transition-transform inline-block">▶</span>
            </summary>
            <div className="mt-3 text-sm text-gray-600 space-y-2">
              <p>
                SVS measures how well your content communicates meaning to AI search engines 
                like ChatGPT, Claude, and Perplexity. Unlike traditional SEO focused on keywords, 
                SVS evaluates:
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong>Entity Coverage:</strong> Named entities and relationships</li>
                <li><strong>Semantic Variety:</strong> Natural language vs keyword stuffing</li>
                <li><strong>Q&A Utility:</strong> Question/answer patterns</li>
                <li><strong>Citation Evidence:</strong> Stats and credible sources</li>
                <li><strong>Clarity:</strong> AI-readable content structure</li>
              </ul>
            </div>
          </details>
        </div>

        {/* CTA */}
        <div className="mt-6 text-center">
          <button 
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            onClick={() => window.open(`https://seoagent.com/signup?source=free-audit&url=${encodeURIComponent(websiteUrl)}`, '_blank')}
          >
            <span>Get Full SVS Analysis</span>
            <span className="ml-2">→</span>
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Unlock detailed recommendations and automated improvements
          </p>
        </div>
      </div>
    </motion.div>
  );
}

interface SVSComparisonWidgetProps {
  userScore: number;
  userGrade: {
    grade: string;
    label: string;
    color: string;
  };
  industryAverage?: number;
  industry?: string;
  percentile?: number;
}

export function SVSComparisonWidget({
  userScore,
  userGrade,
  industryAverage,
  industry,
  percentile
}: SVSComparisonWidgetProps) {
  const isAboveAverage = industryAverage ? userScore > industryAverage : false;
  
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h4 className="font-medium text-gray-900 mb-3">Industry Comparison</h4>
      
      <div className="flex items-center justify-between mb-3">
        <div className="text-center">
          <div className="text-lg font-bold" style={{ color: userGrade.color }}>
            {userScore}
          </div>
          <div className="text-xs text-gray-600">Your Score</div>
        </div>
        
        <div className="flex-1 mx-4">
          <div className="flex items-center space-x-2">
            {isAboveAverage ? (
              <>
                <span className="text-green-500 text-sm">📈</span>
                <span className="text-sm text-green-700 font-medium">Above Average</span>
              </>
            ) : (
              <>
                <span className="text-orange-500 text-sm">📊</span>
                <span className="text-sm text-orange-700 font-medium">Below Average</span>
              </>
            )}
          </div>
        </div>
        
        {industryAverage && (
          <div className="text-center">
            <div className="text-lg font-bold text-gray-600">
              {Math.round(industryAverage)}
            </div>
            <div className="text-xs text-gray-600">
              {industry || 'Industry'} Avg
            </div>
          </div>
        )}
      </div>
      
      {percentile && (
        <div className="text-center">
          <span className="text-sm text-gray-600">
            Better than <strong>{percentile}%</strong> of similar websites
          </span>
        </div>
      )}
    </div>
  );
}