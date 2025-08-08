'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth';

export default function TestAgentPage() {
  const { user } = useAuth();
  const [websiteToken, setWebsiteToken] = useState('test-website-123');
  const [memoryType, setMemoryType] = useState('context');
  const [memoryKey, setMemoryKey] = useState('seo_focus');
  const [memoryData, setMemoryData] = useState('{"seo_focus": ["technical SEO", "content optimization"]}');
  const [results, setResults] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testStoreMemory = async () => {
    if (!user?.token) {
      setResults('Error: User not authenticated');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/agent/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken: user.token,
          websiteToken,
          memoryType,
          memoryKey,
          memoryData: JSON.parse(memoryData),
          confidenceScore: 0.9
        })
      });

      const result = await response.json();
      setResults(`Store Memory Result:\n${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      setResults(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testGetMemory = async () => {
    if (!user?.token) {
      setResults('Error: User not authenticated');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/agent/memory?userToken=${user.token}&websiteToken=${websiteToken}&memoryType=${memoryType}&memoryKey=${memoryKey}`
      );

      const result = await response.json();
      setResults(`Get Memory Result:\n${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      setResults(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testGetWebsiteContext = async () => {
    if (!user?.token) {
      setResults('Error: User not authenticated');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/agent/memory?userToken=${user.token}&websiteToken=${websiteToken}`
      );

      const result = await response.json();
      setResults(`Website Context Result:\n${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      setResults(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testAgentWithMemory = async () => {
    if (!user?.token) {
      setResults('Error: User not authenticated');
      return;
    }

    setLoading(true);
    try {
      // First, store some context
      await fetch('/api/agent/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken: user.token,
          websiteToken,
          memoryType: 'context',
          memoryKey: 'business_type',
          memoryData: { business_type: 'SaaS startup targeting small businesses' },
          confidenceScore: 0.9
        })
      });

      await fetch('/api/agent/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken: user.token,
          websiteToken,
          memoryType: 'preferences',
          memoryKey: 'content_style',
          memoryData: { content_style: 'Technical but accessible, 1500+ words' },
          confidenceScore: 0.9
        })
      });

      // Now test getting the full context
      const response = await fetch(
        `/api/agent/memory?userToken=${user.token}&websiteToken=${websiteToken}`
      );

      const result = await response.json();
      setResults(`Agent Context Test Result:\n${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      setResults(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600">Please log in to test the agent memory system.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Agent Memory System Test</h1>
          
          {/* Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website Token
              </label>
              <input
                type="text"
                value={websiteToken}
                onChange={(e) => setWebsiteToken(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Memory Type
              </label>
              <select
                value={memoryType}
                onChange={(e) => setMemoryType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="context">Context</option>
                <option value="patterns">Patterns</option>
                <option value="preferences">Preferences</option>
                <option value="insights">Insights</option>
                <option value="strategies">Strategies</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Memory Key
              </label>
              <input
                type="text"
                value={memoryKey}
                onChange={(e) => setMemoryKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Memory Data (JSON)
              </label>
              <textarea
                value={memoryData}
                onChange={(e) => setMemoryData(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* Test Buttons */}
          <div className="flex flex-wrap gap-4 mb-8">
            <button
              onClick={testStoreMemory}
              disabled={loading}
              className="px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Store Memory'}
            </button>
            
            <button
              onClick={testGetMemory}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Get Memory'}
            </button>
            
            <button
              onClick={testGetWebsiteContext}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Get Full Context'}
            </button>
            
            <button
              onClick={testAgentWithMemory}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Test Full Agent Context'}
            </button>
          </div>

          {/* Results */}
          {results && (
            <div className="bg-gray-100 rounded-md p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Results:</h3>
              <pre className="text-sm text-gray-700 overflow-auto">
                {results}
              </pre>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-lg font-medium text-blue-900 mb-2">Testing Instructions:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li><strong>Store Memory:</strong> Add some context data for the agent to remember</li>
              <li><strong>Get Memory:</strong> Retrieve specific memory by type and key</li>
              <li><strong>Get Full Context:</strong> See all context the agent has for this website</li>
              <li><strong>Test Full Agent Context:</strong> Simulate what the agent sees during conversations</li>
            </ol>
            
            <div className="mt-4">
              <h4 className="font-medium text-blue-900 mb-2">Sample Memory Data to Try:</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Business Type:</strong> <code>{`{"business_type": "E-commerce fashion retailer"}`}</code></p>
                <p><strong>SEO Focus:</strong> <code>{`{"seo_focus": ["product pages", "blog content", "local SEO"]}`}</code></p>
                <p><strong>Content Style:</strong> <code>{`{"content_style": "Casual and engaging, 800-1200 words"}`}</code></p>
                <p><strong>Target Audience:</strong> <code>{`{"target_audience": "Women 25-45, fashion-conscious"}`}</code></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}