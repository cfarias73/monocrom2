import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export interface UserProfile {
  id: string
  email: string
  plan: 'free' | 'beta' | 'pro' | 'enterprise'
  is_authorized: boolean
  created_at?: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  isBypassed: boolean
  sendMagicLink: (email: string) => Promise<{ error: Error | null }>
  verifyOtp: (email: string, token: string) => Promise<{ error: Error | null }>
  signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>
  signUpWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  setBypassed: (bypassed: boolean) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const OFFLINE_BYPASS_KEY = 'monocrom_offline_dev_bypass'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isBypassed, setIsBypassed] = useState<boolean>(() => {
    return localStorage.getItem(OFFLINE_BYPASS_KEY) === 'true'
  })

  useEffect(() => {
    // 1. Check current active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadUserProfile(session.user)
      }
      setLoading(false)
    })

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadUserProfile(session.user)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const loadUserProfile = async (currentUser: User) => {
    try {
      // Try to query profiles table if it exists
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single()

      if (data && !error) {
        setProfile({
          id: data.id,
          email: data.email || currentUser.email || '',
          plan: data.plan || 'beta',
          is_authorized: data.is_authorized !== false,
          created_at: data.created_at,
        })
      } else {
        // Default profile for verified beta users
        setProfile({
          id: currentUser.id,
          email: currentUser.email || '',
          plan: 'beta',
          is_authorized: true,
        })
      }
    } catch {
      setProfile({
        id: currentUser.id,
        email: currentUser.email || '',
        plan: 'beta',
        is_authorized: true,
      })
    }
  }

  const sendMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })
    return { error }
  }

  const verifyOtp = async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })
    if (data.session) {
      setSession(data.session)
      setUser(data.user)
    }
    return { error }
  }

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUpWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setProfile(null)
    localStorage.removeItem(OFFLINE_BYPASS_KEY)
    setIsBypassed(false)
  }

  const setBypassed = (bypassed: boolean) => {
    setIsBypassed(bypassed)
    if (bypassed) {
      localStorage.setItem(OFFLINE_BYPASS_KEY, 'true')
    } else {
      localStorage.removeItem(OFFLINE_BYPASS_KEY)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isBypassed,
        sendMagicLink,
        verifyOtp,
        signInWithPassword,
        signUpWithPassword,
        signOut,
        setBypassed,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
