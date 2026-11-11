import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { bookingService } from '../services/bookingService'
import type { Booking } from '../types'
import { playAlert } from '../utils/audioAlert'

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBookings()
    const channel = subscribeRealtime()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchBookings() {
    try {
      setLoading(true)
      const data = await bookingService.getAll()
      setBookings(data)
    } catch (e: any) {
      setError(e.message || 'Could not load bookings.')
    } finally {
      setLoading(false)
    }
  }

  function subscribeRealtime() {
    return supabase
      .channel('bookings-realtime-admin')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bookings' },
        (payload) => {
          setBookings((prev) => [payload.new as Booking, ...prev])
          playAlert()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings' },
        (payload) => {
          setBookings((prev) =>
            prev.map((b) => (b.id === payload.new.id ? (payload.new as Booking) : b))
          )
        }
      )
      .subscribe()
  }

  async function updateStatus(id: string, status: Booking['status']) {
    await bookingService.updateStatus(id, status)
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status } : b))
    )
  }

  return { bookings, loading, error, updateStatus, refetch: fetchBookings }
}

