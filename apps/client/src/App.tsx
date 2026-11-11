import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { ClientAuthProvider, useClientAuth } from './context/ClientAuthContext'
import { ToastProvider } from './context/ToastContext'
import { ToastContainer } from './components/Toast'
import { ClientSidebar } from './components/ClientSidebar'
import { ClientHeader } from './components/ClientHeader'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { FullPageSpinner } from './components/Spinner'
import { Car } from 'lucide-react'
import { CookieConsent } from './components/CookieConsent'

// Public pages
import { Home } from './pages/Home'
import { PublicServices } from './pages/PublicServices'
import { PublicBooking } from './pages/PublicBooking'
import { PublicAbout } from './pages/PublicAbout'
import { PublicContact } from './pages/PublicContact'
import { PrivacyPolicy } from './pages/PrivacyPolicy'
import { TermsConditions } from './pages/TermsConditions'

// Client Auth & Dashboard Pages
import { ClientLogin } from './pages/ClientLogin'
import { ClientSignup } from './pages/ClientSignup'
import { ResetPassword } from './pages/ResetPassword'
import { ClientDashboard } from './pages/ClientDashboard'
import { ClientBookings } from './pages/ClientBookings'
import { ClientVehicles } from './pages/ClientVehicles'
import { ClientProfile } from './pages/ClientProfile'
import { ClientPackages } from './pages/ClientPackages'
import { ClientBookNow } from './pages/ClientBookNow'
import { ClientSubscriptions } from './pages/ClientSubscriptions'

interface LayoutProps {
  children: React.ReactNode;
}

const PublicLayout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-[#FFF8F0] dark:bg-[#120702] text-[#3D1E0B] dark:text-[#FFF5EB] font-sans transition-colors duration-300">
      <Navbar />
      <main className="flex-grow py-8 pt-28 bg-[#FFF8F0] dark:bg-[#120702]">
        {children}
      </main>
      <Footer />
    </div>
  )
}

const ClientLayout: React.FC<LayoutProps> = ({ children }) => {
  const { user, customer, logout, loading } = useClientAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (loading) {
    return <FullPageSpinner />
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  if (customer && customer.status === 'Suspended') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-amber-50 dark:bg-[#120702] p-6 text-center font-sans">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center border border-rose-100 shadow-sm mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-xl font-extrabold text-[#3D1E0B] dark:text-white">Account Suspended</h1>
        <p className="text-xs text-slate-500 max-w-sm mt-2">
          Your client portal access has been suspended by the administrator. Please reach out to customer support to resolve this issue.
        </p>
        <button
          onClick={() => logout()}
          className="mt-6 px-6 py-3 bg-[#381403] hover:bg-[#210E04] text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
        >
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#FFF8F0] dark:bg-[#120702] text-[#3D1E0B] dark:text-[#FFF5EB] overflow-hidden font-sans transition-colors duration-300">
      <ClientSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <ClientHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto px-6 py-6 bg-[#FFF8F0] dark:bg-[#120702]">
          <div className="max-w-5xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}

import { supabase } from './supabaseClient'
import { applyTheme } from './utils/themeHelper'

const AppContent: React.FC = () => {
  const { user, loading } = useClientAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showSplash, setShowSplash] = useState(true)
  const [progress, setProgress] = useState(0)
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    return localStorage.getItem('theme') === 'dark'
  })

  // Auto-redirect confirmed authenticated user to /dashboard if on public/landing route
  useEffect(() => {
    if (user && user.email_confirmed_at) {
      if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/signup' || window.location.hash.includes('access_token')) {
        navigate('/dashboard', { replace: true })
      }
    }
  }, [user, location.pathname, navigate])

  useEffect(() => {
    // Ensure initial theme defaults match localStorage
    const savedTheme = localStorage.getItem('theme') || 'light'
    const darkActive = savedTheme === 'dark'
    setIsDarkTheme(darkActive)
    if (darkActive) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    // 1. Settings, Title & Favicon Logo Sync
    const loadSettings = async () => {
      try {
        const { data } = await supabase
          .from('settings')
          .select('business_name, logo_url, social_links')
          .eq('id', 1)
          .single()
        
        if (data) {
          if (data.social_links?.theme_config) {
            applyTheme(data.social_links.theme_config)
          } else if (data.social_links?.theme_color) {
            applyTheme(data.social_links.theme_color)
          }
          if (data.business_name) {
            document.title = `${data.business_name} – Doorstep Detailing`
          }
          if (data.logo_url) {
            let faviconLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement
            if (!faviconLink) {
              faviconLink = document.createElement('link')
              faviconLink.rel = 'icon'
              document.head.appendChild(faviconLink)
            }
            faviconLink.href = data.logo_url
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err)
      }
    }

    loadSettings()

    const channel = supabase
      .channel('client-theme-listener')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'settings', filter: 'id=eq.1' },
        (payload: any) => {
          if (payload.new) {
            if (payload.new.social_links?.theme_config) {
              applyTheme(payload.new.social_links.theme_config)
            } else if (payload.new.social_links?.theme_color) {
              applyTheme(payload.new.social_links.theme_color)
            }
            if (payload.new.business_name) {
              document.title = `${payload.new.business_name} – Doorstep Detailing`
            }
            if (payload.new.logo_url) {
              let faviconLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement
              if (faviconLink) faviconLink.href = payload.new.logo_url
            }
          }
        }
      )
      .subscribe()

    // 2. 0 to 100% Progress simulation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setShowSplash(false)
          return 100
        }
        return prev + 10
      })
    }, 15)

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading || showSplash) {
    return (
      <div 
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center font-sans transition-colors duration-300 ${
          isDarkTheme ? 'bg-[#140903] text-[#FAF6F0]' : 'bg-[#FAF6F0] text-[#221105]'
        }`}
      >
        <div className="z-10 flex flex-col items-center gap-6">
          <div className="w-18 h-18 rounded-full bg-primary-600 flex items-center justify-center shadow-2xl shadow-red-500/25">
            <Car className="h-9 w-9 text-white stroke-[2]" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-3xl font-black tracking-tight uppercase">RWash</span>
            <span className="text-[10px] text-red-500 font-extrabold uppercase tracking-[0.25em]">Detailing Redefined</span>
          </div>
        </div>

        {/* Progress bar container */}
        <div className="absolute bottom-16 flex flex-col items-center gap-3">
          <div className="w-56 h-1 bg-slate-300/40 dark:bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary-600 transition-all duration-75 rounded-full" 
              style={{ width: `${progress}%` }} 
            />
          </div>
          <span className="text-[11px] font-black tracking-[0.2em] uppercase">
            {progress}% Loading
          </span>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Public Pages */}
      <Route
        path="/"
        element={
          <PublicLayout>
            <Home />
          </PublicLayout>
        }
      />
      <Route
        path="/services"
        element={
          <PublicLayout>
            <PublicServices />
          </PublicLayout>
        }
      />
      <Route
        path="/book"
        element={
          <PublicLayout>
            <PublicBooking />
          </PublicLayout>
        }
      />
      <Route
        path="/about"
        element={
          <PublicLayout>
            <PublicAbout />
          </PublicLayout>
        }
      />
      <Route
        path="/contact"
        element={
          <PublicLayout>
            <PublicContact />
          </PublicLayout>
        }
      />
      <Route
        path="/privacy"
        element={
          <PublicLayout>
            <PrivacyPolicy />
          </PublicLayout>
        }
      />
      <Route
        path="/policies"
        element={
          <PublicLayout>
            <PrivacyPolicy />
          </PublicLayout>
        }
      />
      <Route
        path="/terms"
        element={
          <PublicLayout>
            <TermsConditions />
          </PublicLayout>
        }
      />

      {/* Customer Auth Gates */}
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <ClientLogin />}
      />
      <Route
        path="/signup"
        element={<Navigate to="/login" replace />}
      />
      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />

      {/* Customer Protected Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ClientLayout>
            <ClientDashboard />
          </ClientLayout>
        }
      />
      <Route
        path="/dashboard/bookings"
        element={
          <ClientLayout>
            <ClientBookings />
          </ClientLayout>
        }
      />
      <Route
        path="/dashboard/vehicles"
        element={
          <ClientLayout>
            <ClientVehicles />
          </ClientLayout>
        }
      />
      <Route
        path="/dashboard/profile"
        element={
          <ClientLayout>
            <ClientProfile />
          </ClientLayout>
        }
      />
      <Route
        path="/dashboard/packages"
        element={
          <ClientLayout>
            <ClientPackages />
          </ClientLayout>
        }
      />
      <Route
        path="/dashboard/book"
        element={
          <ClientLayout>
            <ClientBookNow />
          </ClientLayout>
        }
      />
      <Route
        path="/dashboard/subscriptions"
        element={
          <ClientLayout>
            <ClientSubscriptions />
          </ClientLayout>
        }
      />

      {/* Catch-all redirect to Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

import { SupportChat } from './components/SupportChat'
import { ScrollToTop } from './components/ScrollToTop'

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <ToastProvider>
        <ClientAuthProvider>
          <AppContent />
          <SupportChat />
          <ToastContainer />
          <CookieConsent />
        </ClientAuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
