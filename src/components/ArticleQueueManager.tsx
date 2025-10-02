'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Edit3, Trash2, GripVertical, Plus, Sparkles, Clock, Target, TrendingUp } from 'lucide-react';

interface ArticleQueueItem {
  id: number;
  title: string;
  scheduledFor: string;
  status: 'draft' | 'pending' | 'generating' | 'completed';
  wordCount: number;
  contentStyle: string;
  priority: number;
  targetKeywords: string[];
  articleFormat?: {
    type: string;
    template: string;
    wordCountRange: [number, number];
  };
  authorityLevel: 'foundation' | 'intermediate' | 'advanced';
  estimatedTrafficPotential: number;
  targetQueries: string[];
  topicCluster?: string;
}

interface PublishedArticleItem {
  id: number;
  title: string;
  slug: string;
  created_at?: string;
  published_at?: string | null;
  domain?: string;
}

interface Props {
  userToken: string;
  websiteToken: string;
  domain: string;
  onTopicClusterClick?: (clusterName: string) => void;
}

export default function ArticleQueueManager({ userToken, websiteToken, domain, onTopicClusterClick }: Props) {
  const [queue, setQueue] = useState<ArticleQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editingItem, setEditingItem] = useState<ArticleQueueItem | null>(null);
  const [draggedItem, setDraggedItem] = useState<ArticleQueueItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [newBrief, setNewBrief] = useState({
    title: '',
    parentCluster: '',
    primaryKeyword: '',
    intent: 'informational',
    scheduledFor: new Date().toISOString().slice(0,16),
    wordCount: 1500
  } as any);
  const [published, setPublished] = useState<PublishedArticleItem[]>([]);
  const [drafts, setDrafts] = useState<PublishedArticleItem[]>([]);
  const [schedule, setSchedule] = useState<{ enabled: boolean; auto_publish: boolean; next_scheduled_at?: string | null } | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success'|'error'|'info' }>({ visible: false, message: '', type: 'info' });
  const showToast = (message: string, type: 'success'|'error'|'info' = 'info', ms = 2500) => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), ms);
  };

  const fetchQueue = useCallback(async () => {
    try {
      // Use article briefs queue for planned briefs
      const response = await fetch(`/api/content/article-briefs-queue?userToken=${encodeURIComponent(userToken)}&websiteToken=${encodeURIComponent(websiteToken)}&domain=${encodeURIComponent(domain)}&limit=20`);
      const data = await response.json();

      if (data.success) {
        setQueue(data.queue || []);
      }
    } catch (error) {
      console.error('Error fetching article queue:', error);
    } finally {
      setLoading(false);
    }
  }, [userToken, websiteToken]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  useEffect(() => {
    const fetchPublished = async () => {
      try {
        const resp = await fetch(`/api/articles?userToken=${encodeURIComponent(userToken)}`);
        const data = await resp.json();
        if (resp.ok && data.success) {
          const clean = (s: string) => String(s || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
          const target = clean(domain);
          const items: PublishedArticleItem[] = (data.articles || [])
            .filter((a: any) => (a.status === 'completed' || a.status === 'published') && clean(a.websites?.domain) === target)
            .map((a: any) => ({ id: a.id, title: a.title, slug: a.slug, created_at: a.created_at, published_at: a.published_at, domain: a.websites?.domain }));
          setPublished(items);
        }
      } catch (e) { /* no-op */ }
    };
    fetchPublished();
    const fetchSchedule = async () => {
      try {
        const resp = await fetch(`/api/content/schedule-config?userToken=${encodeURIComponent(userToken)}&websiteToken=${encodeURIComponent(websiteToken)}`);
        const data = await resp.json();
        if (resp.ok && data.success) {
          setSchedule({ enabled: !!data.config.enabled, auto_publish: !!data.config.auto_publish, next_scheduled_at: data.config.next_scheduled_at });
        }
      } catch {}
    };
    if (userToken && websiteToken) fetchSchedule();
    const fetchDrafts = async () => {
      try {
        const resp = await fetch(`/api/articles?userToken=${encodeURIComponent(userToken)}`);
        const data = await resp.json();
        if (resp.ok && data.success) {
          const clean = (s: string) => String(s || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
          const target = clean(domain);
          const items: PublishedArticleItem[] = (data.articles || [])
            .filter((a: any) => (!a.published_at) && clean(a.websites?.domain) === target)
            .map((a: any) => ({ id: a.id, title: a.title, slug: a.slug, created_at: a.created_at, published_at: a.published_at, domain: a.websites?.domain }));
          setDrafts(items);
        }
      } catch {}
    };
    fetchDrafts();
  }, [userToken, websiteToken, domain]);

  useEffect(() => {
    const handler = (e: any) => {
      // Refresh on any queue-updated signal to avoid missed refreshes
      fetchQueue();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('seoagent:queue-updated', handler as any);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('seoagent:queue-updated', handler as any);
      }
    };
  }, [websiteToken, fetchQueue]);

  const generateBulkIdeas = async (period: 'week' | 'month', count: number, addToQueue: boolean = false) => {
    setGenerating(true);
    try {
      // New source: generate structured briefs (anti-cannibalization + pillar/cluster)
      // Then insert into article_queue via /api/articles
      // 1) Generate briefs
      const briefsResp = await fetch('/api/agent/briefs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken,
          websiteToken,
          domain,
          count,
          includePillar: false,
          addToQueue: true
        })
      });

      const briefsData = await briefsResp.json();
      if (!briefsResp.ok || !briefsData.success) {
        throw new Error(briefsData.error || 'Failed to generate briefs');
      }

      const briefs: Array<any> = briefsData.briefs || [];

      // Items are persisted inside the briefs API when addToQueue: true
      if (addToQueue) await fetchQueue();

      return briefs;
    } catch (error) {
      console.error('Error generating bulk ideas:', error);
      throw error;
    } finally {
      setGenerating(false);
    }
  };

  const updateItem = async (id: number, updates: Partial<ArticleQueueItem>) => {
    try {
      const response = await fetch('/api/content/article-briefs-queue', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates, userToken })
      });

      const data = await response.json();

      if (data.success) {
        setQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
        setEditingItem(null);
      }
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const deleteItem = async (id: number) => {
    try {
      const response = await fetch(`/api/content/article-briefs-queue?id=${id}&userToken=${encodeURIComponent(userToken)}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setQueue(prev => prev.filter(item => item.id !== id));
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const reorderQueue = async (reorderedItems: ArticleQueueItem[]) => {
    try {
      const response = await fetch('/api/content/article-briefs-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reorderedItems, userToken, websiteToken })
      });
      const data = await response.json();
      if (data.success) {
        setQueue(data.items);
      }
    } catch (error) {
      console.error('Error reordering briefs:', error);
    }
  };

  const handleDragStart = (item: ArticleQueueItem) => {
    setDraggedItem(item);
  };

  const handleDragOver = (e: React.DragEvent, targetItem: ArticleQueueItem) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetItem.id) return;

    const newQueue = [...queue];
    const draggedIndex = newQueue.findIndex(item => item.id === draggedItem.id);
    const targetIndex = newQueue.findIndex(item => item.id === targetItem.id);

    newQueue.splice(draggedIndex, 1);
    newQueue.splice(targetIndex, 0, draggedItem);

    setQueue(newQueue);
  };

  const handleDragEnd = async () => {
    if (draggedItem) {
      await reorderQueue(queue);
      setDraggedItem(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'generating': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getAuthorityColor = (level: string) => {
    switch (level) {
      case 'foundation': return 'bg-green-100 text-green-700';
      case 'intermediate': return 'bg-yellow-100 text-yellow-700';
      case 'advanced': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Article Briefs Queue</h3>
            <p className="text-sm text-gray-500">{queue.length} brief{queue.length === 1 ? '' : 's'} in queue</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setCreating(true)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Plus className="w-4 h-4 mr-2" /> New Brief
            </button>
          </div>
        </div>
      </div>

      {/* Queue Items */}
      <div className="divide-y divide-gray-200">
        {queue.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Sparkles className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No article briefs yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Add your first article briefs based on clusters and strategy.
            </p>
            <div className="mt-6 flex gap-2 justify-center">
              <button
                onClick={() => generateBulkIdeas('week', 10, true)}
                disabled={generating}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add 10 Article Briefs for This Week
              </button>
              <button
                onClick={() => setCreating(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Plus className="w-4 h-4 mr-2" /> Add One Manually
              </button>
            </div>
          </div>
        ) : (
          queue.map((item, index) => (
            <div
              key={item.id}
              className={`px-6 py-4 hover:bg-gray-50 ${draggedItem?.id === item.id ? 'opacity-50' : ''}`}
              draggable
              onDragStart={() => handleDragStart(item)}
              onDragOver={(e) => handleDragOver(e, item)}
              onDragEnd={handleDragEnd}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="flex-shrink-0 mt-1">
                    <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          #{item.priority} {item.title}
                        </h4>

                        <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(item.scheduledFor).toLocaleDateString()} at {new Date(item.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>

                          <div className="flex items-center">
                            <Target className="w-3 h-3 mr-1" />
                            {item.wordCount} words
                          </div>

                          {item.estimatedTrafficPotential > 0 && (
                            <div className="flex items-center">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              +{item.estimatedTrafficPotential} monthly visits
                            </div>
                          )}
                        </div>

                        <div className="mt-2 flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>

                          {item.articleFormat && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              {item.articleFormat.type}
                            </span>
                          )}

                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getAuthorityColor(item.authorityLevel)}`}>
                            {item.authorityLevel}
                          </span>
                        </div>

                        {/* Topic Cluster */}
                        {item.topicCluster && (
                          <div className="mt-2">
                            <button
                              onClick={() => onTopicClusterClick?.(item.topicCluster!)}
                              className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                            >
                              <Target className="w-3 h-3 mr-1" />
                              {item.topicCluster}
                            </button>
                          </div>
                        )}

                        {item.targetKeywords && item.targetKeywords.length > 0 && (
                          <div className="mt-2">
                            <div className="flex flex-wrap gap-1">
                              {item.targetKeywords.slice(0, 3).map((keyword, i) => (
                                <span key={i} className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                                  {keyword}
                                </span>
                              ))}
                              {item.targetKeywords.length > 3 && (
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                                  +{item.targetKeywords.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={async () => {
                            try {
                              showToast('Draft creation started', 'info');
                              const respBrief = await fetch('/api/articles/from-brief', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userToken, websiteToken, briefId: item.id, start: true })
                              });
                              if (!respBrief.ok) {
                                const err = await respBrief.json().catch(() => ({}));
                                showToast(`Failed: ${err.error || respBrief.statusText}`, 'error', 3000);
                                return;
                              }
                              // Refresh both queue and drafts
                              fetchQueue();
                              const resp = await fetch(`/api/articles?userToken=${encodeURIComponent(userToken)}`);
                              const data = await resp.json();
                              if (resp.ok && data.success) {
                                const clean = (s: string) => String(s || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
                                const target = clean(domain);
                                const items: PublishedArticleItem[] = (data.articles || [])
                                  .filter((a: any) => (!a.published_at) && clean(a.websites?.domain) === target)
                                  .map((a: any) => ({ id: a.id, title: a.title, slug: a.slug, created_at: a.created_at, published_at: a.published_at, domain: a.websites?.domain }));
                                setDrafts(items);
                              }
                            } catch (e) { console.error('Failed to generate from brief', e); showToast('Failed to start draft', 'error', 3000); }
                          }}
                          className="inline-flex items-center px-2 py-1 text-xs border rounded text-gray-700 hover:bg-gray-50"
                          title="Generate Article from Brief"
                        >
                          Generate article from brief
                        </button>
                        <button
                          onClick={() => setEditingItem(item)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => deleteItem(item.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Published Articles */}
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900">Published Articles</h4>
          <span className="text-xs text-gray-500">{published.length}</span>
        </div>
        {published.length === 0 ? (
          <p className="text-sm text-gray-500">No published articles yet.</p>
        ) : (
          <ul className="space-y-2">
            {published.slice(0, 10).map((a) => (
              <li key={a.id} className="flex items-center justify-between">
                <span className="text-sm text-gray-800 truncate pr-3">{a.title}</span>
                <a
                  className="text-sm text-blue-600 hover:underline flex-shrink-0"
                  href={`https://${(a.domain || domain).replace(/^https?:\/\//,'').replace(/\/$/,'')}/${a.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Schedule Controls */}
      <div className="px-6 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-gray-800">
              <input
                type="checkbox"
                checked={!!schedule?.enabled}
                onChange={async (e) => {
                  const newEnabled = e.target.checked;
                  try {
                    const resp = await fetch('/api/content/schedule-config', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userToken, websiteToken, config: { enabled: newEnabled } })
                    });
                    const data = await resp.json();
                    if (resp.ok && data.success) {
                      setSchedule({ enabled: data.config.enabled, auto_publish: data.config.auto_publish, next_scheduled_at: data.config.next_scheduled_at });
                    }
                  } catch {}
                }}
              />
              Auto‑generate
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-800">
              <input
                type="checkbox"
                checked={!!schedule?.auto_publish}
                onChange={async (e) => {
                  const newAuto = e.target.checked;
                  try {
                    const resp = await fetch('/api/content/schedule-config', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userToken, websiteToken, config: { auto_publish: newAuto } })
                    });
                    const data = await resp.json();
                    if (resp.ok && data.success) {
                      setSchedule({ enabled: data.config.enabled, auto_publish: data.config.auto_publish, next_scheduled_at: data.config.next_scheduled_at });
                    }
                  } catch {}
                }}
              />
              Auto‑publish
            </label>
          </div>
          <div className="text-xs text-gray-600">
            {schedule?.enabled && schedule?.auto_publish ? (
              <span>Next auto publish: {schedule?.next_scheduled_at ? new Date(schedule.next_scheduled_at).toLocaleString() : 'scheduled'}</span>
            ) : (
              <span>Auto‑publish: Off</span>
            )}
          </div>
        </div>
      </div>

      {/* Drafted Articles */}
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900">Drafted Articles</h4>
          <span className="text-xs text-gray-500">{drafts.length}</span>
        </div>
        {drafts.length === 0 ? (
          <p className="text-sm text-gray-500">No drafted articles yet.</p>
        ) : (
          <ul className="space-y-2">
            {drafts.slice(0, 10).map((a) => (
              <li key={a.id} className="flex items-center justify-between">
                <div className="flex flex-col pr-3">
                  <span className="text-sm text-gray-800 truncate">{a.title}</span>
                  {schedule?.enabled && schedule?.auto_publish && (
                    <span className="text-xs text-gray-500">Next publish: {schedule?.next_scheduled_at ? new Date(schedule.next_scheduled_at).toLocaleString() : 'scheduled'}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      try {
                        showToast('Publishing…', 'info');
                        const resp = await fetch('/api/articles/publish', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ userToken, articleId: a.id, publishDraft: true })
                        });
                        if (resp.ok) {
                          // refresh published and drafts
                          const p = await fetch(`/api/articles?userToken=${encodeURIComponent(userToken)}`);
                          const d = await p.json();
                          if (p.ok && d.success) {
                            const clean = (s: string) => String(s || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
                            const target = clean(domain);
                            const pub: PublishedArticleItem[] = (d.articles || [])
                              .filter((art: any) => art.published_at && clean(art.websites?.domain) === target)
                              .map((art: any) => ({ id: art.id, title: art.title, slug: art.slug, created_at: art.created_at, published_at: art.published_at, domain: art.websites?.domain }));
                            const drf: PublishedArticleItem[] = (d.articles || [])
                              .filter((art: any) => !art.published_at && clean(art.websites?.domain) === target)
                              .map((art: any) => ({ id: art.id, title: art.title, slug: art.slug, created_at: art.created_at, published_at: art.published_at, domain: art.websites?.domain }));
                            setPublished(pub);
                            setDrafts(drf);
                            showToast('Published', 'success');
                          }
                        }
                      } catch (e) { console.error('Publish failed', e); }
                    }}
                    className="inline-flex items-center px-2 py-1 text-xs border rounded text-gray-700 hover:bg-gray-50"
                  >
                    Publish Now
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Article</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={editingItem.title}
                    onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
                  <input
                    type="datetime-local"
                    value={new Date(editingItem.scheduledFor).toISOString().slice(0, 16)}
                    onChange={(e) => setEditingItem({ ...editingItem, scheduledFor: new Date(e.target.value).toISOString() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Word Count</label>
                  <input
                    type="number"
                    value={editingItem.wordCount}
                    onChange={(e) => setEditingItem({ ...editingItem, wordCount: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={editingItem.status}
                    onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="pending">Pending</option>
                    <option value="generating">Generating</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center mt-6">
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this article from the queue?')) {
                      deleteItem(editingItem.id);
                      setEditingItem(null);
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md flex items-center space-x-1"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Article</span>
                </button>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => updateItem(editingItem.id, editingItem)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {creating && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Article Brief</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={newBrief.title}
                    onChange={(e) => setNewBrief({ ...newBrief, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parent Cluster</label>
                  <input
                    type="text"
                    value={newBrief.parentCluster}
                    onChange={(e) => setNewBrief({ ...newBrief, parentCluster: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Primary Keyword</label>
                  <input
                    type="text"
                    value={newBrief.primaryKeyword}
                    onChange={(e) => setNewBrief({ ...newBrief, primaryKeyword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Intent</label>
                  <select
                    value={newBrief.intent}
                    onChange={(e) => setNewBrief({ ...newBrief, intent: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="informational">Informational</option>
                    <option value="commercial">Commercial</option>
                    <option value="transactional">Transactional</option>
                    <option value="comparison">Comparison</option>
                    <option value="pricing">Pricing</option>
                    <option value="location">Location</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
                  <input
                    type="datetime-local"
                    value={newBrief.scheduledFor}
                    onChange={(e) => setNewBrief({ ...newBrief, scheduledFor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Word Count (target)</label>
                  <input
                    type="number"
                    value={newBrief.wordCount}
                    onChange={(e) => setNewBrief({ ...newBrief, wordCount: parseInt(e.target.value) || 1500 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end items-center mt-6 gap-3">
                <button
                  onClick={() => setCreating(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!newBrief.title || !newBrief.primaryKeyword) return;
                    try {
                      const resp = await fetch('/api/content/article-briefs-queue', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          userToken,
                          websiteToken,
                          title: newBrief.title,
                          h1: newBrief.title,
                          pageType: 'cluster',
                          parentCluster: newBrief.parentCluster || null,
                          primaryKeyword: newBrief.primaryKeyword,
                          intent: newBrief.intent,
                          wordCountMin: Math.max(800, Math.floor(newBrief.wordCount * 0.7)),
                          wordCountMax: newBrief.wordCount,
                          scheduledFor: new Date(newBrief.scheduledFor).toISOString()
                        })
                      });
                      const data = await resp.json();
                      if (resp.ok && data.success) {
                        setCreating(false);
                        setNewBrief({ title: '', parentCluster: '', primaryKeyword: '', intent: 'informational', scheduledFor: new Date().toISOString().slice(0,16), wordCount: 1500 });
                        await fetchQueue();
                      }
                    } catch (e) { console.error('Create brief failed:', e); }
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  Save Brief
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    {toast.visible && (
      <div className={`fixed top-4 right-4 z-[9999] px-4 py-2 rounded-lg shadow ${toast.type==='success' ? 'bg-green-600 text-white' : toast.type==='error' ? 'bg-red-600 text-white' : 'bg-gray-800 text-white'}`}>
        {toast.message}
      </div>
    )}
  );
}
