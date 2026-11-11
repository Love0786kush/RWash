import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Car, ShieldCheck, Clock, Award, ChevronRight, CheckCircle2, AlertCircle, Heart, XCircle, Sparkles } from 'lucide-react'
import { useClientAuth } from '../context/ClientAuthContext'
import { supabase } from '../lib/supabase'
import { SkeletonLoader } from '../components/Spinner'
import { useToast } from '../context/ToastContext'

interface Banner {
  id: string;
  image_url: string;
  title: string | null;
}

export const ClientDashboard: React.FC = () => {
  const { customer, refreshProfile } = useClientAuth()
  const { showToast } = useToast()
  const [totalCount, setTotalCount] = useState(0)
  const [upcomingCount, setUpcomingCount] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [cancelledCount, setCancelledCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  
  // Realtime Promotional Banners & Coupons List
  const [banners, setBanners] = useState<Banner[]>([])
  const [couponsList, setCouponsList] = useState<any[]>([])

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)

      if (!customer) return

      // Fetch Bookings Count
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('status')
        .eq('customer_id', customer.id)

      if (bookingsData) {
        setTotalCount(bookingsData.length)
        setUpcomingCount(bookingsData.filter(b => b.status === 'Pending' || b.status === 'Confirmed' || b.status === 'Assigned').length)
        setCompletedCount(bookingsData.filter(b => b.status === 'Completed').length)
        setCancelledCount(bookingsData.filter(b => b.status === 'Cancelled').length)
      }

      // Fetch Banners
      const { data: bannerData } = await supabase
        .from('banners')
        .select('*')
        .eq('is_visible', true)
        .limit(2)
      setBanners(bannerData || [])

      // Fetch Active Coupons
      const { data: coupons } = await supabase
        .from('coupons')
        .select('*')
        .eq('is_used', false)
        .limit(3)
      setCouponsList(coupons || [])

    } catch (err) {
      console.error('Client Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSeedDemoData = async () => {
    if (!customer) return
    try {
      setSeeding(true)
      showToast('Seeding demo vehicles and booking data...', 'info')

      // 1. Get first service ID
      const { data: servs } = await supabase.from('services').select('id').limit(1)
      const serviceId = servs && servs.length > 0 ? servs[0].id : null

      // 2. Insert sample vehicle
      await supabase.from('vehicles').insert([
        {
          customer_id: customer.id,
          brand: 'Tesla',
          model: 'Model 3 Dual Motor',
          vehicle_type: 'Sedan',
          vehicle_number: 'CA-9821-EV',
          color: 'Pearl White'
        }
      ])

      // 3. Insert sample bookings
      if (serviceId) {
        await supabase.from('bookings').insert([
          {
            customer_id: customer.id,
            service_id: serviceId,
            vehicle_type: 'Tesla Model 3 Dual Motor (Sedan)',
            booking_date: new Date().toISOString().split('T')[0],
            booking_time: '10:00 AM',
            status: 'Confirmed',
            notes: 'Demo booking seeded automatically.'
          }
        ])
      }

      showToast('Demo data seeded successfully!', 'success')
      await refreshProfile()
      await fetchDashboardStats()
    } catch (err: any) {
      showToast('Seeding failed: ' + err.message, 'error')
    } finally {
      setSeeding(false)
    }
  }

  useEffect(() => {
    fetchDashboardStats()

    if (!customer) return

    const channel = supabase
      .channel('client-dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `customer_id=eq.${customer.id}` },
        () => {
          fetchDashboardStats()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [customer])

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader rows={4} />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in text-left">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-amber-800 via-amber-900 to-stone-950 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 translate-x-12 -translate-y-6 w-52 h-52 bg-amber-500/10 rounded-full blur-2xl" />
        <div className="relative z-10 space-y-4 text-left">
          <div className="flex items-center gap-2 text-amber-200">
            <Sparkles className="h-5 w-5 text-amber-300 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest">Customer Dashboard</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none">
            Welcome Back, {customer?.name || 'Valued Client'}!
          </h1>
          <p className="text-amber-100 text-xs md:text-sm max-w-md leading-relaxed font-medium">
            Manage your car collection, track detailing status, and book scheduling slots with ease.
          </p>
        </div>
      </div>

      {/* Stats counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Total Bookings', value: totalCount, icon: <CalendarDays className="h-5 w-5 text-primary-600 dark:text-amber-400" />, bg: 'bg-primary-50 dark:bg-slate-800' },
          { title: 'Upcoming Washes', value: upcomingCount, icon: <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />, bg: 'bg-amber-50 dark:bg-amber-950/40' },
          { title: 'Completed Cleanings', value: completedCount, icon: <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />, bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
          { title: 'Cancelled Appointments', value: cancelledCount, icon: <XCircle className="h-5 w-5 text-slate-500 dark:text-slate-400" />, bg: 'bg-slate-100 dark:bg-slate-800' },
        ].map((item) => (
          <div key={item.title} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{item.title}</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{item.value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${item.bg}`}>{item.icon}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Account profile</h3>
            <Link to="/dashboard/profile" className="text-[10px] font-bold text-primary-600 dark:text-amber-400 hover:underline">
              Edit
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {customer?.image_url ? (
              <img src={customer.image_url} alt="Avatar" className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-800" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center text-sm font-bold">
                {customer?.name?.substring(0, 2).toUpperCase() || 'CU'}
              </div>
            )}
            <div className="min-w-0">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{customer?.name}</h4>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold truncate mt-0.5">{customer?.email}</p>
            </div>
          </div>

          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 space-y-2">
            <p>Phone: <span className="text-slate-800 dark:text-slate-200">{customer?.phone || 'Not added'}</span></p>
            <p>City: <span className="text-slate-800 dark:text-slate-200">{customer?.city || 'Not added'}</span></p>
          </div>
        </div>

        {/* Coupons List Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Your Active Coupons</h3>
          </div>
          {couponsList.length === 0 ? (
            <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-xs font-semibold">No coupons available.</div>
          ) : (
            <div className="space-y-3">
              {couponsList.map(c => (
                <div key={c.id} className="p-3 bg-amber-50/60 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 rounded-xl flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-amber-700 dark:text-amber-300 tracking-wider">{c.code}</span>
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">Save ₹{parseFloat(c.discount_amount).toFixed(0)}</span>
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(c.code)
                      showToast('Coupon code copied to clipboard!', 'info')
                    }}
                    className="text-[9px] font-black uppercase text-primary-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    Copy Code
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Banners Promotion Offers */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
              <span>Latest Brand Offers</span>
            </h3>
          </div>

          {banners.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs font-medium">
              No active promo banners right now.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {banners.map((b) => (
                <div key={b.id} className="relative rounded-2xl overflow-hidden h-36 border border-slate-200 dark:border-slate-800 group shadow-xs">
                  <img src={b.image_url} alt="Offer" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/30 to-transparent p-4 flex flex-col justify-end">
                    <span className="text-white font-extrabold text-xs">{b.title || 'Exclusive Wash Deal'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
