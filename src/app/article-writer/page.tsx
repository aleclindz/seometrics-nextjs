'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import FeatureGate from '@/components/FeatureGate';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

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

export default function ArticleWriter() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  
  const [articles, setArticles] = useState<Article[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [cmsConnections, setCmsConnections] = useState<CMSConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creatingArticle, setCreatingArticle] = useState(false);
  const [generatingArticle, setGeneratingArticle] = useState<number | null>(null);
  const [publishingArticle, setPublishingArticle] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    websiteId: '',
    cmsConnectionId: '',
    targetKeywords: '',
    contentLength: 'medium',
    tone: 'professional'
  });

  useEffect(() => {
    if (user?.token) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch articles, websites, and CMS connections in parallel
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

  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token) return;

    try {
      setCreatingArticle(true);
      
      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken: user.token,
          websiteId: parseInt(formData.websiteId),
          cmsConnectionId: formData.cmsConnectionId ? parseInt(formData.cmsConnectionId) : null,
          title: formData.title,
          targetKeywords: formData.targetKeywords.split(',').map(k => k.trim()).filter(k => k)
        })
      });

      if (response.ok) {
        const data = await response.json();
        setArticles(prev => [data.article, ...prev]);
        setShowCreateForm(false);
        setFormData({
          title: '',
          websiteId: '',
          cmsConnectionId: '',
          targetKeywords: '',
          contentLength: 'medium',
          tone: 'professional'
        });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create article');
      }
    } catch (err) {
      setError('Failed to create article');
    } finally {
      setCreatingArticle(false);
    }
  };

  const handleGenerateContent = async (articleId: number) => {
    if (!user?.token) return;

    try {
      setGeneratingArticle(articleId);
      
      const article = articles.find(a => a.id === articleId);
      const response = await fetch('/api/articles/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken: user.token,
          articleId,
          targetKeywords: article?.target_keywords || [],
          contentLength: 'medium',
          tone: 'professional'
        })
      });

      if (response.ok) {
        // Refresh articles list to get updated data
        fetchData();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to generate content');
      }
    } catch (err) {
      setError('Failed to generate content');
    } finally {
      setGeneratingArticle(null);
    }
  };

  const handlePublishArticle = async (articleId: number) => {
    if (!user?.token) return;

    try {
      setPublishingArticle(articleId);
      
      const response = await fetch('/api/articles/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken: user.token,
          articleId,
          publishDraft: true // Publish as draft initially
        })
      });

      if (response.ok) {
        // Refresh articles list to get updated data
        fetchData();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to publish article');
      }
    } catch (err) {
      setError('Failed to publish article');
    } finally {
      setPublishingArticle(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      case 'generating': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      case 'generated': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      case 'publishing': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30';
      case 'published': return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30';
      case 'failed': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'generating': return 'Generating...';
      case 'generated': return 'Ready to Publish';
      case 'publishing': return 'Publishing...';
      case 'published': return 'Published';
      case 'failed': return 'Failed';
      default: return status;
    }
  };

  const hasCMSConnections = cmsConnections.length > 0;

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
                <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
                  
                  <div className="mb-8">
                    <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Article Writer</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                      AI-powered article generation for your SEO content
                    </p>
                  </div>

                  {error && (
                    <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex">
                        <svg className="h-5 w-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <div className="ml-3">
                          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                        <button
                          onClick={() => setError(null)}
                          className="ml-auto text-red-400 hover:text-red-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}

                  {!hasCMSConnections ? (
                    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
                      <div className="px-6 py-8">
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                          </div>
                          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            CMS Connection Required
                          </h2>
                          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
                            To use the Article Writer, you need to connect your CMS (like Strapi) where articles will be published.
                          </p>
                          <a
                            href="/cms-connections"
                            className="inline-flex items-center px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Set Up CMS Connection
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Create Article Button */}
                      <div className="mb-6">
                        <button
                          onClick={() => setShowCreateForm(true)}
                          disabled={loading}
                          className="inline-flex items-center px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Create New Article
                        </button>
                      </div>

                      {/* Create Article Form */}
                      {showCreateForm && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                              Create New Article
                            </h3>
                            <form onSubmit={handleCreateArticle} className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Article Title *
                                </label>
                                <input
                                  type="text"
                                  value={formData.title}
                                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                  placeholder="Enter article title..."
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                  required
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Website *
                                </label>
                                <select
                                  value={formData.websiteId}
                                  onChange={(e) => setFormData(prev => ({ ...prev, websiteId: e.target.value }))}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                  required
                                >
                                  <option value="">Select website...</option>
                                  {websites.map(website => (
                                    <option key={website.id} value={website.id}>
                                      {website.domain}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  CMS Connection
                                </label>
                                <select
                                  value={formData.cmsConnectionId}
                                  onChange={(e) => setFormData(prev => ({ ...prev, cmsConnectionId: e.target.value }))}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                >
                                  <option value="">Select CMS connection...</option>
                                  {cmsConnections
                                    .filter(conn => !formData.websiteId || conn.website_id.toString() === formData.websiteId)
                                    .map(connection => (
                                    <option key={connection.id} value={connection.id}>
                                      {connection.connection_name} ({connection.cms_type})
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Target Keywords
                                </label>
                                <input
                                  type="text"
                                  value={formData.targetKeywords}
                                  onChange={(e) => setFormData(prev => ({ ...prev, targetKeywords: e.target.value }))}
                                  placeholder="keyword1, keyword2, keyword3"
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Separate keywords with commas
                                </p>
                              </div>

                              <div className="flex justify-end space-x-3 pt-4">
                                <button
                                  type="button"
                                  onClick={() => setShowCreateForm(false)}
                                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  disabled={creatingArticle}
                                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                                >
                                  {creatingArticle ? 'Creating...' : 'Create Article'}
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>
                      )}

                      {/* Articles List */}
                      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60">
                          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Your Articles
                          </h2>
                        </div>

                        {loading ? (
                          <div className="px-6 py-8 text-center">
                            <div className="inline-flex items-center">
                              <div className="w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                              Loading articles...
                            </div>
                          </div>
                        ) : articles.length === 0 ? (
                          <div className="px-6 py-12 text-center">
                            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-gray-500 dark:text-gray-400">
                              No articles yet. Create your first article to get started!
                            </p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                            {articles.map((article) => (
                              <div key={article.id} className="px-6 py-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                                      {article.title}
                                    </h3>
                                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-2">
                                      <span>{article.websites?.domain}</span>
                                      {article.word_count && (
                                        <span>{article.word_count} words</span>
                                      )}
                                      <span>Created {new Date(article.created_at).toLocaleDateString()}</span>
                                    </div>
                                    {article.target_keywords && article.target_keywords.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mb-2">
                                        {article.target_keywords.map((keyword, index) => (
                                          <span
                                            key={index}
                                            className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                                          >
                                            {keyword}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    {(article.quality_score || article.seo_score || article.readability_score) && (
                                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                                        {article.quality_score && (
                                          <span>Quality: {article.quality_score.toFixed(1)}/10</span>
                                        )}
                                        {article.seo_score && (
                                          <span>SEO: {article.seo_score.toFixed(1)}/10</span>
                                        )}
                                        {article.readability_score && (
                                          <span>Readability: {article.readability_score.toFixed(0)}</span>
                                        )}
                                      </div>
                                    )}
                                    {article.status === 'failed' && article.error_message && (
                                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-600 dark:text-red-400">
                                        <div className="font-medium mb-1">Error Details:</div>
                                        <div>{article.error_message}</div>
                                        {article.retry_count && article.retry_count > 0 && (
                                          <div className="mt-1 text-red-500 dark:text-red-400">
                                            Retry attempts: {article.retry_count}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-3 ml-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(article.status)}`}>
                                      {getStatusText(article.status)}
                                    </span>
                                    {article.status === 'pending' && (
                                      <button
                                        onClick={() => handleGenerateContent(article.id)}
                                        disabled={generatingArticle === article.id}
                                        className="inline-flex items-center px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                                      >
                                        {generatingArticle === article.id ? (
                                          <>
                                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                                            Generating...
                                          </>
                                        ) : (
                                          <>
                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            Generate
                                          </>
                                        )}
                                      </button>
                                    )}
                                    {article.status === 'failed' && (
                                      <button
                                        onClick={() => handleGenerateContent(article.id)}
                                        disabled={generatingArticle === article.id}
                                        className="inline-flex items-center px-3 py-1 text-sm bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                                      >
                                        {generatingArticle === article.id ? (
                                          <>
                                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                                            Retrying...
                                          </>
                                        ) : (
                                          <>
                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            Retry Generation
                                          </>
                                        )}
                                      </button>
                                    )}
                                    {article.status === 'generated' && article.cms_connections && (
                                      <button
                                        onClick={() => handlePublishArticle(article.id)}
                                        disabled={publishingArticle === article.id}
                                        className="inline-flex items-center px-3 py-1 text-sm bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                                      >
                                        {publishingArticle === article.id ? (
                                          <>
                                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                                            Publishing...
                                          </>
                                        ) : (
                                          <>
                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l1.5-1.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Publish
                                          </>
                                        )}
                                      </button>
                                    )}
                                    {(article.status === 'failed' && article.article_content) && article.cms_connections && (
                                      <button
                                        onClick={() => handlePublishArticle(article.id)}
                                        disabled={publishingArticle === article.id}
                                        className="inline-flex items-center px-3 py-1 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                                      >
                                        {publishingArticle === article.id ? (
                                          <>
                                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                                            Retrying...
                                          </>
                                        ) : (
                                          <>
                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            Retry Publish
                                          </>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </main>
            </div>
          </div>
        </div>
      </FeatureGate>
    </ProtectedRoute>
  );
}