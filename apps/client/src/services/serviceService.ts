import { supabase } from '../lib/supabase'
import type { Service, ServiceCategory } from '../types'

export const serviceService = {
  async getActiveServices(category?: string): Promise<Service[]> {
    let query = supabase
      .from('services')
      .select('*')
      .eq('status', 'Active')
      .order('name')

    if (category && category !== 'All') {
      query = query.eq('category', category)
    }

    const { data, error } = await query
    if (error) throw error
    return (data as unknown as Service[]) ?? []
  },

  async getCategories(): Promise<ServiceCategory[]> {
    const { data, error } = await supabase
      .from('service_categories')
      .select('*')
      .order('sort_order')

    if (error) throw error
    return (data as unknown as ServiceCategory[]) ?? []
  },

  async getServiceById(id: string): Promise<Service | null> {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as unknown as Service
  },
}

