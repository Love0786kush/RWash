// apps/client/src/pages/ClientSetupProfile.tsx
// Streamlined New User Setup & Profile Onboarding Screen for RWash Doorstep Car Detailing
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClientAuth } from '../context/ClientAuthContext'
import { useToast } from '../context/ToastContext'
import {
  User as UserIcon,
  Phone,
  Mail,
  ShieldCheck,
  ArrowRight,
  Camera,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { supabase } from '../supabaseClient'
import { compressImageWithStats } from '../utils/imageCompressor'

export const ClientSetupProfile: React.FC = () => {
  const navigate = useNavigate()
  const { user, customer, profile, isProfileComplete, saveCompleteProfile, loading: authLoading } = useClientAuth()
  const { showToast } = useToast()

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Personal Info - initialize immediately from localStorage fallback if available
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem('pending_signup_name') || ''
    } catch {
      return ''
    }
  })

  const [phone, setPhone] = useState(() => {
    try {
      const raw = localStorage.getItem('pending_signup_phone') || ''
      return raw.replace(/\D/g, '').slice(-10)
    } catch {
      return ''
    }
  })

  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem('pending_signup_email') || ''
    } catch {
      return ''
    }
  })

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Pre-fill existing user info & retain create-account data
  useEffect(() => {
    let savedName = ''
    let savedPhone = ''
    let savedEmail = ''
    try {
      savedName = localStorage.getItem('pending_signup_name') || ''
      savedPhone = localStorage.getItem('pending_signup_phone') || ''
      savedEmail = localStorage.getItem('pending_signup_email') || ''
    } catch {}

    if (user) {
      const meta = user.user_metadata || {}
      const existingName =
        profile?.full_name ||
        customer?.name ||
        meta.full_name ||
        meta.name ||
        savedName ||
        ''

      const existingPhone =
        profile?.phone_number ||
        customer?.phone ||
        user.phone ||
        meta.phone ||
        meta.phone_number ||
        savedPhone ||
        ''

      const existingEmail =
        profile?.email ||
        customer?.email ||
        user.email ||
        meta.email ||
        savedEmail ||
        ''

      const existingAvatar =
        profile?.avatar_url ||
        customer?.avatar_url ||
        meta.avatar_url ||
        meta.picture ||
        null

      if (existingName && existingName !== 'Customer') {
        setName(existingName)
      } else if (savedName) {
        setName(savedName)
      }

      if (existingPhone) {
        const clean = existingPhone.replace(/\D/g, '')
        setPhone(clean.slice(-10))
      } else if (savedPhone) {
        setPhone(savedPhone.replace(/\D/g, '').slice(-10))
      }

      if (existingEmail) {
        setEmail(existingEmail)
      } else if (savedEmail) {
        setEmail(savedEmail)
      }

      if (existingAvatar) {
        setAvatarUrl(existingAvatar)
      }
    } else {
      if (savedName) setName(savedName)
      if (savedPhone) setPhone(savedPhone.replace(/\D/g, '').slice(-10))
      if (savedEmail) setEmail(savedEmail)
    }
  }, [user, profile, customer])

  // If user is already complete and verified, redirect directly to dashboard
  useEffect(() => {
    if (!authLoading && user && isProfileComplete) {
      navigate('/dashboard', { replace: true })
    }
  }, [authLoading, user, isProfileComplete, navigate])

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      showToast('Maximum photo size is 5MB', 'warning')
      return
    }
    setUploadingAvatar(true)
    try {
      const result = await compressImageWithStats(file, { maxWidth: 450, maxHeight: 450, maxSizeMB: 0.5 })
      const ext = result.file.name.split('.').pop() || 'webp'
      const path = `avatars/user_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('rwash-images')
        .upload(path, result.file, { contentType: result.file.type, upsert: false })

      if (!upErr) {
        const { data } = supabase.storage.from('rwash-images').getPublicUrl(path)
        setAvatarUrl(data.publicUrl)
      } else {
        const reader = new FileReader()
        reader.onloadend = () => setAvatarUrl(reader.result as string)
        reader.readAsDataURL(result.file)
      }
    } catch {
      const reader = new FileReader()
      reader.onloadend = () => setAvatarUrl(reader.result as string)
      reader.readAsDataURL(file)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    // Validations
    if (!name.trim()) {
      showToast('Please enter your full name', 'warning')
      return
    }
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length !== 10) {
      showToast('Please enter a valid 10-digit mobile number', 'warning')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        name: name.trim(),
        phone: cleanPhone,
        email: email.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
      }

      const res = await saveCompleteProfile(payload)
      if (res.error) {
        setErrorMsg(res.error)
        showToast(res.error, 'error')
      } else {
        // Clear pending signup local cache
        try {
          localStorage.removeItem('pending_signup_name')
          localStorage.removeItem('pending_signup_phone')
          localStorage.removeItem('pending_signup_email')
        } catch {}

        showToast(`Profile setup complete! Welcome, ${name.trim()}!`, 'success')
        navigate('/dashboard', { replace: true })
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to complete profile setup.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full px-4 py-3.5 rounded-xl bg-white dark:bg-[#180b04] border border-[#E6CBB2] dark:border-[#42220f] text-[#3D1E0B] dark:text-white text-sm placeholder-[#B8977D] dark:placeholder-[#7A5635] focus:outline-none transition-all shadow-xs'

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FFF8F0] dark:bg-[#0c0502] font-sans p-4 sm:p-6 transition-colors duration-300 py-10">
      <div className="w-full max-w-lg">

        {/* Brand & Setup Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-3 shadow-xs"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--theme-p, #8C471E) 12%, transparent)',
              color: 'var(--theme-p, #8C471E)',
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Profile Setup</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#3D1E0B] dark:text-white tracking-tight">
            Complete Your Profile
          </h1>
          <p className="text-xs sm:text-sm text-[#7A5635] dark:text-[#B8977D] mt-1.5 max-w-sm">
            Just verify your name and contact details to get your doorstep car wash booked in seconds.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-[#140803] rounded-3xl border border-[#E6CBB2]/80 dark:border-[#42220f] shadow-xl p-6 sm:p-8">

          {errorMsg && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Profile Avatar Upload */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-[#FFF8F0]/70 dark:bg-[#1c0d05]/60 border border-[#E6CBB2]/50 dark:border-[#381a0b]">
              <div
                className="relative cursor-pointer group shrink-0"
                onClick={() => fileInputRef.current?.click()}
                title="Change photo"
              >
                <div
                  className="w-20 h-20 rounded-full bg-white dark:bg-[#140803] border-2 border-[#E6CBB2] dark:border-[#42220f] overflow-hidden flex items-center justify-center transition-all shadow-sm"
                  style={{
                    borderColor: avatarUrl ? 'var(--theme-p, #8C471E)' : undefined,
                  }}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="h-8 w-8 text-[#B8977D]" />
                  )}
                </div>
                <div
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full text-white flex items-center justify-center border-2 border-white dark:border-[#140803] shadow-md transition-transform group-hover:scale-110"
                  style={{
                    backgroundColor: 'var(--theme-btn, var(--color-primary-600, #8C471E))',
                  }}
                >
                  <Camera className="h-3.5 w-3.5" />
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              <div className="text-center sm:text-left">
                <div className="text-sm font-bold text-[#3D1E0B] dark:text-white">
                  Profile Photo
                </div>
                <div className="text-xs text-[#7A5635] dark:text-[#B8977D] mt-0.5">
                  {uploadingAvatar ? 'Compressing & uploading...' : 'Upload a profile photo (optional)'}
                </div>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setAvatarUrl(null)
                    }}
                    className="text-[11px] text-red-500 hover:text-red-600 font-medium mt-1 cursor-pointer"
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>

            {/* Form Inputs */}
            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-[#5A3A1E] dark:text-[#D4B896] mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="h-4 w-4 text-[#B8977D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className={inputClass + ' pl-10'}
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-[#5A3A1E] dark:text-[#D4B896] mb-1.5">
                  Mobile Number (Calling & WhatsApp) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pr-2.5 border-r border-[#E6CBB2] dark:border-[#42220f] text-[#5A3A1E] dark:text-[#D4B896] text-xs font-semibold pointer-events-none">
                    <span>🇮🇳</span>
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    required
                    value={phone}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '')
                      if (v.length <= 10) setPhone(v)
                    }}
                    placeholder="9876543210"
                    className={inputClass + ' pl-[88px] font-medium tracking-wide'}
                  />
                  {phone.length === 10 && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  )}
                </div>
                <p className="text-[11px] text-[#7A5635] dark:text-[#B8977D] mt-1">
                  Used by our detailing technician to coordinate your doorstep service.
                </p>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-[#5A3A1E] dark:text-[#D4B896] mb-1.5">
                  Email Address <span className="text-[#B8977D] text-[11px] font-normal">(for invoices & receipts)</span>
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-[#B8977D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className={inputClass + ' pl-10'}
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || !name.trim() || phone.replace(/\D/g, '').length !== 10}
                style={{
                  backgroundColor: 'var(--theme-btn, var(--color-primary-600, #8C471E))',
                }}
                className="w-full py-4 rounded-xl text-white font-bold text-sm transition-all shadow-lg hover:opacity-95 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>{submitting ? 'Saving Profile...' : 'Complete Setup & Go to Dashboard'}</span>
                {!submitting && <ArrowRight className="h-4 w-4" />}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#7A5635] dark:text-[#B8977D] mt-3">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Your personal information is stored securely</span>
              </div>
            </div>

          </form>

        </div>
      </div>
    </div>
  )
}

export default ClientSetupProfile
