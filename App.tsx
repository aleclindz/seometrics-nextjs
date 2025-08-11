import { useState } from 'react';
import { WebsiteHeader } from './components/WebsiteHeader';
import { ChatInterface } from './components/ChatInterface';
import { SEODashboard } from './components/SEODashboard';
import { ActionItems } from './components/ActionItems';

export default function App() {
  const [selectedWebsite] = useState({
    id: '1',
    name: 'techstartup.com',
    url: 'https://techstartup.com',
    status: 'active',
    lastCrawled: '2024-08-10T14:30:00Z'
  });

  return (
    <div className="min-h-screen bg-background">
      <WebsiteHeader website={selectedWebsite} />
      
      <div className="container mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Interface - Takes up more space on larger screens */}
        <div className="lg:col-span-2 order-1">
          <ChatInterface websiteId={selectedWebsite.id} />
        </div>
        
        {/* Dashboard and Action Items */}
        <div className="lg:col-span-1 order-2 space-y-6">
          <SEODashboard websiteId={selectedWebsite.id} />
          <ActionItems websiteId={selectedWebsite.id} />
        </div>
      </div>
    </div>
  );
}