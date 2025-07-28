'use client';

import { useAuth } from '@/contexts/auth';
import LandingPage from '@/components/LandingPage';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  console.log('[HOME DEBUG] Render state - loading:', loading, 'user:', user ? 'exists' : 'null');

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      console.log('[HOME DEBUG] Redirecting authenticated user to dashboard');
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  // Show loading state while checking authentication
  if (loading) {
    console.log('[HOME DEBUG] Showing loading state');
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-violet-600 rounded-lg flex items-center justify-center animate-pulse mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Loading...
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Checking authentication status...
          </p>
        </div>
      </div>
    );
  }

  // Show loading state while redirecting authenticated users
  if (user) {
    console.log('[HOME DEBUG] User authenticated, redirecting to dashboard...');
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-violet-600 rounded-lg flex items-center justify-center animate-pulse mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Redirecting to Dashboard...
          </h2>
        </div>
      </div>
    );
  }

  // Show landing page for visitors
  console.log('[HOME DEBUG] Showing landing page for unauthenticated user');
  return <LandingPage />;
}