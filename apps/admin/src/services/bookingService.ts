import { supabase } from '../lib/supabase'
import type { Booking } from '../types'

export const bookingService = {
  async getAll(): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, services(*), customers(*), workers(*)')
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data as unknown as Booking[]) ?? []
  },

  async updateStatus(id: string, status: Booking['status']): Promise<void> {
    const updatePayload: Record<string, any> = { status }
    if (status === 'Completed') {
      updatePayload.completed_at = new Date().toISOString()
      updatePayload.payment_status = 'Paid'
    } else if (status === 'Cancelled') {
      updatePayload.cancelled_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('bookings')
      .update(updatePayload)
      .eq('id', id)

    if (error) throw error
  },

  async assignWorker(id: string, worker_id: string): Promise<void> {
    const { error } = await supabase
      .from('bookings')
      .update({ worker_id, status: 'Assigned' })
      .eq('id', id)

    if (error) throw error
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('bookings').delete().eq('id', id)
    if (error) throw error
  },
}

