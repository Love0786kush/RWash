import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Menu, X, Car, User as UserIcon, LogOut, ChevronDown, Calendar, Percent, Sun, Moon } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useClientAuth } from '../context/ClientAuthContext'

export const Navbar: React.FC = () => {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [businessName, setBusinessName] = useState('RWash')
  const [tagline, setTagline] = useState('Doorstep Detailing')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const { user, customer, logout } = useClientAuth()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleProfileClick = () => {
    if (user) {
      setIsDropdownOpen(!isDropdownOpen)
    } else {
      navigate('/login')
    }
  }

  // Dark/Light Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light'
  })
  const [transitionTheme, setTransitionTheme] = useState<'light' | 'dark' | null>(null)

  useEffect(() => {
    const syncTheme = () => {
      const current = localStorage.getItem('theme') || 'light'
      setTheme(current)
      if (current === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    syncTheme()
    window.addEventListener('themeChange', syncTheme)
    return () => window.removeEventListener('themeChange', syncTheme)
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    localStorage.setItem('theme', nextTheme)
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    window.dispatchEvent(new Event('themeChange'))
  }

  useEffect(() => {
    // Fetch settings for branding
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('business_name, logo_url, social_links')
          .eq('id', 1)
          .single()
        
        if (data && !error) {
          if (data.business_name) setBusinessName(data.business_name)
          if (data.logo_url) setLogoUrl(data.logo_url)
          if (data.social_links?.tagline) setTagline(data.social_links.tagline)
        }
      } catch (err) {
        console.error('Navbar load error:', err)
      }
    }

    fetchSettings()

    // Realtime brand updates
    const channel = supabase
      .channel('navbar-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'settings' }, (payload: any) => {
        if (payload.new) {
          if (payload.new.business_name) setBusinessName(payload.new.business_name)
          if (payload.new.logo_url !== undefined) setLogoUrl(payload.new.logo_url)
          if (payload.new.social_links?.tagline) setTagline(payload.new.social_links.tagline)
        }
      })
      .subscribe()

    // Close dropdown on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Services', path: '/services' },
    { name: 'About Us', path: '/about' },
    { name: 'Contact', path: '/contact' },
    { name: 'Book Now', path: '/book' },
  ]

  return (
    <>
    <nav
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-7xl backdrop-blur-xl border rounded-full shadow-2xl transition-all duration-300 px-6 py-2 flex items-center justify-between h-20 font-sans"
      style={{ backgroundColor: 'var(--theme-card, #FFF8F0)', borderColor: 'var(--theme-border, #E6CBB2)' }}
    >
      {/* Brand / Logo */}
      <Link to="/" className="flex items-center gap-3 group">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="RWash Logo"
            className="w-11 h-11 object-contain rounded-2xl border bg-slate-950 p-1 shadow-md shrink-0"
            style={{ borderColor: 'var(--theme-border, #E6CBB2)' }}
          />
        ) : (
          <div
            className="w-11 h-11 rounded-2xl text-white flex items-center justify-center shadow-md shrink-0"
            style={{ backgroundColor: 'var(--theme-btn, #8C471E)' }}
          >
            <Car className="h-6 w-6 text-white stroke-2" />
          </div>
        )}
        <div className="hidden sm:flex flex-col max-w-[200px]">
          <span
            className="font-display font-bold text-lg tracking-tight leading-none transition-colors truncate"
            style={{ color: 'var(--theme-text, #3D1E0B)' }}
          >
            {businessName || 'RWash'}
          </span>
          <span
            className="text-[9px] font-bold tracking-[0.18em] uppercase mt-0.5 truncate"
            style={{ color: 'var(--theme-text2, #7A3B14)' }}
          >
            {tagline || 'Doorstep Detailing'}
          </span>
        </div>
      </Link>

      {/* Desktop Links */}
      <div className="hidden md:flex items-center gap-8 px-4">
        {navLinks.map((link) => (
          <NavLink
            key={link.name}
            to={link.path}
            className={({ isActive }) =>
              `font-display text-xs font-bold uppercase tracking-[0.14em] transition-colors ${
                isActive ? 'border-b-2 pb-1' : ''
              }`
            }
            style={({ isActive }: any) =>
              isActive
                ? { color: 'var(--theme-btn, #8C471E)', borderColor: 'var(--theme-btn, #8C471E)' }
                : { color: 'var(--theme-text2, #542E16)' }
            }
          >
            {link.name}
          </NavLink>
        ))}
      </div>

      {/* Desktop User Dropdown Menu & Theme Toggle */}
      <div className="hidden md:flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-full border hover:scale-105 transition-all cursor-pointer flex items-center justify-center shadow-xs"
          style={{ backgroundColor: 'var(--theme-bg, #FFF8F0)', borderColor: 'var(--theme-border, #E6CBB2)', color: 'var(--theme-btn, #8C471E)' }}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={handleProfileClick}
            className="flex items-center gap-2 p-1.5 pr-3 border rounded-full transition-colors"
            style={{ backgroundColor: 'var(--theme-bg, #FFF8F0)', borderColor: 'var(--theme-border, #E6CBB2)', color: 'var(--theme-text, #3D1E0B)' }}
          >
            <div
              className="w-8.5 h-8.5 rounded-full text-white flex items-center justify-center font-display font-bold text-xs shadow-xs"
              style={{ backgroundColor: 'var(--theme-btn, #8C471E)' }}
            >
              {user ? (
                customer?.image_url ? (
                  <img src={customer.image_url} alt="Profile" className="w-full h-full object-cover rounded-full" />
                ) : (
                  customer?.name?.substring(0, 2).toUpperCase() || 'U'
                )
              ) : (
                <UserIcon className="h-4 w-4 text-white" />
              )}
            </div>
            <span className="font-display text-xs font-bold truncate max-w-[100px]">
              {user ? (customer?.name || 'My Account') : 'Sign In'}
            </span>
            {user && <ChevronDown className="h-3.5 w-3.5 opacity-70" />}
          </button>

          {user && isDropdownOpen && (
            <div
              className="absolute right-0 mt-3 w-56 border rounded-2xl shadow-2xl py-2 z-50 animate-slide-down text-left font-sans"
              style={{ backgroundColor: 'var(--theme-card, #fff)', borderColor: 'var(--theme-border, #E6CBB2)' }}
            >
              <div className="px-4 py-2.5 border-b" style={{ borderColor: 'var(--theme-border, #E6CBB2)' }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--theme-text2, #7A3B14)' }}>Logged In As</p>
                <p className="font-display text-xs font-bold truncate mt-0.5" style={{ color: 'var(--theme-text, #3D1E0B)' }}>{user.email}</p>
              </div>
              <Link
                to="/dashboard"
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold transition-colors"
                style={{ color: 'var(--theme-text, #3D1E0B)' }}
              >
                <UserIcon className="h-4 w-4" />
                <span>My Dashboard</span>
              </Link>
              <Link
                to="/book"
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold transition-colors"
                style={{ color: 'var(--theme-text, #3D1E0B)' }}
              >
                <Calendar className="h-4 w-4" />
                <span>Book Appointment</span>
              </Link>
              <button
                onClick={async () => {
                  setIsDropdownOpen(false)
                  await logout()
                  navigate('/')
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-500/10 transition-colors border-t mt-1 cursor-pointer"
                style={{ borderColor: 'var(--theme-border, #E6CBB2)' }}
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Toggle Button & Theme Toggle */}
      <div className="md:hidden flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-full border flex items-center justify-center cursor-pointer shadow-xs"
          style={{ backgroundColor: 'var(--theme-bg, #FFF8F0)', borderColor: 'var(--theme-border, #E6CBB2)', color: 'var(--theme-btn, #8C471E)' }}
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </button>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-10 rounded-full text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
          style={{ backgroundColor: 'var(--theme-btn, #8C471E)' }}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {isOpen && (
        <div
          className="md:hidden absolute top-22 left-0 right-0 border py-6 px-6 rounded-3xl space-y-4 shadow-2xl flex flex-col items-center animate-slide-down font-sans"
          style={{ backgroundColor: 'var(--theme-card, #fff)', borderColor: 'var(--theme-border, #E6CBB2)' }}
        >
          {navLinks.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `font-display text-xs font-bold uppercase tracking-[0.14em] py-2 transition-colors ${
                  isActive ? 'border-b-2' : ''
                }`
              }
              style={({ isActive }: any) =>
                isActive
                  ? { color: 'var(--theme-btn, #8C471E)', borderColor: 'var(--theme-btn, #8C471E)' }
                  : { color: 'var(--theme-text2, #542E16)' }
              }
            >
              {link.name}
            </NavLink>
          ))}
          
          <div className="pt-4 border-t w-full flex flex-col gap-3" style={{ borderColor: 'var(--theme-border, #E6CBB2)' }}>
            {user ? (
              <div className="flex flex-col gap-2">
                <Link
                  to="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-3 text-white font-display font-bold text-xs uppercase tracking-[0.12em] rounded-full transition-colors shadow-xs"
                  style={{ backgroundColor: 'var(--theme-btn, #8C471E)' }}
                >
                  <UserIcon className="h-4 w-4" />
                  <span>My Dashboard</span>
                </Link>
                <button
                  onClick={async () => {
                    setIsOpen(false)
                    await logout()
                    navigate('/')
                  }}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 font-display font-bold text-xs uppercase tracking-[0.12em] rounded-full transition-colors border border-rose-500/20 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 w-full">
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center py-3 border font-display font-bold text-xs uppercase tracking-[0.12em] rounded-full transition-colors"
                  style={{ borderColor: 'var(--theme-border, #E6CBB2)', color: 'var(--theme-text, #3D1E0B)' }}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center py-3 text-white font-display font-bold text-xs uppercase tracking-[0.12em] rounded-full transition-colors shadow-xs"
                  style={{ backgroundColor: 'var(--theme-btn, #8C471E)' }}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>

      {/* Full Screen Circular Theme Transition Overlay — DB theme driven */}
      {transitionTheme && createPortal(
        <div 
          className="fixed inset-0 w-screen h-screen z-[999999] pointer-events-none flex flex-col items-center justify-center animate-circle-expand"
          style={{ 
            backgroundColor: 'var(--theme-dbg, #140903)',
            color: 'var(--theme-dtext, #FAF6F0)' 
          }}
        >
          <div className="flex flex-col items-center gap-4 animate-pulse-glow">
            <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-2xl bg-white/10 backdrop-blur-md border border-white/20">
              {transitionTheme === 'dark' ? (
                <Moon className="h-10 w-10" style={{ color: 'var(--theme-dp, #FDBA74)' }} />
              ) : (
                <Sun className="h-10 w-10" style={{ color: 'var(--theme-dp, #FDBA74)' }} />
              )}
            </div>
            <h2 className="font-display text-xs font-bold tracking-[0.25em] uppercase">
              {transitionTheme === 'dark' ? 'Dark Mode On' : 'Light Mode On'}
            </h2>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
