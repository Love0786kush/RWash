import { supabase } from '../lib/supabase'
import type { Customer } from '../types'

export const customerService = {
  async getAll(): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data as unknown as Customer[]) ?? []
  },

  async updateStatus(id: string, status: Customer['status']): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .update({ status })
      .eq('id', id)

    if (error) throw error
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) throw error
  },
}

