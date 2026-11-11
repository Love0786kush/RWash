import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  Users,
  Wrench,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowUpRight,
  Check,
  Percent,
  UserCheck,
  CheckSquare,
  Bell
} from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { supabase } from '../supabaseClient'
import { useToast } from '../context/ToastContext'
import { Spinner, SkeletonLoader } from '../components/Spinner'
import { playNewBookingAlertSound, requestNotificationPermission, triggerDesktopNotification } from '../utils/audioAlert'

interface Stats {
  totalBookings: number;
  totalCustomers: number;
  totalServices: number;
  todaysBookings: number;
}

interface RecentBooking {
  id: string;
  status: string;
  booking_date: string;
  booking_time: string;
  customers: { name: string } | null;
  services: { name: string; price: number } | null;
}

interface MonthlyBookingData {
  month: string;
  Bookings: number;
}

interface MonthlyRevenueData {
  month: string;
  Revenue: number;
}

interface StatusData {
  name: string;
  value: number;
}

interface TopServiceData {
  name: string;
  Washes: number;
}

export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  
  // Dashboard states
  const [stats, setStats] = useState<Stats>({
    totalBookings: 0,
    totalCustomers: 0,
    totalServices: 0,
    todaysBookings: 0,
  })
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
  
  // Charts states
  const [monthlyBookings, setMonthlyBookings] = useState<MonthlyBookingData[]>([])
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenueData[]>([])
  const [statusChart, setStatusChart] = useState<StatusData[]>([])
  const [topServices, setTopServices] = useState<TopServiceData[]>([])

  const { showToast } = useToast()

  const STATUS_COLORS = {
    Pending: '#f59e0b',
    Confirmed: '#6366f1',
    Assigned: '#3b82f6',
    Completed: '#10b981',
    Cancelled: '#64748b',
  }

  const fetchDashboardData = async (silent = false) => {
    try {
      const todayStr = new Date().toISOString().split('T')[0]

      // Fetch basic count stats
      const [
        bookingsRes,
        customersRes,
        servicesRes,
        todaysRes,
        recentRes,
        allBookingsForCharts,
      ] = await Promise.all([
        supabase.from('bookings').select('id', { count: 'exact', head: true }),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('services').select('id', { count: 'exact', head: true }),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('booking_date', todayStr),
        supabase.from('bookings').select(`
          id,
          status,
          booking_date,
          booking_time,
          customers!left (name),
          services!left (name, price)
        `).order('created_at', { ascending: false }).limit(5),
        supabase.from('bookings').select(`
          status,
          booking_date,
          services!left (name, price)
        `),
      ])

      setStats({
        totalBookings: bookingsRes.count || 0,
        totalCustomers: customersRes.count || 0,
        totalServices: servicesRes.count || 0,
        todaysBookings: todaysRes.count || 0,
      })

      setRecentBookings((recentRes.data as unknown as RecentBooking[]) || [])

      // Process Charts Data from allBookingsForCharts
      const rawBookings = allBookingsForCharts.data || []
      
      // 1. Monthly Bookings & Monthly Revenue (last 6 months)
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const monthlyCounts: { [key: string]: number } = {}
      const monthlyRev: { [key: string]: number } = {}

      // Get last 6 months list
      const last6Months: string[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const label = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`
        last6Months.push(label)
        monthlyCounts[label] = 0
        monthlyRev[label] = 0
      }

      // Group bookings by month labels
      rawBookings.forEach((b: any) => {
        if (!b.booking_date) return
        const dateObj = new Date(b.booking_date)
        const label = `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear().toString().substring(2)}`
        
        if (last6Months.includes(label)) {
          monthlyCounts[label] += 1
          if (b.status === 'Completed' && b.services?.price) {
            monthlyRev[label] += parseFloat(b.services.price)
          }
        }
      })

      setMonthlyBookings(last6Months.map(m => ({ month: m, Bookings: monthlyCounts[m] })))
      setMonthlyRevenue(last6Months.map(m => ({ month: m, Revenue: parseFloat(monthlyRev[m].toFixed(2)) })))

      // 2. Booking Status (Pie Chart)
      const statusCounts: { [key: string]: number } = { Pending: 0, Confirmed: 0, Assigned: 0, Completed: 0, Cancelled: 0 }
      rawBookings.forEach((b: any) => {
        const s = b.status || 'Pending'
        statusCounts[s] = (statusCounts[s] || 0) + 1
      })
      setStatusChart(
        Object.keys(statusCounts).map((k) => ({
          name: k,
          value: statusCounts[k],
        }))
      )

      // 3. Top Services (Bar Chart)
      const serviceCounts: { [key: string]: number } = {}
      rawBookings.forEach((b: any) => {
        const sName = b.services?.name || 'Custom Wash'
        serviceCounts[sName] = (serviceCounts[sName] || 0) + 1
      })
      const sortedServices = Object.keys(serviceCounts)
        .map((k) => ({ name: k, Washes: serviceCounts[k] }))
        .sort((a, b) => b.Washes - a.Washes)
        .slice(0, 4) // Show top 4 services
      setTopServices(sortedServices)

    } catch (err: any) {
      if (!silent) showToast('Error syncing dashboard: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    requestNotificationPermission()

    // Realtime listeners for live updates — no polling needed
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchDashboardData(true)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => {
        fetchDashboardData(true)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
        fetchDashboardData(true)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id)
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error
      showToast(`Booking marked as ${newStatus}`, 'success')
      fetchDashboardData()
    } catch (err: any) {
      showToast('Failed to update status: ' + err.message, 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-7 bg-slate-250 dark:bg-slate-800 rounded-lg w-64" />
            <div className="h-4 bg-slate-200 dark:bg-slate-800/80 rounded-lg w-96" />
          </div>
          <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-36" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="p-6 bg-white/40 dark:bg-slate-800/20 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-full w-1/2" />
                <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/3" />
              </div>
              <div className="h-14 w-14 rounded-2xl bg-slate-150 dark:bg-slate-800/80" />
            </div>
          ))}
        </div>

        {/* Charts Row 1 Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/40 dark:bg-slate-800/20 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 h-80" />
          <div className="bg-white/40 dark:bg-slate-800/20 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 h-80" />
        </div>

        {/* Table Skeleton */}
        <div className="bg-white/40 dark:bg-slate-800/20 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-48" />
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-16" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="flex justify-between items-center py-3 border-b border-slate-100/10">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-1/4" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-1/6" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-1/12" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-1/6" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#3D1E0B] dark:text-[#FFF5EB] tracking-tight flex items-center gap-2">
            <span>Control Center Dashboard</span>
            <Sparkles className="h-5 w-5 text-[#8C471E] dark:text-[#E69D62] animate-pulse" />
          </h1>
          <p className="text-[#542E16] dark:text-[#E8C8AE] text-sm mt-0.5 font-semibold">Realtime monitoring & business intelligence metrics.</p>
        </div>
        <Link
          to="/bookings"
          className="flex items-center justify-center gap-2 px-4.5 py-2.5 bg-[#8C471E] hover:bg-[#6D3412] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-xs"
        >
          <span>Manage Appts</span>
          <ArrowUpRight className="h-4 w-4 text-amber-200" />
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Total Bookings', value: stats.totalBookings, icon: <CalendarDays className="h-6 w-6 text-[#8C471E] dark:text-[#E69D62]" /> },
          { title: 'Registered Customers', value: stats.totalCustomers, icon: <Users className="h-6 w-6 text-[#8C471E] dark:text-[#E69D62]" /> },
          { title: 'Today\'s Bookings', value: stats.todaysBookings, icon: <Clock className="h-6 w-6 text-emerald-600 dark:text-emerald-400" /> },
          { title: 'Wash Services Offered', value: stats.totalServices, icon: <Wrench className="h-6 w-6 text-amber-600 dark:text-amber-400" /> },
        ].map((item) => (
          <div key={item.title} className="p-6 bg-white dark:bg-[#210E04] rounded-3xl border border-[#E6CBB2] dark:border-[#52270D] shadow-xs flex items-center justify-between transition-colors">
            <div>
              <p className="text-[10px] font-black text-[#7A3B14] dark:text-[#E8C8AE] uppercase tracking-widest">{item.title}</p>
              <h3 className="text-3xl font-black text-[#3D1E0B] dark:text-[#FFF5EB] mt-2">{item.value}</h3>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#FFF8F0] dark:bg-[#120702] border border-[#E6CBB2] dark:border-[#52270D]">{item.icon}</div>
          </div>
        ))}
      </div>

      {/* Row 1: Bookings Frequency & Revenue Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Bookings Chart */}
        <div className="bg-white dark:bg-[#210E04] p-6 rounded-3xl border border-[#E6CBB2] dark:border-[#52270D] shadow-xs transition-colors">
          <h3 className="text-sm font-black text-[#3D1E0B] dark:text-[#FFF5EB] mb-1">Monthly Wash Volume</h3>
          <p className="text-[#542E16] dark:text-[#E8C8AE] text-xs mb-6 font-semibold">Total number of wash orders completed/requested per month.</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyBookings}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border, #E6CBB2)" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--theme-btn, #8C471E)' }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--theme-btn, #8C471E)' }} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--theme-dcard, #210E04)', color: 'var(--theme-dtext, #FFF5EB)', borderRadius: '12px', border: '1px solid var(--theme-dborder, #52270D)' }} />
                <Bar dataKey="Bookings" fill="var(--theme-btn, #8C471E)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Revenue Chart */}
        <div className="bg-white dark:bg-[#210E04] p-6 rounded-3xl border border-[#E6CBB2] dark:border-[#52270D] shadow-xs transition-colors">
          <h3 className="text-sm font-black text-[#3D1E0B] dark:text-[#FFF5EB] mb-1">Monthly Revenue Trend</h3>
          <p className="text-[#542E16] dark:text-[#E8C8AE] text-xs mb-6 font-semibold">Gross sales (₹) accrued from completed appointments.</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border, #E6CBB2)" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--theme-btn, #8C471E)' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--theme-btn, #8C471E)' }} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--theme-dcard, #210E04)', color: 'var(--theme-dtext, #FFF5EB)', borderRadius: '12px', border: '1px solid var(--theme-dborder, #52270D)' }} />
                <Line type="monotone" dataKey="Revenue" stroke="var(--theme-btn, #8C471E)" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Status Breakdown & Popular Services */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Booking Status Pie Chart */}
        <div className="bg-white dark:bg-[#210E04] p-6 rounded-3xl border border-[#E6CBB2] dark:border-[#52270D] shadow-xs flex flex-col justify-between transition-colors">
          <div>
            <h3 className="text-sm font-black text-[#3D1E0B] dark:text-[#FFF5EB] mb-1">Appointment Status</h3>
            <p className="text-[#542E16] dark:text-[#E8C8AE] text-xs mb-4 font-semibold">Breakdown of orders processed.</p>
          </div>
          <div className="h-56 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusChart}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusChart.map((entry) => (
                    <Cell
                      key={`cell-${entry.name}`}
                      fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || '#e2e8f0'}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--theme-dcard, #210E04)', color: 'var(--theme-dtext, #FFF5EB)', borderRadius: '12px', border: '1px solid var(--theme-dborder, #52270D)' }} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Summary Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-black text-[#3D1E0B] dark:text-[#FFF5EB]">
                {statusChart.reduce((acc, curr) => acc + curr.value, 0)}
              </span>
              <span className="text-[10px] text-[#7A3B14] dark:text-[#E8C8AE] font-bold uppercase">Total</span>
            </div>
          </div>
          <div className="flex justify-center gap-4 flex-wrap text-xs font-bold text-[#542E16] dark:text-[#E8C8AE]">
            {statusChart.map((entry) => (
              <span key={entry.name} className="flex items-center gap-1">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] }}
                />
                {entry.name} ({entry.value})
              </span>
            ))}
          </div>
        </div>

        {/* Top Services Bar Chart */}
        <div className="bg-white dark:bg-[#210E04] p-6 rounded-3xl border border-[#E6CBB2] dark:border-[#52270D] shadow-xs lg:col-span-2 transition-colors">
          <h3 className="text-sm font-black text-[#3D1E0B] dark:text-[#FFF5EB] mb-1">Top Performing Services</h3>
          <p className="text-[#542E16] dark:text-[#E8C8AE] text-xs mb-6 font-semibold">Catalog wash items generating the highest booking quantity.</p>
          <div className="h-64 w-full">
            {topServices.length === 0 ? (
              <div className="py-20 text-center text-[#542E16] dark:text-[#E8C8AE] text-xs">No service bookings recorded yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topServices} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border, #E6CBB2)" opacity={0.3} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--theme-btn, #8C471E)' }} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10, fill: 'var(--theme-btn, #8C471E)' }} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--theme-dcard, #210E04)', color: 'var(--theme-dtext, #FFF5EB)', borderRadius: '12px', border: '1px solid var(--theme-dborder, #52270D)' }} />
                  <Bar dataKey="Washes" fill="var(--theme-btn, #8C471E)" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Recent Bookings Table */}
      <div className="bg-white dark:bg-[#210E04] p-6 rounded-3xl border border-[#E6CBB2] dark:border-[#52270D] shadow-xs transition-colors">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-black text-[#3D1E0B] dark:text-[#FFF5EB]">Recent Appointments Activity</h3>
            <p className="text-[#542E16] dark:text-[#E8C8AE] text-xs mt-0.5 font-semibold">Quick look at the latest 5 appointments.</p>
          </div>
          <Link to="/bookings" className="text-xs font-black text-[#8C471E] dark:text-[#E69D62] hover:underline uppercase tracking-wider">
            View All
          </Link>
        </div>

        {recentBookings.length === 0 ? (
          <div className="py-12 text-center text-[#542E16] dark:text-[#E8C8AE] text-xs font-medium">No bookings found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#FDF0E6] dark:bg-[#2A1307] border-b border-[#E6CBB2] dark:border-[#52270D] text-[#8C471E] dark:text-[#E69D62] font-black uppercase tracking-wider">
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Scheduled Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6CBB2]/40 dark:divide-[#52270D]/40 text-[#3D1E0B] dark:text-[#FFF5EB]">
                {recentBookings.map((b) => {
                  const badges = {
                    Pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                    Confirmed: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
                    Assigned: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
                    Completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                    Cancelled: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
                  }

                  return (
                    <tr key={b.id} className="hover:bg-[#FFF8F0] dark:hover:bg-[#2A1307]/60 transition-colors">
                      <td className="px-4 py-3 font-bold text-[#3D1E0B] dark:text-[#FFF5EB]">
                        {b.customers?.name || 'Walk-in'}
                      </td>
                      <td className="px-4 py-3 font-medium">{b.services?.name || 'Custom Service'}</td>
                      <td className="px-4 py-3 font-black text-[#8C471E] dark:text-[#E69D62]">
                        {b.services?.price ? `₹${parseFloat(b.services.price.toString()).toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#542E16] dark:text-[#E8C8AE]">
                        {b.booking_date} • {b.booking_time}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold border ${badges[b.status as keyof typeof badges] || 'bg-slate-50'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1.5 justify-end">
                          {b.status === 'Pending' && (
                            <button
                              onClick={() => handleUpdateStatus(b.id, 'Confirmed')}
                              disabled={updatingId === b.id}
                              className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-[#FFF8F0] dark:hover:bg-[#120702] border border-[#E6CBB2] dark:border-[#52270D] rounded-lg transition-colors cursor-pointer"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {b.status === 'Confirmed' && (
                            <button
                              onClick={() => handleUpdateStatus(b.id, 'Assigned')}
                              disabled={updatingId === b.id}
                              className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-[#FFF8F0] dark:hover:bg-[#120702] border border-[#E6CBB2] dark:border-[#52270D] rounded-lg transition-colors cursor-pointer"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {b.status === 'Assigned' && (
                            <button
                              onClick={() => handleUpdateStatus(b.id, 'Completed')}
                              disabled={updatingId === b.id}
                              className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-[#FFF8F0] dark:hover:bg-[#120702] border border-[#E6CBB2] dark:border-[#52270D] rounded-lg transition-colors cursor-pointer"
                            >
                              <CheckSquare className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
