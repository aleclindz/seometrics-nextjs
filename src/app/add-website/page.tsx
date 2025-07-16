'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { createClientComponentClient } from '@/lib/supabase';

const languages = [
  { code: 'english', name: 'English' },
  { code: 'arabic', name: 'Arabic' },
  { code: 'bulgarian', name: 'Bulgarian' },
  { code: 'chinese', name: 'Chinese' },
  { code: 'czech', name: 'Czech' },
  { code: 'danish', name: 'Danish' },
  { code: 'dutch', name: 'Dutch' },
  { code: 'estonian', name: 'Estonian' },
  { code: 'finnish', name: 'Finnish' },
  { code: 'french', name: 'French' },
  { code: 'german', name: 'German' },
  { code: 'greek', name: 'Greek' },
  { code: 'hebrew', name: 'Hebrew' },
  { code: 'hindi', name: 'Hindi' },
  { code: 'hungarian', name: 'Hungarian' },
  { code: 'indonesian', name: 'Indonesian' },
  { code: 'italian', name: 'Italian' },
  { code: 'japanese', name: 'Japanese' },
  { code: 'korean', name: 'Korean' },
  { code: 'latvian', name: 'Latvian' },
  { code: 'lithuanian', name: 'Lithuanian' },
  { code: 'norwegian', name: 'Norwegian' },
  { code: 'polish', name: 'Polish' },
  { code: 'portuguese', name: 'Portuguese' },
  { code: 'romanian', name: 'Romanian' },
  { code: 'russian', name: 'Russian' },
  { code: 'slovak', name: 'Slovak' },
  { code: 'slovenian', name: 'Slovenian' },
  { code: 'spanish', name: 'Spanish' },
  { code: 'swedish', name: 'Swedish' },
  { code: 'turkish', name: 'Turkish' },
  { code: 'ukrainian', name: 'Ukrainian' }
];

export default function AddWebsite() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [formData, setFormData] = useState({
    domain: '',
    language: 'english',
    enableMetaTags: true,
    enableImageTags: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();
  const supabase = createClientComponentClient();

  const validateDomain = (domain: string) => {
    const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    return domainPattern.test(domain);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate domain
      if (!validateDomain(formData.domain)) {
        setError('Please enter a valid domain name (e.g., example.com)');
        setLoading(false);
        return;
      }

      // Get session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Please log in to add a website');
        setLoading(false);
        return;
      }

      // Call Edge Function to create website
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/websites`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain: formData.domain,
          language: formData.language,
          enableMetaTags: formData.enableMetaTags,
          enableImageTags: formData.enableImageTags,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to add website');
        setLoading(false);
        return;
      }

      // Redirect to dashboard
      router.push('/');
    } catch (err) {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
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
                  <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Add Website</h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Add a new website to start generating AI-powered SEO content
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
                  <div className="px-6 py-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                      
                      {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <label htmlFor="domain" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Domain Name
                        </label>
                        <input
                          type="text"
                          id="domain"
                          value={formData.domain}
                          onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          placeholder="example.com"
                          required
                        />
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Enter your domain without http:// or https://
                        </p>
                      </div>

                      <div>
                        <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Language
                        </label>
                        <select
                          id="language"
                          value={formData.language}
                          onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        >
                          {languages.map((lang) => (
                            <option key={lang.code} value={lang.code}>
                              {lang.name}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Select the primary language for your website content
                        </p>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">SEO Features</h3>
                        
                        <div className="flex items-center">
                          <input
                            id="enableMetaTags"
                            type="checkbox"
                            checked={formData.enableMetaTags}
                            onChange={(e) => setFormData({ ...formData, enableMetaTags: e.target.checked })}
                            className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                          />
                          <label htmlFor="enableMetaTags" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                            Enable AI Meta Tags
                          </label>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 ml-6">
                          Automatically generate meta titles and descriptions for your pages
                        </p>

                        <div className="flex items-center">
                          <input
                            id="enableImageTags"
                            type="checkbox"
                            checked={formData.enableImageTags}
                            onChange={(e) => setFormData({ ...formData, enableImageTags: e.target.checked })}
                            className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                          />
                          <label htmlFor="enableImageTags" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                            Enable AI Image Alt-Tags
                          </label>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 ml-6">
                          Automatically generate descriptive alt-text for your images
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-6">
                        <button
                          type="button"
                          onClick={() => router.push('/')}
                          className="btn border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="btn bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Adding...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              Add Website
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}