'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { ActionItem } from '@/lib/ActionItemService';

interface ActionItemsInterfaceProps {
  siteUrl: string;
  onRefresh?: () => void;
}

interface ActionItemStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
}

export default function ActionItemsInterface({ siteUrl, onRefresh }: ActionItemsInterfaceProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeItems, setActiveItems] = useState<ActionItem[]>([]);
  const [completedItems, setCompletedItems] = useState<ActionItem[]>([]);
  const [stats, setStats] = useState<ActionItemStats | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(false);

  const categories = [
    { id: 'all', name: 'All Issues', icon: '🔍' },
    { id: 'indexing', name: 'Indexing', icon: '🔍' },
    { id: 'sitemap', name: 'Sitemaps', icon: '🗺️' },
    { id: 'robots', name: 'Robots.txt', icon: '🤖' },
    { id: 'schema', name: 'Schema', icon: '📋' },
    { id: 'mobile', name: 'Mobile', icon: '📱' },
    { id: 'performance', name: 'Performance', icon: '⚡' },
    { id: 'meta_tags', name: 'Meta Tags', icon: '🏷️' },
    { id: 'alt_tags', name: 'Alt Tags', icon: '🖼️' }
  ];

  const severityColors = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-blue-100 text-blue-800 border-blue-200'
  };

  const statusColors = {
    detected: 'bg-red-50 border-red-200',
    assigned: 'bg-yellow-50 border-yellow-200',
    in_progress: 'bg-blue-50 border-blue-200',
    completed: 'bg-green-50 border-green-200',
    verified: 'bg-green-100 border-green-300',
    closed: 'bg-gray-50 border-gray-200',
    dismissed: 'bg-gray-100 border-gray-300'
  };

  useEffect(() => {
    fetchActionItems();
  }, [user?.token, siteUrl]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchActionItems, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, user?.token, siteUrl]);

  const fetchActionItems = async () => {
    if (!user?.token) return;

    try {
      setLoading(true);
      
      // Fetch active action items (including completed but not verified ones)
      const activeResponse = await fetch(
        `/api/action-items?userToken=${user.token}&siteUrl=${encodeURIComponent(siteUrl)}&status=detected,assigned,in_progress,completed`
      );
      const activeData = await activeResponse.json();

      // Fetch verified/closed action items (completed items)
      const completedResponse = await fetch(
        `/api/action-items?userToken=${user.token}&siteUrl=${encodeURIComponent(siteUrl)}&status=verified,closed&limit=20`
      );
      const completedData = await completedResponse.json();

      if (activeData.success) {
        setActiveItems(activeData.actionItems);
        calculateStats(activeData.actionItems);
      }

      if (completedData.success) {
        setCompletedItems(completedData.actionItems);
      }

    } catch (error) {
      console.error('Error fetching action items:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (items: ActionItem[]) => {
    const stats: ActionItemStats = {
      total: items.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      byCategory: {},
      byStatus: {}
    };

    items.forEach(item => {
      // Count by severity
      if (item.severity) {
        stats[item.severity as keyof ActionItemStats]++;
      }

      // Count by category
      stats.byCategory[item.issue_category] = (stats.byCategory[item.issue_category] || 0) + 1;

      // Count by status
      stats.byStatus[item.status] = (stats.byStatus[item.status] || 0) + 1;
    });

    setStats(stats);
  };

  const handleDetectIssues = async () => {
    if (!user?.token) return;

    try {
      setLoading(true);
      const response = await fetch('/api/action-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken: user.token,
          siteUrl,
          action: 'detect_issues'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        await fetchActionItems(); // Refresh the list
        onRefresh?.();
      }
    } catch (error) {
      console.error('Error detecting issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFixAction = async (actionItem: ActionItem, fixType: string) => {
    if (!user?.token) return;

    try {
      setProcessingItems(prev => {
        const newSet = new Set(prev);
        newSet.add(actionItem.id);
        return newSet;
      });

      // Call the automated fix API
      const response = await fetch('/api/test-seo/automated-fixes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken: user.token,
          siteUrl,
          fixAction: fixType,
          actionItemId: actionItem.id
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Update action item status
        await fetch(`/api/action-items/${actionItem.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'mark_completed',
            fixType: fixType,
            fixDetails: result.result
          })
        });

        // Refresh action items
        await fetchActionItems();
        onRefresh?.();
      }
    } catch (error) {
      console.error('Error applying fix:', error);
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionItem.id);
        return newSet;
      });
    }
  };

  const handleDismiss = async (actionItem: ActionItem) => {
    if (!user?.token) return;

    try {
      const response = await fetch(`/api/action-items/${actionItem.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dismiss',
          reason: 'User dismissed'
        })
      });

      if (response.ok) {
        await fetchActionItems();
      }
    } catch (error) {
      console.error('Error dismissing action item:', error);
    }
  };

  const getFixButtonForItem = (item: ActionItem) => {
    const fixes = {
      sitemap_missing: 'generate_and_submit_sitemap',
      sitemap_not_downloaded: 'generate_and_submit_sitemap',
      robots_missing: 'generate_robots_txt',
      robots_fetch_errors: 'generate_robots_txt',
      indexing_blocked_pages: 'fix_indexing_issue',
      schema_missing_all: 'generate_schema_markup',
      schema_missing_pages: 'generate_schema_markup'
    };

    return fixes[item.issue_type as keyof typeof fixes];
  };

  const filteredActiveItems = activeItems.filter(item => {
    if (selectedCategory !== 'all' && item.issue_category !== selectedCategory) {
      return false;
    }
    if (selectedSeverity !== 'all' && item.severity !== selectedSeverity) {
      return false;
    }
    return true;
  });

  if (loading && activeItems.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
          <span className="ml-3 text-gray-600">Loading action items...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">SEO Action Items</h2>
            <p className="text-gray-600 mt-1">
              Track and manage SEO issues from detection to verified completion
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Auto-refresh</span>
            </label>
            <button
              onClick={handleDetectIssues}
              disabled={loading}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <span>🔍</span>
              <span>{loading ? 'Scanning...' : 'Scan for Issues'}</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-red-800 font-bold text-2xl">{stats.critical}</div>
              <div className="text-red-600 text-sm">Critical Issues</div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="text-orange-800 font-bold text-2xl">{stats.high}</div>
              <div className="text-orange-600 text-sm">High Priority</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-yellow-800 font-bold text-2xl">{stats.medium}</div>
              <div className="text-yellow-600 text-sm">Medium Priority</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-blue-800 font-bold text-2xl">{stats.total}</div>
              <div className="text-blue-600 text-sm">Total Active</div>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Category:</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Severity:</label>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                showCompleted 
                  ? 'bg-green-100 text-green-800 border border-green-200' 
                  : 'bg-gray-100 text-gray-700 border border-gray-200'
              }`}
            >
              {showCompleted ? 'Hide' : 'Show'} Completed ({completedItems.length})
            </button>
          </div>
        </div>
      </div>

      {/* Outstanding Action Items */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Outstanding Action Items ({filteredActiveItems.length})
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Issues that need attention, sorted by priority
          </p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {filteredActiveItems.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 text-6xl mb-4">✅</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Outstanding Issues</h3>
              <p className="text-gray-600">
                {activeItems.length === 0 
                  ? 'Click "Scan for Issues" to detect SEO problems.'
                  : 'All issues in this filter have been resolved!'}
              </p>
            </div>
          ) : (
            filteredActiveItems.map((item) => (
              <div key={item.id} className={`p-6 ${statusColors[item.status as keyof typeof statusColors]}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${severityColors[item.severity as keyof typeof severityColors]}`}>
                        {item.severity?.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500 uppercase tracking-wide">
                        {item.issue_category.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      {item.title}
                    </h4>
                    
                    <p className="text-gray-600 mb-3">
                      {item.description}
                    </p>
                    
                    {item.impact_description && (
                      <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mb-3">
                        <p className="text-sm text-orange-800">
                          <span className="font-medium">Impact:</span> {item.impact_description}
                        </p>
                      </div>
                    )}
                    
                    {item.fix_recommendation && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
                        <p className="text-sm text-blue-800">
                          <span className="font-medium">Recommendation:</span> {item.fix_recommendation}
                        </p>
                      </div>
                    )}
                    
                    {item.affected_urls && item.affected_urls.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          Affected URLs ({item.affected_urls.length}):
                        </p>
                        <div className="max-h-32 overflow-y-auto">
                          {item.affected_urls.slice(0, 5).map((url, index) => (
                            <div key={index} className="text-sm text-gray-600 truncate">
                              {url}
                            </div>
                          ))}
                          {item.affected_urls.length > 5 && (
                            <div className="text-sm text-gray-500">
                              +{item.affected_urls.length - 5} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col space-y-2 ml-6">
                    {item.status !== 'completed' && item.status !== 'verified' && (
                      <>
                        {getFixButtonForItem(item) && (
                          <button
                            onClick={() => handleFixAction(item, getFixButtonForItem(item)!)}
                            disabled={processingItems.has(item.id)}
                            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                          >
                            {processingItems.has(item.id) ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Fixing...</span>
                              </>
                            ) : (
                              <>
                                <span>⚡</span>
                                <span>Fix Now</span>
                              </>
                            )}
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDismiss(item)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                        >
                          Dismiss
                        </button>
                      </>
                    )}
                    
                    {item.status === 'completed' && (
                      <div className="text-center">
                        <div className="text-green-600 text-sm font-medium mb-1">
                          ✅ Fix Applied
                        </div>
                        <div className="text-xs text-gray-500 mb-2">
                          Awaiting verification
                        </div>
                        <button
                          onClick={async () => {
                            if (!user?.token) return;
                            
                            console.log(`[ACTION ITEMS UI] Starting verification for item:`, {
                              id: item.id,
                              title: item.title,
                              issueType: item.issue_type,
                              category: item.issue_category,
                              status: item.status
                            });
                            
                            try {
                              // First, run debug endpoint for sitemap issues to get detailed info
                              if (item.issue_category === 'sitemap') {
                                console.log(`[ACTION ITEMS UI] Running sitemap debug for verification`);
                                const debugResponse = await fetch(`/api/debug/sitemap-debug?userToken=${user.token}&siteUrl=${encodeURIComponent(item.site_url)}`);
                                if (debugResponse.ok) {
                                  const debugData = await debugResponse.json();
                                  console.log(`[ACTION ITEMS UI] Sitemap debug data:`, debugData.debugInfo);
                                } else {
                                  console.log(`[ACTION ITEMS UI] Debug endpoint failed:`, debugResponse.status);
                                }
                              }
                              
                              // Trigger verification check
                              console.log(`[ACTION ITEMS UI] Calling verification API for item ${item.id}`);
                              const response = await fetch(`/api/action-items/${item.id}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                  action: 'verify_completion',
                                  userToken: user.token 
                                })
                              });
                              const result = await response.json();
                              
                              console.log(`[ACTION ITEMS UI] Verification result:`, result);
                              
                              if (result.success && result.verified) {
                                // Show success feedback
                                console.log(`[ACTION ITEMS UI] Verification successful for ${item.title}`);
                                alert('✅ Verification successful! Issue has been resolved and verified.');
                              } else if (result.success && !result.verified) {
                                // Show needs more work feedback
                                console.log(`[ACTION ITEMS UI] Verification failed for ${item.title}`);
                                alert('⚠️ Verification failed - the issue still exists and needs additional work.');
                              } else {
                                console.log(`[ACTION ITEMS UI] Verification API failed:`, result);
                                alert('❌ Verification API failed. Check console for details.');
                              }
                              
                              await fetchActionItems(); // Refresh to show updated status
                            } catch (error) {
                              console.error('[ACTION ITEMS UI] Error verifying completion:', error);
                              alert('❌ Error during verification. Please try again.');
                            }
                          }}
                          className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded hover:bg-blue-200 transition-colors"
                        >
                          ⚡ Verify Now
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500 mt-4 pt-4 border-t border-gray-200">
                  <div>
                    Detected: {new Date(item.detected_at).toLocaleDateString()}
                  </div>
                  <div>
                    Priority Score: {item.priority_score}/100
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Completed Action Items */}
      {showCompleted && completedItems.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              Completed Action Items ({completedItems.length})
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Recently resolved issues and audit trail
            </p>
          </div>
          
          <div className="divide-y divide-gray-200">
            {completedItems.map((item) => (
              <div key={item.id} className="p-6 bg-green-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        {item.status === 'verified' ? 'VERIFIED' : 'CLOSED'}
                      </span>
                      <span className="text-xs text-gray-500 uppercase tracking-wide">
                        {item.issue_category.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      {item.title}
                    </h4>
                    
                    <p className="text-gray-600 mb-3">
                      {item.description}
                    </p>
                  </div>
                  
                  <div className="text-right ml-6">
                    <div className="text-green-600 text-2xl mb-2">✅</div>
                    <div className="text-xs text-gray-500">
                      {item.verified_at 
                        ? `Verified: ${new Date(item.verified_at).toLocaleDateString()}`
                        : `Completed: ${new Date(item.completed_at || '').toLocaleDateString()}`
                      }
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}