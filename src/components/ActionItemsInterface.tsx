'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { ActionItem } from '@/lib/ActionItemService';
import { CodingAgentInstructionsGenerator } from '@/lib/CodingAgentInstructions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';

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

// Helper function to get card styling based on status and severity
const getCardStyling = (status: string, severity: string) => {
  // Status-based background colors
  if (status === 'completed' || status === 'verified') {
    return 'bg-green-50 border-green-200';
  }
  if (status === 'needs_verification') {
    return 'bg-orange-50 border-orange-200';
  }
  
  // Severity-based colors for active items
  switch (severity) {
    case 'critical':
      return 'bg-red-50 border-red-200';
    case 'high':
      return 'bg-orange-50 border-orange-200';
    case 'medium':
      return 'bg-yellow-50 border-yellow-200';
    case 'low':
      return 'bg-blue-50 border-blue-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
};

// Helper function to get badge styling
const getBadgeStyling = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'destructive' as const;
    case 'high':
      return 'default' as const;
    case 'medium':
      return 'secondary' as const;
    case 'low':
      return 'outline' as const;
    default:
      return 'secondary' as const;
  }
};

// Helper function to get badge custom classes for severity colors
const getBadgeClasses = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Helper function to get status display text and styling
const getStatusDisplay = (status: string) => {
  switch (status) {
    case 'completed':
      return { text: '✅ Fix Applied', class: 'text-green-600' };
    case 'needs_verification':
      return { text: '⚠️ Needs Verification', class: 'text-orange-600' };
    case 'verified':
      return { text: '✅ Verified', class: 'text-green-600' };
    case 'in_progress':
      return { text: '🔄 In Progress', class: 'text-blue-600' };
    case 'assigned':
      return { text: '📋 Assigned', class: 'text-purple-600' };
    default:
      return { text: '🔍 Detected', class: 'text-gray-600' };
  }
};


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
  const [instructionsGenerated, setInstructionsGenerated] = useState<Set<string>>(new Set());
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
        
        // Mark instructions as generated
        setInstructionsGenerated(prev => {
          const newSet = new Set(prev);
          newSet.add(actionItem.id);
          return newSet;
        });
        
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
          
          // Mark instructions as generated for popup case too
          setInstructionsGenerated(prev => {
            const newSet = new Set(prev);
            newSet.add(actionItem.id);
            return newSet;
          });
        }
      }
    } else {
      alert('⚠️ No automated instructions available for this issue type. Manual review required.');
    }
  };

  const handleVerifyCodeFix = async (actionItem: ActionItem) => {
    if (!user?.token) return;

    console.log(`[ACTION ITEMS] 🔍 Verifying code fix for: ${actionItem.title}`);
    
    try {
      setProcessingItems(prev => {
        const newSet = new Set(prev);
        newSet.add(actionItem.id);
        return newSet;
      });

      // Call verification based on issue type
      let verificationResult = false;
      let verificationMessage = '';

      switch (actionItem.issue_type) {
        case 'mobile_usability_issues':
          verificationResult = await verifyMobileUsabilityFix(actionItem);
          verificationMessage = verificationResult 
            ? '✅ Mobile usability verification passed! Pages are now mobile-friendly.'
            : '❌ Mobile usability issues still detected. Please ensure all fixes have been applied and deployed.';
          break;
          
        case 'indexing_blocked_pages':
          // For code-fixable indexing issues (like 404 fixes)
          verificationResult = await verifyIndexingCodeFix(actionItem);
          verificationMessage = verificationResult
            ? '✅ Pages are now accessible! Indexing issues have been resolved.'
            : '❌ Some pages are still returning errors. Please check that all pages have been created and deployed.';
          break;
          
        default:
          verificationMessage = '⚠️ Verification not yet implemented for this issue type. Please manually verify the fixes.';
          break;
      }

      // Update action item status based on verification result
      if (verificationResult) {
        const updateResponse = await fetch(`/api/action-items/${actionItem.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'mark_completed',
            fixType: 'code_fix_verified',
            fixDetails: { verificationResult: true, verifiedAt: new Date().toISOString() }
          })
        });

        if (updateResponse.ok) {
          await fetchActionItems(); // Refresh the list
          onRefresh?.();
        }
      }

      alert(verificationMessage);
      
    } catch (error) {
      console.error('[ACTION ITEMS] Error verifying code fix:', error);
      alert('❌ Error during verification. Please try again.');
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionItem.id);
        return newSet;
      });
    }
  };

  // Verification helper functions
  const verifyMobileUsabilityFix = async (actionItem: ActionItem): Promise<boolean> => {
    if (!actionItem.affected_urls || actionItem.affected_urls.length === 0) {
      // If no specific URLs, re-run GSC URL inspection to check mobile usability
      console.log(`[ACTION ITEMS] Re-checking mobile usability via GSC API for site: ${actionItem.site_url}`);
      return await verifyMobileUsabilityViaGSC(actionItem);
    }

    console.log(`[ACTION ITEMS] Running mobile usability verification for ${actionItem.affected_urls.length} URLs`);
    
    try {
      let allPassed = true;
      
      for (const url of actionItem.affected_urls.slice(0, 3)) { // Limit to 3 URLs
        try {
          // Check if page is accessible
          const response = await fetch(url, { method: 'GET' });
          if (!response.ok) {
            console.log(`[ACTION ITEMS] URL ${url} is not accessible (${response.status})`);
            allPassed = false;
            continue;
          }
          
          // Check page HTML for mobile usability basics
          const html = await response.text();
          const hasViewport = html.includes('viewport') && html.includes('width=device-width');
          
          if (!hasViewport) {
            console.log(`[ACTION ITEMS] URL ${url} missing proper viewport meta tag`);
            allPassed = false;
          } else {
            console.log(`[ACTION ITEMS] ✅ URL ${url} has viewport meta tag`);
          }
          
        } catch (error) {
          console.log(`[ACTION ITEMS] Error checking ${url}:`, error);
          allPassed = false;
        }
      }
      
      return allPassed;
    } catch (error) {
      console.error('[ACTION ITEMS] Error in mobile usability verification:', error);
      return false;
    }
  };

  const verifyMobileUsabilityViaGSC = async (actionItem: ActionItem): Promise<boolean> => {
    try {
      // Re-run URL inspection for a few key pages to check mobile usability
      const testUrls = [
        actionItem.site_url,
        `${actionItem.site_url}/`,
        `${actionItem.site_url}/contact`,
        `${actionItem.site_url}/about`
      ].filter((url, index, self) => self.indexOf(url) === index).slice(0, 2); // Dedupe and limit
      
      console.log(`[ACTION ITEMS] Running GSC URL inspection for mobile usability verification`);
      
      const gscResponse = await fetch(`/api/gsc/url-inspection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken: actionItem.user_token,
          siteUrl: actionItem.site_url,
          urls: testUrls
        })
      });

      if (gscResponse.ok) {
        const gscData = await gscResponse.json();
        if (gscData.success) {
          const mobileUsableCount = gscData.data.summary.mobileUsable;
          const totalChecked = gscData.data.summary.indexable + gscData.data.summary.blocked;
          
          console.log(`[ACTION ITEMS] GSC mobile usability check: ${mobileUsableCount}/${totalChecked} pages mobile-friendly`);
          
          // Consider it fixed if majority of pages are now mobile-usable
          return mobileUsableCount >= Math.ceil(totalChecked * 0.8); // 80% threshold
        }
      }
      
      return false;
    } catch (error) {
      console.error('[ACTION ITEMS] Error in GSC mobile usability verification:', error);
      return false;
    }
  };

  const verifyIndexingCodeFix = async (actionItem: ActionItem): Promise<boolean> => {
    if (!actionItem.affected_urls || actionItem.affected_urls.length === 0) {
      return true;
    }

    console.log(`[ACTION ITEMS] Verifying indexing code fixes for ${actionItem.affected_urls.length} URLs`);
    
    try {
      // Check if previously 404 pages now return 200
      for (const url of actionItem.affected_urls) {
        try {
          const response = await fetch(url, { method: 'HEAD' });
          if (!response.ok) {
            console.log(`[ACTION ITEMS] URL ${url} still returns ${response.status} error`);
            return false;
          }
          console.log(`[ACTION ITEMS] ✅ URL ${url} now accessible (${response.status})`);
        } catch (error) {
          console.log(`[ACTION ITEMS] Error accessing ${url}:`, error);
          return false;
        }
      }
      
      return true; // All URLs are now accessible
    } catch (error) {
      console.error('[ACTION ITEMS] Error in indexing code fix verification:', error);
      return false;
    }
  };

  // ActionItemCard component for clean card rendering
  const ActionItemCard = ({ 
    item, 
    processingItems, 
    instructionsGenerated, 
    user, 
    handleFixAction, 
    handleGenerateInstructions, 
    handleVerifyCodeFix, 
    handleDismiss, 
    fetchActionItems,
    getFixButtonType,
    getFixButtonForItem,
    getPreFixExplanation
  }: {
    item: ActionItem;
    processingItems: Set<string>;
    instructionsGenerated: Set<string>;
    user: any;
    handleFixAction: (item: ActionItem, action: any) => void;
    handleGenerateInstructions: (item: ActionItem) => void;
    handleVerifyCodeFix: (item: ActionItem) => void;
    handleDismiss: (item: ActionItem) => void;
    fetchActionItems: () => Promise<void>;
    getFixButtonType: (item: ActionItem) => string;
    getFixButtonForItem: (item: ActionItem) => any;
    getPreFixExplanation: (item: ActionItem, buttonType: string) => string;
  }) => {
    const [urlsOpen, setUrlsOpen] = useState(false);
    const statusDisplay = getStatusDisplay(item.status);
    
    return (
      <Card className={getCardStyling(item.status, item.severity || '')}>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge 
                  variant="secondary" 
                  className={getBadgeClasses(item.severity || '')}
                >
                  {item.severity?.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="text-xs text-gray-500">
                  {item.issue_category.replace('_', ' ')}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {item.status.replace('_', ' ')}
                </Badge>
              </div>
              <CardTitle className="text-lg text-gray-900">
                {item.title}
              </CardTitle>
            </div>
            
            {/* Verification status in top right */}
            {(item.status === 'completed' || item.status === 'needs_verification' || item.status === 'verified') && (
              <div className="text-right ml-4 flex-shrink-0">
                <div className={`text-sm font-medium mb-1 ${statusDisplay.class}`}>
                  {statusDisplay.text}
                </div>
                {item.issue_category === 'indexing' && (
                  <div className="text-xs text-blue-600 mb-2 px-2 py-1 bg-blue-50 rounded max-w-xs">
                    💡 <strong>Normal process:</strong> Google needs time to discover and re-evaluate your pages after fixes are applied.
                  </div>
                )}
                {item.issue_category === 'sitemap' && (
                  <div className="text-xs text-gray-500 mb-2">
                    Waiting for Google to download updated sitemap
                  </div>
                )}
                {item.status === 'verified' && (
                  <div className="text-xs text-gray-500 mb-2">
                    Issue verified and resolved
                  </div>
                )}
                <Button
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
                      if (item.issue_category === 'sitemap') {
                        console.log(`[ACTION ITEMS UI] 🔄 Refreshing GSC sitemap status before verification...`);
                        const gscRefreshResponse = await fetch(`/api/gsc/sitemap-status?userToken=${user.token}&siteUrl=${encodeURIComponent(item.site_url)}`);
                        if (gscRefreshResponse.ok) {
                          const gscRefreshData = await gscRefreshResponse.json();
                          console.log(`[ACTION ITEMS UI] ✅ GSC refresh successful:`, gscRefreshData);
                        } else {
                          console.log(`[ACTION ITEMS UI] ⚠️ GSC refresh failed:`, gscRefreshResponse.status);
                        }
                        
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
                        console.log(`[ACTION ITEMS UI] Verification successful for ${item.title}`);
                        alert('✅ Verification successful! Issue has been resolved and verified.');
                      } else if (result.success && !result.verified) {
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
                      
                      await fetchActionItems();
                    } catch (error) {
                      console.error('[ACTION ITEMS UI] Error verifying completion:', error);
                      alert('❌ Error during verification. Please try again.');
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                >
                  ⚡ Verify Now
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Detailed problem breakdown for indexing issues */}
          {item.issue_type === 'indexing_blocked_pages' && item.metadata?.problemsByType && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
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
            <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
              <p className="text-sm text-orange-800">
                <span className="font-medium">Impact:</span> {item.impact_description}
              </p>
            </div>
          )}
          
          {item.fix_recommendation && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800 whitespace-pre-line">
                <span className="font-medium">Recommendation:</span> {item.fix_recommendation}
              </p>
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {item.status !== 'completed' && item.status !== 'needs_verification' && item.status !== 'verified' && (
              <>
                {(() => {
                  const buttonType = getFixButtonType(item);
                  const fixAction = getFixButtonForItem(item);
                  
                  if (buttonType === 'auto' && fixAction) {
                    return (
                      <Button
                        onClick={() => handleFixAction(item, fixAction)}
                        disabled={processingItems.has(item.id)}
                        className="bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        {processingItems.has(item.id) ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Fixing...
                          </>
                        ) : (
                          <>⚡ Fix Now</>
                        )}
                      </Button>
                    );
                  } else if (buttonType === 'code') {
                    return (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => handleGenerateInstructions(item)}
                          variant="outline"
                          size="sm"
                          className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                        >
                          🤖 Generate Fix Instructions
                        </Button>
                        
                        {instructionsGenerated.has(item.id) && (
                          <Button
                            onClick={() => handleVerifyCodeFix(item)}
                            disabled={processingItems.has(item.id)}
                            variant="outline"
                            size="sm"
                            className="bg-purple-100 text-purple-800 hover:bg-purple-200"
                          >
                            {processingItems.has(item.id) ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-800 mr-2"></div>
                                Verifying...
                              </>
                            ) : (
                              <>🔍 Verify Fix Applied</>
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  } else {
                    return (
                      <Button
                        onClick={() => {
                          alert(`📖 Manual Review Required\n\nThis issue type (${item.issue_type}) requires manual review and cannot be automatically fixed. Please:\n\n1. Review the issue details\n2. Consult the fix recommendation\n3. Implement changes manually\n4. Test the results\n\nOnce fixed, you can dismiss this item.`);
                        }}
                        variant="secondary"
                        size="sm"
                      >
                        📖 Manual Review
                      </Button>
                    );
                  }
                })()}
                
                <Button
                  onClick={() => handleDismiss(item)}
                  variant="outline"
                  size="sm"
                >
                  Dismiss
                </Button>
              </>
            )}
          </div>
          
          {/* Pre-fix explanation for non-completed items */}
          {item.status !== 'completed' && item.status !== 'needs_verification' && item.status !== 'verified' && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-sm text-green-800 whitespace-pre-line">
                <span className="font-medium">What SEOAgent will do:</span><br />
                {getPreFixExplanation(item, getFixButtonType(item))}
              </p>
            </div>
          )}
          
          {/* Collapsible Affected URLs */}
          {item.affected_urls && item.affected_urls.length > 0 && (
            <Collapsible open={urlsOpen} onOpenChange={setUrlsOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 transition-colors">
                <ChevronRight className={`h-4 w-4 transition-transform ${urlsOpen ? 'rotate-90' : ''}`} />
                Affected URLs ({item.affected_urls.length})
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-1 text-sm text-muted-foreground pl-6">
                {item.affected_urls.map((url, index) => (
                  <div key={index}>{url}</div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Footer metadata */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-200">
            <div>
              Detected: {new Date(item.detected_at).toLocaleDateString()}
            </div>
            <div>
              Priority Score: {item.priority_score}/100
            </div>
          </div>
        </CardContent>
      </Card>
    );
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Outstanding Action Items ({filteredActiveItems.length})
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Issues that need attention, sorted by priority
            </p>
          </div>
        </div>
        
        {filteredActiveItems.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">✅</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Outstanding Issues</h3>
            <p className="text-gray-600">
              {activeItems.length === 0 
                ? 'Click "Scan for Issues" to detect SEO problems.'
                : 'All issues in this filter have been resolved!'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredActiveItems.map((item) => (
              <ActionItemCard 
                key={item.id}
                item={item}
                processingItems={processingItems}
                instructionsGenerated={instructionsGenerated}
                user={user}
                handleFixAction={handleFixAction}
                handleGenerateInstructions={handleGenerateInstructions}
                handleVerifyCodeFix={handleVerifyCodeFix}
                handleDismiss={handleDismiss}
                fetchActionItems={fetchActionItems}
                getFixButtonType={getFixButtonType}
                getFixButtonForItem={getFixButtonForItem}
                getPreFixExplanation={getPreFixExplanation}
              />
            ))}
        </div>
        )}
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