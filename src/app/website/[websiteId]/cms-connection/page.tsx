'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

/**
 * DEPRECATED: CMS Connection Page
 * 
 * This page has been deprecated. CMS connections are now handled
 * entirely within the website setup modal for a better user experience.
 * 
 * This page now redirects users to the main website page where they
 * can access CMS connections through the modal interface.
 */
export default function WebsiteCMSConnection() {
  const router = useRouter();
  const params = useParams();
  const websiteId = params.websiteId as string;

  useEffect(() => {
    // Redirect to website page with a message about the new modal interface
    const timer = setTimeout(() => {
      router.push(`/website/${websiteId}?cms_setup=true`);
    }, 3000);

    return () => clearTimeout(timer);
  }, [router, websiteId]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Page Moved
        </h1>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          CMS connections are now handled through an improved modal interface. You&apos;ll be redirected to the new location in a moment.
        </p>
        
        <div className="space-y-3">
          <button
            onClick={() => router.push(`/website/${websiteId}`)}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Go to Website Page
          </button>
          
          <p className="text-xs text-gray-500 dark:text-gray-400">
            From the website page, click &ldquo;Setup &amp; Connections&rdquo; to access CMS integration
          </p>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600 mx-auto"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Redirecting automatically...
          </p>
        </div>
      </div>
    </div>
  );
}