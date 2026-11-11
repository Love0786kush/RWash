// apps/client/src/context/AuthContext.tsx
// Complete Supabase Authentication: Email, Google OAuth, and WhatsApp-style Phone OTP
import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { authService } from '../services/authService'
import type { User } from '@supabase/supabase-js'
import type { Customer } from '../types'

interface AuthContextValue {
  user: User | null
  customer: Customer | null
  loading: boolean
  sendOtp: (phone: string) => Promise<{ error: string | null }>
  verifyOtp: (phone: string, token: string) => Promise<{ error: string | null; isNewUser?: boolean; existingName?: string; existingEmail?: string; avatarUrl?: string }>
  signInWithEmail: (email: string, pass: string) => Promise<{ error: string | null }>
  signUpWithEmail: (email: string, pass: string, name: string, phone?: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  // Backward compatible aliases
  sendMobileOtp: (phone: string) => Promise<{ error: string | null }>
  verifyMobileOtp: (phone: string, token: string) => Promise<{ error: string | null; isNewUser?: boolean; existingName?: string; existingEmail?: string; avatarUrl?: string }>
  saveUserProfile: (profile: { fullName: string; email?: string; avatarUrl?: string }) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null
      setUser(u)
      if (u) fetchCustomerProfile(u.id)
      else setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) fetchCustomerProfile(u.id)
      else {
        setCustomer(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchCustomerProfile(userId: string) {
    try {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .or(`user_id.eq.${userId},profile_id.eq.${userId}`)
        .maybeSingle()

      if (data) {
        setCustomer(data as unknown as Customer)
      }
    } catch (e) {
      console.warn('Customer profile load error:', e)
    } finally {
      setLoading(false)
    }
  }

  async function sendOtp(phone: string) {
    return authService.sendPhoneOtp(phone)
  }

  async function verifyOtp(phone: string, token: string) {
    const res = await authService.verifyPhoneOtp(phone, token)
    if (res.error) {
      return { error: res.error }
    }

    // Check if customer profile exists
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (currentUser) {
      const { data: existingCust } = await supabase
        .from('customers')
        .select('*')
        .or(`user_id.eq.${currentUser.id},profile_id.eq.${currentUser.id}`)
        .maybeSingle()

      if (existingCust && existingCust.name) {
        return {
          error: null,
          isNewUser: false,
          existingName: existingCust.name,
          existingEmail: existingCust.email ?? undefined,
          avatarUrl: existingCust.avatar_url ?? undefined,
        }
      }
    }

    return { error: null, isNewUser: true }
  }

  async function saveUserProfile(profile: { fullName: string; email?: string; avatarUrl?: string }) {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) throw new Error('Not authenticated')

    // Upsert customer entry
    const { error } = await supabase
      .from('customers')
      .upsert({
        user_id: currentUser.id,
        profile_id: currentUser.id,
        name: profile.fullName,
        email: profile.email || currentUser.email || null,
        phone: currentUser.phone || null,
        avatar_url: profile.avatarUrl || null,
      })

    if (error) throw error
    await fetchCustomerProfile(currentUser.id)
  }

  async function signInWithEmail(email: string, pass: string) {
    return authService.signInWithEmail(email, pass)
  }

  async function signUpWithEmail(email: string, pass: string, name: string, phone?: string) {
    return authService.signUpWithEmail(email, pass, name, phone)
  }

  async function signInWithGoogle() {
    return authService.signInWithGoogle()
  }

  async function signOut() {
    await authService.signOut()
    setUser(null)
    setCustomer(null)
  }

  async function refreshProfile() {
    if (user) await fetchCustomerProfile(user.id)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        customer,
        loading,
        sendOtp,
        verifyOtp,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        refreshProfile,
        // Aliases
        sendMobileOtp: sendOtp,
        verifyMobileOtp: verifyOtp,
        saveUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export const useClientAuth = useAuth
