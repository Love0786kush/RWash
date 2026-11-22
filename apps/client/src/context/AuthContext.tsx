// apps/client/src/context/AuthContext.tsx
// Complete Supabase Authentication: Email, Google OAuth, Phone OTP & Database Profile Sync
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { authService } from '../services/authService'
import type { User } from '@supabase/supabase-js'
import type { Customer, Profile } from '../types'

export interface CompleteProfileData {
  name: string
  phone: string
  email?: string
  address?: string
  city?: string
  avatarUrl?: string
  vehicle?: {
    brand: string
    model: string
    vehicleNumber: string
    color: string
    vehicleType: 'Sedan' | 'SUV' | 'Hatchback' | 'Luxury' | 'Bike' | 'Commercial'
  }
}

interface AuthContextValue {
  user: User | null
  customer: Customer | null
  profile: Profile | null
  loading: boolean
  isProfileComplete: boolean
  sendOtp: (phone: string) => Promise<{ error: string | null }>
  verifyOtp: (phone: string, token: string) => Promise<{ error: string | null; isNewUser?: boolean; existingName?: string; existingEmail?: string; avatarUrl?: string }>
  sendEmailOtp: (email: string) => Promise<{ error: string | null }>
  verifyEmailOtp: (email: string, token: string) => Promise<{ error: string | null; session?: any }>
  setPasswordAndProfile: (password: string, fullName: string, phone?: string) => Promise<{ error: string | null }>
  signInWithEmail: (email: string, pass: string) => Promise<{ error: string | null }>
  signUpWithEmail: (email: string, pass: string, name: string, phone?: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  saveCompleteProfile: (data: CompleteProfileData) => Promise<{ error: string | null }>
  resetPasswordForEmail: (email: string) => Promise<{ error: string | null }>
  updateUserPassword: (password: string) => Promise<{ error: string | null }>
  // Aliases for backwards compatibility
  sendMobileOtp: (phone: string) => Promise<{ error: string | null }>
  verifyMobileOtp: (phone: string, token: string) => Promise<{ error: string | null; isNewUser?: boolean; existingName?: string; existingEmail?: string; avatarUrl?: string }>
  saveUserProfile: (profile: { fullName: string; email?: string; avatarUrl?: string }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const checkProfileCompleteness = (p: Profile | null, c: Customer | null): boolean => {
    const name = (p?.full_name || c?.name || '').trim()
    const phone = (p?.phone_number || c?.phone || '').trim()

    // Valid name cannot be empty or default placeholder
    const hasValidName = name.length >= 2 && name.toLowerCase() !== 'customer'
    // Valid phone must have at least 10 digits
    const hasValidPhone = phone.replace(/\D/g, '').length >= 10

    return hasValidName && hasValidPhone
  }

  const isProfileComplete = checkProfileCompleteness(profile, customer)

  const fetchCustomerProfile = useCallback(async (userId: string, currentUser?: User) => {
    try {
      // 1. Fetch from profiles table
      const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (profData) {
        setProfile(profData as Profile)
      }

      // 2. Fetch from customers table
      const { data: custData } = await supabase
        .from('customers')
        .select('*')
        .or(`user_id.eq.${userId},profile_id.eq.${userId}`)
        .maybeSingle()

      if (custData) {
        setCustomer(custData as unknown as Customer)
      }

      // 3. Defensive auto-provisioning if missing in Supabase
      if (!custData || !profData) {
        const u = currentUser || (await supabase.auth.getUser()).data.user
        if (u) {
          await authService.syncUserProfile(u)

          // Re-fetch once after sync
          const [reProf, reCust] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
            supabase.from('customers').select('*').or(`user_id.eq.${userId},profile_id.eq.${userId}`).maybeSingle(),
          ])

          if (reProf.data) setProfile(reProf.data as Profile)
          if (reCust.data) setCustomer(reCust.data as unknown as Customer)
        }
      }
    } catch (e) {
      console.warn('Customer profile load error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      const u = data.session?.user ?? null
      setUser(u)
      if (u) {
        fetchCustomerProfile(u.id, u)
      } else {
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      const u = session?.user ?? null
      setUser(u)

      if (u) {
        // When signed in (especially OAuth redirect), sync profile immediately
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          await authService.syncUserProfile(u)
        }
        await fetchCustomerProfile(u.id, u)
      } else {
        setProfile(null)
        setCustomer(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchCustomerProfile])

  async function sendOtp(phone: string) {
    return authService.sendPhoneOtp(phone)
  }

  async function verifyOtp(phone: string, token: string) {
    const res = await authService.verifyPhoneOtp(phone, token)
    if (res.error) {
      return { error: res.error }
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (currentUser) {
      await fetchCustomerProfile(currentUser.id, currentUser)
      const { data: existingCust } = await supabase
        .from('customers')
        .select('*')
        .or(`user_id.eq.${currentUser.id},profile_id.eq.${currentUser.id}`)
        .maybeSingle()

      if (existingCust && existingCust.name && existingCust.name !== 'Customer') {
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

  async function sendEmailOtp(email: string) {
    return authService.sendEmailOtp(email)
  }

  async function verifyEmailOtp(email: string, token: string) {
    return authService.verifyEmailOtp(email, token)
  }

  async function setPasswordAndProfile(password: string, fullName: string, phone?: string) {
    const res = await authService.setPasswordAndProfile(password, fullName, phone)
    if (!res.error) {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (u) await fetchCustomerProfile(u.id, u)
    }
    return res
  }

  async function saveUserProfile(p: { fullName: string; email?: string; avatarUrl?: string }) {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) throw new Error('Not authenticated')

    await authService.syncUserProfile(currentUser, {
      fullName: p.fullName,
      phone: currentUser.phone,
      avatarUrl: p.avatarUrl,
    })

    await fetchCustomerProfile(currentUser.id, currentUser)
  }

  async function saveCompleteProfile(data: CompleteProfileData): Promise<{ error: string | null }> {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) return { error: 'User is not authenticated' }

      const cleanPhone = data.phone.replace(/\D/g, '')
      const formattedPhone = cleanPhone.startsWith('91') && cleanPhone.length === 12
        ? `+${cleanPhone}`
        : `+91${cleanPhone.slice(-10)}`

      // 1. Update profiles table
      const { error: profileErr } = await supabase
        .from('profiles')
        .upsert({
          id: currentUser.id,
          full_name: data.name.trim(),
          email: data.email?.trim() || currentUser.email || null,
          phone_number: formattedPhone,
          address: data.address?.trim() || null,
          city: data.city?.trim() || null,
          avatar_url: data.avatarUrl || null,
          role: 'Customer',
        }, { onConflict: 'id' })

      if (profileErr) throw profileErr

      // 2. Update customers table
      const { data: updatedCust, error: custErr } = await supabase
        .from('customers')
        .upsert({
          user_id: currentUser.id,
          profile_id: currentUser.id,
          name: data.name.trim(),
          email: data.email?.trim() || currentUser.email || null,
          phone: formattedPhone,
          address: data.address?.trim() || null,
          city: data.city?.trim() || null,
          avatar_url: data.avatarUrl || null,
          status: 'Active',
        }, { onConflict: 'user_id' })
        .select()
        .single()

      if (custErr) throw custErr

      // 3. Register vehicle if provided
      if (data.vehicle && data.vehicle.brand && data.vehicle.model && data.vehicle.vehicleNumber) {
        const custId = updatedCust?.id || customer?.id
        if (custId) {
          await supabase.from('vehicles').upsert({
            customer_id: custId,
            brand: data.vehicle.brand.trim(),
            model: data.vehicle.model.trim(),
            vehicle_number: data.vehicle.vehicleNumber.trim().toUpperCase(),
            color: data.vehicle.color.trim() || 'White',
            vehicle_type: data.vehicle.vehicleType || 'Sedan',
            is_default: true,
          }, { onConflict: 'customer_id,vehicle_number' })
        }
      }

      await fetchCustomerProfile(currentUser.id, currentUser)
      return { error: null }
    } catch (err: any) {
      console.error('saveCompleteProfile error:', err)
      return { error: err?.message || 'Failed to save profile. Please try again.' }
    }
  }

  async function signInWithEmail(email: string, pass: string) {
    const res = await authService.signInWithEmail(email, pass)
    if (!res.error && res.session?.user) {
      await fetchCustomerProfile(res.session.user.id, res.session.user)
    }
    return res
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
    setProfile(null)
  }

  async function refreshProfile() {
    if (user) await fetchCustomerProfile(user.id, user)
  }

  async function resetPasswordForEmail(email: string) {
    return authService.resetPasswordForEmail(email)
  }

  async function updateUserPassword(password: string) {
    return authService.updateUserPassword(password)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        customer,
        profile,
        loading,
        isProfileComplete,
        sendOtp,
        verifyOtp,
        sendEmailOtp,
        verifyEmailOtp,
        setPasswordAndProfile,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        refreshProfile,
        saveCompleteProfile,
        resetPasswordForEmail,
        updateUserPassword,
        // Aliases
        sendMobileOtp: sendOtp,
        verifyMobileOtp: verifyOtp,
        saveUserProfile,
        logout: signOut,
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
