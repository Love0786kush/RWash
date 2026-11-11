import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface DashboardStats {
  totalBookings: number
  todayBookings: number
  pendingBookings: number
  completedBookings: number
  totalRevenue: number
  monthRevenue: number
  totalCustomers: number
  activeCustomers: number
  activeSubscriptions: number
  totalCampaigns: number
  sentCampaigns: number
  totalNotified: number
}

const EMPTY_STATS: DashboardStats = {
  totalBookings: 0,
  todayBookings: 0,
  pendingBookings: 0,
  completedBookings: 0,
  totalRevenue: 0,
  monthRevenue: 0,
  totalCustomers: 0,
  activeCustomers: 0,
  activeSubscriptions: 0,
  totalCampaigns: 0,
  sentCampaigns: 0,
  totalNotified: 0,
}

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)

    try {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const [
        bookingsAll,
        bookingsToday,
        bookingsPending,
        bookingsCompleted,
        customersAll,
        customersActive,
        subscriptionsActive,
        campaignsAll,
        campaignsSent,
      ] = await Promise.allSettled([
        // Total bookings
        supabase
          .from('bookings')
          .select('id, final_amount, status', { count: 'exact' }),

        // Today's bookings
        supabase
          .from('bookings')
          .select('id', { count: 'exact' })
          .gte('created_at', todayStart.toISOString()),

        // Pending bookings
        supabase
          .from('bookings')
          .select('id', { count: 'exact' })
          .in('status', ['Pending', 'Confirmed']),

        // Completed bookings
        supabase
          .from('bookings')
          .select('id, final_amount', { count: 'exact' })
          .eq('status', 'Completed'),

        // Total customers
        supabase
          .from('customers')
          .select('id', { count: 'exact' }),

        // Active customers
        supabase
          .from('customers')
          .select('id', { count: 'exact' })
          .eq('status', 'Active'),

        // Active subscriptions
        supabase
          .from('subscriptions')
          .select('id', { count: 'exact' })
          .eq('status', 'Active'),

        // Total campaigns
        supabase
          .from('notification_campaigns')
          .select('id', { count: 'exact' }),

        // Sent campaigns + total_targeted sum
        supabase
          .from('notification_campaigns')
          .select('id, total_targeted', { count: 'exact' })
          .eq('status', 'Sent'),
      ])

      // Extract data safely
      const allBookingsData =
        bookingsAll.status === 'fulfilled' ? bookingsAll.value.data ?? [] : []
      const totalBookings =
        bookingsAll.status === 'fulfilled' ? bookingsAll.value.count ?? 0 : 0

      const todayBookings =
        bookingsToday.status === 'fulfilled' ? bookingsToday.value.count ?? 0 : 0

      const pendingBookings =
        bookingsPending.status === 'fulfilled' ? bookingsPending.value.count ?? 0 : 0

      const completedData =
        bookingsCompleted.status === 'fulfilled' ? bookingsCompleted.value.data ?? [] : []
      const completedBookings =
        bookingsCompleted.status === 'fulfilled' ? bookingsCompleted.value.count ?? 0 : 0

      // Revenue from completed bookings
      const totalRevenue = completedData.reduce(
        (sum: number, b: any) => sum + (Number(b.final_amount) || 0),
        0
      )

      // Month revenue — filter from allBookings completed this month
      const monthRevenue = allBookingsData
        .filter((b: any) => b.status === 'Completed' && new Date(b.created_at) >= monthStart)
        .reduce((sum: number, b: any) => sum + (Number(b.final_amount) || 0), 0)

      const totalCustomers =
        customersAll.status === 'fulfilled' ? customersAll.value.count ?? 0 : 0

      const activeCustomers =
        customersActive.status === 'fulfilled' ? customersActive.value.count ?? 0 : 0

      const activeSubscriptions =
        subscriptionsActive.status === 'fulfilled' ? subscriptionsActive.value.count ?? 0 : 0

      const totalCampaigns =
        campaignsAll.status === 'fulfilled' ? campaignsAll.value.count ?? 0 : 0

      const sentCampaignsData =
        campaignsSent.status === 'fulfilled' ? campaignsSent.value.data ?? [] : []
      const sentCampaigns =
        campaignsSent.status === 'fulfilled' ? campaignsSent.value.count ?? 0 : 0

      const totalNotified = sentCampaignsData.reduce(
        (sum: number, c: any) => sum + (Number(c.total_targeted) || 0),
        0
      )

      setStats({
        totalBookings,
        todayBookings,
        pendingBookings,
        completedBookings,
        totalRevenue,
        monthRevenue,
        totalCustomers,
        activeCustomers,
        activeSubscriptions,
        totalCampaigns,
        sentCampaigns,
        totalNotified,
      })
    } catch (err: any) {
      setError(err.message ?? 'Failed to load dashboard stats')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()

    // Realtime: refresh stats on any booking change
    const channel = supabase
      .channel('dashboard-live-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchStats(true)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
        fetchStats(true)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notification_campaigns' }, () => {
        fetchStats(true)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchStats])

  return { stats, loading, error, refetch: fetchStats }
}

