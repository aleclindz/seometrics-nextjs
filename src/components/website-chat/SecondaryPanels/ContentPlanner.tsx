'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Plus, 
  Calendar,
  Link,
  Target,
  TrendingUp
} from 'lucide-react';

interface ContentPlannerProps {
  domain: string;
  userToken: string;
}

export default function ContentPlanner({ domain, userToken }: ContentPlannerProps) {
  const [activeTab, setActiveTab] = useState<'clusters' | 'drafts' | 'interlinking'>('clusters');

  const topicClusters = [
    {
      id: '1',
      pillarTopic: 'Email Marketing',
      keywordVolume: 12100,
      articles: [
        { title: 'Email Marketing Automation Guide', status: 'draft', targetKeywords: ['email automation', 'marketing sequences'] },
        { title: '10 Best Email Marketing Tools', status: 'published', targetKeywords: ['email tools', 'marketing software'] },
        { title: 'Email Segmentation Strategies', status: 'idea', targetKeywords: ['email segmentation', 'targeted emails'] }
      ]
    },
    {
      id: '2',
      pillarTopic: 'Content Marketing',
      keywordVolume: 22300,
      articles: [
        { title: 'Content Marketing ROI Calculator', status: 'idea', targetKeywords: ['content roi', 'marketing metrics'] },
        { title: 'How to Create Viral Content', status: 'draft', targetKeywords: ['viral content', 'content strategy'] }
      ]
    }
  ];

  const blogDrafts = [
    {
      id: '1',
      title: '10 Email Marketing Strategies That Drive Results',
      status: 'in-progress',
      wordCount: 2100,
      targetWords: 2500,
      scheduledDate: '2024-03-15',
      targetKeywords: ['email marketing', 'marketing strategies']
    },
    {
      id: '2',
      title: 'Complete Guide to Marketing Automation',
      status: 'draft',
      wordCount: 0,
      targetWords: 3000,
      scheduledDate: '2024-03-20',
      targetKeywords: ['marketing automation', 'automation tools']
    },
    {
      id: '3',
      title: 'SEO Content Optimization Checklist',
      status: 'review',
      wordCount: 1800,
      targetWords: 2000,
      scheduledDate: '2024-03-10',
      targetKeywords: ['seo optimization', 'content seo']
    }
  ];

  const interlinkingOpportunities = [
    {
      sourcePage: '/blog/email-marketing-guide',
      targetPage: '/blog/automation-tools',
      anchorText: 'marketing automation tools',
      relevanceScore: 0.92,
      difficulty: 'Easy'
    },
    {
      sourcePage: '/blog/content-strategy',
      targetPage: '/blog/seo-guide',
      anchorText: 'SEO optimization',
      relevanceScore: 0.87,
      difficulty: 'Medium'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'review': return 'bg-purple-100 text-purple-800';
      case 'idea': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-4">
      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'clusters', label: 'Topic Clusters' },
          { id: 'drafts', label: 'Drafts' },
          { id: 'interlinking', label: 'Interlinking' }
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

      {/* Topic Clusters */}
      {activeTab === 'clusters' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">Content Clusters</h4>
            <Button size="sm">
              <Plus className="h-3 w-3 mr-1" />
              New Cluster
            </Button>
          </div>
          
          {topicClusters.map((cluster) => (
            <Card key={cluster.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{cluster.pillarTopic}</CardTitle>
                  <div className="flex items-center gap-1 text-sm text-blue-600">
                    <TrendingUp className="h-3 w-3" />
                    {cluster.keywordVolume.toLocaleString()}/mo
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {cluster.articles.map((article, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{article.title}</div>
                        <div className="text-xs text-gray-500">
                          {article.targetKeywords.join(', ')}
                        </div>
                      </div>
                      <Badge className={getStatusColor(article.status)}>
                        {article.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Blog Drafts */}
      {activeTab === 'drafts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">Blog Drafts</h4>
            <Button size="sm">
              <Plus className="h-3 w-3 mr-1" />
              New Draft
            </Button>
          </div>
          
          {blogDrafts.map((draft) => (
            <Card key={draft.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900 mb-1">{draft.title}</h5>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {draft.wordCount}/{draft.targetWords} words
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(draft.scheduledDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Badge className={getStatusColor(draft.status)}>
                    {draft.status}
                  </Badge>
                </div>
                
                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(draft.wordCount / draft.targetWords) * 100}%` }}
                    />
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {draft.targetKeywords.map((keyword, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Interlinking */}
      {activeTab === 'interlinking' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">Interlinking Opportunities</h4>
            <Button size="sm" variant="outline">
              Scan for More
            </Button>
          </div>
          
          {interlinkingOpportunities.map((opportunity, index) => (
            <Card key={index}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Link className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-sm">Internal Link Opportunity</span>
                  <Badge variant="outline" className="ml-auto">
                    Score: {Math.round(opportunity.relevanceScore * 100)}%
                  </Badge>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">From:</span>{' '}
                    <code className="bg-gray-100 px-1 rounded">{opportunity.sourcePage}</code>
                  </div>
                  <div>
                    <span className="text-gray-500">To:</span>{' '}
                    <code className="bg-gray-100 px-1 rounded">{opportunity.targetPage}</code>
                  </div>
                  <div>
                    <span className="text-gray-500">Anchor text:</span>{' '}
                    <span className="font-medium">{opportunity.anchorText}</span>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-3">
                  <Button size="sm" className="flex-1">
                    Add Link
                  </Button>
                  <Button size="sm" variant="outline">
                    Skip
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}