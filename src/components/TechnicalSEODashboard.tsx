'use client';

import { useState, useEffect } from 'react';
import AIFixModal from '@/components/AIFixModal';
// Using basic HTML elements since shadcn/ui components are not installed
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
  BarChart3,
  Map
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
  sitemap?: {
    urlCount: number;
    status: string;
    generatedAt: string;
    submittedAt?: string;
    sitemapUrl?: string;
  } | null;
  robots?: {
    exists: boolean;
    accessible: boolean;
    size: number;
    issuesCount: number;
    suggestionsCount: number;
    analyzedAt: string;
    crawlDelay?: number;
    sitemapUrls: number;
  } | null;
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
  const [gscAnalysisInProgress, setGscAnalysisInProgress] = useState(false);
  const [sitemapGenerationInProgress, setSitemapGenerationInProgress] = useState(false);
  const [robotsAnalysisInProgress, setRobotsAnalysisInProgress] = useState(false);
  const [activeTab, setActiveTab] = useState<'issues' | 'activity'>('issues');
  const [fixSuggestions, setFixSuggestions] = useState<Record<string, string>>({});
  const [aiFixModal, setAiFixModal] = useState<{
    isOpen: boolean;
    issue: any;
    suggestion: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    issue: null,
    suggestion: '',
    isLoading: false
  });

  const debugUrlInspections = async () => {
    try {
      const response = await fetch(`/api/debug/url-inspections?userToken=${userToken}`);
      const result = await response.json();
      console.log('URL Inspections Debug:', result);
      alert(`Found ${result.data?.totalInspections || 0} URL inspections. Check console for details.`);
    } catch (error) {
      console.error('Debug failed:', error);
    }
  };

  const getAIFixSuggestion = async (issue: any) => {
    try {
      const issueKey = `${issue.type}-${issue.description}`;
      
      // Open modal with loading state
      setAiFixModal({
        isOpen: true,
        issue: issue,
        suggestion: '',
        isLoading: true
      });
      
      if (fixSuggestions[issueKey]) {
        // Already have suggestion, show it
        setAiFixModal({
          isOpen: true,
          issue: issue,
          suggestion: fixSuggestions[issueKey],
          isLoading: false
        });
        return;
      }

      const response = await fetch('/api/technical-seo/ai-fix-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueType: issue.type,
          description: issue.description,
          url: selectedSite,
          severity: issue.severity,
          rawData: issue.rawData || null
        })
      });

      if (response.ok) {
        const result = await response.json();
        const suggestion = result.data.suggestion;
        
        // Store suggestion for future use
        setFixSuggestions(prev => ({ ...prev, [issueKey]: suggestion }));
        
        // Update modal with suggestion
        setAiFixModal({
          isOpen: true,
          issue: issue,
          suggestion: suggestion,
          isLoading: false
        });
      } else {
        setAiFixModal({
          isOpen: true,
          issue: issue,
          suggestion: 'Failed to get AI fix suggestion. Please try again.',
          isLoading: false
        });
      }
    } catch (error) {
      console.error('Error getting AI fix suggestion:', error);
      setAiFixModal({
        isOpen: true,
        issue: issue,
        suggestion: 'Error getting AI fix suggestion. Please check your connection.',
        isLoading: false
      });
    }
  };

  const closeAiFixModal = () => {
    setAiFixModal({
      isOpen: false,
      issue: null,
      suggestion: '',
      isLoading: false
    });
  };

  const runRobotsAnalysis = async () => {
    if (!selectedSite) return;
    
    try {
      setRobotsAnalysisInProgress(true);
      
      const siteUrlToSend = `https://${selectedSite.replace('sc-domain:', '')}`;
      console.log('[DASHBOARD] Analyzing robots.txt for:', siteUrlToSend);
      
      const response = await fetch('/api/technical-seo/robots-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken,
          siteUrl: siteUrlToSend
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Robots.txt Analysis Results:', result);
        
        const { exists, accessible, issuesCount, suggestionsCount } = result.data;
        
        let message = exists 
          ? `✅ robots.txt found and analyzed`
          : `⚠️ robots.txt not found`;
        
        if (exists) {
          if (issuesCount > 0) {
            message += `\n🔍 Found ${issuesCount} issue${issuesCount > 1 ? 's' : ''}`;
          }
          if (suggestionsCount > 0) {
            message += `\n💡 ${suggestionsCount} suggestion${suggestionsCount > 1 ? 's' : ''} for improvement`;
          }
          if (issuesCount === 0 && suggestionsCount === 0) {
            message += `\n✨ No issues found - robots.txt looks good!`;
          }
        }
        
        alert(message);
        
        // Refresh dashboard data
        await fetchTechnicalSEOData();
      } else {
        const errorText = await response.text();
        console.error('[DASHBOARD] Robots analysis error:', errorText);
        alert(`Robots.txt analysis failed: ${errorText}`);
      }
    } catch (error) {
      console.error('Error analyzing robots.txt:', error);
      alert('Error analyzing robots.txt. Please check your connection.');
    } finally {
      setRobotsAnalysisInProgress(false);
    }
  };

  const generateAndSubmitSitemap = async () => {
    if (!selectedSite) return;
    
    try {
      setSitemapGenerationInProgress(true);
      
      const siteUrlToSend = `https://${selectedSite.replace('sc-domain:', '')}`;
      console.log('[DASHBOARD] Generating sitemap for:', siteUrlToSend);
      
      const response = await fetch('/api/technical-seo/generate-sitemap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken,
          siteUrl: siteUrlToSend,
          submitToGSC: true
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Sitemap Generation Results:', result);
        
        const { urlCount, gscSubmission } = result.data;
        let message = `✅ Sitemap generated with ${urlCount} URLs`;
        
        if (gscSubmission?.success) {
          message += `\n🚀 Successfully submitted to Google Search Console`;
        } else if (gscSubmission?.error) {
          message += `\n⚠️ GSC submission failed: ${gscSubmission.error}`;
        }
        
        alert(message);
        
        // Refresh dashboard data
        await fetchTechnicalSEOData();
      } else {
        const errorText = await response.text();
        console.error('[DASHBOARD] Sitemap generation error:', errorText);
        alert(`Sitemap generation failed: ${errorText}`);
      }
    } catch (error) {
      console.error('Error generating sitemap:', error);
      alert('Error generating sitemap. Please check your connection.');
    } finally {
      setSitemapGenerationInProgress(false);
    }
  };

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
      const siteUrlToSend = `https://${selectedSite}`;
      console.log('[DASHBOARD] Fetching technical SEO data for:', siteUrlToSend);
      console.log('[DASHBOARD] User token:', userToken);
      
      const inspectionsResponse = await fetch('/api/technical-seo/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken,
          siteUrl: siteUrlToSend
        })
      });

      if (inspectionsResponse.ok) {
        const technicalData = await inspectionsResponse.json();
        console.log('[DASHBOARD] Technical SEO API Response:', technicalData);
        setData(technicalData.data);
      } else {
        const errorText = await inspectionsResponse.text();
        console.error('[DASHBOARD] Technical SEO API Error:', errorText);
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

  const triggerGSCAnalysis = async () => {
    if (!selectedSite) return;
    
    try {
      setGscAnalysisInProgress(true);
      
      // First check if we have GSC data
      const debugResponse = await fetch(`/api/debug/gsc-data?userToken=${userToken}`);
      const debugData = await debugResponse.json();
      
      console.log('GSC Debug Data:', debugData);
      console.log('Selected Site:', selectedSite);
      console.log('Looking for:', `sc-domain:${selectedSite}`);
      
      if (debugData.data?.properties?.length > 0) {
        // Find the matching GSC property for this site
        const siteWithoutWww = selectedSite.replace('www.', '');
        const matchingProperty = debugData.data.properties.find((prop: any) => {
          console.log('Checking property:', prop.site_url);
          const propDomain = prop.site_url.replace('sc-domain:', '').replace('https://', '').replace('http://', '').replace('www.', '');
          const selectedDomain = siteWithoutWww.replace('https://', '').replace('http://', '');
          
          return propDomain === selectedDomain ||
                 prop.site_url === `sc-domain:${selectedSite}` || 
                 prop.site_url === `sc-domain:${siteWithoutWww}` ||
                 prop.site_url === selectedSite ||
                 prop.site_url === siteWithoutWww ||
                 prop.site_url === `https://${selectedSite}` ||
                 prop.site_url === `https://${siteWithoutWww}` ||
                 prop.site_url === `http://${selectedSite}` ||
                 prop.site_url === `http://${siteWithoutWww}`;
        });

        if (!matchingProperty) {
          alert(`No GSC property found for ${selectedSite}. Available properties: ${debugData.data.properties.map((p: any) => p.site_url).join(', ')}`);
          return;
        }

        console.log('Found matching GSC property:', matchingProperty);

        // We have GSC connected, now do URL inspection on main pages
        // Extract the actual domain from GSC property format or clean domain
        let actualDomain = selectedSite;
        
        // Remove sc-domain: prefix if present
        if (actualDomain.startsWith('sc-domain:')) {
          actualDomain = actualDomain.replace('sc-domain:', '');
        }
        
        // Remove protocol prefixes if present
        actualDomain = actualDomain.replace(/^https?:\/\//, '');
        
        // Remove www prefix if present
        actualDomain = actualDomain.replace(/^www\./, '');
        
        // Remove trailing slash if present
        actualDomain = actualDomain.replace(/\/$/, '');
        
        console.log('Selected Site:', selectedSite);
        console.log('Cleaned Domain:', actualDomain);
        
        // Start with just 2 URLs to avoid timeout
        const mainUrls = [
          `https://${actualDomain}`,
          `https://${actualDomain}/about`
        ];
        
        console.log('URLs to inspect:', mainUrls);

        const response = await fetch('/api/gsc/url-inspection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userToken,
            siteUrl: matchingProperty.site_url, // Use the exact GSC property URL format
            urls: mainUrls
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log('URL Inspection Results:', result);
          console.log('URLs inspected:', result.data?.inspectedUrls);
          console.log('Summary:', result.data?.summary);
          
          if (result.data?.errors?.length > 0) {
            console.error('GSC Inspection Errors:', result.data.errors);
            alert(`GSC Analysis completed with ${result.data.errors.length} errors. Check console for details.`);
          }
          
          // Wait a moment for database writes to complete
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Refresh data after analysis
          await fetchTechnicalSEOData();
        } else {
          const errorText = await response.text();
          console.error('URL inspection failed:', errorText);
          alert(`GSC Analysis failed: ${errorText}`);
        }
      } else {
        alert('Google Search Console not connected. Please connect GSC first.');
      }
    } catch (error) {
      console.error('Error triggering GSC analysis:', error);
    } finally {
      setGscAnalysisInProgress(false);
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
            <span className="text-sm text-gray-600">Loading...</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-6 rounded-lg border shadow-sm">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Calculate overall status
  const getOverallStatus = () => {
    if (!data) return { status: 'unknown', message: 'Loading technical SEO data...' };
    
    const criticalIssues = data.issues.filter(issue => issue.severity === 'critical').length;
    const totalIssues = data.issues.length;
    const indexabilityRate = data.overview.totalPages > 0 ? (data.overview.indexablePages / data.overview.totalPages) * 100 : 0;
    
    if (criticalIssues > 0) {
      return { 
        status: 'critical', 
        message: `${criticalIssues} critical issue${criticalIssues > 1 ? 's' : ''} requiring immediate attention`,
        color: 'red'
      };
    } else if (totalIssues > 0) {
      return { 
        status: 'warning', 
        message: `${totalIssues} issue${totalIssues > 1 ? 's' : ''} detected, but no critical problems`,
        color: 'orange'
      };
    } else if (indexabilityRate >= 95) {
      return { 
        status: 'excellent', 
        message: 'All systems optimal - technical SEO running smoothly!',
        color: 'green'
      };
    } else if (indexabilityRate >= 80) {
      return { 
        status: 'good', 
        message: 'Good technical SEO health with room for improvement',
        color: 'blue'
      };
    } else {
      return { 
        status: 'needs-attention', 
        message: 'Technical SEO needs attention - run analysis to identify issues',
        color: 'orange'
      };
    }
  };

  const status = getOverallStatus();

  return (
    <div className="space-y-6">
      {/* AI Fix Modal */}
      <AIFixModal
        isOpen={aiFixModal.isOpen}
        onClose={closeAiFixModal}
        issue={aiFixModal.issue}
        suggestion={aiFixModal.suggestion}
        isLoading={aiFixModal.isLoading}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Technical SEO Dashboard</h2>
          <p className="text-gray-600">
            Automated SEO fixes and real-time monitoring
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
            className="px-3 py-2 border rounded-md bg-white"
          >
            {websites.map((site) => (
              <option key={site.domain} value={site.domain}>
                {site.domain}
              </option>
            ))}
          </select>
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="px-4 py-2 border rounded-md bg-white hover:bg-gray-50 flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Status Overview */}
      <div className={`bg-white p-6 rounded-lg border shadow-sm border-l-4 ${
        status.color === 'green' ? 'border-l-green-500 bg-green-50' :
        status.color === 'blue' ? 'border-l-blue-500 bg-blue-50' :
        status.color === 'orange' ? 'border-l-orange-500 bg-orange-50' :
        'border-l-red-500 bg-red-50'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {status.color === 'green' && <CheckCircle className="h-6 w-6 text-green-600" />}
            {status.color === 'blue' && <CheckCircle className="h-6 w-6 text-blue-600" />}
            {status.color === 'orange' && <AlertTriangle className="h-6 w-6 text-orange-600" />}
            {status.color === 'red' && <XCircle className="h-6 w-6 text-red-600" />}
            <div>
              <h3 className={`text-lg font-semibold ${
                status.color === 'green' ? 'text-green-800' :
                status.color === 'blue' ? 'text-blue-800' :
                status.color === 'orange' ? 'text-orange-800' :
                'text-red-800'
              }`}>
                Technical SEO Status: {status.status === 'excellent' ? 'Excellent' : 
                                     status.status === 'good' ? 'Good' :
                                     status.status === 'warning' ? 'Needs Review' :
                                     status.status === 'critical' ? 'Critical Issues' : 'Checking...'}
              </h3>
              <p className={`text-sm ${
                status.color === 'green' ? 'text-green-700' :
                status.color === 'blue' ? 'text-blue-700' :
                status.color === 'orange' ? 'text-orange-700' :
                'text-red-700'
              }`}>
                {status.message}
              </p>
            </div>
          </div>
          {data && data.overview.totalPages > 0 && (
            <div className="text-right">
              <div className={`text-2xl font-bold ${
                status.color === 'green' ? 'text-green-600' :
                status.color === 'blue' ? 'text-blue-600' :
                status.color === 'orange' ? 'text-orange-600' :
                'text-red-600'
              }`}>
                {Math.round((data.overview.indexablePages / data.overview.totalPages) * 100)}%
              </div>
              <p className="text-xs text-gray-600">Indexable</p>
            </div>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Pages</p>
                <p className="text-2xl font-bold">{data.overview.totalPages}</p>
              </div>
              <Globe className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Last audit: {new Date(data.overview.lastAuditAt).toLocaleDateString()}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Indexable</p>
                <p className="text-2xl font-bold text-green-600">{data.overview.indexablePages}</p>
              </div>
              <Search className="h-8 w-8 text-green-500" />
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{ width: `${(data.overview.indexablePages / data.overview.totalPages) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Mobile Friendly</p>
                <p className="text-2xl font-bold text-blue-600">{data.overview.mobileFriendly}</p>
              </div>
              <Smartphone className="h-8 w-8 text-blue-500" />
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${(data.overview.mobileFriendly / data.overview.totalPages) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">With Schema</p>
                <p className="text-2xl font-bold text-purple-600">{data.overview.withSchema}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-purple-600 h-2 rounded-full" 
                style={{ width: `${(data.overview.withSchema / data.overview.totalPages) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Automated Fixes Section */}
      {data && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-500" />
                Automated Fixes
              </h3>
              <p className="text-gray-600">
                Smart.js is continuously optimizing your website&apos;s technical SEO
              </p>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={triggerGSCAnalysis}
                disabled={gscAnalysisInProgress}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md flex items-center space-x-2 disabled:opacity-50"
              >
                {gscAnalysisInProgress ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    <span>Run GSC Analysis</span>
                  </>
                )}
              </button>
              <button 
                onClick={generateAndSubmitSitemap}
                disabled={sitemapGenerationInProgress}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md flex items-center space-x-2 disabled:opacity-50"
              >
                {sitemapGenerationInProgress ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Map className="h-4 w-4" />
                    <span>Generate Sitemap</span>
                  </>
                )}
              </button>
              <button 
                onClick={runRobotsAnalysis}
                disabled={robotsAnalysisInProgress}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-md flex items-center space-x-2 disabled:opacity-50"
              >
                {robotsAnalysisInProgress ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    <span>Analyze Robots.txt</span>
                  </>
                )}
              </button>
              <button 
                onClick={debugUrlInspections}
                className="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md text-sm"
              >
                Debug
              </button>
              <button 
                onClick={triggerAutomatedFixes}
                disabled={autoFixInProgress}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md flex items-center space-x-2 disabled:opacity-50"
              >
                {autoFixInProgress ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Applying Fixes...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    <span>Trigger Fixes</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{data.fixes.automated}</div>
              <p className="text-sm text-gray-600">Fixes Applied</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{data.fixes.pending}</div>
              <p className="text-sm text-gray-600">Pending</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{data.fixes.errors}</div>
              <p className="text-sm text-gray-600">Errors</p>
            </div>
          </div>
        </div>
      )}

      {/* Sitemap Status Section */}
      {data && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Map className="h-5 w-5 text-green-500" />
                Sitemap Status
              </h3>
              <p className="text-gray-600">
                XML sitemap generation and Google Search Console submission
              </p>
            </div>
          </div>
          
          {data.sitemap ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{data.sitemap.urlCount}</div>
                <p className="text-sm text-gray-600">URLs in Sitemap</p>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  data.sitemap.status === 'submitted_to_gsc' ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {data.sitemap.status === 'submitted_to_gsc' ? '✓ Submitted' : 'Generated'}
                </div>
                <p className="text-sm text-gray-600">GSC Status</p>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">
                  Generated: {new Date(data.sitemap.generatedAt).toLocaleDateString()}
                </div>
                {data.sitemap.submittedAt && (
                  <div className="text-sm text-gray-600">
                    Submitted: {new Date(data.sitemap.submittedAt).toLocaleDateString()}
                  </div>
                )}
                {data.sitemap.sitemapUrl && (
                  <a 
                    href={data.sitemap.sitemapUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    View Sitemap
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Map className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No sitemap generated yet</p>
              <p className="text-sm text-gray-500">
                Click &ldquo;Generate Sitemap&rdquo; to create and submit your XML sitemap to Google Search Console
              </p>
            </div>
          )}
        </div>
      )}

      {/* Robots.txt Status Section */}
      {data && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-500" />
                Robots.txt Status
              </h3>
              <p className="text-gray-600">
                robots.txt analysis and crawling directive validation
              </p>
            </div>
          </div>
          
          {data.robots ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  data.robots.exists && data.robots.accessible ? 'text-green-600' : 'text-red-600'
                }`}>
                  {data.robots.exists && data.robots.accessible ? '✓ Found' : '✗ Missing'}
                </div>
                <p className="text-sm text-gray-600">robots.txt File</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{data.robots.size}</div>
                <p className="text-sm text-gray-600">File Size (bytes)</p>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  data.robots.issuesCount === 0 ? 'text-green-600' : 
                  data.robots.issuesCount <= 2 ? 'text-orange-600' : 'text-red-600'
                }`}>
                  {data.robots.issuesCount}
                </div>
                <p className="text-sm text-gray-600">Issues Found</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{data.robots.suggestionsCount}</div>
                <p className="text-sm text-gray-600">Suggestions</p>
              </div>
            </div>
            
            {/* Additional robots.txt details */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-gray-600">
                    Analyzed: {new Date(data.robots.analyzedAt).toLocaleDateString()}
                  </div>
                </div>
                {data.robots.crawlDelay && (
                  <div className="text-center">
                    <div className="text-gray-600">
                      Crawl Delay: {data.robots.crawlDelay}s
                    </div>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-gray-600">
                    Sitemap URLs: {data.robots.sitemapUrls}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No robots.txt analysis yet</p>
              <p className="text-sm text-gray-500">
                Click &ldquo;Analyze Robots.txt&rdquo; to check your robots.txt file for issues and get optimization suggestions
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tabs Section */}
      {data && (
        <div className="space-y-4">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('issues')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'issues'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Issues
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'activity'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Real-time Activity
              </button>
            </nav>
          </div>

          {activeTab === 'issues' && (
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Technical SEO Issues</h3>
              <p className="text-gray-600 mb-4">
                Issues detected and available automated fixes
              </p>
              <div className="space-y-4">
                {data.issues.map((issue, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {issue.severity === 'critical' && <XCircle className="h-5 w-5 text-red-500" />}
                      {issue.severity === 'warning' && <AlertTriangle className="h-5 w-5 text-orange-500" />}
                      {issue.severity === 'info' && <CheckCircle className="h-5 w-5 text-blue-500" />}
                      <div>
                        <p className="font-medium">{issue.type}</p>
                        <p className="text-sm text-gray-600">{issue.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        issue.severity === 'critical' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {issue.count} pages
                      </span>
                      {issue.canAutoFix ? (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 flex items-center">
                          <Zap className="h-3 w-3 mr-1" />
                          Auto-fixable
                        </span>
                      ) : (
                        <button
                          onClick={() => getAIFixSuggestion(issue)}
                          className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 flex items-center"
                        >
                          <Search className="h-3 w-3 mr-1" />
                          Get AI Fix
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Real-time Activity</h3>
              <p className="text-gray-600 mb-4">
                Recent automated fixes and optimizations
              </p>
              <div className="space-y-3">
                {data.realtimeActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                    {activity.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />}
                    {activity.status === 'warning' && <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />}
                    {activity.status === 'error' && <XCircle className="h-4 w-4 text-red-500 mt-0.5" />}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-gray-600">{activity.page}</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Alert for no data */}
      {!data && !loading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                No technical SEO data available. Run a website audit to see automated fixes and optimizations.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}