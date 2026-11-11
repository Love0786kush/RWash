import { useEffect, useState } from 'react'
import { customerService } from '../services/customerService'
import type { Customer } from '../types'

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCustomers()
  }, [])

  async function fetchCustomers() {
    try {
      setLoading(true)
      const data = await customerService.getAll()
      setCustomers(data)
    } catch (e: any) {
      setError(e.message || 'Could not load customers.')
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(id: string, status: Customer['status']) {
    await customerService.updateStatus(id, status)
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status } : c))
    )
  }

  return { customers, loading, error, updateStatus, refetch: fetchCustomers }
}

