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
  const [isProcessingAuth, setIsProcessingAuth] = useState(false) // Prevent simultaneous auth operations
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
        
        // Prevent unnecessary processing on token refresh events
        if (event === 'TOKEN_REFRESHED' && user && (user as any).token) {
          console.log('[AUTH DEBUG] Token refreshed - user already authenticated, skipping')
          return
        }
        
        // Prevent race conditions by checking if we're already processing
        if (event === 'SIGNED_IN' && user && (user as any).token) {
          console.log('[AUTH DEBUG] User already authenticated with token - skipping')
          return
        }
        
        // Skip processing if we're just getting the same session again
        if (session?.user?.id === user?.id && (user as any).token && !loading) {
          console.log('[AUTH DEBUG] Same user session with token, skipping reprocessing')
          return
        }
        
        // Also skip if we're getting repeated SIGNED_IN events for the same user
        if (event === 'SIGNED_IN' && session?.user?.id === user?.id && user) {
          console.log('[AUTH DEBUG] Repeated SIGNED_IN for same user, skipping')
          return
        }
        
        // Prevent simultaneous auth operations
        if (isProcessingAuth) {
          console.log('[AUTH DEBUG] Auth operation already in progress, skipping')
          return
        }
        
        try {
          if (session?.user) {
            console.log('[AUTH DEBUG] Setting loading to true for token fetch')
            setIsProcessingAuth(true)
            setLoading(true)
            
            // Add timeout to prevent hanging - reduced to 2 seconds
            const tokenPromise = fetchUserToken(session.user)
            const timeoutPromise = new Promise<User>((resolve) => {
              setTimeout(() => {
                console.log('[AUTH DEBUG] Token fetch timeout in auth state change')
                resolve(session.user)
              }, 2000) // Reduced from 5 seconds
            })
            
            const userWithToken = await Promise.race([tokenPromise, timeoutPromise])
            setUser(userWithToken)
            console.log('[AUTH DEBUG] User updated from auth state change with token:', (userWithToken as any).token ? 'yes' : 'no')
          } else {
            setUser(null)
            console.log('[AUTH DEBUG] User cleared from auth state change')
          }
          
          setLoading(false)
          setIsProcessingAuth(false)
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
          setIsProcessingAuth(false)
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