'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface Project {
  id: string;
  name: string;
  framework: string;
}

interface IntegrationData {
  accessToken: string;
  teamId: string | null;
  userId: string;
  username: string;
  email: string;
  projects: Project[];
}

export default function VercelIntegrationPage() {
  const [integrationData, setIntegrationData] = useState<IntegrationData | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const data = searchParams.get('data');
    if (data) {
      try {
        const parsedData = JSON.parse(decodeURIComponent(data));
        setIntegrationData(parsedData);
        if (parsedData.projects.length === 1) {
          setSelectedProject(parsedData.projects[0].id);
        }
      } catch (err) {
        setError('Failed to parse integration data');
      }
    } else {
      setError('No integration data provided');
    }
    setLoading(false);
  }, [searchParams]);

  const handleInstall = async () => {
    if (!integrationData || !selectedProject) return;
    
    setInstalling(true);
    try {
      const selectedProjectData = integrationData.projects.find(p => p.id === selectedProject);
      const urlParams = new URLSearchParams(window.location.search);
      const passedDomain = urlParams.get('domain') || undefined;
      const passedWebsiteId = urlParams.get('websiteId') || undefined;
      
      const response = await fetch('/api/hosting/vercel/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken: urlParams.get('userToken'),
          accessToken: integrationData.accessToken,
          teamId: integrationData.teamId,
          projectId: selectedProject,
          projectName: selectedProjectData?.name,
          deploymentMethod: 'redirects',
          autoDeployment: false,
          // Forward optional context for precise hosting_status update
          domain: passedDomain,
          websiteId: passedWebsiteId
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        // Show success and close popup
        alert('✅ Vercel integration installed successfully!');
        
        // Close popup and redirect parent window
        if (window.opener) {
          window.opener.location.href = '/dashboard?vercel_integration=success';
          window.close();
        } else {
          // Fallback if not in popup
          window.location.href = '/dashboard?vercel_integration=success';
        }
      } else {
        setError(result.error || 'Installation failed');
      }
    } catch (err) {
      setError('Installation failed. Please try again.');
    }
    setInstalling(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up your Vercel integration...</p>
        </div>
      </div>
    );
  }

  if (error || !integrationData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Integration Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.close()}
            className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Install SEOAgent</h1>
          <p className="text-gray-600">Connected to {integrationData.email}</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Vercel Project
          </label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            disabled={installing}
          >
            <option value="">Choose a project...</option>
            {integrationData.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} {project.framework && `(${project.framework})`}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
          <h3 className="text-sm font-medium text-blue-900 mb-2">What will be configured:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Automatic sitemap generation and submission</li>
            <li>• Robots.txt optimization</li>
            <li>• SEO monitoring and alerts</li>
          </ul>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => window.close()}
            className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-md hover:bg-gray-300 disabled:opacity-50"
            disabled={installing}
          >
            Cancel
          </button>
          <button
            onClick={handleInstall}
            disabled={!selectedProject || installing}
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {installing ? 'Installing...' : 'Install Integration'}
          </button>
        </div>
      </div>
    </div>
  );
}
