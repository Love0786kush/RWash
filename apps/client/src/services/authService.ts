import { supabase } from '../lib/supabase'

export const authService = {
  // 1. Phone OTP (WhatsApp-like flow via Supabase Auth SMS)
  async sendPhoneOtp(phone: string): Promise<{ error: string | null }> {
    const formatted = phone.startsWith('+') ? phone : `+91${phone.replace(/^0+/, '')}`
    const { error } = await supabase.auth.signInWithOtp({
      phone: formatted,
    })
    return { error: error?.message ?? null }
  },

  async verifyPhoneOtp(phone: string, token: string): Promise<{ error: string | null; session?: any }> {
    const formatted = phone.startsWith('+') ? phone : `+91${phone.replace(/^0+/, '')}`
    const { data, error } = await supabase.auth.verifyOtp({
      phone: formatted,
      token: token.trim(),
      type: 'sms',
    })
    return { error: error?.message ?? null, session: data?.session }
  },

  // 2. Email & Password Login
  async signInWithEmail(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    return { error: error?.message ?? null }
  },

  // 3. Email Signup
  async signUpWithEmail(email: string, password: string, fullName: string, phone?: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone || '',
        },
      },
    })
    return { error: error?.message ?? null }
  },

  // 4. Google OAuth Sign-in
  async signInWithGoogle(): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    })
    return { error: error?.message ?? null }
  },

  // 5. Sign Out
  async signOut(): Promise<void> {
    await supabase.auth.signOut()
  },
}

