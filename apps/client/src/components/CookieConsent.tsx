import React, { useState, useEffect } from 'react'
import { ShieldAlert, Check, X, Settings, ArrowRight } from 'lucide-react'

export const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // Preferences state
  const [preferences, setPreferences] = useState({
    analytics: true,
    marketing: false,
  })

  useEffect(() => {
    // Check if consent has already been given
    const consent = localStorage.getItem('cookie-consent')
    if (!consent) {
      // Show banner after 2 seconds
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAcceptAll = () => {
    localStorage.setItem('cookie-consent', JSON.stringify({
      functional: true,
      analytics: true,
      marketing: true,
    }))
    setIsVisible(false)
  }

  const handleSavePreferences = () => {
    localStorage.setItem('cookie-consent', JSON.stringify({
      functional: true,
      analytics: preferences.analytics,
      marketing: preferences.marketing,
    }))
    setIsVisible(false)
  }

  const handleRejectAll = () => {
    localStorage.setItem('cookie-consent', JSON.stringify({
      functional: true,
      analytics: false,
      marketing: false,
    }))
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:max-w-md z-[60] bg-slate-950/95 backdrop-blur-xl border border-white/10 text-white rounded-3xl p-6 shadow-2xl animate-slide-up flex flex-col gap-4 text-left">
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-full bg-primary-500/10 text-primary-400 flex items-center justify-center flex-shrink-0">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-extrabold tracking-tight">Cookie Preferences</h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            We use cookies to optimize vehicle detailing bookings, personalize offers, and analyze traffic. Choose your preferences below.
          </p>
        </div>
      </div>

      {showDetails && (
        <div className="space-y-3.5 py-2 border-t border-white/5 mt-1 animate-fade-in">
          {/* Functional - Required */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white block">Functional Cookies</span>
              <p className="text-[10px] text-slate-500 leading-normal">
                Required for essential features like secure customer logins and active booking sessions.
              </p>
            </div>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-400 px-2 py-1 bg-emerald-500/10 rounded-md">
              Required
            </span>
          </div>

          {/* Analytics */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white block">Analytics Cookies</span>
              <p className="text-[10px] text-slate-500 leading-normal">
                Helps us monitor detailing traffic patterns and improve booking response times.
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.analytics}
              onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
              className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-primary-600 focus:ring-primary-500 cursor-pointer"
            />
          </div>

          {/* Marketing */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white block">Marketing Cookies</span>
              <p className="text-[10px] text-slate-500 leading-normal">
                Allows us to share tailored detailing discounts, promotional codes, and banners.
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.marketing}
              onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
              className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-primary-600 focus:ring-primary-500 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Button controls */}
      <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
        {showDetails ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleSavePreferences}
              className="py-2.5 bg-white hover:bg-slate-100 text-slate-950 font-extrabold text-[11px] uppercase tracking-wider rounded-full transition-all"
            >
              Save Choices
            </button>
            <button
              onClick={() => setShowDetails(false)}
              className="py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 font-extrabold text-[11px] uppercase tracking-wider rounded-full transition-all border border-white/10"
            >
              Go Back
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleAcceptAll}
                className="py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-[11px] uppercase tracking-wider rounded-full transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Accept All</span>
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              </button>
              <button
                onClick={handleRejectAll}
                className="py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 font-extrabold text-[11px] uppercase tracking-wider rounded-full transition-all border border-white/10 cursor-pointer"
              >
                Reject All
              </button>
            </div>
            <button
              onClick={() => setShowDetails(true)}
              className="text-[10px] font-extrabold uppercase tracking-widest text-slate-450 hover:text-white flex items-center justify-center gap-1 py-1 transition-colors cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Customize Preferences</span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
