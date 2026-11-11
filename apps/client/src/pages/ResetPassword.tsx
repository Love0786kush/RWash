import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClientAuth } from '../context/ClientAuthContext'
import { useToast } from '../context/ToastContext'
import { Lock, Car, CheckCircle } from 'lucide-react'
import { Alert } from '../components/Alert'

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate()
  const { updateUserPassword } = useClientAuth()
  const { showToast } = useToast()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long')
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match')
      return
    }

    setSubmitting(true)
    try {
      await updateUserPassword(newPassword)
      setSuccess(true)
      showToast('Password updated successfully!', 'success')
      setTimeout(() => {
        navigate('/login')
      }, 2500)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update password. Please try again.')
      showToast('Password update failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 md:p-8 font-sans"
      style={{ backgroundColor: 'var(--theme-bg, #FFEED6)' }}
    >
      <div
        className="w-full max-w-md rounded-3xl border shadow-2xl p-8 md:p-10 space-y-6 text-left"
        style={{ backgroundColor: 'var(--theme-card, #fff)', borderColor: 'var(--theme-border, #E2E8F0)' }}
      >
        {/* Header Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl text-white flex items-center justify-center shadow-md"
            style={{ backgroundColor: 'var(--theme-btn, #8B5E3C)' }}
          >
            <Car className="h-6 w-6" />
          </div>
          <div>
            <span className="font-display font-bold text-lg uppercase tracking-wide block leading-none" style={{ color: 'var(--theme-text, #0F172A)' }}>
              RWash
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--theme-text2, #64748B)' }}>Set New Password</span>
          </div>
        </div>

        {success ? (
          <div className="text-center py-6 space-y-4 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle className="h-10 w-10" />
            </div>
            <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--theme-text, #0F172A)' }}>Password Reset Complete</h2>
            <p className="text-xs font-medium leading-relaxed" style={{ color: 'var(--theme-text2, #475569)' }}>
              Your password has been successfully updated. Redirecting to login...
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 text-white font-display font-bold rounded-xl shadow-md text-xs uppercase tracking-[0.14em] cursor-pointer"
              style={{ backgroundColor: 'var(--theme-btn, #8B5E3C)' }}
            >
              Back to Login
            </button>
          </div>
        ) : (
          <div className="space-y-5 animate-fade-in">
            <div className="space-y-1.5">
              <h1 className="font-display text-2xl md:text-[28px] font-bold tracking-tight" style={{ color: 'var(--theme-text, #0F172A)' }}>
                Reset Your Password
              </h1>
              <p className="text-xs font-medium leading-relaxed" style={{ color: 'var(--theme-text2, #475569)' }}>
                Enter your new password below to secure your RWash account.
              </p>
            </div>

            {errorMsg && <Alert type="error" message={errorMsg} onClose={() => setErrorMsg(null)} />}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: 'var(--theme-text, #1E293B)' }}>
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Must be at least 6 characters"
                    className="w-full px-4 py-3 rounded-xl text-xs md:text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 transition-all shadow-xs border"
                    style={{ backgroundColor: 'var(--theme-card, #fff)', borderColor: 'var(--theme-border, #CBD5E1)', color: 'var(--theme-text, #0F172A)' }}
                  />
                  <Lock className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: 'var(--theme-text, #1E293B)' }}>
                  Confirm New Password *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="w-full px-4 py-3 rounded-xl text-xs md:text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 transition-all shadow-xs border"
                    style={{ backgroundColor: 'var(--theme-card, #fff)', borderColor: 'var(--theme-border, #CBD5E1)', color: 'var(--theme-text, #0F172A)' }}
                  />
                  <Lock className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 text-white font-display font-bold rounded-xl transition-all shadow-md text-xs uppercase tracking-[0.14em] cursor-pointer"
                style={{ backgroundColor: 'var(--theme-btn, #8B5E3C)' }}
              >
                {submitting ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
