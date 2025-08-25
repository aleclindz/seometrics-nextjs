'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth'

export function useOnboardingStatus() {
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user?.token) {
        setLoading(false)
        return
      }

      try {
        console.log('[ONBOARDING] Checking onboarding status for user:', user.token)
        
        const response = await fetch(`/api/onboarding/survey?userToken=${user.token}`)
        
        if (response.status === 404) {
          // No survey found - user needs onboarding
          console.log('[ONBOARDING] No survey found, user needs onboarding')
          setNeedsOnboarding(true)
        } else if (response.ok) {
          const data = await response.json()
          // Check if survey is completed
          const completed = data.survey?.survey_completed || false
          console.log('[ONBOARDING] Survey found, completed:', completed)
          setNeedsOnboarding(!completed)
        } else {
          console.error('[ONBOARDING] Error checking status:', response.status)
          // Default to showing onboarding on error (safer)
          setNeedsOnboarding(true)
        }
      } catch (error) {
        console.error('[ONBOARDING] Error checking onboarding status:', error)
        // Default to showing onboarding on error (safer)
        setNeedsOnboarding(true)
      } finally {
        setLoading(false)
      }
    }

    checkOnboardingStatus()
  }, [user?.token])

  const markOnboardingComplete = () => {
    setNeedsOnboarding(false)
  }

  return {
    needsOnboarding,
    loading,
    markOnboardingComplete
  }
}