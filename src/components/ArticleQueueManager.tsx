'use client';
import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetchQueue();
  }, [userToken, websiteToken]);

  useEffect(() => {
    const handler = (e: any) => {
      // Optional: filter by websiteToken if provided
      if (!e?.detail?.websiteToken || e.detail.websiteToken === websiteToken) {
        fetchQueue();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('seoagent:queue-updated', handler as any);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('seoagent:queue-updated', handler as any);
      }
    };
  }, [websiteToken]);

  const fetchQueue = async () => {
    try {
      const response = await fetch(`/api/content/article-queue?userToken=${encodeURIComponent(userToken)}&websiteToken=${encodeURIComponent(websiteToken)}&limit=20`);
      const data = await response.json();

      if (data.success) {
        setQueue(data.queue || []);
      }
    } catch (error) {
      console.error('Error fetching article queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateBulkIdeas = async (period: 'week' | 'month', count: number, addToQueue: boolean = false) => {
    setGenerating(true);
    try {
      const response = await fetch('/api/content/bulk-article-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken,
          websiteToken,
          domain,
          period,
          count,
          addToQueue
        })
      });

      const data = await response.json();

      if (data.success) {
        if (addToQueue) {
          await fetchQueue(); // Refresh queue
        }
        return data.articleIdeas;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error generating bulk ideas:', error);
      throw error;
    } finally {
      setGenerating(false);
    }
  };

  const updateItem = async (id: number, updates: Partial<ArticleQueueItem>) => {
    try {
      const response = await fetch('/api/content/article-queue', {
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
      const response = await fetch(`/api/content/article-queue?id=${id}&userToken=${encodeURIComponent(userToken)}`, {
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
      const response = await fetch('/api/content/article-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reorderedItems, userToken })
      });

      const data = await response.json();

      if (data.success) {
        setQueue(data.items);
      }
    } catch (error) {
      console.error('Error reordering queue:', error);
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
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Articles</h3>
            <p className="text-sm text-gray-500">
              {queue.length} articles scheduled • Next: {queue[0] ? new Date(queue[0].scheduledFor).toLocaleDateString() : 'None'}
            </p>
          </div>

          {/* Removed auto-idea generation buttons per request */}
        </div>
      </div>

      {/* Queue Items */}
      <div className="divide-y divide-gray-200">
        {queue.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Sparkles className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No articles scheduled</h3>
            <p className="mt-1 text-sm text-gray-500">
              Generate your first batch of AI-powered article ideas based on your GSC data and keyword strategy.
            </p>
            <div className="mt-6">
              <button
                onClick={() => generateBulkIdeas('week', 10, true)}
                disabled={generating}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Generate 10 Ideas for This Week
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
    </div>
  );
}
