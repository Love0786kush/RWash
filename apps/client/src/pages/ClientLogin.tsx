// apps/client/src/pages/ClientLogin.tsx
// Multi-Provider Authentication: Google, Phone OTP, Email+Password
// Signup: Name+Phone+Email → Email OTP verify → Set Password
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useClientAuth } from '../context/ClientAuthContext'
import { useToast } from '../context/ToastContext'
import {
  Car,
  ShieldCheck,
  Smartphone,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User as UserIcon,
  Mail,
  ChevronLeft,
  Check,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react'
import { supabase } from '../supabaseClient'

// ─── 6-Digit OTP Box ──────────────────────────────────────────────────────────

interface OtpInputProps {
  value: string
  onChange: (otp: string) => void
  disabled?: boolean
  length?: number
  onComplete?: (otp: string) => void
}

const OtpInput: React.FC<OtpInputProps> = ({ value, onChange, disabled, length = 6, onComplete }) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length }, (_, i) => value[i] || '')

  useEffect(() => {
    const firstEmpty = digits.findIndex((d) => !d)
    const idx = firstEmpty === -1 ? length - 1 : firstEmpty
    inputRefs.current[idx]?.focus()
  }, [length])

  const handleDigitChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const char = e.target.value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = char
    const combined = next.join('')
    onChange(combined)
    if (char && index < length - 1) inputRefs.current[index + 1]?.focus()
    if (combined.length === length && onComplete) onComplete(combined)
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus()
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus()
    if (e.key === 'ArrowRight' && index < length - 1) inputRefs.current[index + 1]?.focus()
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (pasted) {
      onChange(pasted)
      inputRefs.current[Math.min(pasted.length, length - 1)]?.focus()
      if (pasted.length === length && onComplete) onComplete(pasted)
    }
  }

  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 my-4">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          disabled={disabled}
          value={digits[i] || ''}
          onChange={(e) => handleDigitChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={`w-9 h-12 sm:w-11 sm:h-13 text-center text-lg sm:text-xl font-bold rounded-xl border transition-all outline-none ${
            digits[i]
              ? 'border-[#8C471E] bg-[#8C471E]/5 text-[#3D1E0B] dark:text-white dark:bg-[#8C471E]/15 ring-2 ring-[#8C471E]/20'
              : 'border-[#E6CBB2] dark:border-[#42220f] bg-white dark:bg-[#1a0c04] text-[#3D1E0B] dark:text-white focus:border-[#8C471E] focus:ring-2 focus:ring-[#8C471E]/20'
          } disabled:opacity-40`}
        />
      ))}
    </div>
  )
}

// ─── Flow Screens ─────────────────────────────────────────────────────────────

type Screen =
  | 'login'               // Default: Email + Password login
  | 'phone_input'         // Sign in with phone: mobile number
  | 'phone_otp'           // Sign in with phone: SMS OTP verification
  | 'signup_details'      // Create account: Name, Phone, Email
  | 'signup_email_otp'    // Create account: Email OTP verification
  | 'signup_password'     // Create account: Set Password

export const ClientLogin: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    user,
    isProfileComplete,
    signInWithEmail,
    signInWithGoogle,
    sendMobileOtp,
    verifyMobileOtp,
    sendEmailOtp,
    verifyEmailOtp,
    setPasswordAndProfile,
    loading: authLoading,
  } = useClientAuth()
  const { showToast } = useToast()

  // Default to signup if route is /signup
  const [screen, setScreen] = useState<Screen>(() => {
    return window.location.pathname.includes('signup') ? 'signup_details' : 'login'
  })
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // 1. Login State (Email + Password only)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  // 2. Phone Login State
  const [phoneNumber, setPhoneNumber] = useState('')
  const [phoneOtp, setPhoneOtp] = useState('')
  const [phoneResendIn, setPhoneResendIn] = useState(0)

  // 3. Create Account State (Name + Phone + Email OTP + Password)
  const [signupName, setSignupName] = useState('')
  const [signupPhone, setSignupPhone] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupEmailOtp, setSignupEmailOtp] = useState('')
  const [emailResendIn, setEmailResendIn] = useState(0)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)

  // Branding
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [businessName, setBusinessName] = useState('RWash')

  // Timers
  useEffect(() => {
    if (phoneResendIn <= 0) return
    const t = setTimeout(() => setPhoneResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [phoneResendIn])

  useEffect(() => {
    if (emailResendIn <= 0) return
    const t = setTimeout(() => setEmailResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [emailResendIn])

  // Redirect if logged in: check profile completeness against database
  useEffect(() => {
    if (!authLoading && user) {
      if (screen !== 'signup_password') {
        if (!isProfileComplete) {
          navigate('/setup-profile', { replace: true })
        } else {
          navigate('/dashboard', { replace: true })
        }
      }
    }
  }, [user, isProfileComplete, authLoading, screen, navigate])

  // Load brand details
  useEffect(() => {
    supabase
      .from('settings')
      .select('logo_url, business_name')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.logo_url) setLogoUrl(data.logo_url)
        if (data?.business_name) setBusinessName(data.business_name)
      })
      .catch(() => {})
  }, [])

  // ─── 1. Email + Password Login (Direct — no secondary OTP) ────────────────
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSubmitting(true)
    try {
      const res = await signInWithEmail(loginEmail.trim(), loginPassword)
      if (res.error) {
        // Translate common Supabase error messages to user-friendly Hindi/English
        if (res.error.includes('Invalid login credentials')) {
          setErrorMsg('Email ya password galat hai. Dobara check karein ya naya account banayein.')
        } else if (res.error.includes('Email not confirmed')) {
          setErrorMsg('Aapka email verify nahi hua hai. Pehle signup karein aur email OTP verify karein.')
        } else {
          setErrorMsg(res.error)
        }
        return
      }
      showToast('Welcome back! Login successful.', 'success')
      // Redirect will happen via the useEffect above
    } catch (err: any) {
      setErrorMsg(err?.message || 'Login failed. Please check your credentials.')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── 2. Google OAuth ───────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setErrorMsg(null)
    try {
      const res = await signInWithGoogle()
      if (res.error) setErrorMsg(res.error)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Google sign-in failed.')
    }
  }

  // ─── 3. Phone Sign In Flow ─────────────────────────────────────────────────
  const handleSendPhoneOtp = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setErrorMsg(null)
    const clean = phoneNumber.replace(/\D/g, '')
    if (clean.length !== 10) {
      showToast('Please enter a valid 10-digit number', 'warning')
      return
    }
    setSubmitting(true)
    try {
      const res = await sendMobileOtp(clean)
      if (res.error) {
        setErrorMsg(res.error)
      } else {
        setScreen('phone_otp')
        setPhoneResendIn(45)
        showToast('SMS verification code sent to +91 ' + clean, 'success')
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to send SMS code.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerifyPhoneOtp = async (e?: React.FormEvent, directOtp?: string) => {
    e?.preventDefault()
    setErrorMsg(null)
    const code = (directOtp || phoneOtp).replace(/\D/g, '')
    if (code.length !== 6) {
      showToast('Enter the 6-digit SMS code', 'warning')
      return
    }
    setSubmitting(true)
    try {
      const res = await verifyMobileOtp(phoneNumber, code)
      if (res.error) {
        setErrorMsg(res.error)
        return
      }
      showToast('Phone verified successfully!', 'success')
    } catch (err: any) {
      setErrorMsg(err?.message || 'Invalid SMS code.')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── 4. Create Account Flow (Name + Phone + Email → OTP → Password) ───────
  const handleStartSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!signupName.trim()) {
      showToast('Please enter your full name', 'warning')
      return
    }
    const cleanPhone = signupPhone.replace(/\D/g, '')
    if (cleanPhone.length !== 10) {
      showToast('Please enter a valid 10-digit phone number', 'warning')
      return
    }
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      showToast('Please enter a valid email address', 'warning')
      return
    }

    setSubmitting(true)
    try {
      // Save pending signup data locally so it persists across setup steps
      try {
        localStorage.setItem('pending_signup_name', signupName.trim())
        localStorage.setItem('pending_signup_phone', cleanPhone)
        localStorage.setItem('pending_signup_email', signupEmail.trim())
      } catch {}

      const res = await sendEmailOtp(signupEmail.trim())
      if (res.error) {
        if (res.error.includes('fetch failed') || res.error.includes('500') || res.error === '{}') {
          setErrorMsg('Verification email send nahi ho paya. Kripya apna sahi active email check karein (jaise Gmail) ya Google Sign-in use karein.')
        } else {
          setErrorMsg(res.error)
        }
      } else {
        setScreen('signup_email_otp')
        setEmailResendIn(45)
        showToast('Verification code sent to ' + signupEmail.trim(), 'success')
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to send verification code to email.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerifyEmailOtp = async (e?: React.FormEvent, directOtp?: string) => {
    e?.preventDefault()
    setErrorMsg(null)
    const code = (directOtp || signupEmailOtp).replace(/\D/g, '')
    if (code.length < 6 || code.length > 8) {
      showToast('Enter the verification code sent to your email', 'warning')
      return
    }
    setSubmitting(true)
    try {
      const res = await verifyEmailOtp(signupEmail.trim(), code)
      if (res.error) {
        setErrorMsg(res.error)
        return
      }
      showToast('Email verified successfully! Now set your password.', 'success')
      setScreen('signup_password')
    } catch (err: any) {
      setErrorMsg(err?.message || 'Invalid or expired email code.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCompleteSignupPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters long', 'warning')
      return
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'warning')
      return
    }

    setSubmitting(true)
    try {
      try {
        localStorage.setItem('pending_signup_name', signupName.trim())
        localStorage.setItem('pending_signup_phone', signupPhone.replace(/\D/g, ''))
        localStorage.setItem('pending_signup_email', signupEmail.trim())
      } catch {}

      const res = await setPasswordAndProfile(newPassword, signupName.trim(), signupPhone.trim())
      if (res.error) {
        setErrorMsg(res.error)
        return
      }
      showToast(`Welcome aboard, ${signupName.trim()}! Account created.`, 'success')
      navigate('/setup-profile', { replace: true })
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not set password. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-[#180b04] border border-[#E6CBB2] dark:border-[#42220f] text-[#3D1E0B] dark:text-white text-sm placeholder-[#B8977D] dark:placeholder-[#7A5635] focus:outline-none focus:border-[#8C471E] focus:ring-2 focus:ring-[#8C471E]/15 transition-all'

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FFF8F0] dark:bg-[#0c0502] font-sans p-4 sm:p-6 transition-colors duration-300">
      <div className="w-full max-w-[440px]">

        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-11 h-11 rounded-2xl bg-[#8C471E] flex items-center justify-center overflow-hidden shadow-sm">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Car className="h-5.5 w-5.5 text-white" />
              )}
            </div>
            <span className="text-xl font-black text-[#3D1E0B] dark:text-white tracking-tight">
              {businessName}
            </span>
          </Link>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-[#140803] rounded-3xl border border-[#E6CBB2]/80 dark:border-[#42220f]/80 shadow-md p-6 sm:p-8">

          {/* Navigation Tabs between Sign In and Create Account */}
          {(screen === 'login' || screen === 'signup_details') && (
            <div className="flex items-center p-1 bg-[#FFF0E0]/60 dark:bg-[#1f0e05] rounded-2xl mb-6 border border-[#E6CBB2]/50 dark:border-[#3d1c0b]">
              <button
                type="button"
                onClick={() => { setScreen('login'); setErrorMsg(null) }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  screen === 'login'
                    ? 'bg-white dark:bg-[#140803] text-[#8C471E] dark:text-[#E69D62] shadow-sm'
                    : 'text-[#7A5635] dark:text-[#B8977D] hover:text-[#3D1E0B]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setScreen('signup_details'); setErrorMsg(null) }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  screen === 'signup_details'
                    ? 'bg-white dark:bg-[#140803] text-[#8C471E] dark:text-[#E69D62] shadow-sm'
                    : 'text-[#7A5635] dark:text-[#B8977D] hover:text-[#3D1E0B]'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Error Notice */}
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              SCREEN 1: SIGN IN — Email + Password (+ Google + Phone)
          ═════════════════════════════════════════════════════════════════ */}
          {screen === 'login' && (
            <div className="space-y-4">
              {/* Google 1-Click Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full py-3 px-4 rounded-xl border border-[#E6CBB2] dark:border-[#42220f] bg-white dark:bg-[#1a0c04] hover:bg-[#FFF0E0]/60 text-[#3D1E0B] dark:text-white text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-sm"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>

              <button
                type="button"
                onClick={() => { setScreen('phone_input'); setErrorMsg(null) }}
                className="w-full py-3 px-4 rounded-xl border border-[#E6CBB2] dark:border-[#42220f] bg-white dark:bg-[#1a0c04] hover:bg-[#FFF0E0]/60 text-[#3D1E0B] dark:text-white text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-sm"
              >
                <Smartphone className="h-4 w-4 text-[#8C471E] dark:text-[#E69D62]" />
                <span>Sign in with Mobile OTP</span>
              </button>

              {/* Divider */}
              <div className="relative flex items-center my-3">
                <div className="flex-1 border-t border-[#E6CBB2]/80 dark:border-[#42220f]" />
                <span className="px-3 text-[11px] font-semibold text-[#B8977D] uppercase">or with email</span>
                <div className="flex-1 border-t border-[#E6CBB2]/80 dark:border-[#42220f]" />
              </div>

              {/* Email + Password Login Form */}
              <form onSubmit={handleEmailLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#5A3A1E] dark:text-[#D4B896] mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="h-4 w-4 text-[#B8977D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="you@email.com"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#5A3A1E] dark:text-[#D4B896]">
                      Password
                    </label>
                    <Link to="/reset-password" className="text-[11px] text-[#8C471E] dark:text-[#E69D62] hover:underline font-semibold">
                      Forgot?
                    </Link>
                  </div>
                  <div className="relative">
                    <KeyRound className="h-4 w-4 text-[#B8977D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className={inputClass + ' pr-10'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B8977D] hover:text-[#8C471E] transition-colors"
                      tabIndex={-1}
                    >
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !loginEmail || !loginPassword}
                  className="w-full py-3.5 mt-1 rounded-xl bg-[#8C471E] hover:bg-[#703512] text-white font-bold text-sm transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>{submitting ? 'Signing in...' : 'Sign In'}</span>
                  {!submitting && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              SCREEN 2: CREATE ACCOUNT — STEP 1: NAME, PHONE, EMAIL
          ═════════════════════════════════════════════════════════════════ */}
          {screen === 'signup_details' && (
            <div className="space-y-4">
              {/* Google 1-Click Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full py-3 px-4 rounded-xl border border-[#E6CBB2] dark:border-[#42220f] bg-white dark:bg-[#1a0c04] hover:bg-[#FFF0E0]/60 text-[#3D1E0B] dark:text-white text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-sm"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Divider */}
              <div className="relative flex items-center my-2">
                <div className="flex-1 border-t border-[#E6CBB2]/80 dark:border-[#42220f]" />
                <span className="px-3 text-[11px] font-semibold text-[#B8977D] uppercase">or create with email</span>
                <div className="flex-1 border-t border-[#E6CBB2]/80 dark:border-[#42220f]" />
              </div>

              <form onSubmit={handleStartSignup} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#5A3A1E] dark:text-[#D4B896] mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <UserIcon className="h-4 w-4 text-[#B8977D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5A3A1E] dark:text-[#D4B896] mb-1">
                    Mobile Number *
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pr-2.5 border-r border-[#E6CBB2] dark:border-[#42220f] text-[#5A3A1E] dark:text-[#D4B896] text-xs font-medium pointer-events-none">
                      <span>🇮🇳</span>
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      required
                      value={signupPhone}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '')
                        if (v.length <= 10) setSignupPhone(v)
                      }}
                      placeholder="10-digit number"
                      className={inputClass + ' pl-[85px]'}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5A3A1E] dark:text-[#D4B896] mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="h-4 w-4 text-[#B8977D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="you@email.com"
                      className={inputClass}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !signupName || signupPhone.length !== 10 || !signupEmail}
                  className="w-full py-3.5 mt-2 rounded-xl bg-[#8C471E] hover:bg-[#703512] text-white font-bold text-sm transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>{submitting ? 'Sending Verification Code...' : 'Verify Email & Continue'}</span>
                  {!submitting && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              SCREEN 3: CREATE ACCOUNT — STEP 2: EMAIL OTP VERIFICATION
          ═════════════════════════════════════════════════════════════════ */}
          {screen === 'signup_email_otp' && (
            <div className="space-y-4">
              <div>
                <button
                  type="button"
                  onClick={() => { setScreen('signup_details'); setErrorMsg(null); setSignupEmailOtp('') }}
                  className="inline-flex items-center gap-1 text-xs text-[#8C471E] dark:text-[#E69D62] font-semibold mb-2.5 hover:underline cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Change details
                </button>
                <h1 className="text-xl font-bold text-[#3D1E0B] dark:text-white tracking-tight">
                  Verify your email
                </h1>
                <p className="text-xs text-[#7A5635] dark:text-[#B8977D] mt-1">
                  We sent a 6-digit OTP code to <b className="text-[#3D1E0B] dark:text-white">{signupEmail}</b>
                </p>
              </div>

              <form onSubmit={(e) => handleVerifyEmailOtp(e)} className="space-y-4">
                <OtpInput
                  length={6}
                  value={signupEmailOtp}
                  onChange={setSignupEmailOtp}
                  disabled={submitting}
                  onComplete={(code) => handleVerifyEmailOtp(undefined, code)}
                />

                <div className="flex items-center justify-between text-xs text-[#7A5635] dark:text-[#B8977D]">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Didn't get OTP?
                  </span>
                  <button
                    type="button"
                    disabled={emailResendIn > 0 || submitting}
                    onClick={() => handleStartSignup({ preventDefault: () => {} } as any)}
                    className="font-semibold text-[#8C471E] dark:text-[#E69D62] hover:underline disabled:opacity-40 cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className={`h-3 w-3 ${submitting ? 'animate-spin' : ''}`} />
                    {emailResendIn > 0 ? `Resend in ${emailResendIn}s` : 'Resend Email OTP'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={submitting || signupEmailOtp.length < 6}
                  className="w-full py-3.5 rounded-xl bg-[#8C471E] hover:bg-[#703512] text-white font-bold text-sm transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>{submitting ? 'Verifying OTP...' : 'Verify OTP'}</span>
                  {!submitting && <CheckCircle2 className="h-4 w-4" />}
                </button>
              </form>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              SCREEN 4: CREATE ACCOUNT — STEP 3: SET PASSWORD
          ═════════════════════════════════════════════════════════════════ */}
          {screen === 'signup_password' && (
            <div className="space-y-5">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 mb-2">
                  <Check className="h-3 w-3" /> Email Verified
                </div>
                <h1 className="text-xl font-bold text-[#3D1E0B] dark:text-white tracking-tight">
                  Set your password
                </h1>
                <p className="text-xs text-[#7A5635] dark:text-[#B8977D] mt-1">
                  Choose a secure password for your {businessName} account
                </p>
              </div>

              <form onSubmit={handleCompleteSignupPassword} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#5A3A1E] dark:text-[#D4B896] mb-1">
                    Password (at least 6 characters)
                  </label>
                  <div className="relative">
                    <KeyRound className="h-4 w-4 text-[#B8977D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      autoFocus
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className={inputClass + ' pr-10'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B8977D] hover:text-[#8C471E]"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5A3A1E] dark:text-[#D4B896] mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <KeyRound className="h-4 w-4 text-[#B8977D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={inputClass}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || newPassword.length < 6 || newPassword !== confirmPassword}
                  className="w-full py-3.5 mt-2 rounded-xl bg-[#8C471E] hover:bg-[#703512] text-white font-bold text-sm transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>{submitting ? 'Setting up account...' : 'Complete & Setup Profile'}</span>
                  {!submitting && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              SCREEN 5: PHONE LOGIN — NUMBER INPUT
          ═════════════════════════════════════════════════════════════════ */}
          {screen === 'phone_input' && (
            <div className="space-y-5">
              <div>
                <button
                  type="button"
                  onClick={() => { setScreen('login'); setErrorMsg(null) }}
                  className="inline-flex items-center gap-1 text-xs text-[#8C471E] dark:text-[#E69D62] font-semibold mb-2.5 hover:underline cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Back to sign in
                </button>
                <h1 className="text-xl font-bold text-[#3D1E0B] dark:text-white tracking-tight">
                  Sign in with Phone
                </h1>
                <p className="text-xs text-[#7A5635] dark:text-[#B8977D] mt-1">
                  We'll send a 6-digit SMS OTP code to your mobile number
                </p>
              </div>

              <form onSubmit={handleSendPhoneOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5A3A1E] dark:text-[#D4B896] mb-1">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pr-2.5 border-r border-[#E6CBB2] dark:border-[#42220f] text-[#5A3A1E] dark:text-[#D4B896] text-xs font-medium pointer-events-none">
                      <span>🇮🇳</span>
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      required
                      autoFocus
                      disabled={submitting}
                      value={phoneNumber}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '')
                        if (v.length <= 10) setPhoneNumber(v)
                      }}
                      placeholder="10-digit number"
                      className={inputClass + ' pl-[85px]'}
                    />
                  </div>
                  <p className="text-[11px] text-[#B8977D] flex items-center gap-1 mt-1.5">
                    <ShieldCheck className="h-3 w-3 text-emerald-600" />
                    Instant passwordless login via SMS OTP
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting || phoneNumber.length !== 10}
                  className="w-full py-3.5 rounded-xl bg-[#8C471E] hover:bg-[#703512] text-white font-bold text-sm transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>{submitting ? 'Sending SMS OTP...' : 'Send SMS OTP'}</span>
                  {!submitting && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              SCREEN 6: PHONE LOGIN — SMS OTP VERIFICATION
          ═════════════════════════════════════════════════════════════════ */}
          {screen === 'phone_otp' && (
            <div className="space-y-4">
              <div>
                <button
                  type="button"
                  onClick={() => { setScreen('phone_input'); setPhoneOtp(''); setErrorMsg(null) }}
                  className="inline-flex items-center gap-1 text-xs text-[#8C471E] dark:text-[#E69D62] font-semibold mb-2.5 hover:underline cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Change number
                </button>
                <h1 className="text-xl font-bold text-[#3D1E0B] dark:text-white tracking-tight">
                  Enter SMS OTP
                </h1>
                <p className="text-xs text-[#7A5635] dark:text-[#B8977D] mt-1">
                  Sent to <b className="text-[#3D1E0B] dark:text-white">+91 {phoneNumber}</b>
                </p>
              </div>

              <form onSubmit={(e) => handleVerifyPhoneOtp(e)} className="space-y-4">
                <OtpInput
                  value={phoneOtp}
                  onChange={setPhoneOtp}
                  disabled={submitting}
                  onComplete={(code) => handleVerifyPhoneOtp(undefined, code)}
                />

                <div className="flex items-center justify-between text-xs text-[#7A5635] dark:text-[#B8977D]">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Didn't get SMS?
                  </span>
                  <button
                    type="button"
                    disabled={phoneResendIn > 0 || submitting}
                    onClick={() => handleSendPhoneOtp()}
                    className="font-semibold text-[#8C471E] dark:text-[#E69D62] hover:underline disabled:opacity-40 cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className={`h-3 w-3 ${submitting ? 'animate-spin' : ''}`} />
                    {phoneResendIn > 0 ? `Resend in ${phoneResendIn}s` : 'Resend SMS'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={submitting || phoneOtp.length !== 6}
                  className="w-full py-3.5 rounded-xl bg-[#8C471E] hover:bg-[#703512] text-white font-bold text-sm transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>{submitting ? 'Verifying OTP...' : 'Verify & Continue'}</span>
                  {!submitting && <CheckCircle2 className="h-4 w-4" />}
                </button>
              </form>
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between mt-5 px-2 text-[11px] text-[#B8977D]">
          <span>© {new Date().getFullYear()} {businessName}</span>
          <div className="flex items-center gap-3">
            <Link to="/privacy" className="hover:underline">Privacy</Link>
            <Link to="/terms" className="hover:underline">Terms</Link>
          </div>
        </div>

      </div>
    </div>
  )
}

export default ClientLogin
