'use client';

import { useAuth } from '@/contexts/auth';
import Dashboard from '@/components/Dashboard';
import LandingPage from '@/components/LandingPage';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function Home() {
  const { user, loading } = useAuth();

  console.log('[HOME DEBUG] Render state - loading:', loading, 'user:', user ? 'exists' : 'null');

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

  // Show dashboard for authenticated users
  if (user) {
    console.log('[HOME DEBUG] Showing dashboard for authenticated user');
    return (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    );
  }

  // Show landing page for visitors
  console.log('[HOME DEBUG] Showing landing page for unauthenticated user');
  return <LandingPage />;
}