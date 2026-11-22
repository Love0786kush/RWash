import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

export default function Profile() {
  const { user, signOut, isAuthenticated } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    fetchProfile()
  }, [user])

  async function fetchProfile() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (error) throw error
      setProfile(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function updateProfile(updates: any) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user!.id)
      
      if (error) throw error
      setProfile({ ...profile, ...updates })
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (!isAuthenticated) return null

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>
      
      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded">{error}</div>}
      
      {loading ? (
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              defaultValue={profile?.full_name}
              onChange={(e) => updateProfile({ full_name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              defaultValue={user?.email}
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              type="tel"
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              defaultValue={profile?.phone_number}
              placeholder="+91XXXXXXXXXX"
              onChange={(e) => updateProfile({ phone_number: e.target.value })}
            />
          </div>
          <p className="text-sm text-gray-500">Role: {profile?.role || 'Customer'}</p>
          
          <button
            onClick={() => signOut()}
            className="mt-6 w-full bg-red-600 text-white py-2 rounded-md"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}