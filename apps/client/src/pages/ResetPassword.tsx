// apps/client/src/pages/ResetPassword.tsx
// Production-grade Password Recovery & Reset Flow
import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useClientAuth } from '../context/ClientAuthContext'
import { useToast } from '../context/ToastContext'
import {
  Lock,
  Car,
  CheckCircle2,
  AlertTriangle,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  ChevronLeft,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'
import { supabase } from '../supabaseClient'

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { resetPasswordForEmail, updateUserPassword, user } = useClientAuth()
  const { showToast } = useToast()

  // Detect if user reached via recovery email link (hash or query contains access_token / type=recovery)
  const isRecoveryLink =
    window.location.hash.includes('type=recovery') ||
    window.location.hash.includes('access_token') ||
    new URLSearchParams(window.location.search).get('type') === 'recovery'

  const [mode, setMode] = useState<'request' | 'update'>(() => {
    return isRecoveryLink ? 'update' : 'request'
  })

  // Mode 1: Request Email Reset Link
  const [email, setEmail] = useState('')
  const [requestSent, setRequestSent] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  // Mode 2: Update Password
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Listen for Supabase PASSWORD_RECOVERY event
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('update')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Timer for resend email
  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  // Handle Send Reset Email Link
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!email.trim() || !email.includes('@')) {
      showToast('Please enter a valid email address', 'warning')
      return
    }

    setSubmitting(true)
    try {
      const res = await resetPasswordForEmail(email.trim())
      if (res.error) {
        setErrorMsg(res.error)
      } else {
        setRequestSent(true)
        setResendIn(60)
        showToast('Password reset link sent to your email!', 'success')
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to send reset email.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Set New Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.')
      return
    }

    setSubmitting(true)
    try {
      const res = await updateUserPassword(newPassword)
      if (res.error) {
        setErrorMsg(res.error)
      } else {
        setUpdateSuccess(true)
        showToast('Password updated successfully!', 'success')
        setTimeout(() => {
          navigate('/login', { replace: true })
        }, 2500)
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update password. Link might be expired.')
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
              <Car className="h-5.5 w-5.5 text-white" />
            </div>
            <span className="text-xl font-black text-[#3D1E0B] dark:text-white tracking-tight">
              RWash
            </span>
          </Link>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-[#140803] rounded-3xl border border-[#E6CBB2]/80 dark:border-[#42220f]/80 shadow-md p-6 sm:p-8">

          {/* Error Notice */}
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              MODE 1: REQUEST PASSWORD RESET EMAIL LINK
          ═════════════════════════════════════════════════════════════════ */}
          {mode === 'request' && (
            <div className="space-y-5">
              <div>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center gap-1 text-xs text-[#8C471E] dark:text-[#E69D62] font-semibold mb-2.5 hover:underline cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Back to sign in
                </button>
                <h1 className="text-xl font-bold text-[#3D1E0B] dark:text-white tracking-tight">
                  Forgot Password?
                </h1>
                <p className="text-xs text-[#7A5635] dark:text-[#B8977D] mt-1">
                  Enter your registered email address and we'll send a secure reset link.
                </p>
              </div>

              {requestSent ? (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                    Reset Link Dispatched!
                  </h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                    We sent a password reset email to <b>{email}</b>. Click the link in your email to choose a new password.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={resendIn > 0 || submitting}
                      onClick={handleRequestReset}
                      className="text-xs font-semibold text-[#8C471E] dark:text-[#E69D62] hover:underline disabled:opacity-40 flex items-center justify-center gap-1.5 mx-auto"
                    >
                      <RotateCcw className={`h-3 w-3 ${submitting ? 'animate-spin' : ''}`} />
                      {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend Email Link'}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleRequestReset} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#5A3A1E] dark:text-[#D4B896] mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="h-4 w-4 text-[#B8977D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        required
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@email.com"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !email}
                    className="w-full py-3.5 rounded-xl bg-[#8C471E] hover:bg-[#703512] text-white font-bold text-sm transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>{submitting ? 'Sending Reset Link...' : 'Send Reset Link'}</span>
                    {!submitting && <ArrowRight className="h-4 w-4" />}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              MODE 2: SET NEW PASSWORD & CONFIRM PASSWORD
          ═════════════════════════════════════════════════════════════════ */}
          {mode === 'update' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-[#3D1E0B] dark:text-white tracking-tight">
                  Set New Password
                </h1>
                <p className="text-xs text-[#7A5635] dark:text-[#B8977D] mt-1">
                  Choose a secure password for your RWash account.
                </p>
              </div>

              {updateSuccess ? (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                    Password Successfully Updated!
                  </h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    Redirecting you to login with your new password...
                  </p>
                  <button
                    onClick={() => navigate('/login', { replace: true })}
                    className="w-full py-3 rounded-xl bg-[#8C471E] text-white text-xs font-bold shadow-sm"
                  >
                    Go to Login Now
                  </button>
                </div>
              ) : (
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#5A3A1E] dark:text-[#D4B896] mb-1">
                      New Password (min 6 characters) *
                    </label>
                    <div className="relative">
                      <Lock className="h-4 w-4 text-[#B8977D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <Lock className="h-4 w-4 text-[#B8977D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className={inputClass + ' pr-10'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B8977D] hover:text-[#8C471E]"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-[11px] text-red-500 mt-1">Passwords do not match.</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || newPassword.length < 6 || newPassword !== confirmPassword}
                    className="w-full py-3.5 rounded-xl bg-[#8C471E] hover:bg-[#703512] text-white font-bold text-sm transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>{submitting ? 'Saving Password...' : 'Save New Password'}</span>
                    {!submitting && <ArrowRight className="h-4 w-4" />}
                  </button>
                </form>
              )}
            </div>
          )}

        </div>

        <div className="text-center mt-5 text-[11px] text-[#B8977D] flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Secured with End-to-End Supabase Authentication</span>
        </div>

      </div>
    </div>
  )
}

export default ResetPassword
