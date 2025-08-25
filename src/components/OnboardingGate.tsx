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
        console.log('[ONBOARDING GATE] Submitting survey data:', surveyData)
        
        const response = await fetch('/api/onboarding/survey', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userToken: user.token,
            websiteBuildingMethod: surveyData.websiteBuildingMethod,
            websiteBuildingMethodOther: surveyData.websiteBuildingMethodOther,
            usesCms: surveyData.usesCms,
            cmsType: surveyData.cmsType,
            cmsTypeOther: surveyData.cmsTypeOther,
            hostingProvider: surveyData.hostingProvider,
            hostingProviderOther: surveyData.hostingProviderOther,
            businessType: surveyData.businessType,
            websiteAge: surveyData.websiteAge,
            monthlyVisitors: surveyData.monthlyVisitors,
            seoExperience: surveyData.seoExperience,
            primarySeoGoal: surveyData.primarySeoGoal,
            interestedInFounderCall: surveyData.interestedInFounderCall,
            acceptedProOffer: surveyData.acceptedProOffer
          }),
        })

        if (response.ok) {
          const result = await response.json()
          console.log('[ONBOARDING GATE] Survey saved successfully:', result)
          markOnboardingComplete()
          
          // Handle Pro offer redirect
          if (result.proOffer) {
            console.log('[ONBOARDING GATE] Pro offer accepted, opening Calendly and dashboard')
            // Open Calendly in new tab
            window.open(result.proOffer.calendlyUrl, '_blank')
            // Navigate to dashboard in current tab
            router.push('/')
          } else {
            console.log('[ONBOARDING GATE] No Pro offer, redirecting to dashboard')
            // Redirect to dashboard
            router.push('/')
          }
        } else {
          const errorData = await response.json()
          console.error('[ONBOARDING GATE] Survey save failed:', response.status, errorData)
          throw new Error(errorData.error || 'Failed to save survey')
        }
      } catch (error) {
        console.error('[ONBOARDING GATE] Error saving survey:', error)
        throw error // Re-throw so the survey component can handle it
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