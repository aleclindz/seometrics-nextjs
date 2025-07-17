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

  const fetchUserToken = async (authUser: User) => {
    try {
      const { data: dbUser } = await supabase
        .from('login_users')
        .select('token')
        .eq('email', authUser.email)
        .single()
      
      return { ...authUser, token: dbUser?.token }
    } catch (error) {
      console.error('Error fetching user token:', error)
      return authUser
    }
  }

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const userWithToken = await fetchUserToken(session.user)
        setUser(userWithToken)
      } else {
        setUser(null)
      }
      setLoading(false)
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const userWithToken = await fetchUserToken(session.user)
          setUser(userWithToken)
        } else {
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
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