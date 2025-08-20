'use client';

import { useAuth } from '@/contexts/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect after auth is loaded and user is authenticated
    if (!loading && user) {
      console.log('[AUTH REDIRECT] Redirecting authenticated user to dashboard');
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  // This component doesn't render anything - it just handles redirects
  return null;
}