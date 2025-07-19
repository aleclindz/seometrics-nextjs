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

  const fetchUserToken = async (authUser: User) => {
    try {
      console.log('[AUTH DEBUG] Fetching token for user:', authUser.email)
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Token fetch timeout')), 5000) // 5 second timeout
      })
      
      const fetchPromise = supabase
        .from('login_users')
        .select('token')
        .eq('email', authUser.email)
        .single()
      
      const { data: dbUser, error } = await Promise.race([fetchPromise, timeoutPromise]) as any
      
      if (error) {
        console.error('[AUTH DEBUG] Database error fetching token:', error)
        // Return user without token if DB fetch fails
        console.log('[AUTH DEBUG] Continuing without token due to error')
        return authUser
      }
      
      console.log('[AUTH DEBUG] Token fetch result:', dbUser?.token ? 'Found' : 'Not found')
      return { ...authUser, token: dbUser?.token }
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
        
        try {
          if (session?.user) {
            console.log('[AUTH DEBUG] Setting loading to true for token fetch')
            setLoading(true)
            
            const userWithToken = await fetchUserToken(session.user)
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