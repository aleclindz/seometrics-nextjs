import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ExternalLink, Settings, TrendingUp, Clock } from 'lucide-react';

interface Website {
  id: string;
  name: string;
  url: string;
  status: string;
  lastCrawled: string;
}

interface WebsiteHeaderProps {
  website: Website;
}

export function WebsiteHeader({ website }: WebsiteHeaderProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="border-0 border-b rounded-none bg-card">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-medium">{website.name}</h1>
                <Badge variant={website.status === 'active' ? 'default' : 'secondary'}>
                  {website.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-muted-foreground">
                <a 
                  href={website.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  {website.url}
                  <ExternalLink className="h-3 w-3" />
                </a>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span className="text-sm">Last crawled {formatDate(website.lastCrawled)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <TrendingUp className="h-4 w-4 mr-2" />
              View Analytics
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}