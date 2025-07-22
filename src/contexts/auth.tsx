'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

type AuthContextType = {
  user: (User & { token?: string }) | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<(User & { token?: string }) | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  // Failsafe timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('[AUTH DEBUG] Failsafe timeout triggered after 15s - forcing loading to false')
        setLoading(false)
      }
    }, 15000) // 15 second timeout

    return () => clearTimeout(timeout)
  }, [loading])

  // Prevent auth context from getting stuck on page navigation
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && loading) {
        console.log('[AUTH DEBUG] Page became visible while loading - checking auth state')
        // Small delay to let any pending auth operations complete
        setTimeout(() => {
          if (loading) {
            console.log('[AUTH DEBUG] Still loading after visibility change - forcing refresh')
            setLoading(false)
          }
        }, 1000)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [loading])

  const fetchUserToken = async (authUser: User) => {
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

      // Fallback: Use API endpoint with service role
      console.log('[AUTH DEBUG] Trying API endpoint fallback...')
      const response = await fetch(`/api/auth/get-token?authUserId=${authUser.id}`)
      
      if (response.ok) {
        const apiResult = await response.json()
        console.log('[AUTH DEBUG] API endpoint successful!')
        return { ...authUser, token: apiResult.token }
      }
      
      console.log('[AUTH DEBUG] API endpoint also failed, status:', response.status)
      const errorText = await response.text()
      console.log('[AUTH DEBUG] API error response:', errorText)
      
      // Both methods failed - return user without token
      console.log('[AUTH DEBUG] Both direct query and API endpoint failed')
      return authUser
    } catch (error) {
      console.error('[AUTH DEBUG] Error fetching user token:', error)
      console.log('[AUTH DEBUG] Continuing without token due to timeout/error')
      // Return user without token - they're still authenticated
      return authUser
    }
  }

  useEffect(() => {
    console.log('[AUTH DEBUG] AuthProvider useEffect starting')
    const getSession = async () => {
      try {
        console.log('[AUTH DEBUG] Getting initial session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('[AUTH DEBUG] Session error:', error)
          setUser(null)
          setLoading(false)
          return
        }

        if (session?.user) {
          console.log('[AUTH DEBUG] Session found, fetching token...')
          const userWithToken = await fetchUserToken(session.user)
          setUser(userWithToken)
          console.log('[AUTH DEBUG] User set with token')
        } else {
          console.log('[AUTH DEBUG] No session found')
          setUser(null)
        }
        setLoading(false)
        console.log('[AUTH DEBUG] Loading set to false')
      } catch (error) {
        console.error('[AUTH DEBUG] Unexpected error in getSession:', error)
        setUser(null)
        setLoading(false)
      }
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AUTH DEBUG] Auth state change:', event, session ? 'session exists' : 'no session')
        
        // Prevent race conditions by checking if we're already processing
        if (event === 'SIGNED_IN' && user && (user as any).token) {
          console.log('[AUTH DEBUG] User already authenticated with token - skipping')
          return
        }
        
        try {
          if (session?.user) {
            console.log('[AUTH DEBUG] Setting loading to true for token fetch')
            setLoading(true)
            
            // Add timeout to prevent hanging
            const tokenPromise = fetchUserToken(session.user)
            const timeoutPromise = new Promise<User>((resolve) => {
              setTimeout(() => {
                console.log('[AUTH DEBUG] Token fetch timeout in auth state change')
                resolve(session.user)
              }, 5000)
            })
            
            const userWithToken = await Promise.race([tokenPromise, timeoutPromise])
            setUser(userWithToken)
            console.log('[AUTH DEBUG] User updated from auth state change with token:', (userWithToken as any).token ? 'yes' : 'no')
          } else {
            setUser(null)
            console.log('[AUTH DEBUG] User cleared from auth state change')
          }
          
          setLoading(false)
          console.log('[AUTH DEBUG] Loading set to false from auth state change')
        } catch (error) {
          console.error('[AUTH DEBUG] Error in auth state change handler:', error)
          // Still set the user if we have session, just without token
          if (session?.user) {
            setUser(session.user)
            console.log('[AUTH DEBUG] Set user without token due to error')
          } else {
            setUser(null)
          }
          setLoading(false)
        }
      }
    )

    return () => {
      console.log('[AUTH DEBUG] Cleaning up auth subscription')
      subscription.unsubscribe()
    }
  }, [supabase])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
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