import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Menu, Bell, Clock, CheckCircle2, AlertTriangle, MessageSquare, Sun, Moon, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useClientAuth } from '../context/ClientAuthContext'

interface HeaderProps {
  onMenuClick: () => void;
}

interface AlertItem {
  id: string;
  type: 'status_update' | 'custom';
  title: string;
  message: string;
  time: string;
}

export const ClientHeader: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { customer } = useClientAuth()
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Quick View State
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null)

  // Local dismissed alert IDs state
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('dismissed_client_alerts')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

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

  const fetchClientAlerts = async () => {
    if (!customer) return
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .or(`customer_id.eq.${customer.id},customer_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(15)

      if (data && !error) {
        const mappedAlerts: AlertItem[] = data
          .map((n: any) => {
            const timeStr = new Date(n.created_at).toLocaleDateString()
            return {
              id: n.id,
              type: 'custom' as const,
              title: n.title,
              message: n.message,
              time: timeStr,
            }
          })
          // Filter out locally dismissed alerts
          .filter((alert) => !dismissedIds.includes(alert.id))

        setAlerts(mappedAlerts)
      }
    } catch (err) {
      console.error('Alert load error:', err)
    }
  }

  // Request browser native push notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    fetchClientAlerts()

    if (!customer) return

    // Realtime notification listener to alert client & trigger native push notifications
    const channel = supabase
      .channel('client-realtime-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload: any) => {
          const newNoti = payload.new
          // Check if it belongs to this customer or is public (null)
          if (!newNoti.customer_id || newNoti.customer_id === customer.id) {
            // Trigger browser native push notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(newNoti.title, {
                body: newNoti.message,
                icon: '/favicon.ico'
              })
            }
            fetchClientAlerts()
          }
        }
      )
      .subscribe()

    // Click outside dropdown
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [customer, dismissedIds])

  // Dismiss a single alert
  const handleDismissAlert = (id: string) => {
    const nextDismissed = [...dismissedIds, id]
    setDismissedIds(nextDismissed)
    localStorage.setItem('dismissed_client_alerts', JSON.stringify(nextDismissed))
  }

  // Clear all current alerts
  const handleClearAll = () => {
    const currentAlertIds = alerts.map((a) => a.id)
    const nextDismissed = Array.from(new Set([...dismissedIds, ...currentAlertIds]))
    setDismissedIds(nextDismissed)
    localStorage.setItem('dismissed_client_alerts', JSON.stringify(nextDismissed))
    setShowDropdown(false)
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-white dark:bg-[#111111] border-b border-slate-100 dark:border-neutral-900 shadow-xs transition-colors duration-300">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          <Menu className="h-5.5 w-5.5" />
        </button>

        <div className="flex-1 lg:flex-none">
          <h2 className="hidden lg:block text-sm font-black uppercase text-slate-800 dark:text-white tracking-wider">
            Client Dashboard
          </h2>
        </div>

        <div className="flex items-center gap-4">
          {/* Theme Toggler Button */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="h-4.5 w-4.5 text-amber-500" /> : <Moon className="h-4.5 w-4.5 text-slate-700" />}
          </button>

          {/* Notification bell */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors relative cursor-pointer"
            >
              <Bell className="h-5 w-5" />
              {alerts.length > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                  {alerts.length}
                </span>
              )}
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 z-55 animate-slide-up">
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 dark:text-white">Notifications</span>
                  {alerts.length > 0 && (
                    <button 
                      onClick={handleClearAll}
                      className="text-[10px] font-black text-rose-600 dark:text-rose-400 hover:underline uppercase cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {alerts.length === 0 ? (
                    <div className="px-4 py-6 text-center text-slate-400 dark:text-slate-500 text-xs">
                      <CheckCircle2 className="h-7 w-7 text-emerald-400 mx-auto mb-1.5 stroke-1" />
                      No recent updates!
                    </div>
                  ) : (
                    alerts.map((a) => (
                      <div 
                        key={a.id} 
                        onClick={() => {
                          setSelectedAlert(a)
                          setShowDropdown(false)
                        }}
                        className="px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                      >
                        <div className="flex gap-2.5 flex-1 min-w-0">
                          <div className="h-7.5 w-7.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                            <MessageSquare className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-xs font-bold text-slate-800 dark:text-white leading-snug">{a.title}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed mt-0.5">
                              {a.message}
                            </p>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-0.5">{a.time}</span>
                          </div>
                        </div>

                        {/* Individual Dismiss Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDismissAlert(a.id)
                          }}
                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors cursor-pointer flex-shrink-0"
                          title="Dismiss"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User profile capsule */}
          <div className="flex items-center gap-2 border-l border-slate-100 dark:border-neutral-900 pl-3">
            {customer?.image_url ? (
              <img
                src={customer.image_url}
                alt="Avatar"
                className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-neutral-800"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-red-655 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                {customer?.name?.substring(0, 2).toUpperCase() || 'CU'}
              </div>
            )}
            <span className="hidden sm:inline-block text-xs font-bold text-slate-700 dark:text-slate-350">
              {customer?.name?.split(' ')[0] || 'Customer'}
            </span>
          </div>
        </div>
      </header>

      {/* Full Screen Theme Transition Overlay */}
      {transitionTheme && createPortal(
        <div 
          className="fixed inset-0 w-screen h-screen min-h-screen min-w-screen z-[99999] flex flex-col items-center justify-center animate-circle-expand"
          style={{ 
            backgroundColor: transitionTheme === 'dark' ? '#0C0C0C' : '#FFEED6',
            color: transitionTheme === 'dark' ? '#FFEED6' : '#1A120B' 
          }}
        >
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-32 h-32 flex items-center justify-center">
              {transitionTheme === 'dark' ? (
                <Moon className="h-20 w-20 text-amber-400 animate-bounce" />
              ) : (
                <Sun className="h-20 w-20 text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
              )}
            </div>
            <h2 className="text-sm font-black tracking-widest uppercase mt-4 animate-pulse">
              Switching theme to {transitionTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}...
            </h2>
          </div>
        </div>,
        document.body
      )}

      {/* Quick View Notification Detail Modal */}
      {selectedAlert && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#111111] max-w-sm w-full rounded-3xl p-6 border border-slate-100 dark:border-neutral-800 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-neutral-900 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-red-655" /> {selectedAlert.title}
              </h3>
              <button 
                onClick={() => setSelectedAlert(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
              {selectedAlert.message}
            </p>
            
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase pt-1">
              Alert Date: {selectedAlert.time}
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSelectedAlert(null)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-white font-bold text-xs uppercase rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all cursor-pointer text-center"
              >
                Dismiss Detail
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Full Screen Circular Theme Transition Overlay */}
      {transitionTheme && createPortal(
        <div 
          className="fixed inset-0 w-screen h-screen z-[999999] pointer-events-none flex flex-col items-center justify-center animate-circle-expand"
          style={{ 
            backgroundColor: transitionTheme === 'dark' ? '#090d16' : '#f8fafc',
            color: transitionTheme === 'dark' ? '#f8fafc' : '#0f172a' 
          }}
        >
          <div className="flex flex-col items-center gap-4 animate-pulse-glow">
            <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-2xl bg-white/10 backdrop-blur-md border border-white/20">
              {transitionTheme === 'dark' ? (
                <Moon className="h-10 w-10 text-sky-400" />
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
    </>
  )
}
