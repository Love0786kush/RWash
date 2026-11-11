import React, { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Car, CalendarDays, User, Wrench, CalendarRange, LogOut, Sparkles, X, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useClientAuth } from '../context/ClientAuthContext'
import { useToast } from '../context/ToastContext'

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClientSidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { customer, logout } = useClientAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [businessName, setBusinessName] = useState('RWash')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from('settings')
          .select('business_name, logo_url')
          .eq('id', 1)
          .single()
        if (data) {
          if (data.business_name) setBusinessName(data.business_name)
          if (data.logo_url) setLogoUrl(data.logo_url)
        }
      } catch (err) {
        console.error('ClientSidebar branding fetch error:', err)
      }
    }
    fetchSettings()

    const channel = supabase
      .channel('client-sidebar-branding')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'settings', filter: 'id=eq.1' },
        (payload: any) => {
          if (payload.new) {
            if (payload.new.business_name) setBusinessName(payload.new.business_name)
            if (payload.new.logo_url !== undefined) setLogoUrl(payload.new.logo_url)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
      showToast('Successfully logged out!', 'info')
      navigate('/')
    } catch (err: any) {
      showToast('Logout failed: ' + err.message, 'error')
    }
  }

  const menuItems = [
    { name: 'My Dashboard', path: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" />, end: true },
    { name: 'My Bookings', path: '/dashboard/bookings', icon: <CalendarDays className="h-5 w-5" /> },
    { name: 'My Vehicles', path: '/dashboard/vehicles', icon: <Car className="h-5 w-5" /> },
    { name: 'My Subscriptions', path: '/dashboard/subscriptions', icon: <ShieldCheck className="h-5 w-5" /> },
    { name: 'Detailing Packages', path: '/dashboard/packages', icon: <Wrench className="h-5 w-5" /> },
    { name: 'Schedule Booking', path: '/dashboard/book', icon: <CalendarRange className="h-5 w-5" /> },
    { name: 'Account Profile', path: '/dashboard/profile', icon: <User className="h-5 w-5" /> },
  ]

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-45 w-64 transform border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 overflow-hidden">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Brand Logo"
                  className="w-9 h-9 object-contain rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-900 p-0.5 shrink-0"
                />
              ) : (
                <div className="p-2 bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-amber-400 rounded-xl shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
              )}
              <span className="text-base font-bold text-slate-800 dark:text-white tracking-tight truncate max-w-[150px]">
                {businessName || 'RWash Panel'}
              </span>
            </div>
            <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Links */}
          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            {menuItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-4 py-3 rounded-xl font-semibold text-xs transition-all ${
                    isActive
                      ? 'bg-primary-50 dark:bg-sky-950/40 text-primary-700 dark:text-sky-300 border-l-4 border-primary-600 dark:border-sky-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`
                }
              >
                {item.icon}
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>

          {/* Logged in summary */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
            <div className="flex flex-col gap-3">
              <div className="px-3">
                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Logged In As</p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate mt-0.5">
                  {customer?.name || 'Customer Account'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl font-bold text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
