import { useEffect, useState } from 'react'
import { bookingService } from '../services/bookingService'
import { useAuth } from '../context/AuthContext'
import type { Booking } from '../types'

export function useBookings() {
  const { customer } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (customer?.id) {
      fetchBookings(customer.id)
    } else {
      setLoading(false)
    }
  }, [customer?.id])

  async function fetchBookings(customerId: string) {
    try {
      setLoading(true)
      const data = await bookingService.getMyBookings(customerId)
      setBookings(data)
    } catch (e: any) {
      setError(e.message || 'Could not load bookings.')
    } finally {
      setLoading(false)
    }
  }

  async function cancelBooking(id: string, reason?: string) {
    await bookingService.cancelBooking(id, reason)
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'Cancelled' } : b))
    )
  }

  return {
    bookings,
    loading,
    error,
    cancelBooking,
    refetch: () => customer?.id && fetchBookings(customer.id),
  }
}

