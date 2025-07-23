'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

type AuthContextType = {
  user: (User & { token?: string }) | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  validateSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<(User & { token?: string }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionTimeout, setSessionTimeout] = useState<NodeJS.Timeout | null>(null)
  const supabase = createClientComponentClient()

  // Session timeout management (30 minutes)
  const resetSessionTimeout = useCallback(() => {
    if (sessionTimeout) {
      clearTimeout(sessionTimeout)
    }
    
    const timeout = setTimeout(() => {
      console.log('[AUTH] Session timeout - automatically signing out')
      // Don't call signOut directly to avoid dependency issues
      setUser(null)
      supabase.auth.signOut()
    }, 30 * 60 * 1000) // 30 minutes
    
    setSessionTimeout(timeout)
  }, [sessionTimeout, supabase.auth])

  // Clear session timeout on unmount
  useEffect(() => {
    return () => {
      if (sessionTimeout) {
        clearTimeout(sessionTimeout)
      }
    }
  }, [sessionTimeout])


  const fetchUserToken = useCallback(async (authUser: User) => {
    try {
      console.log('[AUTH DEBUG] Fetching token for user:', authUser.email, 'ID:', authUser.id)
      
      // First try direct database query (should work with proper RLS)
      console.log('[AUTH DEBUG] Trying direct database query first...')
      try {
        const { data: dbUser, error } = await supabase
          .from('login_users')
          .select('token')
          .eq('auth_user_id', authUser.id)
          .single()

        if (!error && dbUser?.token) {
          console.log('[AUTH DEBUG] Direct query successful!')
          return { ...authUser, token: dbUser.token }
        }
        
        console.log('[AUTH DEBUG] Direct query failed or no token:', error)
      } catch (directError) {
        console.log('[AUTH DEBUG] Direct query exception:', directError)
      }

      // Fallback: Use API endpoint with service role (with timeout)
      console.log('[AUTH DEBUG] Trying API endpoint fallback...')
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 1500) // 1.5 second timeout
      
      try {
        const response = await fetch(`/api/auth/get-token?authUserId=${authUser.id}`, {
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        
        if (response.ok) {
          const apiResult = await response.json()
          console.log('[AUTH DEBUG] API endpoint successful!')
          return { ...authUser, token: apiResult.token }
        } else {
          console.log('[AUTH DEBUG] API endpoint failed, status:', response.status)
          const errorText = await response.text()
          console.log('[AUTH DEBUG] API error response:', errorText)
        }
      } catch (error: any) {
        clearTimeout(timeoutId)
        if (error.name === 'AbortError') {
          console.log('[AUTH DEBUG] API endpoint timeout after 1.5s')
        } else {
          console.log('[AUTH DEBUG] API endpoint error:', error)
        }
      }
      
      // Both methods failed - return user without token
      console.log('[AUTH DEBUG] Both direct query and API endpoint failed')
      return authUser
    } catch (error) {
      console.error('[AUTH DEBUG] Error fetching user token:', error)
      console.log('[AUTH DEBUG] Continuing without token due to timeout/error')
      // Return user without token - they're still authenticated
      return authUser
    }
  }, [supabase])

  // Static session validation - no reactive auth state changes
  const validateSession = useCallback(async () => {
    try {
      console.log('[AUTH] Validating session...')
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('[AUTH] Session error:', error)
        setUser(null)
        return
      }

      if (session?.user) {
        console.log('[AUTH] Valid session found, fetching token...')
        const userWithToken = await fetchUserToken(session.user)
        setUser(userWithToken)
        resetSessionTimeout() // Reset the 30-minute timeout
        console.log('[AUTH] User validated with token')
      } else {
        console.log('[AUTH] No valid session found')
        setUser(null)
      }
    } catch (error) {
      console.error('[AUTH] Unexpected error in validateSession:', error)
      setUser(null)
    }
  }, [fetchUserToken, resetSessionTimeout, supabase.auth])

  // Initial session check on mount - no reactive listeners
  useEffect(() => {
    console.log('[AUTH] Initial session check starting')
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('[AUTH] Initial session error:', error)
          setUser(null)
          setLoading(false)
          return
        }

        if (session?.user) {
          console.log('[AUTH] Initial session found, fetching token...')
          const userWithToken = await fetchUserToken(session.user)
          setUser(userWithToken)
          resetSessionTimeout() // Start the 30-minute timeout
          console.log('[AUTH] Initial user set with token')
        } else {
          console.log('[AUTH] No initial session found')
          setUser(null)
        }
        setLoading(false)
      } catch (error) {
        console.error('[AUTH] Unexpected error in initial session check:', error)
        setUser(null)
        setLoading(false)
      }
    }

    getInitialSession()
    
    // Set up periodic session validation (every 25 minutes to stay ahead of 30-minute timeout)
    const periodicCheck = setInterval(() => {
      console.log('[AUTH] Periodic session validation check')
      validateSession()
    }, 25 * 60 * 1000) // 25 minutes

    return () => {
      clearInterval(periodicCheck)
    }
  }, [fetchUserToken, resetSessionTimeout, supabase.auth, validateSession])

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (!error && data.user) {
        // Immediately fetch user token and update state
        const userWithToken = await fetchUserToken(data.user)
        setUser(userWithToken)
        resetSessionTimeout() // Start session timeout
        console.log('[AUTH] Sign in successful')
      }
      
      setLoading(false)
      return { error }
    } catch (err) {
      setLoading(false)
      return { error: err }
    }
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { error }
  }

  const signOut = async () => {
    try {
      // Clear session timeout
      if (sessionTimeout) {
        clearTimeout(sessionTimeout)
        setSessionTimeout(null)
      }
      
      // Clear user state immediately
      setUser(null)
      
      // Sign out from Supabase
      await supabase.auth.signOut()
      console.log('[AUTH] Sign out successful')
    } catch (error) {
      console.error('[AUTH] Sign out error:', error)
      // Still clear user state even if signOut fails
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, validateSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}