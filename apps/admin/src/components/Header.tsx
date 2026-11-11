import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Menu, Car, Bell, Clock, CalendarDays, CheckCircle2, ShieldCheck, Sparkles, Sun, Moon, Volume2, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { playNewBookingAlertSound, requestNotificationPermission, triggerDesktopNotification } from '../utils/audioAlert'

interface HeaderProps {
  onMenuClick: () => void;
}

interface NotificationItem {
  id: string;
  type: 'booking' | 'subscription';
  customerName: string;
  detailName: string;
  status?: string;
  time: string;
  rawTime: string;
}

interface LiveAlertItem {
  id: string;
  customerName: string;
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [businessName, setBusinessName] = useState('RWash')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  
  // Notification States
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>(() => 
    JSON.parse(localStorage.getItem('dismissed-alerts') || '[]')
  )
  const [showDropdown, setShowDropdown] = useState(false)
  const [liveAlert, setLiveAlert] = useState<LiveAlertItem | null>(null)
  const processedAlertIds = useRef<Set<string>>(new Set())
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Theme Toggle state
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
    // Fetch initial business settings
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

    // Fetch initial notifications (Recent bookings & recent subscriptions)
    const fetchNotifications = async () => {
      try {
        const [bookingsRes, subsRes] = await Promise.all([
          supabase
            .from('bookings')
            .select(`
              id,
              status,
              created_at,
              booking_date,
              booking_time,
              customers (name),
              services (name)
            `)
            .order('created_at', { ascending: false })
            .limit(20),
          supabase
            .from('subscriptions')
            .select(`
              id,
              plan_name,
              created_at,
              customers (name)
            `)
            .order('created_at', { ascending: false })
            .limit(10)
        ])

        const list: NotificationItem[] = []

        if (bookingsRes.data) {
          bookingsRes.data.forEach((b: any) => {
            const custObj = Array.isArray(b.customers) ? b.customers[0] : b.customers
            const servObj = Array.isArray(b.services) ? b.services[0] : b.services

            list.push({
              id: b.id,
              type: 'booking',
              customerName: custObj?.name || 'Client Customer',
              detailName: servObj?.name || 'Car Detailing Pack',
              status: b.status || 'Pending',
              rawTime: b.created_at,
              time: new Date(b.created_at).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              }),
            })
          })
        }

        if (subsRes.data) {
          subsRes.data.forEach((s: any) => {
            const custObj = Array.isArray(s.customers) ? s.customers[0] : s.customers
            list.push({
              id: s.id,
              type: 'subscription',
              customerName: custObj?.name || 'Subscriber',
              detailName: s.plan_name || 'Detailing Pass',
              status: 'Active',
              rawTime: s.created_at,
              time: new Date(s.created_at).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              }),
            })
          })
        }

        // Sort combined list by rawTime descending
        list.sort((a, b) => new Date(b.rawTime).getTime() - new Date(a.rawTime).getTime())
        setNotifications(list.slice(0, 15))
      } catch (err) {
        console.error('Notification fetch error:', err)
      }
    }

    fetchSettings()
    fetchNotifications()

    // 7-second live polling interval
    const pollInterval = setInterval(() => {
      fetchNotifications()
    }, 7000)

    // Realtime listeners for new bookings (inserts trigger sound, popup banner & desktop notification)
    const channel = supabase
      .channel('bookings-realtime-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, async (payload) => {
        try {
          if (processedAlertIds.current.has(payload.new.id)) {
            return
          }
          processedAlertIds.current.add(payload.new.id)

          playNewBookingAlertSound()

          const { data } = await supabase
            .from('bookings')
            .select(`
              id,
              booking_date,
              booking_time,
              customers (name),
              services (name)
            `)
            .eq('id', payload.new.id)
            .maybeSingle()

          const custObj = Array.isArray((data as any)?.customers) ? (data as any)?.customers[0] : (data as any)?.customers
          const servObj = Array.isArray((data as any)?.services) ? (data as any)?.services[0] : (data as any)?.services

          const clientName = custObj?.name || 'Client User'
          const serviceName = servObj?.name || 'Car Detailing Pack'
          const bDate = data?.booking_date || payload.new.booking_date || 'Today'
          const bTime = data?.booking_time || payload.new.booking_time || 'Scheduled Slot'

          const alertKey = `${clientName}_${bDate}_${bTime}`
          if (processedAlertIds.current.has(alertKey)) {
            return
          }
          processedAlertIds.current.add(alertKey)

          playNewBookingAlertSound()

          // Set floating alert banner
          setLiveAlert({
            id: payload.new.id,
            customerName: clientName,
            serviceName: serviceName,
            bookingDate: bDate,
            bookingTime: bTime
          })

          showToast(`🚗 NEW BOOKING: ${clientName} - ${serviceName}`, 'success')
          triggerDesktopNotification(
            '🚗 New RWash Booking Received!',
            `Client ${clientName} booked ${serviceName} for ${bDate} at ${bTime}`
          )
        } catch (err) {
          console.error('Realtime notification error:', err)
        }
        fetchNotifications()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings' }, () => {
        fetchNotifications()
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'bookings' }, () => {
        fetchNotifications()
      })
      .subscribe()

    // Dual Channel: Direct WebSocket Broadcast Listener
    const broadcastChannel = supabase
      .channel('app-realtime-broadcast')
      .on('broadcast', { event: 'new_booking_created' }, (payload: any) => {
        try {
          const p = payload.payload || {}
          const cName = p.customer_name || 'Client User'
          const bDate = p.booking_date || 'Today'
          const bTime = p.booking_time || 'Scheduled Slot'

          const alertKey = `${cName}_${bDate}_${bTime}`
          if (processedAlertIds.current.has(alertKey)) {
            return
          }
          processedAlertIds.current.add(alertKey)

          playNewBookingAlertSound()
          setLiveAlert({
            id: 'bc_' + Date.now(),
            customerName: cName,
            serviceName: p.service_name || 'Wash Pack',
            bookingDate: bDate,
            bookingTime: bTime
          })
          showToast(`🚗 NEW BOOKING: ${cName} - ${p.service_name || 'Wash'}`, 'success')
          triggerDesktopNotification(
            '🚗 New RWash Booking Received!',
            `Client ${cName} booked ${p.service_name || 'Wash Pack'} for ${bDate} at ${bTime}`
          )
        } catch (err) {
          console.error('Broadcast notification error:', err)
        }
        fetchNotifications()
      })
      .subscribe()

    // Click outside handler for notification dropdown
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
      supabase.removeChannel(broadcastChannel)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const pendingBookingsCount = notifications.filter(n => n.type === 'booking' && n.status === 'Pending').length
  const activeNotifications = notifications.filter(n => !dismissedAlerts.includes(n.id))
  const displayBadgeCount = pendingBookingsCount > 0 ? pendingBookingsCount : activeNotifications.length

  const [notifPerm, setNotifPerm] = useState(() => ('Notification' in window ? Notification.permission : 'granted'))

  const handleEnableNotif = async () => {
    await requestNotificationPermission()
    if ('Notification' in window) {
      setNotifPerm(Notification.permission)
      if (Notification.permission === 'granted') {
        showToast('🔔 Browser Desktop Notifications Enabled!', 'success')
      }
    }
  }

  return (
    <>
      {/* Browser Notification Permission Bar */}
      {notifPerm === 'default' && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-600 text-white text-xs py-2 px-6 flex items-center justify-between shadow-md font-sans z-50 relative">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 animate-bounce text-amber-200" />
            <span className="font-bold">Enable Desktop Notifications:</span> Get instant Windows pop-ups whenever a client books a wash slot!
          </div>
          <button
            onClick={handleEnableNotif}
            className="px-3 py-1 bg-white text-amber-950 font-black text-[10px] uppercase tracking-wider rounded-lg hover:bg-amber-100 transition-all cursor-pointer shadow-sm"
          >
            Allow Notifications
          </button>
        </div>
      )}

      {/* Floating Live Realtime Booking Alert Card Banner */}
      {liveAlert && (
        <div className="fixed top-20 right-6 z-50 max-w-md w-full bg-slate-900 text-white rounded-3xl p-5 shadow-2xl border border-amber-500/40 animate-slide-up space-y-3 font-sans">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">
                🚨 LIVE NEW BOOKING RECEIVED
              </span>
            </div>
            <button
              onClick={() => setLiveAlert(null)}
              className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded-lg bg-white/10 cursor-pointer"
            >
              ✕ Close
            </button>
          </div>

          <div className="space-y-1">
            <div className="text-base font-extrabold text-white flex items-center gap-2">
              <Car className="h-5 w-5 text-amber-400" />
              <span>{liveAlert.customerName}</span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Booked <strong className="text-amber-300">{liveAlert.serviceName}</strong> for{' '}
              <strong>{liveAlert.bookingDate} at {liveAlert.bookingTime}</strong>
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => {
                setLiveAlert(null)
                navigate(`/bookings?highlightId=${liveAlert.id}`)
              }}
              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5"
            >
              <span>View & Manage Booking</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-[#FFF8F0]/90 dark:bg-[#120702]/90 backdrop-blur-md border-b border-[#E6CBB2] dark:border-[#52270D] px-4 md:px-6 py-3.5 transition-colors duration-300 font-sans shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Left Section: Mobile Menu & Clean Page Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={onMenuClick}
              className="p-2 rounded-xl text-[#8C471E] dark:text-[#E69D62] hover:bg-[#E6CBB2]/40 dark:hover:bg-[#210E04] transition-colors lg:hidden cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5.5 w-5.5" />
            </button>
            <h1 className="text-base md:text-lg font-black text-[#3D1E0B] dark:text-[#FFF5EB] tracking-tight">
              Admin Control Panel
            </h1>
          </div>

          {/* Right Section: Theme Toggle, Notifications & Profile */}
          <div className="flex items-center gap-2 md:gap-3">

            {/* Theme Toggler */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-[#8C471E] dark:text-[#E69D62] hover:bg-[#E6CBB2]/40 dark:hover:bg-[#210E04] border border-transparent hover:border-[#E6CBB2] dark:hover:border-[#52270D] transition-all focus:outline-none cursor-pointer"
              aria-label="Toggle theme mode"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Notification Bell Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative p-2 rounded-xl text-[#8C471E] dark:text-[#E69D62] hover:bg-[#E6CBB2]/40 dark:hover:bg-[#210E04] border border-transparent hover:border-[#E6CBB2] dark:hover:border-[#52270D] transition-all focus:outline-none cursor-pointer"
                aria-label="View notifications"
              >
                <Bell className={`h-5 w-5 ${pendingBookingsCount > 0 ? 'text-[#8C471E] dark:text-[#E69D62] animate-bounce' : ''}`} />
                {displayBadgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white ring-2 ring-white dark:ring-[#120702] animate-pulse shadow-md">
                    {displayBadgeCount}
                  </span>
                )}
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-3 w-84 sm:w-96 bg-white dark:bg-[#210E04] text-[#3D1E0B] dark:text-[#FFF5EB] border border-[#E6CBB2] dark:border-[#52270D] rounded-3xl shadow-2xl overflow-hidden z-55 animate-slide-up font-sans">
                  {/* Header Bar */}
                  <div className="px-5 py-3.5 bg-[#FDF0E6] dark:bg-[#2A1307] border-b border-[#E6CBB2] dark:border-[#52270D] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#8C471E]/10 text-[#8C471E] dark:text-[#E69D62]">
                        <Bell className="h-4 w-4 animate-bounce" />
                      </div>
                      <div>
                        <h3 className="font-black text-xs text-[#3D1E0B] dark:text-[#FFF5EB] tracking-tight flex items-center gap-1.5">
                          <span>Booking Alerts</span>
                          {pendingBookingsCount > 0 && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-rose-600 text-white rounded-full animate-pulse">
                              {pendingBookingsCount} Pending
                            </span>
                          )}
                        </h3>
                        <p className="text-[10px] text-[#7A3B14] dark:text-[#E8C8AE] font-semibold">{notifications.length} Total Alerts</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          playNewBookingAlertSound()
                          showToast('🔊 Live Sound Alert Tested!', 'info')
                        }}
                        className="text-[10px] font-black uppercase tracking-wider text-[#8C471E] dark:text-[#E69D62] hover:bg-[#8C471E]/10 px-2 py-1 rounded-lg border border-[#8C471E]/30 transition-all cursor-pointer flex items-center gap-1"
                        title="Test Sound Alert"
                      >
                        <Volume2 className="h-3 w-3" />
                        <span>Sound</span>
                      </button>
                      {activeNotifications.length > 0 && (
                        <button
                          onClick={() => {
                            const allIds = notifications.map(item => item.id)
                            setDismissedAlerts(allIds)
                            localStorage.setItem('dismissed-alerts', JSON.stringify(allIds))
                            showToast('All alerts cleared successfully', 'info')
                          }}
                          className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20 transition-all cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* List Container */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-[#E6CBB2]/40 dark:divide-[#52270D]/40">
                    {activeNotifications.length === 0 ? (
                      <div className="px-6 py-8 text-center space-y-2">
                        <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20 shadow-inner">
                          <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-wider">All Detailing Clear!</h4>
                        <p className="text-[11px] text-[#542E16] dark:text-[#E8C8AE] leading-relaxed max-w-xs mx-auto">
                          No unread wash alerts. New client bookings will pop up here live!
                        </p>
                      </div>
                    ) : (
                      activeNotifications.map((n) => {
                        return (
                          <button
                            key={n.id}
                            onClick={() => {
                              setShowDropdown(false)
                              const updated = [...dismissedAlerts, n.id]
                              setDismissedAlerts(updated)
                              localStorage.setItem('dismissed-alerts', JSON.stringify(updated))
                              if (n.type === 'booking') {
                                navigate(`/bookings?highlightId=${n.id}`)
                              } else {
                                navigate(`/subscriptions`)
                              }
                            }}
                            className="w-full text-left px-5 py-3.5 hover:bg-[#FFF8F0] dark:hover:bg-[#2A1307]/60 transition-all flex items-center gap-3.5 group cursor-pointer focus:outline-none bg-[#FFF8F0]/40 dark:bg-[#120702]/40 border-l-2 border-[#8C471E]"
                          >
                            <div className="h-9 w-9 rounded-2xl bg-[#8C471E]/10 text-[#8C471E] dark:text-[#E69D62] border border-[#E6CBB2] dark:border-[#52270D] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                              <Car className="h-4.5 w-4.5" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between text-xs mb-0.5">
                                <span className="font-black text-[#3D1E0B] dark:text-[#FFF5EB] truncate flex items-center gap-1.5 group-hover:text-[#8C471E] transition-colors">
                                  {n.customerName}
                                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                </span>
                                <span className="text-[10px] text-[#7A3B14] dark:text-[#E8C8AE] font-semibold">{n.time}</span>
                              </div>
                              <p className="text-[11px] text-[#542E16] dark:text-[#E8C8AE] truncate font-medium">{n.detailName}</p>
                              
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider ${
                                  n.status === 'Completed'
                                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                                    : n.status === 'Confirmed'
                                    ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30'
                                    : 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30'
                                }`}>
                                  {n.status || 'New Order'}
                                </span>
                              </div>
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>

                  {/* Footer Bar */}
                  <div className="p-2.5 bg-[#FFF8F0] dark:bg-[#120702] border-t border-[#E6CBB2] dark:border-[#52270D] text-center">
                    <button
                      onClick={() => {
                        setShowDropdown(false)
                        navigate('/bookings')
                      }}
                      className="w-full py-2 bg-[#8C471E] text-white hover:bg-[#6D3412] font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>View All Bookings</span>
                      <ArrowRight className="h-3.5 w-3.5 text-amber-200" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar Pill */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-[#E6CBB2] dark:border-[#52270D]">
              <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-tr from-[#8C471E] to-[#6D3412] text-white flex items-center justify-center text-xs font-black shadow-sm ring-2 ring-[#E6CBB2] dark:ring-[#52270D]">
                AD
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-black text-[#3D1E0B] dark:text-[#FFF5EB] leading-none">
                  Admin
                </span>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mt-0.5">
                  ● Online
                </span>
              </div>
            </div>

          </div>
        </div>

      {/* Full Screen Circular Theme Transition Overlay */}
      {transitionTheme && createPortal(
        <div 
          className="fixed inset-0 w-screen h-screen z-[999999] pointer-events-none flex flex-col items-center justify-center animate-circle-expand"
          style={{ 
            backgroundColor: transitionTheme === 'dark' ? '#0C0C0C' : '#FFEED6',
            color: transitionTheme === 'dark' ? '#FFEED6' : '#1A120B' 
          }}
        >
          <div className="flex flex-col items-center gap-4 animate-pulse-glow">
            <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-2xl bg-white/10 backdrop-blur-md border border-white/20">
              {transitionTheme === 'dark' ? (
                <Moon className="h-10 w-10 text-amber-400" />
              ) : (
                <Sun className="h-10 w-10 text-amber-500" />
              )}
            </div>
            <h2 className="text-xs font-black tracking-[0.25em] uppercase">
              {transitionTheme === 'dark' ? 'Dark Mode On' : 'Light Mode On'}
            </h2>
          </div>
        </div>,
        document.body
      )}
    </header>
    </>
  )
}
