'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ContentPlanner from './ContentPlanner';
import CrawlMonitor from './CrawlMonitor';
import GEOInsights from './GEOInsights';
import { 
  FileText, 
  Search, 
  Bot, 
  X,
  ChevronRight
} from 'lucide-react';

interface SecondaryPanelsProps {
  domain: string;
  userToken: string;
}

type PanelType = 'content-planner' | 'crawl-monitor' | 'geo-insights' | null;

export default function SecondaryPanels({ domain, userToken }: SecondaryPanelsProps) {
  const [activePanel, setActivePanel] = useState<PanelType>(null);

  const panels = [
    {
      id: 'content-planner' as PanelType,
      title: 'Content Planner',
      description: 'Topic clusters, drafts, interlinking',
      icon: <FileText className="h-4 w-4" />,
      badge: '3 drafts',
      color: 'text-green-600'
    },
    {
      id: 'crawl-monitor' as PanelType,
      title: 'Crawl Monitor',
      description: 'Technical issues, Core Web Vitals',
      icon: <Search className="h-4 w-4" />,
      badge: '2 issues',
      color: 'text-orange-600'
    },
    {
      id: 'geo-insights' as PanelType,
      title: 'GEO Insights',
      description: 'AI visibility tracking',
      icon: <Bot className="h-4 w-4" />,
      badge: '23% visible',
      color: 'text-blue-600'
    }
  ];

  const renderPanel = () => {
    switch (activePanel) {
      case 'content-planner':
        return <ContentPlanner domain={domain} userToken={userToken} />;
      case 'crawl-monitor':
        return <CrawlMonitor domain={domain} userToken={userToken} />;
      case 'geo-insights':
        return <GEOInsights domain={domain} userToken={userToken} />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Panel Triggers */}
      <div className="flex gap-2">
        {panels.map((panel) => (
          <Button
            key={panel.id}
            variant="outline"
            size="sm"
            onClick={() => setActivePanel(panel.id)}
            className={`h-9 ${activePanel === panel.id ? 'bg-gray-100' : 'bg-white hover:bg-gray-50'}`}
          >
            <span className={panel.color}>
              {panel.icon}
            </span>
            <span className="ml-2 font-medium">{panel.title}</span>
            <Badge variant="outline" className="ml-2 text-xs">
              {panel.badge}
            </Badge>
            <ChevronRight className="h-3 w-3 ml-1 text-gray-400" />
          </Button>
        ))}
      </div>

      {/* Panel Overlay */}
      {activePanel && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setActivePanel(null)}
          />
          
          {/* Panel */}
          <div className="relative ml-auto bg-white w-96 h-full shadow-xl flex flex-col">
            {/* Panel Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {panels.find(p => p.id === activePanel)?.title}
                </h3>
                <p className="text-sm text-gray-500">
                  {panels.find(p => p.id === activePanel)?.description}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActivePanel(null)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto">
              {renderPanel()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}