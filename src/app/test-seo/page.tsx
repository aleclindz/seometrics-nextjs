'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';

interface TestResult {
  type: string;
  success: boolean;
  timestamp: string;
  data: any;
}

interface SEOIssue {
  type: string;
  url: string;
  issue: string;
  severity: 'high' | 'medium' | 'low';
  details: string;
  action?: string;
}

interface StatusReport {
  lastUpdated: string;
  overallHealth: {
    score: number;
    grade: string;
    issues: string[];
    breakdown: {
      indexing: number;
      sitemap: number;
      robots: number;
      schema: number;
    };
  };
  issueSummary: {
    critical: number;
    warnings: number;
    total: number;
    details: Array<{
      type: string;
      category: string;
      title: string;
      description: string;
      impact: string;
      fixable: boolean;
    }>;
  };
  recommendedActions: Array<{
    priority: number;
    action: string;
    title: string;
    description: string;
    estimatedImpact: string;
  }>;
}

export default function SEOTestDashboard() {
  const { user } = useAuth();
  const [testSite, setTestSite] = useState('https://techstartup.com');
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [currentIssues, setCurrentIssues] = useState<SEOIssue[]>([]);
  const [agentAnalysis, setAgentAnalysis] = useState<any>(null);
  const [statusReport, setStatusReport] = useState<StatusReport | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const testScenarios = [
    { id: 'gsc_indexing_issues', name: 'GSC Indexing Issues', description: 'Pages blocked, 404s, server errors' },
    { id: 'missing_sitemaps', name: 'Missing Sitemaps', description: 'No XML sitemap in GSC' },
    { id: 'robots_issues', name: 'Robots.txt Issues', description: 'Missing or misconfigured robots.txt' },
    { id: 'schema_missing', name: 'Missing Schema', description: 'Pages lacking structured data' },
    { id: 'mobile_issues', name: 'Mobile Issues', description: 'Mobile usability problems' },
    { id: 'all_issues', name: 'All Issues', description: 'Generate comprehensive test data' }
  ];

  const fixActions = [
    { id: 'generate_and_submit_sitemap', name: 'Generate Sitemap', description: 'Create and submit XML sitemap' },
    { id: 'generate_robots_txt', name: 'Generate Robots.txt', description: 'Create optimized robots.txt' },
    { id: 'generate_schema_markup', name: 'Add Schema Markup', description: 'Generate structured data' },
    { id: 'fix_indexing_issue', name: 'Fix Indexing', description: 'Resolve indexing problems' },
    { id: 'all_fixes', name: 'All Fixes', description: 'Apply all available fixes' }
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh && user?.token) {
      interval = setInterval(() => {
        fetchStatusReport();
      }, 10000); // Refresh every 10 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, user?.token, testSite]);

  const fetchStatusReport = async () => {
    if (!user?.token) return;

    try {
      const response = await fetch(`/api/test-seo/status-tracking?userToken=${user.token}&siteUrl=${encodeURIComponent(testSite)}`);
      const result = await response.json();
      
      if (result.success) {
        setStatusReport(result);
      }
    } catch (error) {
      console.error('Status tracking error:', error);
    }
  };

  const runTestScenario = async (scenarioId: string) => {
    if (!user?.token) return;

    setLoading(true);
    try {
      const response = await fetch('/api/test-seo/generate-test-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken: user.token,
          siteUrl: testSite,
          testScenario: scenarioId
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setCurrentIssues(result.details);
        setTestResults(prev => [{
          type: 'test-data-generation',
          success: true,
          timestamp: new Date().toISOString(),
          data: result
        }, ...prev]);
      }
    } catch (error) {
      console.error('Test scenario error:', error);
    } finally {
      setLoading(false);
    }
  };

  const runAgentAnalysis = async () => {
    if (!user?.token) return;

    setLoading(true);
    try {
      const response = await fetch('/api/test-seo/agent-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken: user.token,
          siteUrl: testSite,
          testPrompt: "Analyze my website's technical SEO issues and provide detailed explanations."
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setAgentAnalysis(result);
        setTestResults(prev => [{
          type: 'agent-analysis',
          success: true,
          timestamp: new Date().toISOString(),
          data: result
        }, ...prev]);
      }
    } catch (error) {
      console.error('Agent analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  const runAutomatedFix = async (fixAction: string) => {
    if (!user?.token) return;

    setLoading(true);
    try {
      const response = await fetch('/api/test-seo/automated-fixes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken: user.token,
          siteUrl: testSite,
          fixAction
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setTestResults(prev => [{
          type: 'automated-fix',
          success: result.success,
          timestamp: new Date().toISOString(),
          data: result
        }, ...prev]);

        // Refresh issues and status after fix
        setTimeout(() => {
          runAgentAnalysis();
          fetchStatusReport();
        }, 1000);
      }
    } catch (error) {
      console.error('Automated fix error:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearTestData = () => {
    setTestResults([]);
    setCurrentIssues([]);
    setAgentAnalysis(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access the SEO testing dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Technical SEO Testing Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Validate AI agent issue detection, explanations, and automated fixes in real-time.
          </p>
        </div>

        {/* Test Site Input */}
        <div className="mb-6 bg-white p-6 rounded-lg shadow">
          <div className="flex items-center space-x-4">
            <label htmlFor="testSite" className="text-sm font-medium text-gray-700">
              Test Website URL:
            </label>
            <input
              id="testSite"
              type="url"
              value={testSite}
              onChange={(e) => setTestSite(e.target.value)}
              className="flex-1 max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="https://example.com"
            />
            <button
              onClick={fetchStatusReport}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Get Status
            </button>
            <button
              onClick={clearTestData}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Clear Data
            </button>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Auto-refresh</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Test Scenarios */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Generate Test Data</h2>
            <p className="text-sm text-gray-600 mb-4">
              Create various technical SEO issues to test detection and fixes.
            </p>
            <div className="space-y-2">
              {testScenarios.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => runTestScenario(scenario.id)}
                  disabled={loading}
                  className="w-full text-left px-3 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  <div className="font-medium">{scenario.name}</div>
                  <div className="text-xs text-gray-500">{scenario.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Agent Analysis */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. AI Agent Analysis</h2>
            <p className="text-sm text-gray-600 mb-4">
              Test the agent&apos;s ability to detect and explain SEO issues.
            </p>
            <button
              onClick={runAgentAnalysis}
              disabled={loading}
              className="w-full px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 disabled:opacity-50 mb-4"
            >
              {loading ? 'Analyzing...' : 'Run Agent Analysis'}
            </button>

            {agentAnalysis && (
              <div className="mt-4 p-4 bg-gray-50 rounded-md">
                <div className="text-sm">
                  <div className="font-medium">Test Results:</div>
                  <div>Grade: <span className="font-bold text-lg">{agentAnalysis.testResults.overallGrade}</span></div>
                  <div>Accuracy: {agentAnalysis.testResults.accuracy}%</div>
                  <div>Detected: {agentAnalysis.testResults.detectedIssues}</div>
                  <div>Missed: {agentAnalysis.testResults.missedIssues}</div>
                </div>
              </div>
            )}
          </div>

          {/* Automated Fixes */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Automated Fixes</h2>
            <p className="text-sm text-gray-600 mb-4">
              Test automated fix capabilities with real-time status tracking.
            </p>
            <div className="space-y-2">
              {fixActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => runAutomatedFix(action.id)}
                  disabled={loading}
                  className="w-full text-left px-3 py-2 text-sm border border-gray-200 rounded hover:bg-green-50 hover:border-green-300 disabled:opacity-50"
                >
                  <div className="font-medium">{action.name}</div>
                  <div className="text-xs text-gray-500">{action.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Real-time Status Report */}
        {statusReport && (
          <div className="mt-8 bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Real-time SEO Health Status</h2>
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {new Date(statusReport.lastUpdated).toLocaleString()}
                {autoRefresh && <span className="ml-2 text-green-600">● Auto-refreshing</span>}
              </p>
            </div>
            <div className="p-6">
              {/* Overall Health Score */}
              <div className="mb-6 text-center">
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full text-3xl font-bold ${
                  statusReport.overallHealth.grade === 'A' ? 'bg-green-100 text-green-800' :
                  statusReport.overallHealth.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                  statusReport.overallHealth.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {statusReport.overallHealth.grade}
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  SEO Health Score: {statusReport.overallHealth.score}/100
                </div>
              </div>

              {/* Health Breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {Object.entries(statusReport.overallHealth.breakdown).map(([category, score]) => (
                  <div key={category} className="text-center">
                    <div className={`w-full bg-gray-200 rounded-full h-2 mb-2`}>
                      <div 
                        className={`h-2 rounded-full ${
                          score >= 90 ? 'bg-green-500' :
                          score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(100, score)}%` }}
                      ></div>
                    </div>
                    <div className="text-sm font-medium capitalize">{category}</div>
                    <div className="text-xs text-gray-500">{score}%</div>
                  </div>
                ))}
              </div>

              {/* Issues Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="text-red-800 font-bold text-2xl">{statusReport.issueSummary.critical}</div>
                  <div className="text-red-600 text-sm">Critical Issues</div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="text-yellow-800 font-bold text-2xl">{statusReport.issueSummary.warnings}</div>
                  <div className="text-yellow-600 text-sm">Warnings</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                  <div className="text-gray-800 font-bold text-2xl">{statusReport.issueSummary.total}</div>
                  <div className="text-gray-600 text-sm">Total Issues</div>
                </div>
              </div>

              {/* Recommended Actions */}
              {statusReport.recommendedActions.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Recommended Actions</h3>
                  <div className="space-y-3">
                    {statusReport.recommendedActions.slice(0, 5).map((action, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-md">
                        <div className="flex-1">
                          <div className="font-medium">{action.title}</div>
                          <div className="text-sm text-gray-600">{action.description}</div>
                        </div>
                        <div className="ml-4 flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            action.estimatedImpact === 'high' ? 'bg-red-100 text-red-800' :
                            action.estimatedImpact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {action.estimatedImpact} impact
                          </span>
                          <button
                            onClick={() => runAutomatedFix(action.action)}
                            disabled={loading}
                            className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                          >
                            Fix Now
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Current Issues */}
        {currentIssues.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Current SEO Issues</h2>
            </div>
            <div className="p-6">
              <div className="grid gap-4">
                {currentIssues.map((issue, index) => (
                  <div key={index} className={`p-4 rounded-md border-l-4 ${
                    issue.severity === 'high' ? 'bg-red-50 border-red-400' :
                    issue.severity === 'medium' ? 'bg-yellow-50 border-yellow-400' :
                    'bg-blue-50 border-blue-400'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{issue.issue}</h3>
                        <p className="text-sm text-gray-600 mt-1">{issue.details}</p>
                        <p className="text-xs text-gray-500 mt-1">URL: {issue.url}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          issue.severity === 'high' ? 'bg-red-100 text-red-800' :
                          issue.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {issue.severity}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Agent Analysis Results */}
        {agentAnalysis && (
          <div className="mt-8 bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">AI Agent Analysis</h2>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 p-4 rounded-md">
                <pre className="text-sm whitespace-pre-wrap text-gray-800">
                  {agentAnalysis.agentResponse}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Test Results Log */}
        {testResults.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Test Results Log</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {testResults.map((result, index) => (
                  <div key={index} className="p-4 border rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium capitalize">{result.type.replace('-', ' ')}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(result.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Running tests...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}