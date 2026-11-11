import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

export interface AdminAuthState {
  isAdmin: boolean
  profile: Profile | null
  loading: boolean
  error: string | null
}

/**
 * useAdminAuth — verifies the signed-in Supabase user has role 'Admin'.
 * Redirects to /login if not authenticated; shows error if role is not Admin.
 */
export function useAdminAuth(): AdminAuthState {
  const [isAdmin, setIsAdmin] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const checkAdminRole = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        navigate('/login', { replace: true })
        return
      }

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      const userProfile = data as Profile

      if (userProfile.role !== 'Admin') {
        setError('Access denied. Admin role required.')
        setIsAdmin(false)
        // Sign out the non-admin user
        await supabase.auth.signOut()
        navigate('/login', { replace: true })
        return
      }

      setProfile(userProfile)
      setIsAdmin(true)
    } catch (err: any) {
      setError(err.message ?? 'Failed to verify admin role')
      setIsAdmin(false)
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    checkAdminRole()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setIsAdmin(false)
        setProfile(null)
        navigate('/login', { replace: true })
      }
    })

    return () => subscription.unsubscribe()
  }, [checkAdminRole, navigate])

  return { isAdmin, profile, loading, error }
}

