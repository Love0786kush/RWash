import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  Wrench,
  Users,
  Image as ImageIcon,
  Settings as SettingsIcon,
  LogOut,
  Sparkles,
  X,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  Car,
  Tag,
  Bell
} from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const [isHovered, setIsHovered] = useState(false)
  const [businessName, setBusinessName] = useState('RWash – The Art of Detailing at Your Doorstep')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('business_name, logo_url')
          .eq('id', 1)
          .single()
        
        if (data && !error) {
          setBusinessName(data.business_name)
          setLogoUrl(data.logo_url)
        }
      } catch (err) {
        console.error('Settings fetch error:', err)
      }
    }
    fetchSettings()

    const channel = supabase
      .channel('admin-sidebar-branding')
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
      showToast('Logged out successfully', 'info')
    } catch (err: any) {
      showToast('Failed to log out: ' + err.message, 'error')
    }
  }

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard className="h-5 w-5 flex-shrink-0 text-[#8C471E] dark:text-[#E69D62]" /> },
    { name: 'Bookings', path: '/bookings', icon: <CalendarDays className="h-5 w-5 flex-shrink-0 text-[#8C471E] dark:text-[#E69D62]" /> },
    { name: 'Services', path: '/services', icon: <Car className="h-5 w-5 flex-shrink-0 text-[#8C471E] dark:text-[#E69D62]" /> },
    { name: 'Categories', path: '/categories', icon: <Tag className="h-5 w-5 flex-shrink-0 text-[#8C471E] dark:text-[#E69D62]" /> },
    { name: 'Customers', path: '/customers', icon: <Users className="h-5 w-5 flex-shrink-0 text-[#8C471E] dark:text-[#E69D62]" /> },
    { name: 'Subscriptions', path: '/subscriptions', icon: <ShieldCheck className="h-5 w-5 flex-shrink-0 text-[#8C471E] dark:text-[#E69D62]" /> },
    { name: 'Offers', path: '/offers', icon: <Sparkles className="h-5 w-5 flex-shrink-0 text-[#8C471E] dark:text-[#E69D62]" /> },
    { name: 'Banners', path: '/banners', icon: <ImageIcon className="h-5 w-5 flex-shrink-0 text-[#8C471E] dark:text-[#E69D62]" /> },
    { name: 'Reports', path: '/reports', icon: <TrendingUp className="h-5 w-5 flex-shrink-0 text-[#8C471E] dark:text-[#E69D62]" /> },
    { name: 'Push Notifications', path: '/push-notifications', icon: <Bell className="h-5 w-5 flex-shrink-0 text-[#8C471E] dark:text-[#E69D62]" /> },
    { name: 'Settings', path: '/settings', icon: <SettingsIcon className="h-5 w-5 flex-shrink-0 text-[#8C471E] dark:text-[#E69D62]" /> },
  ]

  const showExpanded = isHovered || isOpen

  return (
    <>
      {/* Mobile Sidebar Drawer Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed top-0 bottom-0 left-0 z-45 flex flex-col justify-between h-full border-r border-[#E6CBB2] dark:border-[#52270D] bg-[#FFF8F0] dark:bg-[#120702] transition-all duration-300 ease-in-out md:static font-sans shadow-md ${
          isOpen 
            ? 'translate-x-0 w-64' 
            : 'translate-x-full md:translate-x-0 ' + (showExpanded ? 'w-64' : 'w-20')
        }`}
      >
        {/* Top Header Section */}
        <div className="flex items-center justify-between px-5 py-6 border-b border-[#E6CBB2]/60 dark:border-[#52270D]/60">
          <div className="flex items-center gap-3 overflow-hidden">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="h-10 w-10 object-contain rounded-2xl border border-[#E6CBB2] dark:border-[#52270D] flex-shrink-0"
              />
            ) : (
              <div className="p-2.5 bg-[#8C471E] dark:bg-[#A65D2E] rounded-2xl text-white shadow-md flex-shrink-0 flex items-center justify-center">
                <Car className="h-5.5 w-5.5" />
              </div>
            )}
            <div className={`transition-all duration-300 flex flex-col ${
              showExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
            }`}>
              <span className="text-base font-black text-[#3D1E0B] dark:text-[#FFF5EB] tracking-tight whitespace-nowrap truncate max-w-[150px]">
                {businessName || 'RWash'}
              </span>
              <span className="text-[10px] font-bold text-[#7A3B14] dark:text-[#E8C8AE] uppercase tracking-widest whitespace-nowrap">
                Detailer Workspace
              </span>
            </div>
          </div>

          {/* Close button for mobile layout */}
          {isOpen && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-xl text-[#8C471E] dark:text-[#E69D62] hover:bg-[#E6CBB2]/40 dark:hover:bg-[#210E04]"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Menu Items Links */}
        <nav className="flex-1 px-3.5 py-4 space-y-1.5 overflow-y-auto scrollbar-none">
          {menuItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3 rounded-2xl font-bold text-xs transition-all duration-200 relative ${
                  isActive
                    ? 'bg-[#8C471E] dark:bg-[#A65D2E] text-white shadow-md [&>svg]:text-white'
                    : 'text-[#3D1E0B] dark:text-[#FFF5EB] hover:bg-[#E6CBB2]/40 dark:hover:bg-[#210E04]'
                }`
              }
            >
              {item.icon}
              <span className={`transition-all duration-300 whitespace-nowrap ${
                showExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
              }`}>
                {item.name}
              </span>
              {showExpanded && (
                <ChevronRight className="h-3.5 w-3.5 absolute right-4 opacity-60" />
              )}
            </NavLink>
          ))}
        </nav>

        {/* Profile Card & Logout Options */}
        <div className="p-3.5 border-t border-[#E6CBB2] dark:border-[#52270D] bg-[#FFF8F0] dark:bg-[#120702] overflow-hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#8C471E] to-[#6D3412] text-white flex items-center justify-center font-black text-xs flex-shrink-0 shadow-sm ring-2 ring-[#E6CBB2] dark:ring-[#52270D]">
                AD
              </div>
              <div className={`transition-all duration-300 flex flex-col min-w-0 ${
                showExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
              }`}>
                <span className="text-xs font-black text-[#3D1E0B] dark:text-[#FFF5EB] truncate">Admin Manager</span>
                <span className="text-[10px] font-bold text-[#7A3B14] dark:text-[#E8C8AE] truncate mt-0.5" title={user?.email}>
                  {user?.email || 'admin@rwash.com'}
                </span>
              </div>
            </div>

            {showExpanded && (
              <button
                onClick={handleLogout}
                className="p-2.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all flex-shrink-0 cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
