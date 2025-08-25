'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth'
import { useRouter, useSearchParams } from 'next/navigation'
import OnboardingSurvey from '@/components/OnboardingSurvey'
import Image from 'next/image'
import { Suspense } from 'react'

function OnboardingContent() {
  const [surveyCompleted, setSurveyCompleted] = useState(false)
  const [proOfferDetails, setProOfferDetails] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    // Check if user arrived here from email verification
    const verified = searchParams.get('verified')
    const newUser = searchParams.get('new_user')
    
    if (verified === 'true') {
      console.log('[ONBOARDING] User verified email, showing onboarding')
    }
  }, [user, searchParams, router])

  const handleSurveyComplete = async (surveyData: any) => {
    if (!user?.token) {
      setError('User authentication error')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/onboarding/survey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save survey')
      }

      console.log('[ONBOARDING] Survey saved successfully')
      setSurveyCompleted(true)

      // If user accepted Pro offer, show the details
      if (result.proOffer) {
        setProOfferDetails(result.proOffer)
      } else {
        // No Pro offer, redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/')
        }, 3000)
      }

    } catch (err) {
      console.error('[ONBOARDING] Error saving survey:', err)
      setError(err instanceof Error ? err.message : 'Failed to save survey')
    } finally {
      setLoading(false)
    }
  }

  const handleSkipSurvey = () => {
    router.push('/')
  }

  const handleBookCall = () => {
    if (proOfferDetails?.calendlyUrl) {
      window.open(proOfferDetails.calendlyUrl, '_blank')
    }
    // Redirect to dashboard after booking
    setTimeout(() => {
      router.push('/')
    }, 1000)
  }

  const handleContinueToDashboard = () => {
    router.push('/')
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-pulse">
          <Image 
            src="/assets/agent_icon.png" 
            alt="SEOAgent" 
            width={64}
            height={64}
            style={{ height: '64px', width: '64px' }}
          />
        </div>
      </div>
    )
  }

  if (loading) {
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
          <p className="text-gray-600 dark:text-gray-400">Saving your responses...</p>
        </div>
      </div>
    )
  }

  if (surveyCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-lg flex items-center justify-center">
              <Image 
                src="/assets/agent_icon.png" 
                alt="SEOAgent" 
                width={64}
                height={64}
                style={{ height: '64px', width: '64px' }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow-lg sm:rounded-lg sm:px-10">
            {proOfferDetails ? (
              // Pro offer accepted - show Calendly booking
              <div className="text-center space-y-6">
                <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 text-2xl">🎉</span>
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Welcome to SEOAgent Pro!
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Your Pro account has been activated for 3 months.
                  </p>
                </div>

                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    Your redemption code:
                  </h3>
                  <code className="text-lg font-mono bg-white dark:bg-gray-700 px-3 py-1 rounded border text-indigo-600 dark:text-indigo-400">
                    {proOfferDetails.redemptionCode}
                  </code>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleBookCall}
                    className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    📅 Book Your 15-Minute Founder Call
                  </button>
                  
                  <button
                    onClick={handleContinueToDashboard}
                    className="w-full text-gray-600 dark:text-gray-400 py-2 px-4 text-sm hover:text-gray-900 dark:hover:text-gray-100"
                  >
                    Continue to Dashboard
                  </button>
                </div>

                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <p>Your Pro features are active immediately.</p>
                  <p>The founder call helps us make SEOAgent work better for you!</p>
                </div>
              </div>
            ) : (
              // Regular completion
              <div className="text-center space-y-6">
                <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 text-2xl">✅</span>
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Thank you for completing the survey!
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Your responses help us improve SEOAgent and provide better recommendations for your website.
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Redirecting you to the dashboard in a few seconds...
                  </p>
                </div>

                <button
                  onClick={handleContinueToDashboard}
                  className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  Continue to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow-lg sm:rounded-lg sm:px-10">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <span className="text-red-600 dark:text-red-400 text-2xl">⚠️</span>
              </div>
              
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Oops! Something went wrong
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {error}
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setError('')}
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  Try Again
                </button>
                
                <button
                  onClick={handleSkipSurvey}
                  className="w-full text-gray-600 dark:text-gray-400 py-2 px-4 text-sm hover:text-gray-900 dark:hover:text-gray-100"
                >
                  Skip Survey & Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <OnboardingSurvey
      onComplete={handleSurveyComplete}
      onSkip={handleSkipSurvey}
    />
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-pulse">
          <Image 
            src="/assets/agent_icon.png" 
            alt="SEOAgent" 
            width={64}
            height={64}
            style={{ height: '64px', width: '64px' }}
          />
        </div>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  )
}