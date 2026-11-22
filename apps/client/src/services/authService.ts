// apps/client/src/services/authService.ts
// Comprehensive Supabase Authentication Service (Google OAuth, Phone OTP, Email)
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

export const authService = {
  // 1. Phone OTP (WhatsApp / SMS Login & Signup)
  async sendPhoneOtp(phone: string): Promise<{ error: string | null }> {
    try {
      const clean = phone.replace(/\D/g, '')
      const formatted = clean.startsWith('91') && clean.length === 12
        ? `+${clean}`
        : `+91${clean.slice(-10)}`

      const { error } = await supabase.auth.signInWithOtp({
        phone: formatted,
      })
      if (error) return { error: error.message }
      return { error: null }
    } catch (err: any) {
      return { error: err?.message || 'Failed to send SMS verification code.' }
    }
  },

  async verifyPhoneOtp(phone: string, token: string): Promise<{ error: string | null; session?: any }> {
    try {
      const clean = phone.replace(/\D/g, '')
      const formatted = clean.startsWith('91') && clean.length === 12
        ? `+${clean}`
        : `+91${clean.slice(-10)}`

      const { data, error } = await supabase.auth.verifyOtp({
        phone: formatted,
        token: token.trim(),
        type: 'sms',
      })
      if (error) return { error: error.message }

      if (data?.user) {
        await this.syncUserProfile(data.user)
      }

      return { error: null, session: data?.session }
    } catch (err: any) {
      return { error: err?.message || 'Failed to verify SMS code.' }
    }
  },

  // 2. Email & Password Sign In
  async signInWithEmail(email: string, password: string): Promise<{ error: string | null; session?: any }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) return { error: error.message }

      if (data?.user) {
        await this.syncUserProfile(data.user)
      }

      return { error: null, session: data?.session }
    } catch (err: any) {
      return { error: err?.message || 'Login failed. Please check credentials.' }
    }
  },

  // 3. Email OTP Flow (Create Account / Passwordless)
  async sendEmailOtp(email: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/login`,
        },
      })
      if (error) return { error: error.message }
      return { error: null }
    } catch (err: any) {
      return { error: err?.message || 'Failed to send email verification code.' }
    }
  },

  async verifyEmailOtp(email: string, token: string): Promise<{ error: string | null; session?: any }> {
    try {
      let res = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type: 'email',
      })
      if (res.error) {
        res = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: token.trim(),
          type: 'signup',
        })
      }
      if (res.error) return { error: res.error.message }

      if (res.data?.user) {
        await this.syncUserProfile(res.data.user)
      }

      return { error: null, session: res.data?.session }
    } catch (err: any) {
      return { error: err?.message || 'Invalid or expired email OTP.' }
    }
  },

  async setPasswordAndProfile(password: string, fullName: string, phone?: string): Promise<{ error: string | null }> {
    try {
      const { data: { user }, error: updateErr } = await supabase.auth.updateUser({
        password,
        data: {
          full_name: fullName.trim(),
          phone: phone?.trim() || '',
        },
      })
      if (updateErr) return { error: updateErr.message }

      if (user) {
        await this.syncUserProfile(user, {
          fullName: fullName.trim(),
          phone: phone?.trim(),
        })
      }
      return { error: null }
    } catch (err: any) {
      return { error: err?.message || 'Failed to update password and profile.' }
    }
  },

  async signUpWithEmail(email: string, password: string, fullName: string, phone?: string): Promise<{ error: string | null }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone?.trim() || '',
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      })
      if (error) return { error: error.message }

      if (data?.user) {
        await this.syncUserProfile(data.user, {
          fullName: fullName.trim(),
          phone: phone?.trim(),
        })
      }

      return { error: null }
    } catch (err: any) {
      return { error: err?.message || 'Account creation failed.' }
    }
  },

  // 4. Google OAuth Sign In
  async signInWithGoogle(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/login`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      })
      if (error) return { error: error.message }
      return { error: null }
    } catch (err: any) {
      return { error: err?.message || 'Google authentication failed.' }
    }
  },

  // 5. Defensively sync profile & customer to Supabase tables
  async syncUserProfile(user: User, overrides?: { fullName?: string; phone?: string; avatarUrl?: string }) {
    if (!user) return

    const rawMeta = user.user_metadata || {}
    const fullName = (
      overrides?.fullName ||
      rawMeta.full_name ||
      rawMeta.name ||
      rawMeta.user_name ||
      (user.email ? user.email.split('@')[0] : '') ||
      'Customer'
    ).trim()

    const avatarUrl = overrides?.avatarUrl || rawMeta.avatar_url || rawMeta.picture || null
    const phone = (overrides?.phone || user.phone || rawMeta.phone || rawMeta.phone_number || '').trim() || null
    const email = (user.email || rawMeta.email || '').trim() || null

    try {
      // 1. Upsert into public.profiles
      await supabase.from('profiles').upsert({
        id: user.id,
        full_name: fullName,
        email: email,
        phone_number: phone,
        avatar_url: avatarUrl,
        role: 'Customer',
      }, { onConflict: 'id' })

      // 2. Upsert into public.customers
      await supabase.from('customers').upsert({
        user_id: user.id,
        profile_id: user.id,
        name: fullName || 'Customer',
        email: email,
        phone: phone,
        avatar_url: avatarUrl,
        status: 'Active',
      }, { onConflict: 'user_id' })
    } catch (err) {
      console.warn('Silent sync error (handled):', err)
    }
  },

  // 6. Forgot & Reset Password
  async resetPasswordForEmail(email: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) return { error: error.message }
      return { error: null }
    } catch (err: any) {
      return { error: err?.message || 'Failed to send password reset email.' }
    }
  },

  async updateUserPassword(password: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) return { error: error.message }
      return { error: null }
    } catch (err: any) {
      return { error: err?.message || 'Failed to update password.' }
    }
  },

  // 7. Sign Out
  async signOut(): Promise<void> {
    await supabase.auth.signOut()
  },
}
