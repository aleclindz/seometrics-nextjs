'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth'
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus'
import OnboardingSurvey from '@/components/OnboardingSurvey'
import Image from 'next/image'

interface OnboardingGateProps {
  children: React.ReactNode
}

export default function OnboardingGate({ children }: OnboardingGateProps) {
  const { user, loading: authLoading } = useAuth()
  const { needsOnboarding, loading: onboardingLoading, markOnboardingComplete } = useOnboardingStatus()
  const router = useRouter()
  const pathname = usePathname()

  // Don't interfere with auth-related pages or API routes
  const isExcludedPath = pathname === '/login' || 
                        pathname === '/onboarding' || 
                        pathname.startsWith('/api/') ||
                        pathname === '/privacy' ||
                        pathname === '/terms'

  useEffect(() => {
    // Only redirect if user is authenticated, doesn't need onboarding check to complete,
    // and we're not already on an excluded path
    if (!authLoading && !onboardingLoading && user && needsOnboarding && !isExcludedPath) {
      console.log('[ONBOARDING GATE] User needs onboarding, redirecting...')
      router.push('/onboarding')
    }
  }, [user, needsOnboarding, authLoading, onboardingLoading, isExcludedPath, router])

  // Show loading state while checking auth and onboarding status
  if (authLoading || onboardingLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse mb-4">
            <Image 
              src="/assets/agent_icon.png" 
              alt="SEOAgent" 
              width={64}
              height={64}
              style={{ height: '64px', width: '64px' }}
            />
          </div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // If user needs onboarding and we're on the onboarding page, show the survey
  if (pathname === '/onboarding' && user && needsOnboarding) {
    const handleSurveyComplete = async (surveyData: any) => {
      if (!user?.token) return

      try {
        const response = await fetch('/api/onboarding/survey', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userToken: user.token,
            ...surveyData
          }),
        })

        if (response.ok) {
          const result = await response.json()
          markOnboardingComplete()
          
          // Handle Pro offer redirect
          if (result.proOffer) {
            // Show success page with Calendly link
            window.location.href = result.proOffer.calendlyUrl
          } else {
            // Redirect to dashboard
            router.push('/')
          }
        } else {
          throw new Error('Failed to save survey')
        }
      } catch (error) {
        console.error('[ONBOARDING GATE] Error saving survey:', error)
      }
    }

    return (
      <OnboardingSurvey
        onComplete={handleSurveyComplete}
        mandatory={true}
        // No onSkip prop - survey is mandatory
      />
    )
  }

  // Show children for all other cases
  return <>{children}</>
}