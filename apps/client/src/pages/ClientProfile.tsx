import React, { useEffect, useState } from 'react'
import { User, Mail, Phone, MapPin, Building, Lock, Upload, Sparkles } from 'lucide-react'
import { useClientAuth } from '../context/ClientAuthContext'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { Spinner } from '../components/Spinner'
import { compressImageWithStats } from '../utils/imageCompressor'

export const ClientProfile: React.FC = () => {
  const { user, customer, refreshProfile } = useClientAuth()
  const { showToast } = useToast()

  // Form states
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)

  // Password change state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    if (customer) {
      setName(customer.name || '')
      setPhone(customer.phone || '')
      setAddress(customer.address || '')
      setCity(customer.city || '')
      setImageUrl(customer.image_url || '')
    } else if (user) {
      setName(user.user_metadata?.full_name || '')
    }
  }, [customer, user])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0]
      if (!file || !user) return

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image size should be less than 5MB', 'warning')
        return
      }

      setUploading(true)
      showToast('Compressing & uploading profile photo...', 'info')

      let publicUrl = ''

      // 1. Compress image to < 1MB (avatar max 500x500)
      const result = await compressImageWithStats(file, { maxWidth: 500, maxHeight: 500, maxSizeMB: 0.5 })
      const compressed = result.file

      // Attempt 1: Upload to Supabase Storage bucket 'rwash-images'
      try {
        const fileExt = compressed.name.split('.').pop() || 'webp'
        const fileName = `client-avatars/${user.id}_${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('rwash-images')
          .upload(fileName, compressed, { 
            contentType: compressed.type,
            upsert: false 
          })

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('rwash-images')
            .getPublicUrl(fileName)
          publicUrl = publicUrlData?.publicUrl || ''
        }
      } catch (storageErr) {
        console.warn('Storage bucket upload notice:', storageErr)
      }

      // Attempt 2: Fallback to Base64 Data URL if storage bucket is missing
      if (!publicUrl) {
        publicUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = (err) => reject(err)
          reader.readAsDataURL(compressed)
        })
      }

      if (publicUrl) {
        setImageUrl(publicUrl)

        await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', user.id)

        await refreshProfile()
        showToast('Profile photo updated successfully!', 'success')
      }
    } catch (err: any) {
      console.error('Photo upload error:', err)
      showToast('Upload failed: ' + (err?.message || 'Unable to upload image'), 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleDeletePhoto = async () => {
    if (!user) return
    try {
      setUploading(true)
      await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id)

      setImageUrl('')
      await refreshProfile()
      showToast('Profile photo removed', 'info')
    } catch (err: any) {
      showToast('Failed to remove photo: ' + err.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      setSavingProfile(true)

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: name.trim(),
          phone_number: phone.trim(),
          address: address.trim(),
          city: city.trim()
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      if (customer) {
        await supabase
          .from('customers')
          .update({
            name: name.trim(),
            phone: phone.trim(),
            address: address.trim(),
            city: city.trim()
          })
          .eq('id', customer.id)
      }

      await refreshProfile()
      showToast('Profile details updated successfully!', 'success')
    } catch (err: any) {
      console.error('Profile save error:', err)
      showToast('Save failed: ' + err.message, 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'warning')
      return
    }

    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters long', 'warning')
      return
    }

    try {
      setChangingPassword(true)
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      showToast('Password updated successfully!', 'success')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      showToast('Password change failed: ' + err.message, 'error')
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Account Profile Settings</h1>
        <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5 font-medium">Update your client information and account password.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Photo Avatar Card */}
        <div className="md:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center text-center">
          <div className="relative group">
            <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-primary-500 bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-md">
              {imageUrl ? (
                <img src={imageUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-black text-slate-700 dark:text-slate-200">
                  {name.substring(0, 2).toUpperCase() || 'CU'}
                </span>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                  <Spinner size="small" color="white" />
                </div>
              )}
            </div>
          </div>

          <label className="mt-4 flex items-center justify-center gap-1.5 px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <Upload className="h-3.5 w-3.5" />
            <span>Upload Photo</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>

          {imageUrl && (
            <button
              onClick={handleDeletePhoto}
              className="text-[10px] text-rose-500 hover:underline mt-2.5 font-bold cursor-pointer"
              disabled={uploading}
            >
              Remove Photo
            </button>
          )}
        </div>

        {/* Profile Form */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pb-2 border-b border-slate-100 dark:border-slate-800">
            Personal Details
          </h3>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Contact Mobile *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="h-4 w-4" />
                  </span>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +1 (555) 019-2834"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                Email Address (Read-only)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-400 text-xs cursor-not-allowed font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Residential Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 742 Evergreen Terrace"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                  City
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Building className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Los Angeles"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-primary-600/10 cursor-pointer"
              >
                {savingProfile ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="md:col-span-3 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
            <Lock className="h-4 w-4 text-slate-400" />
            <span>Security & Password</span>
          </h3>

          <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters..."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password..."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-xs font-semibold"
              />
            </div>

            <button
              type="submit"
              disabled={changingPassword}
              className="py-2.5 bg-slate-900 hover:bg-slate-950 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
            >
              {changingPassword ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
