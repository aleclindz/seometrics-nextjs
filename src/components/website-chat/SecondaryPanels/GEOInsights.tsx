'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  TrendingUp, 
  Eye, 
  MessageCircle,
  ExternalLink,
  Search,
  Sparkles,
  BarChart3
} from 'lucide-react';

interface GEOInsightsProps {
  domain: string;
  userToken: string;
}

export default function GEOInsights({ domain, userToken }: GEOInsightsProps) {
  const [activeTab, setActiveTab] = useState<'visibility' | 'citations' | 'optimization'>('visibility');

  const visibilityData = {
    overallScore: 23,
    trend: '+12%',
    totalQueries: 1247,
    citationsFound: 156,
    topAIEngines: [
      { name: 'ChatGPT', visibility: 28, citations: 45, trend: 'up' },
      { name: 'Claude', visibility: 22, citations: 38, trend: 'up' },
      { name: 'Perplexity', visibility: 19, citations: 31, trend: 'down' },
      { name: 'Bard', visibility: 15, citations: 24, trend: 'up' }
    ]
  };

  const recentCitations = [
    {
      id: '1',
      query: 'best email marketing tools',
      aiEngine: 'ChatGPT',
      citedPage: '/blog/email-marketing-tools',
      position: 2,
      timestamp: '2 hours ago',
      context: 'When discussing comprehensive email marketing solutions...'
    },
    {
      id: '2',
      query: 'how to improve conversion rates',
      aiEngine: 'Claude',
      citedPage: '/blog/conversion-optimization',
      position: 1,
      timestamp: '4 hours ago',
      context: 'For detailed strategies on conversion rate optimization...'
    },
    {
      id: '3',
      query: 'marketing automation best practices',
      aiEngine: 'Perplexity',
      citedPage: '/resources/automation-guide',
      position: 3,
      timestamp: '6 hours ago',
      context: 'According to marketing experts, automation best practices include...'
    }
  ];

  const optimizationTasks = [
    {
      id: '1',
      title: 'Add structured data markup',
      description: 'FAQ and HowTo schema can improve AI citation chances',
      impact: 'High',
      difficulty: 'Medium',
      status: 'pending'
    },
    {
      id: '2',
      title: 'Create stat-heavy content',
      description: 'AI engines prefer content with statistics and data',
      impact: 'High',
      difficulty: 'Easy',
      status: 'in-progress'
    },
    {
      id: '3',
      title: 'Optimize for question-based queries',
      description: 'Structure content to answer common questions directly',
      impact: 'Medium',
      difficulty: 'Easy',
      status: 'pending'
    }
  ];

  const getTrendIcon = (trend: string) => {
    return trend === 'up' ? 
      <TrendingUp className="h-3 w-3 text-green-500" /> :
      <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />;
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-4">
      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'visibility', label: 'Visibility Score' },
          { id: 'citations', label: 'Citations' },
          { id: 'optimization', label: 'Optimization' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Visibility Score */}
      {activeTab === 'visibility' && (
        <div className="space-y-4">
          {/* Overview Card */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {visibilityData.overallScore}%
                </div>
                <div className="text-lg font-medium text-gray-900 mb-1">
                  GEO Visibility Score
                </div>
                <div className="flex items-center justify-center gap-1 text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-medium">{visibilityData.trend} this month</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-blue-200">
                <div className="text-center">
                  <div className="font-semibold text-gray-900">{visibilityData.totalQueries}</div>
                  <div className="text-sm text-gray-600">Queries Tracked</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-900">{visibilityData.citationsFound}</div>
                  <div className="text-sm text-gray-600">Citations Found</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Engines Breakdown */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Performance by AI Engine</h4>
            <div className="space-y-3">
              {visibilityData.topAIEngines.map((engine) => (
                <Card key={engine.name}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Bot className="h-5 w-5 text-blue-500" />
                        <div>
                          <div className="font-medium text-gray-900">{engine.name}</div>
                          <div className="text-sm text-gray-500">
                            {engine.citations} citations
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold text-gray-900">
                            {engine.visibility}%
                          </span>
                          {getTrendIcon(engine.trend)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Citations */}
      {activeTab === 'citations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">Recent Citations</h4>
            <Button size="sm" variant="outline">
              <Search className="h-3 w-3 mr-1" />
              Search More
            </Button>
          </div>
          
          {recentCitations.map((citation) => (
            <Card key={citation.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-blue-500" />
                    <div>
                      <h5 className="font-medium text-gray-900">
                        &ldquo;{citation.query}&rdquo;
                      </h5>
                      <div className="text-sm text-gray-500">
                        {citation.aiEngine} • Position {citation.position}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-green-100 text-green-800">
                      #{citation.position}
                    </Badge>
                    <div className="text-xs text-gray-500 mt-1">
                      {citation.timestamp}
                    </div>
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="text-sm text-gray-600 italic mb-2">
                    &ldquo;{citation.context}&rdquo;
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-gray-500">Cited page:</span>
                    <code className="bg-gray-100 px-1 rounded text-xs">
                      {citation.citedPage}
                    </code>
                  </div>
                </div>
                
                <Button size="sm" variant="outline" className="w-full">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View Full Response
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Optimization Tasks */}
      {activeTab === 'optimization' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">Optimization Tasks</h4>
            <Button size="sm">
              <Sparkles className="h-3 w-3 mr-1" />
              Auto-Optimize
            </Button>
          </div>
          
          {optimizationTasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900 mb-1">{task.title}</h5>
                    <p className="text-sm text-gray-600">{task.description}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Badge className={getImpactColor(task.impact)}>
                      {task.impact}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {task.difficulty}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {task.status === 'pending' ? (
                    <Button size="sm" className="flex-1">
                      Start Task
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="flex-1">
                      View Progress
                    </Button>
                  )}
                  <Button size="sm" variant="outline">
                    Learn More
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Tips */}
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div>
                  <h5 className="font-medium text-yellow-800 mb-1">
                    GEO Optimization Tips
                  </h5>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Include specific statistics and data points</li>
                    <li>• Structure content with clear headings and bullet points</li>
                    <li>• Answer questions directly and concisely</li>
                    <li>• Add FAQ and HowTo schema markup</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}