import { supabase } from '../lib/supabase'
import type { Service, ServiceCategory } from '../types'

export const serviceService = {
  async getAll(): Promise<Service[]> {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('name')

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

  async create(service: Partial<Service>): Promise<Service> {
    const { data, error } = await supabase
      .from('services')
      .insert(service as any)
      .select()
      .single()

    if (error) throw error
    return data as unknown as Service
  },

  async update(id: string, updates: Partial<Service>): Promise<void> {
    const { error } = await supabase
      .from('services')
      .update(updates as any)
      .eq('id', id)

    if (error) throw error
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('services').delete().eq('id', id)
    if (error) throw error
  },
}

