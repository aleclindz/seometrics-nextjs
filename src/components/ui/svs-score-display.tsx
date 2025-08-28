'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface SVSScoreDisplayProps {
  score: number;
  grade: {
    grade: string;
    label: string;
    color: string;
  };
  size?: 'small' | 'medium' | 'large';
  showDetails?: boolean;
  animated?: boolean;
}

export function SVSScoreDisplay({ 
  score, 
  grade, 
  size = 'medium', 
  showDetails = true,
  animated = true 
}: SVSScoreDisplayProps) {
  const sizeClasses = {
    small: {
      container: 'w-16 h-16',
      text: 'text-lg font-bold',
      subtext: 'text-xs'
    },
    medium: {
      container: 'w-24 h-24',
      text: 'text-2xl font-bold',
      subtext: 'text-sm'
    },
    large: {
      container: 'w-32 h-32',
      text: 'text-3xl font-bold',
      subtext: 'text-base'
    }
  };

  const currentSize = sizeClasses[size];

  // Calculate stroke-dasharray for circular progress
  const radius = size === 'small' ? 28 : size === 'medium' ? 40 : 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const MotionDiv = animated ? motion.div : 'div';
  const MotionCircle = animated ? motion.circle : 'circle';

  return (
    <div className="flex flex-col items-center space-y-3">
      {/* Circular Score Display */}
      <MotionDiv
        className={`relative ${currentSize.container} flex items-center justify-center`}
        {...(animated ? {
          initial: { scale: 0 },
          animate: { scale: 1 },
          transition: { type: 'spring', stiffness: 200, damping: 15 }
        } : {})}
      >
        {/* Background Circle */}
        <svg
          className={`absolute inset-0 transform -rotate-90 ${currentSize.container}`}
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r={radius * 0.8}
            stroke="#E5E7EB"
            strokeWidth="8"
            fill="none"
          />
          <MotionCircle
            cx="50"
            cy="50"
            r={radius * 0.8}
            stroke={grade.color}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray * 0.8}
            strokeDashoffset={strokeDashoffset * 0.8}
            {...(animated ? {
              initial: { strokeDashoffset: strokeDasharray * 0.8 },
              animate: { strokeDashoffset: strokeDashoffset * 0.8 },
              transition: { duration: 1.5, ease: 'easeOut', delay: 0.5 }
            } : {})}
          />
        </svg>

        {/* Score Text */}
        <div className="flex flex-col items-center">
          <span className={`${currentSize.text} text-gray-900`}>
            {score}
          </span>
          <span className={`${currentSize.subtext} text-gray-500 -mt-1`}>
            SVS
          </span>
        </div>
      </MotionDiv>

      {/* Grade and Label */}
      {showDetails && (
        <MotionDiv
          className="text-center"
          {...(animated ? {
            initial: { opacity: 0, y: 10 },
            animate: { opacity: 1, y: 0 },
            transition: { delay: 1.5, duration: 0.5 }
          } : {})}
        >
          <div className="flex items-center space-x-2">
            <span 
              className={`inline-block px-3 py-1 rounded-full text-white font-semibold text-sm`}
              style={{ backgroundColor: grade.color }}
            >
              {grade.grade}
            </span>
            <span className="text-sm font-medium text-gray-700">
              {grade.label}
            </span>
          </div>
        </MotionDiv>
      )}
    </div>
  );
}

interface SVSComponentScoresProps {
  scores: {
    entity_coverage: number;
    semantic_variety: number;
    qa_utility: number;
    citation_evidence: number;
    clarity_simplicity: number;
    topic_depth: number;
    structure_schema: number;
  };
  maxScores?: {
    entity_coverage: number;
    semantic_variety: number;
    qa_utility: number;
    citation_evidence: number;
    clarity_simplicity: number;
    topic_depth: number;
    structure_schema: number;
  };
  animated?: boolean;
}

export function SVSComponentScores({ 
  scores, 
  maxScores = {
    entity_coverage: 20,
    semantic_variety: 15,
    qa_utility: 15,
    citation_evidence: 15,
    clarity_simplicity: 10,
    topic_depth: 15,
    structure_schema: 10
  },
  animated = true 
}: SVSComponentScoresProps) {
  const components = [
    {
      key: 'entity_coverage',
      label: 'Entity Coverage',
      description: 'Named entities and relationships',
      icon: '🏢',
      color: '#3B82F6'
    },
    {
      key: 'semantic_variety',
      label: 'Semantic Variety',
      description: 'Natural language and synonyms',
      icon: '🔤',
      color: '#10B981'
    },
    {
      key: 'qa_utility',
      label: 'Q&A Utility',
      description: 'Question/answer patterns',
      icon: '❓',
      color: '#F59E0B'
    },
    {
      key: 'citation_evidence',
      label: 'Citation Evidence',
      description: 'Stats and credible sources',
      icon: '📚',
      color: '#EF4444'
    },
    {
      key: 'clarity_simplicity',
      label: 'Clarity & Simplicity',
      description: 'Readability and comprehension',
      icon: '✨',
      color: '#8B5CF6'
    },
    {
      key: 'topic_depth',
      label: 'Topic Depth',
      description: 'Comprehensive coverage',
      icon: '🎯',
      color: '#06B6D4'
    },
    {
      key: 'structure_schema',
      label: 'Structure & Schema',
      description: 'HTML structure and markup',
      icon: '🏗️',
      color: '#84CC16'
    }
  ];

  const MotionDiv = animated ? motion.div : 'div';

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        SVS Component Breakdown
      </h3>
      
      <div className="grid gap-3">
        {components.map((component, index) => {
          const score = scores[component.key as keyof typeof scores];
          const maxScore = maxScores[component.key as keyof typeof maxScores];
          const percentage = (score / maxScore) * 100;
          
          return (
            <MotionDiv
              key={component.key}
              className="bg-gray-50 rounded-lg p-4"
              {...(animated ? {
                initial: { opacity: 0, x: -20 },
                animate: { opacity: 1, x: 0 },
                transition: { delay: index * 0.1, duration: 0.5 }
              } : {})}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{component.icon}</span>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {component.label}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {component.description}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-gray-900">
                    {score}/{maxScore}
                  </span>
                  <div className="text-xs text-gray-500">
                    {Math.round(percentage)}%
                  </div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <MotionDiv
                  className="h-2 rounded-full"
                  style={{ backgroundColor: component.color }}
                  {...(animated ? {
                    initial: { width: 0 },
                    animate: { width: `${percentage}%` },
                    transition: { delay: index * 0.1 + 0.5, duration: 0.8, ease: 'easeOut' }
                  } : {
                    style: { width: `${percentage}%` }
                  })}
                />
              </div>
            </MotionDiv>
          );
        })}
      </div>
    </div>
  );
}

interface SVSRecommendationsProps {
  recommendations: Array<{
    category: string;
    priority: string;
    title: string;
    description: string;
    potential_points: number;
  }>;
  onImplement?: (recommendation: any) => void;
  animated?: boolean;
}

export function SVSRecommendations({ 
  recommendations, 
  onImplement,
  animated = true 
}: SVSRecommendationsProps) {
  const priorityColors = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-blue-100 text-blue-800 border-blue-200'
  };

  const MotionDiv = animated ? motion.div : 'div';

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-4xl mb-2">🎉</div>
        <p className="text-gray-600">No recommendations needed - excellent SVS score!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        SVS Improvement Recommendations
      </h3>
      
      <div className="space-y-3">
        {recommendations.map((rec, index) => (
          <MotionDiv
            key={index}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
            {...(animated ? {
              initial: { opacity: 0, y: 20 },
              animate: { opacity: 1, y: 0 },
              transition: { delay: index * 0.1, duration: 0.5 }
            } : {})}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <span 
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${
                      priorityColors[rec.priority as keyof typeof priorityColors] || 
                      priorityColors.medium
                    }`}
                  >
                    {rec.priority.toUpperCase()}
                  </span>
                  <span className="text-sm text-green-600 font-medium">
                    +{rec.potential_points} pts
                  </span>
                </div>
                
                <h4 className="font-medium text-gray-900 mb-1">
                  {rec.title}
                </h4>
                
                <p className="text-sm text-gray-600 mb-3">
                  {rec.description}
                </p>
                
                <div className="text-xs text-gray-500 capitalize">
                  Category: {rec.category.replace('_', ' ')}
                </div>
              </div>
              
              {onImplement && (
                <button
                  onClick={() => onImplement(rec)}
                  className="ml-4 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Implement
                </button>
              )}
            </div>
          </MotionDiv>
        ))}
      </div>
    </div>
  );
}