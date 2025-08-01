'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Globe, 
  Search,
  Zap,
  TrendingUp,
  FileText,
  Shield,
  Smartphone,
  BarChart3
} from 'lucide-react';

interface TechnicalSEOData {
  overview: {
    totalPages: number;
    indexablePages: number;
    mobileFriendly: number;
    withSchema: number;
    lastAuditAt: string;
  };
  fixes: {
    automated: number;
    pending: number;
    errors: number;
  };
  realtimeActivity: Array<{
    timestamp: string;
    action: string;
    page: string;
    status: 'success' | 'warning' | 'error';
  }>;
  issues: Array<{
    type: string;
    severity: 'critical' | 'warning' | 'info';
    count: number;
    description: string;
    canAutoFix: boolean;
  }>;
}

interface Props {
  userToken: string;
  websites: Array<{ domain: string; website_token: string }>;
}

export default function TechnicalSEODashboard({ userToken, websites }: Props) {
  const [data, setData] = useState<TechnicalSEOData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [autoFixInProgress, setAutoFixInProgress] = useState(false);

  useEffect(() => {
    if (websites.length > 0 && !selectedSite) {
      setSelectedSite(websites[0].domain);
    }
  }, [websites, selectedSite]);

  const fetchTechnicalSEOData = async () => {
    if (!selectedSite) return;
    
    try {
      setLoading(true);
      
      // Fetch URL inspections data
      const inspectionsResponse = await fetch('/api/technical-seo/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken,
          siteUrl: `https://${selectedSite}`
        })
      });

      if (inspectionsResponse.ok) {
        const technicalData = await inspectionsResponse.json();
        setData(technicalData.data);
      }
    } catch (error) {
      console.error('Error fetching technical SEO data:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerAutomatedFixes = async () => {
    if (!selectedSite) return;
    
    try {
      setAutoFixInProgress(true);
      
      const response = await fetch('/api/technical-seo/auto-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken,
          siteUrl: `https://${selectedSite}`,
          fixTypes: ['schema_markup', 'canonical_tags', 'open_graph', 'meta_tags']
        })
      });

      if (response.ok) {
        // Refresh data after fixes
        await fetchTechnicalSEOData();
      }
    } catch (error) {
      console.error('Error triggering automated fixes:', error);
    } finally {
      setAutoFixInProgress(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchTechnicalSEOData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchTechnicalSEOData();
  }, [selectedSite, userToken]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Technical SEO Dashboard</h2>
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Technical SEO Dashboard</h2>
          <p className="text-muted-foreground">
            Automated SEO fixes and real-time monitoring
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            {websites.map((site) => (
              <option key={site.domain} value={site.domain}>
                {site.domain}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Pages</p>
                  <p className="text-2xl font-bold">{data.overview.totalPages}</p>
                </div>
                <Globe className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Last audit: {new Date(data.overview.lastAuditAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Indexable</p>
                  <p className="text-2xl font-bold text-green-600">{data.overview.indexablePages}</p>
                </div>
                <Search className="h-8 w-8 text-green-500" />
              </div>
              <Progress 
                value={(data.overview.indexablePages / data.overview.totalPages) * 100} 
                className="mt-2" 
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Mobile Friendly</p>
                  <p className="text-2xl font-bold text-blue-600">{data.overview.mobileFriendly}</p>
                </div>
                <Smartphone className="h-8 w-8 text-blue-500" />
              </div>
              <Progress 
                value={(data.overview.mobileFriendly / data.overview.totalPages) * 100} 
                className="mt-2" 
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">With Schema</p>
                  <p className="text-2xl font-bold text-purple-600">{data.overview.withSchema}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-500" />
              </div>
              <Progress 
                value={(data.overview.withSchema / data.overview.totalPages) * 100} 
                className="mt-2" 
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Automated Fixes Section */}
      {data && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-orange-500" />
                  Automated Fixes
                </CardTitle>
                <CardDescription>
                  Smart.js is continuously optimizing your website&apos;s technical SEO
                </CardDescription>
              </div>
              <Button 
                onClick={triggerAutomatedFixes}
                disabled={autoFixInProgress}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {autoFixInProgress ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Applying Fixes...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Trigger Fixes
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{data.fixes.automated}</div>
                <p className="text-sm text-muted-foreground">Fixes Applied</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{data.fixes.pending}</div>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{data.fixes.errors}</div>
                <p className="text-sm text-muted-foreground">Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs Section */}
      {data && (
        <Tabs defaultValue="issues" className="space-y-4">
          <TabsList>
            <TabsTrigger value="issues">Issues</TabsTrigger>
            <TabsTrigger value="activity">Real-time Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="issues" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Technical SEO Issues</CardTitle>
                <CardDescription>
                  Issues detected and available automated fixes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.issues.map((issue, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {issue.severity === 'critical' && <XCircle className="h-5 w-5 text-red-500" />}
                        {issue.severity === 'warning' && <AlertTriangle className="h-5 w-5 text-orange-500" />}
                        {issue.severity === 'info' && <CheckCircle className="h-5 w-5 text-blue-500" />}
                        <div>
                          <p className="font-medium">{issue.type}</p>
                          <p className="text-sm text-muted-foreground">{issue.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={issue.severity === 'critical' ? 'destructive' : 'secondary'}>
                          {issue.count} pages
                        </Badge>
                        {issue.canAutoFix && (
                          <Badge variant="outline" className="text-green-600">
                            <Zap className="h-3 w-3 mr-1" />
                            Auto-fixable
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Real-time Activity</CardTitle>
                <CardDescription>
                  Recent automated fixes and optimizations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.realtimeActivity.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                      {activity.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />}
                      {activity.status === 'warning' && <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />}
                      {activity.status === 'error' && <XCircle className="h-4 w-4 text-red-500 mt-0.5" />}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">{activity.page}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Alert for no data */}
      {!data && !loading && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No technical SEO data available. Run a website audit to see automated fixes and optimizations.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}