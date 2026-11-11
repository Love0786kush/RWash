import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ToastContainer } from './components/Toast'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { FullPageSpinner } from './components/Spinner'

// Admin Pages
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Bookings } from './pages/Bookings'
import { Services } from './pages/Services'
import { Categories } from './pages/Categories'
import { Customers } from './pages/Customers'
import { Banners } from './pages/Banners'
import { Settings } from './pages/Settings'
import { Reports } from './pages/Reports'
import { Subscriptions } from './pages/Subscriptions'
import { Offers } from './pages/Offers'
import { Campaigns } from './pages/Campaigns'

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

const ProtectedLayout: React.FC<ProtectedLayoutProps> = ({ children }) => {
  const { user, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (loading) {
    return <FullPageSpinner />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex h-screen w-screen bg-transparent font-sans overflow-hidden">
      <div className="flex h-full w-full bg-transparent backdrop-blur-md overflow-hidden transition-colors duration-300">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex flex-col flex-1 overflow-y-auto">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          <main className="px-6 py-6 bg-slate-50/20 dark:bg-transparent">
            <div className="max-w-full mx-auto font-sans">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}

import { supabase } from './supabaseClient'
import { applyTheme } from './utils/themeHelper'

const AppContent: React.FC = () => {
  const { user, loading } = useAuth()

  React.useEffect(() => {
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
            document.title = `${data.business_name} – Admin Control Panel`
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
        console.error('Failed to load admin settings:', err)
      }
    }

    loadSettings()

    const channel = supabase
      .channel('admin-theme-listener')
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
              document.title = `${payload.new.business_name} – Admin Control Panel`
            }
            if (payload.new.logo_url) {
              let faviconLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement
              if (faviconLink) faviconLink.href = payload.new.logo_url
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading) {
    return <FullPageSpinner />
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />

      <Route
        path="/"
        element={
          <ProtectedLayout>
            <Dashboard />
          </ProtectedLayout>
        }
      />
      <Route
        path="/bookings"
        element={
          <ProtectedLayout>
            <Bookings />
          </ProtectedLayout>
        }
      />
      <Route
        path="/services"
        element={
          <ProtectedLayout>
            <Services />
          </ProtectedLayout>
        }
      />
      <Route
        path="/customers"
        element={
          <ProtectedLayout>
            <Customers />
          </ProtectedLayout>
        }
      />
      <Route
        path="/categories"
        element={
          <ProtectedLayout>
            <Categories />
          </ProtectedLayout>
        }
      />
      <Route
        path="/banners"
        element={
          <ProtectedLayout>
            <Banners />
          </ProtectedLayout>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedLayout>
            <Reports />
          </ProtectedLayout>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedLayout>
            <Settings />
          </ProtectedLayout>
        }
      />
      <Route
        path="/subscriptions"
        element={
          <ProtectedLayout>
            <Subscriptions />
          </ProtectedLayout>
        }
      />
      <Route
        path="/offers"
        element={
          <ProtectedLayout>
            <Offers />
          </ProtectedLayout>
        }
      />
      <Route
        path="/push-notifications"
        element={
          <ProtectedLayout>
            <Campaigns />
          </ProtectedLayout>
        }
      />
      <Route
        path="/campaigns"
        element={
          <ProtectedLayout>
            <Campaigns />
          </ProtectedLayout>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
          <ToastContainer />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
