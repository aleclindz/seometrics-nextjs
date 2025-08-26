'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Zap,
  Globe,
  Smartphone,
  Code
} from 'lucide-react';

interface CrawlMonitorProps {
  domain: string;
  userToken: string;
}

export default function CrawlMonitor({ domain, userToken }: CrawlMonitorProps) {
  const [activeTab, setActiveTab] = useState<'issues' | 'vitals' | 'history'>('issues');

  const technicalIssues = [
    {
      id: '1',
      type: 'Missing Meta Descriptions',
      severity: 'medium',
      count: 12,
      description: 'Pages without meta descriptions may have poor SERP click-through rates',
      pages: ['/blog/seo-guide', '/products/tool-1', '/about'],
      autoFixable: true
    },
    {
      id: '2',
      type: 'Duplicate Title Tags',
      severity: 'high',
      count: 3,
      description: 'Multiple pages share the same title tag',
      pages: ['/category/tools', '/category/software'],
      autoFixable: false
    },
    {
      id: '3',
      type: 'Missing Alt Text',
      severity: 'low',
      count: 8,
      description: 'Images without alt text affect accessibility and SEO',
      pages: ['/blog/guide-1', '/blog/guide-2'],
      autoFixable: true
    }
  ];

  const coreWebVitals = [
    {
      metric: 'LCP',
      name: 'Largest Contentful Paint',
      value: 2.1,
      threshold: 2.5,
      status: 'good',
      unit: 's'
    },
    {
      metric: 'FID',
      name: 'First Input Delay',
      value: 95,
      threshold: 100,
      status: 'good',
      unit: 'ms'
    },
    {
      metric: 'CLS',
      name: 'Cumulative Layout Shift',
      value: 0.08,
      threshold: 0.1,
      status: 'good',
      unit: ''
    },
    {
      metric: 'FCP',
      name: 'First Contentful Paint',
      value: 1.8,
      threshold: 1.8,
      status: 'needs-improvement',
      unit: 's'
    }
  ];

  const crawlHistory = [
    {
      id: '1',
      date: '2024-03-01',
      status: 'completed',
      pagesScanned: 247,
      issuesFound: 15,
      issuesFixed: 8,
      duration: '12m 34s'
    },
    {
      id: '2',
      date: '2024-02-25',
      status: 'completed',
      pagesScanned: 243,
      issuesFound: 23,
      issuesFixed: 12,
      duration: '11m 42s'
    },
    {
      id: '3',
      date: '2024-02-18',
      status: 'completed',
      pagesScanned: 238,
      issuesFound: 31,
      issuesFixed: 18,
      duration: '10m 58s'
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getVitalStatus = (status: string) => {
    switch (status) {
      case 'good': return { color: 'text-green-600', bg: 'bg-green-100' };
      case 'needs-improvement': return { color: 'text-yellow-600', bg: 'bg-yellow-100' };
      case 'poor': return { color: 'text-red-600', bg: 'bg-red-100' };
      default: return { color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  return (
    <div className="p-4">
      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'issues', label: 'Issues' },
          { id: 'vitals', label: 'Core Web Vitals' },
          { id: 'history', label: 'Crawl History' }
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

      {/* Technical Issues */}
      {activeTab === 'issues' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">Technical Issues</h4>
            <Button size="sm">
              <Search className="h-3 w-3 mr-1" />
              Scan Now
            </Button>
          </div>
          
          {technicalIssues.map((issue) => (
            <Card key={issue.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`h-4 w-4 ${
                      issue.severity === 'high' ? 'text-red-500' :
                      issue.severity === 'medium' ? 'text-yellow-500' :
                      'text-blue-500'
                    }`} />
                    <h5 className="font-medium text-gray-900">{issue.type}</h5>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getSeverityColor(issue.severity)}>
                      {issue.count} pages
                    </Badge>
                    {issue.autoFixable && (
                      <Badge className="bg-green-100 text-green-800">
                        Auto-fixable
                      </Badge>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{issue.description}</p>
                
                <div className="mb-3">
                  <h6 className="text-xs font-medium text-gray-500 mb-1">Affected Pages:</h6>
                  <div className="space-y-1">
                    {issue.pages.slice(0, 3).map((page, index) => (
                      <code key={index} className="block text-xs bg-gray-100 px-2 py-1 rounded">
                        {page}
                      </code>
                    ))}
                    {issue.pages.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{issue.pages.length - 3} more pages
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {issue.autoFixable ? (
                    <Button size="sm" className="flex-1">
                      Auto-Fix All
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="flex-1">
                      View Details
                    </Button>
                  )}
                  <Button size="sm" variant="outline">
                    Ignore
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Core Web Vitals */}
      {activeTab === 'vitals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">Core Web Vitals</h4>
            <Button size="sm" variant="outline">
              <Zap className="h-3 w-3 mr-1" />
              Optimize
            </Button>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {coreWebVitals.map((vital) => {
              const status = getVitalStatus(vital.status);
              return (
                <Card key={vital.metric}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${status.bg}`} />
                        <h5 className="font-medium text-gray-900">{vital.metric}</h5>
                      </div>
                      <div className={`text-right ${status.color}`}>
                        <div className="font-semibold">
                          {vital.value}{vital.unit}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{vital.name}</p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Threshold: {vital.threshold}{vital.unit}</span>
                      <span className={status.color}>
                        {vital.status.replace('-', ' ')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Crawl History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">Recent Crawls</h4>
            <Button size="sm" variant="outline">
              Export Report
            </Button>
          </div>
          
          {crawlHistory.map((crawl) => (
            <Card key={crawl.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <div>
                      <h5 className="font-medium text-gray-900">
                        {new Date(crawl.date).toLocaleDateString()}
                      </h5>
                      <p className="text-sm text-gray-500">Duration: {crawl.duration}</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    {crawl.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="font-semibold text-gray-900">{crawl.pagesScanned}</div>
                    <div className="text-xs text-gray-500">Pages Scanned</div>
                  </div>
                  <div>
                    <div className="font-semibold text-red-600">{crawl.issuesFound}</div>
                    <div className="text-xs text-gray-500">Issues Found</div>
                  </div>
                  <div>
                    <div className="font-semibold text-green-600">{crawl.issuesFixed}</div>
                    <div className="text-xs text-gray-500">Issues Fixed</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}