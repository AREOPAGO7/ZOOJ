import { Session, User } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  createProfile: (profileData: any) => Promise<{ error: any }>
  resetPassword: (email: string) => Promise<{ error: any }>
  updatePassword: (newPassword: string) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Auth context: Initial session loaded:", session?.user?.id)
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth context: Auth state change event:", event, "user:", session?.user?.id, "email:", session?.user?.email)
      
      if (event === 'SIGNED_IN') {
        console.log("Auth context: User signed in successfully")
      } else if (event === 'TOKEN_REFRESHED') {
        console.log("Auth context: Token refreshed")
      }
      
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string) => {
    console.log("Auth context: Starting signup for:", email)
    
    try {
      // First, create the user account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })
      
      if (signUpError) {
        console.error("Auth context: Signup error:", signUpError)
        return { error: signUpError }
      }
      
      if (signUpData?.user) {
        console.log("Auth context: Signup successful, user created:", signUpData.user.id)
        
        // Automatically sign in the user after successful signup
        console.log("Auth context: Auto-signing in user after signup")
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        
        if (signInError) {
          console.error("Auth context: Auto-signin error:", signInError)
          return { error: signInError }
        }
        
        if (signInData?.user) {
          console.log("Auth context: Auto-signin successful, user logged in:", signInData.user.id)
          // The user will be automatically set via the auth state change listener
        }
      }
      
      return { error: null }
    } catch (error) {
      console.error("Auth context: Signup exception:", error)
      return { error: { message: 'Une erreur inattendue s\'est produite' } }
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const createProfile = async (profileData: any) => {
    if (!user) {
      return { error: { message: 'No user logged in' } }
    }

    const { error } = await supabase
      .from('profiles')
      .insert([
        {
          id: user.id,
          ...profileData,
        },
      ])

    return { error }
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'zooj://new-password', // Deep link to new password page
      })
      
      if (error) {
        console.error("Auth context: Password reset error:", error)
        return { error }
      }
      
      console.log("Auth context: Password reset email sent successfully to:", email)
      return { error: null }
    } catch (error) {
      console.error("Auth context: Password reset exception:", error)
      return { error: { message: 'Une erreur inattendue s\'est produite' } }
    }
  }

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (error) {
        console.error("Auth context: Password update error:", error)
        return { error }
      }
      
      console.log("Auth context: Password updated successfully")
      return { error: null }
    } catch (error) {
      console.error("Auth context: Password update exception:", error)
      return { error: { message: 'Une erreur inattendue s\'est produite' } }
    }
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    createProfile,
    resetPassword,
    updatePassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
