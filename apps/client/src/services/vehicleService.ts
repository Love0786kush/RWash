import { supabase } from '../lib/supabase'
import type { Vehicle } from '../types'

export const vehicleService = {
  async getMyVehicles(customerId: string): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('customer_id', customerId)
      .order('is_default', { ascending: false })

    if (error) throw error
    return (data as unknown as Vehicle[]) ?? []
  },

  async addVehicle(vehicle: Partial<Vehicle>): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('vehicles')
      .insert(vehicle as any)
      .select()
      .single()

    if (error) throw error
    return data as unknown as Vehicle
  },

  async deleteVehicle(id: string): Promise<void> {
    const { error } = await supabase.from('vehicles').delete().eq('id', id)
    if (error) throw error
  },
}

