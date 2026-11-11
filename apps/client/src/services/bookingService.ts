import { supabase } from '../lib/supabase'
import type { Booking } from '../types'

export const bookingService = {
  async getMyBookings(customerId: string): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, services(*)')
      .eq('customer_id', customerId)
      .order('booking_date', { ascending: false })

    if (error) throw error
    return (data as unknown as Booking[]) ?? []
  },

  async createBooking(booking: Partial<Booking>): Promise<Booking> {
    const { data, error } = await supabase
      .from('bookings')
      .insert(booking as any)
      .select('*, services(*)')
      .single()

    if (error) throw error
    return data as unknown as Booking
  },

  async cancelBooking(id: string, reason?: string): Promise<void> {
    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'Cancelled',
        cancelled_at: new Date().toISOString(),
        cancel_reason: reason || 'Cancelled by customer',
      })
      .eq('id', id)

    if (error) throw error
  },
}

