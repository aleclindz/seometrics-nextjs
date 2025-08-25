'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

type AuthContextType = {
  user: (User & { token?: string }) | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string) => Promise<{ error: any, needsVerification?: boolean }>
  signOut: () => Promise<void>
  validateSession: () => Promise<void>
  resendVerificationEmail: (email: string) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<(User & { token?: string }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionTimeout, setSessionTimeout] = useState<NodeJS.Timeout | null>(null)
  const supabase = createClientComponentClient()

  // Clear session timeout on unmount
  useEffect(() => {
    return () => {
      if (sessionTimeout) {
        clearTimeout(sessionTimeout)
      }
    }
  }, [sessionTimeout])

  // Simple session validation function (no useCallback to avoid dependency issues)
  const validateSession = async () => {
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
        
        // Inline token fetching to avoid dependencies
        try {
          const { data: dbUser, error: tokenError } = await supabase
            .from('login_users')
            .select('token')
            .eq('auth_user_id', session.user.id)
            .single()

          if (!tokenError && dbUser?.token) {
            const userWithToken = { ...session.user, token: dbUser.token }
            setUser(userWithToken)
            
            // Reset session timeout
            if (sessionTimeout) {
              clearTimeout(sessionTimeout)
            }
            const timeout = setTimeout(() => {
              console.log('[AUTH] Session timeout - automatically signing out')
              setUser(null)
              supabase.auth.signOut()
            }, 30 * 60 * 1000)
            setSessionTimeout(timeout)
            
            console.log('[AUTH] User validated with token')
          } else {
            setUser(session.user)
          }
        } catch (tokenError) {
          setUser(session.user)
        }
      } else {
        console.log('[AUTH] No valid session found')
        setUser(null)
      }
    } catch (error) {
      console.error('[AUTH] Unexpected error in validateSession:', error)
      setUser(null)
    }
  }

  // Initial session check on mount - no reactive listeners
  useEffect(() => {
    let isMounted = true
    
    console.log('[AUTH] Initial session check starting')
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!isMounted) return // Component unmounted, don't update state
        
        if (error) {
          console.error('[AUTH] Initial session error:', error)
          setUser(null)
          setLoading(false)
          return
        }

        if (session?.user) {
          console.log('[AUTH] Initial session found, fetching token...')
          
          // Inline token fetching to avoid dependency issues
          try {
            const { data: dbUser, error: tokenError } = await supabase
              .from('login_users')
              .select('token')
              .eq('auth_user_id', session.user.id)
              .single()

            if (!isMounted) return // Component unmounted
            
            if (!tokenError && dbUser?.token) {
              const userWithToken = { ...session.user, token: dbUser.token }
              setUser(userWithToken)
              
              // Reset session timeout inline
              if (sessionTimeout) {
                clearTimeout(sessionTimeout)
              }
              const timeout = setTimeout(() => {
                console.log('[AUTH] Session timeout - automatically signing out')
                setUser(null)
                supabase.auth.signOut()
              }, 30 * 60 * 1000)
              setSessionTimeout(timeout)
              
              console.log('[AUTH] Initial user set with token')
            } else {
              setUser(session.user)
            }
          } catch (tokenError) {
            if (isMounted) {
              setUser(session.user)
            }
          }
        } else {
          console.log('[AUTH] No initial session found')
          setUser(null)
        }
        
        if (isMounted) {
          setLoading(false)
        }
      } catch (error) {
        console.error('[AUTH] Unexpected error in initial session check:', error)
        if (isMounted) {
          setUser(null)
          setLoading(false)
        }
      }
    }

    getInitialSession()
    
    // Set up periodic session validation (every 25 minutes)
    const periodicCheck = setInterval(async () => {
      if (!isMounted) return
      console.log('[AUTH] Periodic session validation check')
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!isMounted) return
        
        if (error || !session?.user) {
          setUser(null)
          return
        }

        // Simple token fetch for validation
        const { data: dbUser } = await supabase
          .from('login_users')
          .select('token')
          .eq('auth_user_id', session.user.id)
          .single()

        if (isMounted && dbUser?.token) {
          const userWithToken = { ...session.user, token: dbUser.token }
          setUser(userWithToken)
        }
      } catch (error) {
        console.error('[AUTH] Periodic validation error:', error)
      }
    }, 25 * 60 * 1000) // 25 minutes

    return () => {
      isMounted = false
      clearInterval(periodicCheck)
    }
  }, []) // Empty dependency array - only run once

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (!error && data.user) {
        // Inline token fetching to avoid dependencies
        try {
          const { data: dbUser, error: tokenError } = await supabase
            .from('login_users')
            .select('token')
            .eq('auth_user_id', data.user.id)
            .single()

          if (!tokenError && dbUser?.token) {
            const userWithToken = { ...data.user, token: dbUser.token }
            setUser(userWithToken)
          } else {
            setUser(data.user)
          }
          
          // Start session timeout
          if (sessionTimeout) {
            clearTimeout(sessionTimeout)
          }
          const timeout = setTimeout(() => {
            console.log('[AUTH] Session timeout - automatically signing out')
            setUser(null)
            supabase.auth.signOut()
          }, 30 * 60 * 1000)
          setSessionTimeout(timeout)
          
          console.log('[AUTH] Sign in successful')
        } catch (tokenError) {
          setUser(data.user)
        }
      }
      
      setLoading(false)
      return { error }
    } catch (err) {
      setLoading(false)
      return { error: err }
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/confirm-email`
        }
      })
      
      setLoading(false)
      
      if (error) {
        return { error }
      }

      // Check if user needs email verification
      const needsVerification = !data.user?.email_confirmed_at
      console.log('[AUTH] Signup successful, needs verification:', needsVerification)
      
      return { error: null, needsVerification }
    } catch (err) {
      setLoading(false)
      return { error: err }
    }
  }

  const resendVerificationEmail = async (email: string) => {
    try {
      const response = await fetch('/api/auth/confirm-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        return { error: new Error(data.error || 'Failed to resend verification email') }
      }

      return { error: null }
    } catch (error) {
      return { error }
    }
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
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, validateSession, resendVerificationEmail }}>
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