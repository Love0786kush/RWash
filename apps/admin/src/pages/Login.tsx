import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { KeyRound, Mail, Car } from 'lucide-react'
import { Alert } from '../components/Alert'
import { supabase } from '../lib/supabase'
import { applyTheme } from '../utils/themeHelper'

export const Login: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  const { login } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [businessName, setBusinessName] = useState('RWash')
  const [logoUrl, setLogoUrl] = useState('')

  // Auth screen bhi DB theme par — bina login ke brand color + logo load karo
  useEffect(() => {
    const loadBranding = async () => {
      try {
        const { data } = await supabase
          .from('settings')
          .select('business_name, logo_url, social_links')
          .eq('id', 1)
          .single()
        if (data) {
          if (data.business_name) setBusinessName(data.business_name)
          if (data.logo_url) setLogoUrl(data.logo_url)
          if (data.social_links?.theme_config) applyTheme(data.social_links.theme_config)
          else if (data.social_links?.theme_color) applyTheme(data.social_links.theme_color)
        }
      } catch { /* default theme */ }
    }
    loadBranding()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!email || !password) {
      showToast('Please fill in all fields', 'warning')
      return
    }

    setIsSubmitting(true)
    try {
      await login(email, password)
      showToast('Welcome back, Admin!', 'success')
      navigate('/')
    } catch (err: any) {
      const msg = err.message || 'Invalid credentials'
      setErrorMsg(msg)
      showToast(msg, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans"
      style={{ backgroundColor: 'var(--theme-bg, #FFF8F0)' }}
    >
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
        style={{ backgroundColor: 'var(--theme-p, #8C471E)' }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-10"
        style={{ backgroundColor: 'var(--theme-accent, #A65D2E)' }}
      />

      <div
        className="w-full max-w-md backdrop-blur-xl rounded-3xl p-8 shadow-2xl z-10 animate-fade-in space-y-6 border"
        style={{
          backgroundColor: 'var(--theme-card, #FFFFFF)',
          borderColor: 'var(--theme-border, #E6CBB2)',
        }}
      >
        <div className="flex flex-col items-center text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg mb-4 overflow-hidden"
            style={{ backgroundColor: 'var(--theme-btn, #8C471E)', color: '#fff' }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Car className="h-8 w-8" />
            )}
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight" style={{ color: 'var(--theme-text, #3D1E0B)' }}>
            {businessName}
          </h1>
          <p className="text-[11px] mt-1.5 uppercase tracking-[0.22em] font-bold" style={{ color: 'var(--theme-text2, #542E16)' }}>
            Admin Control Panel
          </p>
        </div>

        {errorMsg && (
          <Alert type="error" message={errorMsg} onClose={() => setErrorMsg(null)} />
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--theme-text2, #542E16)' }}>
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none opacity-50">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@rwash.com"
                className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 transition-all border"
                style={{
                  backgroundColor: 'var(--theme-bg, #FFF8F0)',
                  borderColor: 'var(--theme-border, #E6CBB2)',
                  color: 'var(--theme-text, #3D1E0B)',
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--theme-text2, #542E16)' }}>
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none opacity-50">
                <KeyRound className="h-4 w-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 transition-all border"
                style={{
                  backgroundColor: 'var(--theme-bg, #FFF8F0)',
                  borderColor: 'var(--theme-border, #E6CBB2)',
                  color: 'var(--theme-text, #3D1E0B)',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 text-white font-display font-bold rounded-2xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 text-sm tracking-wide"
            style={{ backgroundColor: 'var(--theme-btn, #8C471E)' }}
          >
            {isSubmitting ? (
              <>
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="text-center text-[10px] font-medium" style={{ color: 'var(--theme-text2, #542E16)', opacity: 0.7 }}>
          Authorized activities are monitored and logged.
        </div>
      </div>
    </div>
  )
}
