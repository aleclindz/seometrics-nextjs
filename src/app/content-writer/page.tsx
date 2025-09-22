'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, FileText, Eye, Edit } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useFeatures } from '@/hooks/useFeatures';
import ProtectedRoute from '@/components/ProtectedRoute';
import FeatureGate from '@/components/FeatureGate';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Article {
  id: number;
  title: string;
  slug: string;
  status: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
  word_count?: number;
  quality_score?: number;
  seo_score?: number;
  readability_score?: number;
  target_keywords?: string[];
  website_id: number;
  error_message?: string;
  retry_count?: number;
  article_content?: string;
  cms_admin_url?: string;
  public_url?: string;
  websites?: {
    domain: string;
  };
  cms_connections?: {
    connection_name: string;
    cms_type: string;
  };
}

interface Website {
  id: number;
  domain: string;
  website_token: string;
}

interface CMSConnection {
  id: number;
  connection_name: string;
  cms_type: string;
  website_id: number;
}

// Mock data for upcoming articles
const getUpcomingArticles = (articles: Article[]) => {
  return articles
    .filter(article => ['pending', 'generating'].includes(article.status))
    .map((article, index) => ({
      id: article.id,
      order: index + 1,
      title: article.title,
      scheduledDate: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      topicCluster: article.target_keywords?.[0] || "General SEO",
      status: article.status,
      websiteDomain: article.websites?.domain
    }));
};

// Mock data for published articles
const getPublishedArticles = (articles: Article[]) => {
  return articles
    .filter(article => ['published', 'generated'].includes(article.status))
    .map(article => ({
      id: article.id,
      title: article.title,
      publishDate: article.published_at
        ? new Date(article.published_at).toISOString().split('T')[0]
        : new Date(article.updated_at).toISOString().split('T')[0],
      status: article.status === 'published' ? 'Published' : 'Ready to Publish',
      views: Math.floor(Math.random() * 2000) + 100, // Mock view data
      wordCount: article.word_count || Math.floor(Math.random() * 1000) + 800,
      websiteDomain: article.websites?.domain,
      publicUrl: article.public_url,
      cmsUrl: article.cms_admin_url
    }));
};

export default function ContentWriter() {
  const { user } = useAuth();
  const { userPlan } = useFeatures();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  // Data state
  const [articles, setArticles] = useState<Article[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [cmsConnections, setCmsConnections] = useState<CMSConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settings state
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const [currentPlan, setCurrentPlan] = useState('pro');
  const [autoPublish, setAutoPublish] = useState('draft');

  useEffect(() => {
    if (user?.token) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [articlesRes, websitesRes, cmsRes] = await Promise.all([
        fetch(`/api/articles?userToken=${user?.token}`),
        fetch(`/api/websites?userToken=${user?.token}`),
        fetch(`/api/cms/connections?userToken=${user?.token}`)
      ]);

      if (articlesRes.ok) {
        const articlesData = await articlesRes.json();
        setArticles(articlesData.articles || []);
      }

      if (websitesRes.ok) {
        const websitesData = await websitesRes.json();
        setWebsites(websitesData.websites || []);
      }

      if (cmsRes.ok) {
        const cmsData = await cmsRes.json();
        setCmsConnections(cmsData.connections || []);
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const upcomingArticles = getUpcomingArticles(articles);
  const publishedArticles = getPublishedArticles(articles);

  const getPlanDisplayName = (tier: string) => {
    const plans = {
      starter: 'Starter - 3 articles per week',
      pro: 'Pro - 1 article per day',
      scale: 'Scale - 3 articles per day'
    };
    return plans[tier as keyof typeof plans] || 'Pro - 1 article per day';
  };

  return (
    <ProtectedRoute>
      <FeatureGate feature="articleGeneration">
        <div className="font-inter antialiased bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
          <div className="flex h-screen overflow-hidden">
            <Sidebar
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              sidebarExpanded={sidebarExpanded}
              setSidebarExpanded={setSidebarExpanded}
            />

            <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
              <Header
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
              />

              <main className="grow">
                <div className="max-w-6xl mx-auto p-6 space-y-6">
                  {/* Header and Settings Card */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <CardTitle>Automated Content Scheduling</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Enable Toggle */}
                      <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <Switch
                          checked={automationEnabled}
                          onCheckedChange={setAutomationEnabled}
                        />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">Enable Automated Content Generation</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">SEOAgent will automatically generate and schedule blog posts for this website</div>
                        </div>
                      </div>

                      {/* Plan Info and Settings */}
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-gray-700 dark:text-gray-300">Your Plan</Label>
                          <Select value={currentPlan} onValueChange={setCurrentPlan}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="starter">Starter - 3 articles per week</SelectItem>
                              <SelectItem value="pro">Pro - 1 article per day</SelectItem>
                              <SelectItem value="scale">Scale - 3 articles per day</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-700 dark:text-gray-300">Auto Publish</Label>
                          <Select value={autoPublish} onValueChange={setAutoPublish}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Save as Draft</SelectItem>
                              <SelectItem value="publish">Auto-Publish</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Articles Management */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Content Management
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="upcoming" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="upcoming">Upcoming Articles</TabsTrigger>
                          <TabsTrigger value="published">Published Articles</TabsTrigger>
                        </TabsList>

                        <TabsContent value="upcoming" className="space-y-4">
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-16">#</TableHead>
                                  <TableHead>Title</TableHead>
                                  <TableHead>Scheduled Date</TableHead>
                                  <TableHead>Topic Cluster</TableHead>
                                  <TableHead>Website</TableHead>
                                  <TableHead>Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {upcomingArticles.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">
                                      <div className="text-gray-500 dark:text-gray-400">
                                        {loading ? (
                                          <div className="flex items-center justify-center">
                                            <div className="w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                                            Loading upcoming articles...
                                          </div>
                                        ) : (
                                          <div>
                                            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <p>No upcoming articles scheduled</p>
                                            <p className="text-sm mt-1">Enable automation to start generating content automatically</p>
                                          </div>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  upcomingArticles.map((article) => (
                                    <TableRow key={article.id}>
                                      <TableCell className="font-medium">{article.order}</TableCell>
                                      <TableCell className="font-medium">{article.title}</TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                          {article.scheduledDate}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge
                                          variant="outline"
                                          className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        >
                                          {article.topicCluster}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                          {article.websiteDomain}
                                        </span>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <Button variant="outline" size="sm">
                                            <Eye className="w-4 h-4" />
                                          </Button>
                                          <Button variant="outline" size="sm">
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </TabsContent>

                        <TabsContent value="published" className="space-y-4">
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Title</TableHead>
                                  <TableHead>Publish Date</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Views</TableHead>
                                  <TableHead>Words</TableHead>
                                  <TableHead>Website</TableHead>
                                  <TableHead>Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {publishedArticles.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8">
                                      <div className="text-gray-500 dark:text-gray-400">
                                        {loading ? (
                                          <div className="flex items-center justify-center">
                                            <div className="w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                                            Loading published articles...
                                          </div>
                                        ) : (
                                          <div>
                                            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <p>No articles published yet</p>
                                            <p className="text-sm mt-1">Start creating content to see your published articles here</p>
                                          </div>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  publishedArticles.map((article) => (
                                    <TableRow key={article.id}>
                                      <TableCell className="font-medium">{article.title}</TableCell>
                                      <TableCell>{article.publishDate}</TableCell>
                                      <TableCell>
                                        <Badge variant={article.status === 'Published' ? 'default' : 'outline'}>
                                          {article.status}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>{article.views.toLocaleString()}</TableCell>
                                      <TableCell>{article.wordCount}</TableCell>
                                      <TableCell>
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                          {article.websiteDomain}
                                        </span>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          {article.publicUrl && (
                                            <Button variant="outline" size="sm" asChild>
                                              <a href={article.publicUrl} target="_blank" rel="noopener noreferrer">
                                                <Eye className="w-4 h-4" />
                                              </a>
                                            </Button>
                                          )}
                                          {article.cmsUrl && (
                                            <Button variant="outline" size="sm" asChild>
                                              <a href={article.cmsUrl} target="_blank" rel="noopener noreferrer">
                                                <Edit className="w-4 h-4" />
                                              </a>
                                            </Button>
                                          )}
                                          {!article.publicUrl && !article.cmsUrl && (
                                            <Button variant="outline" size="sm">
                                              <Eye className="w-4 h-4" />
                                            </Button>
                                          )}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                </div>
              </main>
            </div>
          </div>
        </div>
      </FeatureGate>
    </ProtectedRoute>
  );
}