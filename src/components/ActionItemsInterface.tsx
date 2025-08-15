'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { ActionItem } from '@/lib/ActionItemService';
import { CodingAgentInstructionsGenerator } from '@/lib/CodingAgentInstructions';

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
  const [showNeedsVerification, setShowNeedsVerification] = useState(true);
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
    needs_verification: 'bg-orange-50 border-orange-200',
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
        `/api/action-items?userToken=${user.token}&siteUrl=${encodeURIComponent(siteUrl)}&status=detected,assigned,in_progress,completed,needs_verification`
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

    console.log(`[ACTION ITEMS] 🚀 Starting fix for "${actionItem.title}"`, {
      actionItemId: actionItem.id,
      issueType: actionItem.issue_type,
      category: actionItem.issue_category,
      severity: actionItem.severity,
      fixType: fixType,
      affectedUrls: actionItem.affected_urls
    });

    try {
      setProcessingItems(prev => {
        const newSet = new Set(prev);
        newSet.add(actionItem.id);
        return newSet;
      });

      // Show user what the agent is doing
      console.log(`[ACTION ITEMS] 🔧 SEOAgent is attempting to fix: ${actionItem.title}`);
      console.log(`[ACTION ITEMS] 📋 Fix strategy: ${fixType}`);
      console.log(`[ACTION ITEMS] 🌐 Target site: ${siteUrl}`);

      // Run debug endpoint for sitemap issues to get detailed info before fix
      if (actionItem.issue_category === 'sitemap') {
        console.log(`[ACTION ITEMS] 🔍 Running pre-fix sitemap diagnosis...`);
        try {
          const debugResponse = await fetch(`/api/debug/sitemap-debug?userToken=${user.token}&siteUrl=${encodeURIComponent(actionItem.site_url)}`);
          if (debugResponse.ok) {
            const debugData = await debugResponse.json();
            console.log(`[ACTION ITEMS] 📊 Pre-fix diagnosis:`, debugData.debugInfo);
          }
        } catch (e) {
          console.log(`[ACTION ITEMS] ⚠️ Pre-fix diagnosis failed:`, e);
        }
      }

      // Call the automated fix API
      console.log(`[ACTION ITEMS] 🎯 Calling automated fix API...`);
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
      
      console.log(`[ACTION ITEMS] 📈 Fix API response:`, result);
      
      if (result.success) {
        console.log(`[ACTION ITEMS] ✅ Fix applied successfully!`);
        console.log(`[ACTION ITEMS] 📝 Fix details:`, result.result);
        
        // Update action item status
        console.log(`[ACTION ITEMS] 💾 Updating action item status to completed...`);
        const updateResponse = await fetch(`/api/action-items/${actionItem.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'mark_completed',
            fixType: fixType,
            fixDetails: result.result
          })
        });

        const updateResult = await updateResponse.json();
        console.log(`[ACTION ITEMS] 💾 Status update result:`, updateResult);

        // Automatic verification for applicable issues
        if (['sitemap', 'robots', 'schema'].includes(actionItem.issue_category)) {
          console.log(`[ACTION ITEMS] 🔍 Starting automatic verification...`);
          
          try {
            // Wait a moment for changes to propagate
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const verifyResponse = await fetch(`/api/action-items/${actionItem.id}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                action: 'verify_completion',
                userToken: user.token 
              })
            });
            
            const verifyResult = await verifyResponse.json();
            console.log(`[ACTION ITEMS] 🔍 Verification result:`, verifyResult);
            
            if (verifyResult.success && verifyResult.verified) {
              console.log(`[ACTION ITEMS] ✨ Auto-verification successful! Issue fully resolved.`);
            } else {
              console.log(`[ACTION ITEMS] ⏳ Fix applied but needs time to propagate. Manual verification may be needed.`);
            }
          } catch (verifyError) {
            console.log(`[ACTION ITEMS] ⚠️ Auto-verification failed:`, verifyError);
          }
        }

        // Refresh action items
        console.log(`[ACTION ITEMS] 🔄 Refreshing action items list...`);
        await fetchActionItems();
        onRefresh?.();
        
        console.log(`[ACTION ITEMS] 🎉 Fix process completed for "${actionItem.title}"`);
      } else {
        console.error(`[ACTION ITEMS] ❌ Fix failed:`, result);
        alert(`❌ Fix failed: ${result.error || 'Unknown error'}. Check console for details.`);
      }
    } catch (error) {
      console.error('[ACTION ITEMS] 💥 Error during fix process:', error);
      alert('❌ Error during fix process. Check console for details.');
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
      // Existing automatable fixes
      sitemap_missing: 'generate_and_submit_sitemap',
      sitemap_not_downloaded: 'generate_and_submit_sitemap',
      robots_missing: 'generate_robots_txt',
      robots_fetch_errors: 'generate_robots_txt',
      indexing_blocked_pages: 'fix_indexing_issue',
      schema_missing_all: 'generate_schema_markup',
      schema_missing_pages: 'generate_schema_markup',
      
      // New automatable fixes via SEOAgent.js
      meta_tags_missing: 'optimize_meta_tags',
      meta_tags_duplicate: 'optimize_meta_tags', 
      alt_tags_missing: 'optimize_alt_tags',
      
      // Performance optimizations (basic ones)
      images_not_optimized: 'optimize_images',
      lazy_loading_missing: 'enable_lazy_loading',
      
      // Mobile issues (basic responsive fixes)
      mobile_viewport_missing: 'fix_mobile_viewport',
      
      // Security issues (basic ones)
      https_redirect_missing: 'enable_https_redirect',
      security_headers_missing: 'add_security_headers'
    };

    return fixes[item.issue_type as keyof typeof fixes];
  };

  const getFixButtonType = (item: ActionItem) => {
    const fixAction = getFixButtonForItem(item);
    
    // Special handling for indexing issues based on analysis data
    if (item.issue_type === 'indexing_blocked_pages' && item.metadata?.analysisData) {
      const analysis = item.metadata.analysisData;
      if (analysis.autoFixableCount > 0) {
        return 'auto'; // Has auto-fixable issues
      } else if (analysis.codeFixableCount > 0) {
        return 'code'; // Has code-fixable issues
      } else {
        return 'manual'; // Only manual issues
      }
    }
    
    if (fixAction) {
      return 'auto'; // Can be automatically fixed
    }
    
    // Check if it's code-fixable (needs coding agent instructions)
    const codeFixableIssues = [
      'mobile_usability_issues',
      'core_web_vitals_poor',
      'performance_slow_loading',
      'css_render_blocking',
      'javascript_render_blocking',
      'images_without_webp',
      'missing_cdn',
      'database_optimization_needed'
    ];
    
    if (codeFixableIssues.includes(item.issue_type)) {
      return 'code'; // Needs coding agent instructions
    }
    
    return 'manual'; // Requires manual intervention
  };

  const getPreFixExplanation = (item: ActionItem, buttonType: string) => {
    if (item.issue_type === 'indexing_blocked_pages' && item.metadata?.analysisData) {
      const analysis = item.metadata.analysisData;
      
      if (buttonType === 'auto') {
        const autoFixableTypes = Object.entries(analysis.problemsByType)
          .filter(([_, problems]: [string, any]) => problems.some((p: any) => p.fixable === 'auto'))
          .map(([type, _]) => type);
        
        return `🚀 **SEOAgent can automatically fix ${analysis.autoFixableCount} of these indexing issues:**\n\n` +
               `${autoFixableTypes.map(type => `• **${type}** - I&apos;ll update your website configuration to resolve this`).join('\n')}\n\n` +
               `After clicking "Fix Now", these changes will be applied immediately and Google will be able to access your pages.`;
      } else if (buttonType === 'code') {
        return `🛠️ **${analysis.codeFixableCount} issues need code changes** that I can guide you through.\n\n` +
               `These problems require updates to your website&apos;s code or content. Click "Generate Instructions" to get step-by-step guidance for your coding assistant.`;
      } else {
        return `📋 **These issues require manual investigation** to determine the best solution.\n\n` +
               `The problems are complex and need human review to understand the root cause and appropriate fix.`;
      }
    }
    
    // Default explanations for other issue types
    if (buttonType === 'auto') {
      return `🚀 **SEOAgent can fix this automatically.** Click "Fix Now" and I&apos;ll resolve the issue for you immediately.`;
    } else if (buttonType === 'code') {
      return `🛠️ **This issue needs code changes.** Click "Generate Instructions" to get detailed guidance for your coding assistant.`;
    } else {
      return `📋 **This issue requires manual review** to determine the best approach for your specific situation.`;
    }
  };

  const handleGenerateInstructions = async (actionItem: ActionItem) => {
    console.log(`[ACTION ITEMS] 🤖 Generating coding agent instructions for: ${actionItem.title}`);
    
    const instructions = CodingAgentInstructionsGenerator.generate(
      actionItem.issue_type, 
      actionItem.title,
      actionItem.affected_urls,
      actionItem.metadata
    );
    
    if (instructions) {
      const copyableText = CodingAgentInstructionsGenerator.generateCopyableInstructions(instructions);
      
      try {
        await navigator.clipboard.writeText(copyableText);
        console.log(`[ACTION ITEMS] 📋 Instructions copied to clipboard for: ${actionItem.title}`);
        alert('📋 Coding agent instructions copied to clipboard! Paste them into your coding assistant.');
      } catch (error) {
        console.error('[ACTION ITEMS] Failed to copy instructions:', error);
        // Fallback: show instructions in a popup
        const popup = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
        if (popup) {
          popup.document.write(`
            <html>
              <head><title>Coding Agent Instructions - ${actionItem.title}</title></head>
              <body style="font-family: system-ui; padding: 20px; line-height: 1.6;">
                <pre style="white-space: pre-wrap; background: #f5f5f5; padding: 20px; border-radius: 8px;">${copyableText}</pre>
                <button onclick="navigator.clipboard.writeText(document.querySelector('pre').textContent); alert('Copied!');" style="margin-top: 20px; padding: 10px 20px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer;">Copy to Clipboard</button>
              </body>
            </html>
          `);
        }
      }
    } else {
      alert('⚠️ No automated instructions available for this issue type. Manual review required.');
    }
  };

  const filteredActiveItems = activeItems.filter(item => {
    if (selectedCategory !== 'all' && item.issue_category !== selectedCategory) {
      return false;
    }
    if (selectedSeverity !== 'all' && item.severity !== selectedSeverity) {
      return false;
    }
    // Filter needs_verification items based on toggle
    if (item.status === 'needs_verification' && !showNeedsVerification) {
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
              onClick={() => setShowNeedsVerification(!showNeedsVerification)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                showNeedsVerification 
                  ? 'bg-orange-100 text-orange-800 border border-orange-200' 
                  : 'bg-gray-100 text-gray-700 border border-gray-200'
              }`}
            >
              {showNeedsVerification ? 'Hide' : 'Show'} Needs Verification ({activeItems.filter(item => item.status === 'needs_verification').length})
            </button>
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
                    
                    {/* Detailed problem breakdown for indexing issues */}
                    {item.issue_type === 'indexing_blocked_pages' && item.metadata?.problemsByType && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-3">
                        <p className="text-sm font-medium text-red-900 mb-2">🔍 Specific Issues Found:</p>
                        {Object.entries(item.metadata.problemsByType).map(([problemType, problems]: [string, any]) => (
                          <div key={problemType} className="mb-2 last:mb-0">
                            <div className="text-sm text-red-800">
                              <span className="font-medium">• {problemType}</span> ({problems.length} page{problems.length > 1 ? 's' : ''}):
                            </div>
                            <div className="text-xs text-red-700 ml-2 mt-1">
                              {problems[0].explanation}
                            </div>
                            <div className="text-xs text-red-600 ml-2 mt-1">
                              <strong>Affected:</strong> {problems.map((p: any) => {
                                try {
                                  const url = new URL(p.url);
                                  return url.pathname;
                                } catch {
                                  return p.url;
                                }
                              }).join(', ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {item.impact_description && (
                      <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mb-3">
                        <p className="text-sm text-orange-800">
                          <span className="font-medium">Impact:</span> {item.impact_description}
                        </p>
                      </div>
                    )}
                    
                    {item.fix_recommendation && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
                        <p className="text-sm text-blue-800 whitespace-pre-line">
                          <span className="font-medium">Recommendation:</span> {item.fix_recommendation}
                        </p>
                      </div>
                    )}
                    
                    {/* Pre-fix explanation for non-completed items */}
                    {item.status !== 'completed' && item.status !== 'needs_verification' && item.status !== 'verified' && (
                      <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-3">
                        <p className="text-sm text-green-800 whitespace-pre-line">
                          <span className="font-medium">What SEOAgent will do:</span><br />
                          {getPreFixExplanation(item, getFixButtonType(item))}
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
                    {item.status !== 'completed' && item.status !== 'needs_verification' && item.status !== 'verified' && (
                      <>
                        {(() => {
                          const buttonType = getFixButtonType(item);
                          const fixAction = getFixButtonForItem(item);
                          
                          if (buttonType === 'auto' && fixAction) {
                            // Auto-fixable: Green "Fix Now" button
                            return (
                              <button
                                onClick={() => handleFixAction(item, fixAction)}
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
                            );
                          } else if (buttonType === 'code') {
                            // Code-fixable: Blue "Generate Instructions" button
                            return (
                              <button
                                onClick={() => handleGenerateInstructions(item)}
                                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                              >
                                <span>🤖</span>
                                <span>Generate Fix Instructions</span>
                              </button>
                            );
                          } else {
                            // Manual-only: Gray "View Manual Steps" button
                            return (
                              <button
                                onClick={() => {
                                  alert(`📖 Manual Review Required\n\nThis issue type (${item.issue_type}) requires manual review and cannot be automatically fixed. Please:\n\n1. Review the issue details\n2. Consult the fix recommendation\n3. Implement changes manually\n4. Test the results\n\nOnce fixed, you can dismiss this item.`);
                                }}
                                className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 flex items-center space-x-2"
                              >
                                <span>📖</span>
                                <span>Manual Review</span>
                              </button>
                            );
                          }
                        })()}
                        
                        <button
                          onClick={() => handleDismiss(item)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                        >
                          Dismiss
                        </button>
                      </>
                    )}
                    
                    {(item.status === 'completed' || item.status === 'needs_verification') && (
                      <div className="text-center">
                        <div className={`text-sm font-medium mb-1 ${
                          item.status === 'needs_verification' 
                            ? 'text-orange-600' 
                            : 'text-green-600'
                        }`}>
                          {item.status === 'needs_verification' ? '⚠️ Needs Verification' : '✅ Fix Applied'}
                        </div>
                        <div className="text-xs text-gray-500 mb-2">
                          {item.status === 'needs_verification'
                            ? 'Verification failed - may need more time or manual review'
                            : item.issue_category === 'indexing' 
                            ? 'Waiting for Google to re-crawl pages (24-48 hrs typical)'
                            : item.issue_category === 'sitemap'
                            ? 'Waiting for Google to download updated sitemap'
                            : 'Awaiting verification'
                          }
                        </div>
                        {/* Additional guidance for indexing issues */}
                        {item.issue_category === 'indexing' && (
                          <div className="text-xs text-blue-600 mb-2 px-2 py-1 bg-blue-50 rounded">
                            💡 <strong>Normal process:</strong> Google needs time to discover and re-evaluate your pages after fixes are applied.
                          </div>
                        )}
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
                              // For sitemap issues, FIRST refresh GSC data to ensure database is up-to-date
                              if (item.issue_category === 'sitemap') {
                                console.log(`[ACTION ITEMS UI] 🔄 Refreshing GSC sitemap status before verification...`);
                                const gscRefreshResponse = await fetch(`/api/gsc/sitemap-status?userToken=${user.token}&siteUrl=${encodeURIComponent(item.site_url)}`);
                                if (gscRefreshResponse.ok) {
                                  const gscRefreshData = await gscRefreshResponse.json();
                                  console.log(`[ACTION ITEMS UI] ✅ GSC refresh successful:`, gscRefreshData);
                                } else {
                                  console.log(`[ACTION ITEMS UI] ⚠️ GSC refresh failed:`, gscRefreshResponse.status);
                                }
                                
                                // Add small delay to ensure database updates are committed
                                await new Promise(resolve => setTimeout(resolve, 1000));
                                
                                console.log(`[ACTION ITEMS UI] 🔍 Running sitemap debug for verification`);
                                const debugResponse = await fetch(`/api/debug/sitemap-debug?userToken=${user.token}&siteUrl=${encodeURIComponent(item.site_url)}`);
                                if (debugResponse.ok) {
                                  const debugData = await debugResponse.json();
                                  console.log(`[ACTION ITEMS UI] 📊 Sitemap debug data:`, debugData.debugInfo);
                                } else {
                                  console.log(`[ACTION ITEMS UI] ❌ Debug endpoint failed:`, debugResponse.status);
                                }
                              }
                              
                              // Trigger verification check
                              console.log(`[ACTION ITEMS UI] 🔍 Calling verification API for item ${item.id}`);
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
                                // Show needs more work feedback with context-specific message
                                console.log(`[ACTION ITEMS UI] Verification failed for ${item.title}`);
                                let failureMessage = '⚠️ Verification shows the issue still needs more time to resolve.\n\n';
                                
                                if (item.issue_category === 'indexing') {
                                  failureMessage += '**For indexing issues:** Google may not have re-crawled your pages yet. This is normal and can take 24-48 hours.\n\n' +
                                                  '**What you can do:**\n' +
                                                  '• Wait another day and try verification again\n' +
                                                  '• Request re-indexing in Google Search Console\n' +
                                                  '• Check that your fixes are still in place';
                                } else if (item.issue_category === 'sitemap') {
                                  failureMessage += '**For sitemap issues:** Google may not have processed your updated sitemap yet.\n\n' +
                                                  '**What you can do:**\n' +
                                                  '• Wait a few hours and try again\n' +
                                                  '• Check Google Search Console for sitemap status\n' +
                                                  '• Verify your sitemap is accessible at the URL';
                                } else {
                                  failureMessage += '**Next steps:**\n' +
                                                  '• Wait some time for changes to take effect\n' +
                                                  '• Verify that your fixes are still in place\n' +
                                                  '• Try verification again later';
                                }
                                
                                alert(failureMessage);
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