import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useClientAuth } from '../context/ClientAuthContext'
import { useToast } from '../context/ToastContext'
import {
  Car,
  ShieldCheck,
  Sparkles,
  Smartphone,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Camera,
  User as UserIcon,
  Mail,
  Lock,
  ChevronLeft,
  Check,
  KeyRound,
  UserPlus
} from 'lucide-react'
import { supabase } from '../supabaseClient'
import { compressImageWithStats } from '../utils/imageCompressor'

interface OtpInput6Props {
  value: string
  onChange: (otp: string) => void
  disabled?: boolean
  onComplete?: (otp: string) => void
}

const OtpInput6: React.FC<OtpInput6Props> = ({ value, onChange, disabled, onComplete }) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '')

  useEffect(() => {
    const firstEmpty = digits.findIndex((d) => !d)
    const targetIdx = firstEmpty === -1 ? 5 : firstEmpty
    inputRefs.current[targetIdx]?.focus()
  }, [])

  const handleDigitChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawChar = e.target.value.replace(/\D/g, '')
    const char = rawChar.slice(-1)

    const nextDigits = [...digits]
    nextDigits[index] = char
    const combined = nextDigits.join('')
    onChange(combined)

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    if (combined.length === 6 && onComplete) {
      onComplete(combined)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted) {
      onChange(pasted)
      const targetIndex = Math.min(pasted.length, 5)
      inputRefs.current[targetIndex]?.focus()
      if (pasted.length === 6 && onComplete) {
        onComplete(pasted)
      }
    }
  }

  return (
    <div className="flex items-center justify-between gap-2 sm:gap-3 my-4">
      {Array.from({ length: 6 }).map((_, i) => {
        const isFilled = Boolean(digits[i])
        return (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            disabled={disabled}
            value={digits[i] || ''}
            onChange={(e) => handleDigitChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className={`w-11 h-14 sm:w-13 sm:h-16 text-center text-xl sm:text-2xl font-bold rounded-2xl border-2 transition-all duration-200 outline-none shadow-sm ${
              isFilled
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/20'
                : 'border-slate-200 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/60 text-slate-900 dark:text-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15'
            } disabled:opacity-50`}
          />
        )
      })}
    </div>
  )
}

type AuthMode = 'email' | 'phone'
type AuthFlowStep = 'input' | 'otp' | 'profile_setup'

export const ClientLogin: React.FC = () => {
  const navigate = useNavigate()
  const {
    user,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    sendMobileOtp,
    verifyMobileOtp,
    saveUserProfile,
  } = useClientAuth()
  const { showToast } = useToast()

  // Selected Auth Mode: 'email' (default) or 'phone' (WhatsApp OTP)
  const [authMode, setAuthMode] = useState<AuthMode>('email')
  const [currentStep, setCurrentStep] = useState<AuthFlowStep>('input')

  // Email form state
  const [isRegistering, setIsRegistering] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [emailPhoneInput, setEmailPhoneInput] = useState('')
  const [authSubmitting, setAuthSubmitting] = useState(false)

  // Phone / WhatsApp OTP form state
  const [mobileNumber, setMobileNumber] = useState('')
  const [otpSending, setOtpSending] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  // WhatsApp Profile Setup (For New Users)
  const [fullName, setFullName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // General error handling
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Branding
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [businessName, setBusinessName] = useState('RWash')

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendIn])

  // Redirect if logged in
  useEffect(() => {
    if (user && currentStep !== 'profile_setup') {
      navigate('/dashboard', { replace: true })
    }
  }, [user, currentStep, navigate])

  // Fetch brand identity from Supabase
  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data } = await supabase
          .from('settings')
          .select('logo_url, business_name')
          .maybeSingle()
        if (data) {
          if (data.logo_url) setLogoUrl(data.logo_url)
          if (data.business_name) setBusinessName(data.business_name)
        }
      } catch (err) {
        console.warn('Could not fetch logo:', err)
      }
    }
    fetchSettings()
  }, [])

  // Email / Password Form Submit
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setAuthSubmitting(true)

    try {
      if (isRegistering) {
        if (!nameInput.trim()) {
          showToast('Please enter your full name', 'warning')
          setAuthSubmitting(false)
          return
        }
        const res = await signUpWithEmail(emailInput, passwordInput, nameInput.trim(), emailPhoneInput)
        if (res.error) {
          setErrorMsg(res.error)
        } else {
          showToast('Account created successfully! Welcome to RWash.', 'success')
          navigate('/dashboard')
        }
      } else {
        const res = await signInWithEmail(emailInput, passwordInput)
        if (res.error) {
          setErrorMsg(res.error)
        } else {
          showToast('Logged in successfully!', 'success')
          navigate('/dashboard')
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication error. Please try again.')
    } finally {
      setAuthSubmitting(false)
    }
  }

  // Google OAuth Handler
  const handleGoogleSignIn = async () => {
    setErrorMsg(null)
    try {
      const res = await signInWithGoogle()
      if (res.error) {
        setErrorMsg(res.error)
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Google sign-in error.')
    }
  }

  // Phone Step 1: Send OTP Handler
  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setErrorMsg(null)

    const clean = mobileNumber.replace(/\D/g, '')
    if (clean.length !== 10) {
      showToast('Please enter a valid 10-digit mobile number', 'warning')
      return
    }

    setOtpSending(true)
    try {
      const res = await sendMobileOtp(clean)
      if (res.error) {
        setErrorMsg(res.error)
      } else {
        setCurrentStep('otp')
        setResendIn(30)
        showToast('OTP code sent successfully via SMS!', 'success')
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to send OTP. Please check your connection.')
    } finally {
      setOtpSending(false)
    }
  }

  // Phone Step 2: Verify OTP Handler
  const handleVerifyOtp = async (e?: React.FormEvent, directOtp?: string) => {
    e?.preventDefault()
    setErrorMsg(null)

    const finalOtp = (directOtp || otp).replace(/\D/g, '')
    if (finalOtp.length !== 6) {
      showToast('Please enter the full 6-digit OTP code', 'warning')
      return
    }

    setOtpVerifying(true)
    try {
      const verifyResult = await verifyMobileOtp(mobileNumber, finalOtp)

      if (verifyResult.error) {
        setErrorMsg(verifyResult.error)
        return
      }

      if (verifyResult.isNewUser) {
        setCurrentStep('profile_setup')
        if (verifyResult.existingName) setFullName(verifyResult.existingName)
        if (verifyResult.existingEmail) setProfileEmail(verifyResult.existingEmail)
        if (verifyResult.avatarUrl) setAvatarUrl(verifyResult.avatarUrl)
        showToast('Number verified! Please set up your profile.', 'info')
      } else {
        showToast(`Welcome back, ${verifyResult.existingName || 'Customer'}!`, 'success')
        navigate('/dashboard')
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Invalid OTP code. Please check and try again.')
    } finally {
      setOtpVerifying(false)
    }
  }

  // Phone Step 3: Save Profile Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!fullName.trim()) {
      showToast('Please enter your full name', 'warning')
      return
    }

    setSavingProfile(true)
    try {
      await saveUserProfile({
        fullName: fullName.trim(),
        email: profileEmail.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
      })
      showToast(`Welcome to RWash, ${fullName.trim()}! Your profile is set up.`, 'success')
      navigate('/dashboard')
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save profile. Please try again.')
    } finally {
      setSavingProfile(false)
    }
  }

  // Avatar Upload Handler
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size should be less than 5MB', 'warning')
      return
    }

    setUploadingAvatar(true)
    try {
      const result = await compressImageWithStats(file, { maxWidth: 450, maxHeight: 450, maxSizeMB: 0.5 })
      const compressed = result.file
      const fileExt = compressed.name.split('.').pop() || 'webp'
      const fileName = `avatars/user_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('rwash-images')
        .upload(fileName, compressed, {
          contentType: compressed.type,
          upsert: false,
        })

      if (!uploadErr && uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from('rwash-images')
          .getPublicUrl(fileName)
        setAvatarUrl(publicUrlData.publicUrl)
        showToast('Profile photo added!', 'success')
      } else {
        const reader = new FileReader()
        reader.onloadend = () => {
          setAvatarUrl(reader.result as string)
          showToast('Profile photo selected!', 'success')
        }
        reader.readAsDataURL(compressed)
      }
    } catch {
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const maskedPhone =
    mobileNumber.length === 10
      ? `+91 ••••••${mobileNumber.slice(-4)}`
      : `+91 ${mobileNumber}`

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-3 sm:p-6 lg:p-10 font-sans overflow-hidden bg-slate-950 text-slate-100">
      {/* Background Ambience */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-25 filter blur-[3px] scale-105"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=2000&q=80')",
        }}
      />
      <div className="absolute inset-0 bg-radial from-amber-600/10 via-slate-950/80 to-slate-950 pointer-events-none" />

      {/* Subtle glowing ambient lights */}
      <div className="absolute top-1/4 left-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="relative w-full max-w-5xl bg-slate-900/90 backdrop-blur-2xl rounded-[32px] sm:rounded-[38px] border border-slate-800/90 shadow-2xl overflow-hidden flex flex-col lg:flex-row transition-all duration-300">
        {/* LEFT COLUMN */}
        <div className="w-full lg:w-[54%] p-6 sm:p-10 lg:p-12 flex flex-col justify-between z-10">
          {/* Top Header */}
          <div className="flex items-center justify-between gap-4 pb-5 border-b border-slate-800/60">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-700 to-amber-500 p-0.5 shadow-lg shadow-amber-900/30 group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center overflow-hidden">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Car className="h-5 w-5 text-amber-400" />
                  )}
                </div>
              </div>
              <div>
                <h2 className="font-display text-base font-bold tracking-tight text-white group-hover:text-amber-400 transition-colors">
                  {businessName || 'RWash'}
                </h2>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Doorstep Service Active
                  </span>
                </div>
              </div>
            </Link>

            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Back Home</span>
            </Link>
          </div>

          {/* Core Body Container */}
          <div className="py-5 sm:py-6 space-y-5 my-auto">
            {/* Error Message */}
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-rose-200 text-xs flex items-start gap-3 animate-shake">
                <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="flex-1 font-medium">{errorMsg}</span>
              </div>
            )}

            {/* TAB SELECTOR: EMAIL vs PHONE (WhatsApp Flow) */}
            {currentStep === 'input' && (
              <div className="p-1 bg-slate-950/80 rounded-2xl border border-slate-800 flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('email')
                    setErrorMsg(null)
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    authMode === 'email'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Mail className="h-4 w-4" />
                  <span>Email Sign In</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('phone')
                    setErrorMsg(null)
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    authMode === 'phone'
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="h-4 w-4" />
                  <span>Phone OTP</span>
                </button>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════
                MODE 1: EMAIL & PASSWORD (DEFAULT)
            ═════════════════════════════════════════════════════════════════ */}
            {currentStep === 'input' && authMode === 'email' && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-1">
                  <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-white">
                    {isRegistering ? 'Create your RWash Account' : 'Welcome back'}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400">
                    {isRegistering
                      ? 'Fill your details to schedule doorstep detailing.'
                      : 'Sign in to access your bookings, vehicles, and subscriptions.'}
                  </p>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-3.5 pt-1">
                  {isRegistering && (
                    <div className="space-y-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                        Full Name *
                      </label>
                      <div className="relative flex items-center">
                        <UserIcon className="h-4 w-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          placeholder="Your full name"
                          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950/70 border border-slate-700/80 focus:border-amber-500 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-amber-500/15 transition-all"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                      Email Address *
                    </label>
                    <div className="relative flex items-center">
                      <Mail className="h-4 w-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="you@domain.com"
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950/70 border border-slate-700/80 focus:border-amber-500 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-amber-500/15 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                        Password *
                      </label>
                      {!isRegistering && (
                        <Link to="/reset-password" className="text-[11px] text-amber-400 hover:underline">
                          Forgot password?
                        </Link>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <KeyRound className="h-4 w-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                      <input
                        type="password"
                        required
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950/70 border border-slate-700/80 focus:border-amber-500 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-amber-500/15 transition-all"
                      />
                    </div>
                  </div>

                  {isRegistering && (
                    <div className="space-y-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                        Phone (Optional)
                      </label>
                      <div className="relative flex items-center">
                        <Smartphone className="h-4 w-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                        <input
                          type="tel"
                          value={emailPhoneInput}
                          onChange={(e) => setEmailPhoneInput(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950/70 border border-slate-700/80 focus:border-amber-500 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-amber-500/15 transition-all"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={authSubmitting || !emailInput || !passwordInput}
                    className="w-full py-3.5 mt-2 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-500 text-slate-950 font-display font-bold text-xs uppercase tracking-widest transition-all duration-300 shadow-lg shadow-amber-900/40 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed group"
                  >
                    <span>{authSubmitting ? 'Processing...' : isRegistering ? 'Sign Up' : 'Sign In'}</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </form>

                {/* Google Sign-in Divider */}
                <div className="relative my-4 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800" />
                  </div>
                  <span className="relative px-3 bg-slate-900 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    Or continue with
                  </span>
                </div>

                {/* Google Button */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-slate-700/80 text-white text-xs font-bold transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm hover:border-slate-600"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                {/* Toggle Register / Login */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegistering(!isRegistering)
                      setErrorMsg(null)
                    }}
                    className="text-xs text-slate-400 hover:text-amber-400 transition-colors"
                  >
                    {isRegistering ? (
                      <span>Already have an account? <b className="text-amber-400 underline">Sign In</b></span>
                    ) : (
                      <span>Don't have an account? <b className="text-amber-400 underline">Sign Up Free</b></span>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════
                MODE 2: WHATSAPP-STYLE PHONE NUMBER INPUT
            ═════════════════════════════════════════════════════════════════ */}
            {currentStep === 'input' && authMode === 'phone' && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                    <Smartphone className="h-3.5 w-3.5" />
                    <span>WhatsApp-Style Fast Login</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-white">
                    Enter your phone number
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400">
                    We'll send an instant 6-digit SMS verification code to your mobile number.
                  </p>
                </div>

                <form onSubmit={handleSendOtp} className="space-y-4 pt-1">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                      Mobile Number
                    </label>

                    <div className="relative flex items-center">
                      <div className="absolute left-3 flex items-center gap-1.5 pl-1 pr-3 py-1.5 border-r border-slate-700 text-slate-300 font-semibold text-xs pointer-events-none">
                        <span className="text-base">🇮🇳</span>
                        <span>+91</span>
                      </div>

                      <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        required
                        autoFocus
                        disabled={otpSending}
                        value={mobileNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '')
                          if (val.length <= 10) setMobileNumber(val)
                          setErrorMsg(null)
                        }}
                        placeholder="Enter 10-digit number"
                        className="w-full pl-24 pr-4 py-3.5 rounded-2xl bg-slate-950/70 border border-slate-700/80 focus:border-emerald-500 text-white font-medium text-sm sm:text-base placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 transition-all shadow-inner"
                      />
                    </div>

                    <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span>Carrier SMS charges may apply. Your number is 100% private.</span>
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={otpSending || mobileNumber.length !== 10}
                    className="w-full py-4 mt-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-500 hover:to-emerald-500 text-slate-950 font-display font-bold text-xs uppercase tracking-widest transition-all duration-300 shadow-lg shadow-emerald-900/40 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed group"
                  >
                    <span>{otpSending ? 'Sending Code...' : 'Send SMS OTP'}</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </form>

                {/* Google Sign-in */}
                <div className="relative my-3 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800" />
                  </div>
                  <span className="relative px-3 bg-slate-900 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    Or
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-slate-700/80 text-white text-xs font-bold transition-all flex items-center justify-center gap-3 cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════
                SCREEN 2: OTP VERIFICATION (WhatsApp Style)
            ═════════════════════════════════════════════════════════════════ */}
            {currentStep === 'otp' && (
              <div className="space-y-5 animate-fade-in">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Enter 6-Digit SMS Code</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-white">
                    Verifying your number
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    SMS code sent to <b className="text-amber-400">+91 {mobileNumber}</b>.{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentStep('input')
                        setOtp('')
                      }}
                      className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer ml-1"
                    >
                      Wrong number?
                    </button>
                  </p>
                </div>

                <form onSubmit={(e) => handleVerifyOtp(e)} className="space-y-4 pt-2">
                  <OtpInput6
                    value={otp}
                    onChange={setOtp}
                    disabled={otpVerifying}
                    onComplete={(fullCode) => handleVerifyOtp(undefined, fullCode)}
                  />

                  <div className="flex items-center justify-between text-xs pt-1 text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      <span>Didn't receive code?</span>
                    </div>

                    <button
                      type="button"
                      disabled={resendIn > 0 || otpSending}
                      onClick={() => handleSendOtp()}
                      className="font-bold text-amber-400 hover:text-amber-300 disabled:opacity-40 disabled:no-underline cursor-pointer flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw className={`h-3 w-3 ${otpSending ? 'animate-spin' : ''}`} />
                      <span>
                        {resendIn > 0
                          ? `Resend in ${resendIn}s`
                          : otpSending
                          ? 'Sending...'
                          : 'Resend via SMS'}
                      </span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={otpVerifying || otp.length !== 6}
                    className="w-full py-4 mt-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-500 hover:to-emerald-500 text-slate-950 font-display font-bold text-xs uppercase tracking-widest transition-all duration-300 shadow-lg shadow-emerald-900/40 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed group"
                  >
                    <span>{otpVerifying ? 'Verifying Code...' : 'Verify & Continue'}</span>
                    <CheckCircle2 className="h-4 w-4 transition-transform group-hover:scale-110" />
                  </button>
                </form>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════
                SCREEN 3: WHATSAPP-STYLE PROFILE SETUP
            ═════════════════════════════════════════════════════════════════ */}
            {currentStep === 'profile_setup' && (
              <div className="space-y-5 animate-fade-in">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Welcome to RWash</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-white">
                    Set up your profile
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Enter your name and details to schedule doorstep detailing.
                  </p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4 pt-1">
                  {/* WhatsApp Circular Profile Photo */}
                  <div className="flex flex-col items-center justify-center space-y-2 py-2">
                    <div
                      className="relative group cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-amber-500/40 overflow-hidden flex items-center justify-center shadow-xl group-hover:border-amber-400 transition-colors">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="h-10 w-10 text-slate-400" />
                        )}
                      </div>

                      <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg border-2 border-slate-900 group-hover:scale-110 transition-transform">
                        <Camera className="h-4 w-4" />
                      </div>

                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {uploadingAvatar ? 'Uploading photo...' : 'Add profile photo (optional)'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                      Full Name *
                    </label>
                    <div className="relative flex items-center">
                      <UserIcon className="h-4 w-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                      <input
                        type="text"
                        required
                        autoFocus
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your name"
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950/70 border border-slate-700/80 focus:border-amber-500 text-white font-medium text-sm placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-amber-500/15 transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                      Mobile Number (Verified)
                    </label>
                    <div className="relative flex items-center">
                      <Lock className="h-4 w-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                      <input
                        type="text"
                        readOnly
                        disabled
                        value={maskedPhone}
                        className="w-full pl-10 pr-28 py-3 rounded-2xl bg-slate-950/40 border border-slate-800 text-slate-300 font-mono text-sm opacity-90 cursor-not-allowed"
                      />
                      <div className="absolute right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                        <Check className="h-3 w-3" />
                        <span>Verified</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                        Email Address
                      </label>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">Optional</span>
                    </div>
                    <div className="relative flex items-center">
                      <Mail className="h-4 w-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                      <input
                        type="email"
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        placeholder="For receipts & booking updates"
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950/70 border border-slate-700/80 focus:border-amber-500 text-white font-medium text-sm placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-amber-500/15 transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingProfile || !fullName.trim()}
                    className="w-full py-4 mt-3 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-500 text-slate-950 font-display font-bold text-xs uppercase tracking-widest transition-all duration-300 shadow-lg shadow-amber-900/40 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed group"
                  >
                    <span>{savingProfile ? 'Saving Profile...' : 'Save Profile & Continue'}</span>
                    <CheckCircle2 className="h-4 w-4 transition-transform group-hover:scale-110" />
                  </button>
                </form>
              </div>
            )}

            {/* Feature Badges Footer */}
            <div className="grid grid-cols-3 gap-2 pt-3 text-[11px] text-slate-400 border-t border-slate-800/60 text-center">
              <div className="p-2 rounded-xl bg-slate-950/40 border border-slate-800/40">
                <span className="font-semibold text-slate-200 block">Fast Sign In</span>
                Email &amp; Google
              </div>
              <div className="p-2 rounded-xl bg-slate-950/40 border border-slate-800/40">
                <span className="font-semibold text-slate-200 block">WhatsApp Flow</span>
                Phone &amp; SMS OTP
              </div>
              <div className="p-2 rounded-xl bg-slate-950/40 border border-slate-800/40">
                <span className="font-semibold text-slate-200 block">Auto-Sync</span>
                Cars &amp; Bookings
              </div>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
            <span>© {new Date().getFullYear()} {businessName || 'RWash'} Detailing</span>
            <span className="flex items-center gap-1">Encrypted 256-bit Auth</span>
          </div>
        </div>

        {/* RIGHT COLUMN: Showcase Banner */}
        <div className="hidden lg:flex w-[46%] relative flex-col justify-between p-10 overflow-hidden bg-gradient-to-br from-amber-950/90 via-slate-950 to-slate-950 border-l border-slate-800">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity scale-110"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=1200&q=80')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-bold uppercase tracking-wider text-amber-300">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Doorstep Mobile Detailing
            </div>
            <h2 className="text-2xl xl:text-3xl font-display font-bold text-white tracking-tight leading-tight">
              Showroom Shine at Your Home or Office Parking
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              Equipped with eco-friendly steam jets, ceramic coating, and certified master detailers.
            </p>
          </div>

          <div className="relative z-10 my-6 space-y-3">
            <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg flex items-center gap-3.5 transform hover:-translate-y-0.5 transition-transform">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Car className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">We Bring Everything</h4>
                <p className="text-[11px] text-slate-400">
                  Water, electricity, steam &amp; professional German detailing compounds.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg flex items-center gap-3.5 transform hover:-translate-y-0.5 transition-transform">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">100% Scratch-Free Guarantee</h4>
                <p className="text-[11px] text-slate-400">
                  High GSM microfiber &amp; two-bucket grit guard washing technology.
                </p>
              </div>
            </div>
          </div>

          <div className="relative z-10 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                {'★★★★★'}
                <span className="text-white ml-1">4.9 / 5</span>
              </div>
              <p className="text-[10px] text-slate-400">Trusted by 15,000+ car lovers</p>
            </div>

            <div className="flex -space-x-2">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80"
                alt="User"
                className="w-7 h-7 rounded-full border-2 border-slate-900 object-cover"
              />
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&h=80&q=80"
                alt="User"
                className="w-7 h-7 rounded-full border-2 border-slate-900 object-cover"
              />
              <img
                src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=80&h=80&q=80"
                alt="User"
                className="w-7 h-7 rounded-full border-2 border-slate-900 object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ClientLogin
